# Tool Manifest — System Spec

> **Status:** Implemented (v1.0 — complete, all contract tests passing)
> **Date:** 2026-03-24
> **Scope:** Eliminate ghost tools — static TOOLS lists in system prompts that
>   diverge from the RBAC-enforced registry. Replace with a dynamic per-role
>   manifest injected at request time, backed by contract tests that make it
>   impossible to silently regress.
> **Prerequisite:** Tool Architecture Refactoring complete (all 5 sprints).

---

## 1. Problem Statement

After the Tool Architecture refactoring, the `ToolRegistry` became the single
source of truth for which tools exist and which roles can execute them. However
the system prompt was still built from a **static TOOLS list** hardcoded in
`buildCorpusBasePrompt()`:

```
TOOLS:
- **calculator**: All math operations - MUST use.
- **search_corpus**: Search across all 10 documents…
- **get_section**: Retrieve full section content.
- **get_checklist**: Actionable checklists from section endings.
- **list_practitioners**: Find key people referenced in the corpus.
- **get_corpus_summary**: Get an overview of all 10 documents…
- **set_theme**: Change the site aesthetic…
- **generate_audio**: Generate title + text for TTS…
- **navigate**: Send the user to a specific route.
```

This created three categories of failure:

### 1A. Ghost tools — tools Claude was told it had but couldn't execute

Every role received the same 9-tool list. An `ANONYMOUS` user was being told
in the system prompt that they had `generate_audio`, `get_section`,
`get_checklist`, and `list_practitioners` — all blocked by RBAC. When the user
asked "what can you do?", Claude described capabilities it would fail to execute.

### 1B. Invisible tools — tools Claude could execute but didn't know about

Six tools existed in the registry but were never mentioned in any prompt section:

| Tool | Available to |
|---|---|
| `adjust_ui` | ALL |
| `set_preference` | AUTHENTICATED, STAFF, ADMIN |
| `generate_chart` | AUTHENTICATED, STAFF, ADMIN |
| `search_my_conversations` | AUTHENTICATED, STAFF, ADMIN |
| `draft_content` | ADMIN only |
| `publish_content` | ADMIN only |

Claude would never proactively use these tools because it had no knowledge of
them.

### 1C. No enforcement mechanism

There was no test that detected the divergence between the static prompt list
and the live registry. Renaming, adding, or removing a tool left the static
list silently stale. The bug was invisible until a user noticed Claude's
self-description didn't match reality.

### 1D. Stale tool name in role directive (discovered during implementation)

The `APPRENTICE` role directive referenced `` `search_my_conversations` `` but
the tool's `roles` array was `["AUTHENTICATED", "STAFF", "ADMIN"]` — `APPRENTICE`
was excluded. The system prompt was telling `APPRENTICE` users to use a tool
that would throw `ToolAccessDeniedError`.

### What we need

1. The system prompt tool list must be **derived from the registry** at request
   time for the authenticated role — not from any hardcoded string.
2. **No static tool names** anywhere that the registry can contradict.
3. **Contract tests** that fail immediately when the prompt and registry diverge,
   with a clear message naming the offending tool.
4. **Role directive parity** — every tool name referenced in a role directive
   must exist in the registry and be executable by that role.

---

## 2. Architecture Inventory (Before)

### 2A. System prompt construction path

```
POST /api/chat/stream
  → createSystemPromptBuilder(role)              # fetches base + role_directive from DB/fallback
  → builder.withUserPreferences(prefs)           # FND-003
  → prepareStreamContext(builder, …)
    → builder.withConversationSummary(…)
    → builder.withRoutingContext(…)
    → applyTaskOriginHandoff(builder, …)
    → builder.build()                            # joins sections by priority
```

The tool list reached Claude only via:
- Anthropic `tools` parameter: `getToolRegistry().getSchemasForRole(role)` ✅ (correct)
- System prompt TOOLS section: hardcoded string in `buildCorpusBasePrompt()` ❌ (stale)

### 2B. Static tool list location

`src/lib/corpus-vocabulary.ts` — `buildCorpusBasePrompt()` embedded a literal
`TOOLS:` block. It was consumed by `ConfigIdentitySource.getIdentity()` and
injected into the `SystemPromptBuilder` as the identity section (priority 10).

### 2C. SystemPromptBuilder sections (before)

| Key | Source | Priority |
|---|---|---|
| `identity` | `ConfigIdentitySource` → `buildCorpusBasePrompt()` | 10 |
| `role_directive` | `DefaultingSystemPromptRepository` → `ROLE_DIRECTIVES` | 20 |
| `user_preferences` | `UserPreferencesDataMapper` | 30 |
| `summary` | `buildSummaryContextBlock()` | 40 |
| `routing` | `buildRoutingContextBlock()` | 50 |
| `task_origin_handoff` | `buildTaskOriginContextBlock()` | 90 |

No tool-aware section existed.

---

## 3. Target Architecture

### 3.1 Single source of truth: the registry

`ToolRegistry.getSchemasForRole(role)` is the canonical, authoritative list of
tools available to a role. It is already used to build the Anthropic `tools`
parameter. It must also be used to build the system prompt tool section.

No code path may construct a tool list by any other means.

### 3.2 withToolManifest() — new SystemPromptBuilder method

```typescript
// src/core/use-cases/SystemPromptBuilder.ts
withToolManifest(schemas: { name: string; description: string }[]): this
```

Accepts the registry schemas (already available at the call site), renders a
`TOOLS AVAILABLE TO YOU:` section with one bullet per tool, and sets it at
priority 15 — after identity (10) and before role directive (20), so the role
directive can reference tool names and Claude reads them in context order.

```
TOOLS AVAILABLE TO YOU:
- **calculator**: Performs arithmetic. Mandatory for every math calculation.
- **search_corpus**: Search across all 10 documents (104 sections)…
…

When the user asks what you can do, list these tools by name with a one-line
description of each.
```

### 3.3 Route wiring

```typescript
// src/app/api/chat/stream/route.ts — POST handler
const tools = getToolRegistry().getSchemasForRole(role) as Anthropic.Tool[];
builder.withToolManifest(tools.map(t => ({ name: t.name, description: t.description ?? "" })));
```

One call, immediately after `tools` is fetched. Same data goes to Anthropic's
`tools` parameter and to the system prompt — they are always identical.

### 3.4 Base prompt cleanup

`buildCorpusBasePrompt()` in `src/lib/corpus-vocabulary.ts`:
- Remove the static `TOOLS:` block entirely.
- Update the `RESPONSE STYLE` bullet that previously referenced specific tool
  names — replace with a generic instruction to offload detail to tools.
- Update the `UI CONTROL` section that previously named `set_theme` and
  `navigate` explicitly — replace with a category-level description
  (`"Some tools (theme switching, in-app navigation)…"`) so no raw tool names
  remain in the base prompt.

### 3.5 SystemPromptBuilder sections (after)

| Key | Source | Priority |
|---|---|---|
| `identity` | `ConfigIdentitySource` → `buildCorpusBasePrompt()` | 10 |
| `tool_manifest` | `ToolRegistry.getSchemasForRole(role)` (live, per-request) | 15 |
| `role_directive` | `DefaultingSystemPromptRepository` → `ROLE_DIRECTIVES` | 20 |
| `user_preferences` | `UserPreferencesDataMapper` | 30 |
| `summary` | `buildSummaryContextBlock()` | 40 |
| `routing` | `buildRoutingContextBlock()` | 50 |
| `task_origin_handoff` | `buildTaskOriginContextBlock()` | 90 |

---

## 4. Role Tool Sets

Derived entirely from `ToolRegistry.getSchemasForRole()`. These are the
canonical sets; the contract tests enforce them.

### ANONYMOUS

| Tool | Description |
|---|---|
| `calculator` | Performs arithmetic. Mandatory for every math calculation. |
| `search_corpus` | Search across all 10 documents (104 sections). |
| `get_corpus_summary` | Get an overview of all 10 documents. |
| `set_theme` | Change the site aesthetic. |
| `adjust_ui` | Adjust UI density or layout. |
| `navigate` | Send the user to a specific route. |

### AUTHENTICATED / STAFF / APPRENTICE

All ANONYMOUS tools, plus:

| Tool | Description |
|---|---|
| `get_section` | Retrieve full section content. |
| `get_checklist` | Actionable checklists from section endings. |
| `list_practitioners` | Find key people referenced in the corpus. |
| `generate_audio` | Generate title + text for TTS. |
| `generate_chart` | Generate a Mermaid diagram rendered inline. |
| `search_my_conversations` | Search your own conversation history. |
| `set_preference` | Save a user preference (tone, style, context). |

Note: `STAFF` and `AUTHENTICATED` share the same tool set. `APPRENTICE` has
the same set as `AUTHENTICATED` after the ghost-tool fix (§1D above).

### ADMIN

All AUTHENTICATED tools, plus:

| Tool | Description |
|---|---|
| `admin_web_search` | Search the live web and return sourced answers. |
| `admin_prioritize_leads` | Rank submitted leads by revenue priority. |
| `admin_prioritize_offer` | Choose the highest-leverage offer to push. |
| `admin_triage_routing_risk` | Flag conversations at risk of bad outcome. |
| `draft_content` | Draft a new blog post or content piece. |
| `publish_content` | Publish a drafted content piece. |

---

## 5. Contract Tests

Three guarantees enforced by `tests/tool-manifest-contract.test.ts`:

### Contract 1 — Manifest equals registry (per role)

```
For every role:
  registry.getSchemasForRole(role).map(t => t.name).sort()
  === names extracted from builder.withToolManifest(schemas).build()
```

Adding a tool to the registry automatically makes it appear in the manifest
for all appropriate roles. No prompt file to update.

### Contract 2 — No ghost tools in manifest (per role)

```
For every tool name in the manifest:
  registry.canExecute(name, role) === true
```

The manifest never describes a tool the role cannot execute.

### Contract 3 — No ghost tools in role directives (per role)

**Scope:** Checks `ROLE_DIRECTIVES[role]` only (the per-role text sections).
It does not scan `buildCorpusBasePrompt()`; the base prompt is covered by the
§3.4 cleanup constraint (no raw tool names in base prompt).

```
For every backtick-quoted identifier in ROLE_DIRECTIVES[role]:
  registry.getToolNames().includes(name) === true    // tool exists
  registry.canExecute(name, role) === true            // role can use it
```

Renaming or removing a tool that is referenced in a role directive causes an
immediate, named test failure:

```
Role directive for APPRENTICE references `search_my_conversations`
but that tool is not allowed for APPRENTICE
```

### Developer workflow

When adding a new tool:
1. Create the tool file with correct `roles` assignment.
2. Register it in `tool-composition-root.ts`.
3. Update the expected name arrays in `tests/core-policy.test.ts` for the
   affected roles.
4. Contract tests pass automatically — no prompt file to update.

When renaming a tool:
1. Update the tool file name and `name` field.
2. If the old name appears in any `ROLE_DIRECTIVES` string, Contract 3 catches it
   by name before the change ships.

---

## 6. Files Changed

| File | Change |
|---|---|
| `src/lib/corpus-vocabulary.ts` | Removed static `TOOLS:` block; made RESPONSE STYLE role-agnostic |
| `src/lib/corpus-vocabulary.test.ts` | Replaced `"preserves existing TOOLS section"` test with assertion that no static tool names exist in base prompt |
| `src/core/use-cases/SystemPromptBuilder.ts` | Added `withToolManifest(schemas)` at priority 15 |
| `src/app/api/chat/stream/route.ts` | Added `builder.withToolManifest(…)` call after `getSchemasForRole(role)` |
| `src/core/use-cases/tools/search-my-conversations.tool.ts` | Added `APPRENTICE` to `roles` array (fixes ghost tool in APPRENTICE directive) |
| `tests/tool-manifest-contract.test.ts` | New — 18 contract tests across all roles |
| `tests/core-policy.test.ts` | Replaced brittle `toHaveLength()` count assertions with explicit sorted name-set assertions per role |

---

## 7. Verification

```bash
npx vitest run tests/tool-manifest-contract.test.ts tests/core-policy.test.ts
# 32 tests, 0 failures

npm run build
# Clean — no type errors
```

### What the contract catches

| Scenario | Contract | Failure message |
|---|---|---|
| New tool registered but not in prompt | 1 | `expected ["…", "new_tool"] to equal ["…"]` |
| Tool in prompt but role can't execute it | 2 | `Tool "X" is in the ROLE manifest but cannot be executed by that role` |
| Role directive references renamed tool | 3 | `Role directive for ROLE references \`old_name\` but no such tool is registered` |
| Role directive references role-restricted tool | 3 | `Role directive for ROLE references \`tool\` but that tool is not allowed for ROLE` |
| Tool added to wrong role set | core-policy | `expected ["…"] to equal ["…"]` with diff showing the unexpected name |

---

## 8. Definition of Done

- [x] Static `TOOLS:` block removed from `buildCorpusBasePrompt()`
- [x] `withToolManifest()` added to `SystemPromptBuilder` at priority 15
- [x] Route wires `getSchemasForRole()` output into both Anthropic `tools` param and manifest
- [x] APPRENTICE ghost tool fixed (`search_my_conversations` added to roles)
- [x] 18 contract tests passing across all roles
- [x] `core-policy.test.ts` upgraded to explicit name-set assertions
- [x] Build clean, no type errors
