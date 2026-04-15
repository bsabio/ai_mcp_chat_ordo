# Sprint 0 — Dynamic Tool Manifest

> **Goal:** Remove every static tool name from the system prompt. Replace the
> hardcoded `TOOLS:` list with a per-role manifest derived entirely from
> `ToolRegistry.getSchemasForRole()`, then prevent silent regression with
> bidirectional contract tests.
> **Spec ref:** §3, §5, §6, §8
> **Prerequisite:** Tool Architecture Refactoring sprints 0–4 complete

---

## Task 0.1 — Remove static TOOLS block from base prompt

**What:** `buildCorpusBasePrompt()` in `src/lib/corpus-vocabulary.ts` contained
a literal 9-tool list identical for every role. Remove it and clean any other
hardcoded tool names from the same function.

| Item | Detail |
| --- | --- |
| **Edit** | `src/lib/corpus-vocabulary.ts` — delete the `TOOLS:` block from `buildCorpusBasePrompt()` |
| **Edit** | `src/lib/corpus-vocabulary.ts` — update `RESPONSE STYLE` bullet from tool-name-specific to generic |
| **Edit** | `src/lib/corpus-vocabulary.ts` — update `UI CONTROL` section: replace hardcoded `set_theme or navigate` with category-level description |
| **Edit** | `src/lib/corpus-vocabulary.test.ts` — replace `"preserves existing TOOLS section"` test with assertion that no static tool names appear in the base prompt output |
| **Spec** | §3.4 |

### Before (in `buildCorpusBasePrompt()`)

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
…
UI CONTROL:
When you use set_theme or navigate, the tool dispatches a command to the client UI automatically.
```

### After

```
(TOOLS block removed entirely)
…
UI CONTROL:
Some tools (theme switching, in-app navigation) dispatch commands to the client UI automatically.
Do NOT output special command strings — just call the tool and continue your response.
```

### Verify

```bash
# No tool names remain in base prompt
node -e "const {buildCorpusBasePrompt} = require('./src/lib/corpus-vocabulary'); const p = buildCorpusBasePrompt(); ['calculator','set_theme','navigate','get_section','generate_audio'].forEach(t => { if(p.includes(t)) throw new Error('Found '+t) }); console.log('clean');"

npm run build   # passes
```

---

## Task 0.2 — Add withToolManifest() to SystemPromptBuilder

**What:** Add a new method to `SystemPromptBuilder` that accepts the registry
schemas and renders a `TOOLS AVAILABLE TO YOU:` section at priority 15 — after
identity (10) and before role directive (20).

| Item | Detail |
| --- | --- |
| **Edit** | `src/core/use-cases/SystemPromptBuilder.ts` — add `withToolManifest(schemas)` method |
| **Spec** | §3.2 |

### Method signature

```typescript
withToolManifest(schemas: { name: string; description: string }[]): this
```

### Output format

```
TOOLS AVAILABLE TO YOU:
- **calculator**: Performs arithmetic. Mandatory for every math calculation.
- **search_corpus**: Search across all 10 documents (104 sections)…
…

When the user asks what you can do, list these tools by name with a one-line description of each.
```

### Verify

```bash
npm run build   # no type errors
```

---

## Task 0.3 — Wire manifest into the stream route

**What:** In `src/app/api/chat/stream/route.ts`, after `getSchemasForRole(role)`
is called, immediately pass the same schema array to `builder.withToolManifest()`.
This makes the Anthropic `tools` parameter and the system prompt manifest
identical by construction.

| Item | Detail |
| --- | --- |
| **Edit** | `src/app/api/chat/stream/route.ts` — add `builder.withToolManifest(tools.map(...))` immediately after `getSchemasForRole` call |
| **Spec** | §3.3 |

### Code pattern

```typescript
const tools = getToolRegistry().getSchemasForRole(role) as Anthropic.Tool[];
builder.withToolManifest(tools.map(t => ({ name: t.name, description: t.description ?? "" })));
```

### Verify

```bash
npm run build   # passes, no drift possible at runtime
```

---

## Task 0.4 — Fix APPRENTICE ghost tool

**What:** The `APPRENTICE` role directive referenced `` `search_my_conversations` ``
but the tool's `roles` array excluded `APPRENTICE`. Claude was instructing
APPRENTICE users to call a tool that would throw `ToolAccessDeniedError`.

| Item | Detail |
| --- | --- |
| **Edit** | `src/core/use-cases/tools/search-my-conversations.tool.ts` — add `"APPRENTICE"` to the `roles` array |
| **Spec** | §1D |

### Before

```typescript
roles: ["AUTHENTICATED", "STAFF", "ADMIN"],
```

### After

```typescript
roles: ["AUTHENTICATED", "APPRENTICE", "STAFF", "ADMIN"],
```

### Verify

```bash
npx vitest run tests/tool-manifest-contract.test.ts   # Contract 3 passes for APPRENTICE
```

---

## Task 0.5 — Contract tests

**What:** Create `tests/tool-manifest-contract.test.ts` with three guarantees
that enforce dynamic parity between the registry and every prompt surface,
across all roles. These tests must pass on every future change to the registry
or role directives.

| Item | Detail |
| --- | --- |
| **Create** | `tests/tool-manifest-contract.test.ts` |
| **Spec** | §5 |

### Contract test scenarios

| Test ID | Contract | Role | Scenario |
| --- | --- | --- | --- |
| CONTRACT-1-ANON | 1 | ANONYMOUS | Manifest names === `getSchemasForRole("ANONYMOUS")` names |
| CONTRACT-1-AUTH | 1 | AUTHENTICATED | Manifest names === `getSchemasForRole("AUTHENTICATED")` names |
| CONTRACT-1-APP | 1 | APPRENTICE | Manifest names === `getSchemasForRole("APPRENTICE")` names |
| CONTRACT-1-STAFF | 1 | STAFF | Manifest names === `getSchemasForRole("STAFF")` names |
| CONTRACT-1-ADMIN | 1 | ADMIN | Manifest names === `getSchemasForRole("ADMIN")` names |
| CONTRACT-2-ANON | 2 | ANONYMOUS | Every manifest name → `canExecute(name, "ANONYMOUS")` = true |
| CONTRACT-2-AUTH | 2 | AUTHENTICATED | Every manifest name → `canExecute(name, "AUTHENTICATED")` = true |
| CONTRACT-2-APP | 2 | APPRENTICE | Every manifest name → `canExecute(name, "APPRENTICE")` = true |
| CONTRACT-2-STAFF | 2 | STAFF | Every manifest name → `canExecute(name, "STAFF")` = true |
| CONTRACT-2-ADMIN | 2 | ADMIN | Every manifest name → `canExecute(name, "ADMIN")` = true |
| CONTRACT-3-ANON | 3 | ANONYMOUS | All backtick names in ROLE_DIRECTIVES["ANONYMOUS"] exist in registry |
| CONTRACT-3-AUTH | 3 | AUTHENTICATED | All backtick names in ROLE_DIRECTIVES["AUTHENTICATED"] are allowed |
| CONTRACT-3-APP | 3 | APPRENTICE | All backtick names in ROLE_DIRECTIVES["APPRENTICE"] are allowed — catches the `search_my_conversations` bug |
| CONTRACT-3-STAFF | 3 | STAFF | All backtick names in ROLE_DIRECTIVES["STAFF"] are allowed |
| CONTRACT-3-ADMIN | 3 | ADMIN | All backtick names in ROLE_DIRECTIVES["ADMIN"] are allowed |

> **Note:** Contracts 1 and 2 each produce 5 tests (one per role) = 10 tests.
> Contract 3 produces one or two tests per role that has backtick names in
> its directive (exists + canExecute). Total across this sprint: 18 tests.

### Helper functions required

```typescript
// Extract tool names from the TOOLS AVAILABLE TO YOU block in a built prompt
function extractManifestToolNames(prompt: string): string[]

// Extract backtick-quoted identifiers from a role directive string
function extractBacktickNames(text: string): string[]
```

### Verify

```bash
npx vitest run tests/tool-manifest-contract.test.ts   # 18 tests pass
```

---

## Task 0.6 — Upgrade core-policy.test.ts to explicit name-set assertions

**What:** Replace the brittle `toHaveLength()` count assertions in
`tests/core-policy.test.ts` with sorted name-set `toEqual()` assertions per
role. This makes the test a readable registry inventory and ensures any tool
addition or removal is caught with a named diff.

| Item | Detail |
| --- | --- |
| **Edit** | `tests/core-policy.test.ts` — replace `toHaveLength(6)`, `toHaveLength(13)`, `toHaveLength(19)` with explicit sorted arrays |
| **Spec** | §4 |

### Per-role expected sets

**ANONYMOUS** (6 tools):
```typescript
["adjust_ui", "calculator", "get_corpus_summary", "navigate", "search_corpus", "set_theme"]
```

**AUTHENTICATED / STAFF** (13 tools — identical sets):
```typescript
[
  "adjust_ui", "calculator", "generate_audio", "generate_chart",
  "get_checklist", "get_corpus_summary", "get_section",
  "list_practitioners", "navigate", "search_corpus",
  "search_my_conversations", "set_preference", "set_theme",
]
```

**ADMIN** (19 tools):
```typescript
[
  "adjust_ui", "admin_prioritize_leads", "admin_prioritize_offer",
  "admin_triage_routing_risk", "admin_web_search", "calculator",
  "draft_content", "generate_audio", "generate_chart",
  "get_checklist", "get_corpus_summary", "get_section",
  "list_practitioners", "navigate", "publish_content",
  "search_corpus", "search_my_conversations", "set_preference", "set_theme",
]
```

### Verify

```bash
npx vitest run tests/core-policy.test.ts   # all tests pass, counts are explicit
```

---

## Sprint Verify (full)

```bash
npx vitest run tests/tool-manifest-contract.test.ts tests/core-policy.test.ts
# 32 tests, 0 failures

npm run build
# Clean — no type errors
```

### What the contracts catch going forward

| Future change | Contract that catches it |
| --- | --- |
| New tool registered — prompt not updated | Contract 1 (manifest ≠ registry) |
| Tool in prompt that role can't execute | Contract 2 (ghost tool in manifest) |
| Tool renamed — role directive still uses old name | Contract 3 (unregistered backtick name) |
| Tool removed from a role — directive still references it | Contract 3 (canExecute fails) |
| Tool count drifts without explicit review | `core-policy.test.ts` sorted diff |
