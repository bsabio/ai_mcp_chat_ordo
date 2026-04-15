# 12 Prompt Equivalence And Control-Plane Audit
> **Historical snapshot.** This document describes the pre-unification system
> state and was used as research input for the sprint program. For current
> architecture, see `02-post-unification-architecture.md` and
> `04-fully-unified-architecture.md`.
This document maps the difference between:

- stored prompt versions
- runtime fallback content
- config-owned identity overlays
- request-time prompt sections
- control-plane mutation surfaces
- the final prompt text actually sent to a model

The main conclusion is that the repo has prompt versioning, but it does not yet have prompt equivalence.

The effective prompt for a turn is a runtime product assembled from several sources that are not fully visible from either the admin surface or the MCP prompt surface.

## 1. Effective Prompt Is A Runtime Product

The current prompt system is composed from multiple layers.

### 1.1 Stored prompt slots

The database stores versioned prompt rows keyed by:

- `role`
- `prompt_type`
- `version`

Today that store is implemented by `SystemPromptDataMapper` over the `system_prompts` table.

### 1.2 Defaulting layer

The runtime does not use the raw mapper directly when building chat prompts.

It wraps the mapper in `DefaultingSystemPromptRepository`, which means:

- if a DB row exists, runtime uses the active DB version
- if no DB row exists, runtime still returns fallback content

That already means “what runtime can say” is broader than “what the prompt admin UI can list.”

### 1.3 Config identity layer

The base identity content is not just a DB row.

`ConfigIdentitySource` builds it by combining:

- `buildCorpusBasePrompt()`
- instance name substitution when branding differs from the default
- `config/prompts.json` personality text when present

`policy.ts` then caches that result in the module-level `_basePrompt` variable.

This content is runtime-relevant but not versioned in `system_prompts`.

### 1.4 Request-time sections

The builder can append additional prompt sections beyond identity and role directive, including:

- tool manifest
- user preferences
- conversation summary
- routing context
- trusted referral context
- page context
- task-origin or other ad hoc sections

These sections are also runtime-relevant, but they are not represented as prompt-version records.

### 1.5 Use-case-local prompt systems outside the builder

Several model-backed flows do not use the shared chat prompt builder at all:

- summarization uses `SUMMARY_PROMPT`
- blog generation uses task-specific JSON prompts
- admin web search uses raw query plus upstream tool config
- TTS uses plain text input only

So the repository does not have one prompt system. It has one chat prompt builder plus several independent prompt producers.

## 2. Current Effective-Prompt Matrix

| Runtime surface | Base source | Role source | Extra sections | What becomes visible in the control plane |
| --- | --- | --- | --- | --- |
| Main chat stream | `ConfigIdentitySource` through `DefaultingSystemPromptRepository` | Active DB directive or fallback `ROLE_DIRECTIVES` | Page context, user preferences, trusted referral, summary, routing, tool manifest, and other turn-specific sections | Only the DB prompt rows are visible. The final assembled prompt is not stored or surfaced |
| Direct chat turn | Same runtime base source | Same runtime role source | User preferences only | Same visibility limit. The final prompt is not surfaced |
| Live eval runtime | `buildSystemPrompt(role)` or caller-supplied prompt | Same as `buildSystemPrompt(role)` when used | Some scenarios append funnel directives, routing, and page context manually after `buildSystemPrompt(...)` returns | The final eval prompt is returned in eval results, but it is still not the same contract as the admin or MCP prompt surfaces |
| Summarizer | None of the shared chat prompt sources | None | Fixed summarization safety prompt | Not represented in prompt admin or prompt MCP surfaces |
| Blog article pipeline | None of the shared chat prompt sources | None | Task-specific JSON-only system prompts and repair prompt | Not represented in prompt admin or prompt MCP surfaces |
| Admin web search | None of the shared chat prompt sources | None | Raw query plus upstream web-search tool config | Not represented in prompt admin or prompt MCP surfaces |
| TTS | None of the shared chat prompt sources | None | Plain text input | Not represented in prompt admin or prompt MCP surfaces |

## 3. Current Control Planes

| Control plane | Backing source | Operations | Side effects | Default role coverage | What it cannot see |
| --- | --- | --- | --- | --- | --- |
| DB seed data | `SYSTEM_PROMPT_SEEDS` in `seeds.ts` | initial row creation | inserts or refreshes version 1 seed rows | `ALL` base plus directives for `ANONYMOUS`, `AUTHENTICATED`, `STAFF`, and `ADMIN` | Config identity overlay, fallback-only roles, request-time sections |
| Runtime builder | `DefaultingSystemPromptRepository` + `ConfigIdentitySource` + `ROLE_DIRECTIVES` | read effective identity and directive, then append runtime sections | affects actual model requests | all runtime roles, including `APPRENTICE`, because `RoleName` and fallback directives include it | raw version history, mutation history, full final prompt provenance |
| Admin prompt surface | `getSystemPromptDataMapper()` from `RepositoryFactory` | list versions, create version, activate version | `revalidatePath(...)` only | hard-coded role list omits `APPRENTICE` | config overlay, fallback content, prompt-change events, final runtime prompt |
| MCP prompt tools | raw `SystemPromptDataMapper` wired in `embedding-server.ts` plus `ConversationEventRecorder` | list, get, set, rollback, diff | emits `prompt_version_changed` conversation events on set and rollback | default role enumeration omits `APPRENTICE` | config overlay, fallback content, final runtime prompt |

## 4. Prompt Equivalence Gaps

### 4.1 Active DB prompt does not equal effective runtime prompt

The runtime prompt for a chat turn includes more than the active DB row:

- config-built identity text
- fallback behavior when DB rows are missing
- request-time sections like tool manifest and routing

So a row shown in admin is only one ingredient of the effective prompt.

### 4.2 Admin and MCP surfaces operate on the raw mapper, not the defaulting runtime

This is one of the most important current splits.

The runtime uses `DefaultingSystemPromptRepository`, but both control planes use the raw `SystemPromptDataMapper`.

Implications:

- runtime can successfully build a prompt where control-plane reads show missing data
- admin detail views can show empty active content even when runtime still has fallback prompt content
- MCP `prompt_get` can report “no prompt found” in cases where runtime still has a valid fallback prompt

That is a structural non-equivalence, not just a missing feature.

### 4.3 Admin and MCP mutations do not have the same side effects

The admin path:

- creates versions
- activates versions
- revalidates admin pages

The MCP path:

- creates or activates versions
- emits `prompt_version_changed` conversation events
- supports rollback and diff as first-class operations

So the resulting DB state may match, but the operational side effects do not.

### 4.4 `APPRENTICE` is a real runtime role with incomplete control-plane coverage

This is the clearest concrete drift found in the prompt audit.

Current state:

- `RoleName` includes `APPRENTICE`
- `ROLE_DIRECTIVES` includes an `APPRENTICE` fallback directive
- prompt assembly tests exercise `APPRENTICE`
- tool manifests and runtime role handling also include `APPRENTICE`

But the control planes do not match that runtime truth:

- `SYSTEM_PROMPT_SEEDS` does not seed an `APPRENTICE` directive row
- `src/lib/admin/prompts/admin-prompts.ts` omits `APPRENTICE` from the hard-coded role list
- `mcp/prompt-tool.ts` omits `APPRENTICE` from its default role enumeration

That means `APPRENTICE` can be valid runtime prompt state while still being absent from standard prompt administration flows.

### 4.5 Config identity and personality overlays are outside prompt versioning

`ConfigIdentitySource` can change the effective base prompt through:

- instance identity name substitution
- `config/prompts.json` personality text

Those changes:

- do not create `system_prompts` versions
- do not emit `prompt_version_changed`
- are not visible in prompt admin views
- are cached in `_basePrompt` in `policy.ts`

So a behaviorally meaningful base-prompt change can happen without the versioned prompt system noticing.

### 4.6 `buildSystemPrompt(...)` is not the final route prompt contract

`buildSystemPrompt(role)` returns the builder output at that stage.

But the main chat route and some eval flows add more sections later.

That means:

- `buildSystemPrompt(role)` is not equivalent to the actual prompt sent by the main chat route
- prompt debugging based only on `buildSystemPrompt(role)` is incomplete for the main runtime

### 4.7 `prompt_version_changed` is not an effective-prompt event

The event name sounds broader than the current behavior actually is.

In the reviewed code, it means:

- a DB-backed prompt slot changed through the MCP prompt tool

It does not mean:

- config identity changed
- `config/prompts.json` personality changed
- request-time prompt sections changed
- the final effective prompt for a specific turn changed

It is therefore a slot-version event, not a full prompt-provenance event.

## 5. What Currently Works Well

The current prompt system is not empty or purely accidental.

It already has useful structure:

- section-based prompt assembly
- durable versioned rows
- fallback protection for missing DB state
- prompt diff and rollback in the MCP surface
- deterministic tool-manifest assembly tests

The weakness is not the absence of prompt infrastructure.

The weakness is that the repo still treats prompt storage, prompt mutation, and effective prompt construction as different truths.

## 6. Operational Reading

The prompt system is currently best understood as three overlapping layers:

1. a DB-backed slot version system
2. a runtime fallback-and-overlay system
3. a request-time final prompt assembly system

All three matter to behavior.

But only the first layer is well represented in today’s control planes.

That is why the repo can honestly claim to have prompt versioning while still lacking a fully inspectable prompt contract.
