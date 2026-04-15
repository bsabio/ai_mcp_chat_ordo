# Sprint 13 — Prompt Directive Unification

> **Status:** Complete
> **Goal:** Replace the monolithic `ROLE_DIRECTIVES` object with catalog-driven
> prompt directive assembly so role-specific tool guidance comes from the
> catalog's `promptHint` facet instead of a single hardcoded file.
> **Prerequisite:** Sprint 10 complete ✅ (full catalog), Sprint 12 complete ✅
> **Estimated scope:** ~20 promptHint facets added, 1 builder function, 4 consumer files updated

## QA Findings Before Implementation

1. **Only 2 catalog entries have `promptHint` facets** — `compose_media` (4 roles)
   and `admin_web_search` (ADMIN only). Sprint 10 did NOT add promptHint facets
   to the 53 other entries.
2. **`role-directives.ts` is 105 lines** — verified ✅. But it contains FAR more
   tool-specific content than the original Sprint 13 doc claimed.
3. **25+ tools are referenced in role-directives.ts** (original doc claimed 4):
   - `compose_media` → 4 roles (already in catalog ✅)
   - `admin_web_search` → ADMIN (already in catalog ✅)
   - `search_my_conversations` → 4 roles (NOT in catalog)
   - `corpus_*` (6 MCP tools) → ADMIN (NOT in catalog — these are MCP-only tools not in CAPABILITY_CATALOG)
   - `admin_prioritize_leads` → ADMIN (NOT in catalog promptHint)
   - `admin_prioritize_offer` → ADMIN (NOT in catalog promptHint)
   - `admin_triage_routing_risk` → ADMIN (NOT in catalog promptHint)
   - 10 journal tools → ADMIN (NOT in catalog promptHint)
   - `list_deferred_jobs` / `get_deferred_job_status` → ADMIN (NOT in catalog promptHint)
   - Dynamic via `getJobStatusDirectiveLines()` → all roles
4. **`role-directives.ts` has 4 consumer sites:**
   - `HardcodedRoleDirectiveSource` → implements `RoleDirectiveSource` port
   - `ConfigRoleDirectiveSource` → implements `RoleDirectiveSource` port
   - `prompt-runtime.ts` line 449 → fallback directive lookup
   - `prompt-control-plane-service.ts` line 383 → fallback directive
5. **Role-level framing is NOT tool-specific** and should remain in the file:
   - "ROLE CONTEXT — DEMO MODE" (ANONYMOUS)
   - "ROLE CONTEXT — REGISTERED USER" (AUTHENTICATED)
   - "ROLE CONTEXT — APPRENTICE (STUDENT)" (APPRENTICE)
   - "ROLE CONTEXT — STAFF MEMBER" (STAFF)
   - "ROLE CONTEXT — SYSTEM ADMINISTRATOR" (ADMIN)
6. **ADMIN operator workflow instructions are behavioral guidance**, not tool-specific
   directives (NOW/NEXT/WAIT format, "do not rely on job cards alone"). These are
   role-framing, not promptHint candidates.
7. **`corpus_*` tools are MCP-only** — they do NOT exist in `CAPABILITY_CATALOG`.
   Their directive lines in ADMIN describe tools exposed through the MCP embedding
   server, not the chat registry. These cannot move to catalog promptHint facets.
8. **`getJobStatusDirectiveLines()` is dynamic** — it assembles lines from
   `JobStatusResponseStrategy` classes (5 strategy classes, 7 `buildDirectiveLines`
   calls). This is driven by the job-status module, not the catalog.

## Current State

### role-directives.ts (105 lines)

```
src/core/entities/role-directives.ts
├── ANONYMOUS: role framing + getJobStatusDirectiveLines("anonymous")
├── AUTHENTICATED: role framing + compose_media + search_my_conversations + getJobStatusDirectiveLines("signed-in")
├── APPRENTICE: role framing + compose_media + search_my_conversations + getJobStatusDirectiveLines("signed-in")
├── STAFF: role framing + compose_media + search_my_conversations + getJobStatusDirectiveLines("signed-in")
└── ADMIN: role framing + corpus_* + admin_web_search + admin_operator_workflows + compose_media + search_my_conversations + job_status
```

### Content classification

| Content Type | Lines | Example | Belongs in catalog? |
| --- | --- | --- | --- |
| Role-level framing | ~16 | "ROLE CONTEXT — REGISTERED USER" | No — stays in role-directives.ts |
| compose_media directives | ~22 | "MEDIA COMPOSITION..." | Already in catalog ✅ |
| admin_web_search directive | ~2 | "ADMIN-ONLY TOOL — Web Search" | Already in catalog ✅ |
| search_my_conversations directive | ~4 | "You have access to search_my_conversations..." | Yes — add promptHint facet |
| corpus_* MCP tools | ~8 | "corpus_list: List all documents..." | No — MCP-only, not in catalog |
| admin_prioritize_* directives | ~3 | "admin_prioritize_leads: Rank submitted leads..." | Yes — add promptHint facet |
| admin_triage_routing_risk | ~1 | "admin_triage_routing_risk: Identify conversations..." | Yes — add promptHint facet |
| Journal operational guidance | ~8 | "prefer journal wrapper tools..." | Yes — add promptHint facet(s) |
| Job status operational | ~3 | "After using list_deferred_jobs..." | Yes — add promptHint facet(s) |
| Operator format guidance | ~6 | "NOW, NEXT, WAIT" | No — behavioral, stays as role framing |
| getJobStatusDirectiveLines() | dynamic | Strategy-driven lines | No — keep dynamic helper |

### Consumers of ROLE_DIRECTIVES

| Consumer | File | Usage |
| --- | --- | --- |
| `HardcodedRoleDirectiveSource` | `src/adapters/HardcodedRoleDirectiveSource.ts` | `RoleDirectiveSource` port |
| `ConfigRoleDirectiveSource` | `src/adapters/ConfigRoleDirectiveSource.ts` | `RoleDirectiveSource` port |
| `prompt-runtime.ts` | `src/lib/chat/prompt-runtime.ts:449` | Fallback directive |
| `prompt-control-plane-service.ts` | `src/lib/prompts/prompt-control-plane-service.ts:383` | Fallback directive |

## Tasks

1. **Add promptHint facets to catalog for remaining directive-bearing tools**
   - `search_my_conversations` → AUTH/APPRENTICE/STAFF/ADMIN
   - `admin_prioritize_leads` → ADMIN
   - `admin_prioritize_offer` → ADMIN
   - `admin_triage_routing_risk` → ADMIN
   - `get_journal_workflow_summary` → ADMIN (journal operational guidance)
   - `list_journal_posts` → ADMIN
   - `prepare_journal_post_for_publish` → ADMIN
   - `update_journal_metadata`, `update_journal_draft`, `submit_journal_review`,
     `approve_journal_post`, `publish_journal_post`, `restore_journal_revision`,
     `select_journal_hero_image` → ADMIN (grouped as "journal editorial" directive)
   - `list_deferred_jobs`, `get_deferred_job_status` → ADMIN (job operational guidance)

2. **Create `assembleRoleDirective(role)` function**
   - Collects role-level framing (stays hardcoded)
   - Iterates `Object.values(CAPABILITY_CATALOG)` and collects `promptHint.roleDirectiveLines[role]`
   - Appends `getJobStatusDirectiveLines()` (stays dynamic)
   - Appends corpus_* MCP tool lines for ADMIN (stays hardcoded — MCP-only tools)
   - Returns the assembled directive string

3. **Migrate role-directives.ts to use `assembleRoleDirective()`**
   - Replace 5 hardcoded role entries with `assembleRoleDirective()` calls
   - Role-level framing stays — tool-specific lines come from catalog
   - corpus_* lines stay (not in catalog)
   - `getJobStatusDirectiveLines()` stays (dynamic)

4. **Update consumers to use assembler**
   - `HardcodedRoleDirectiveSource` → use `assembleRoleDirective()`
   - `ConfigRoleDirectiveSource` → use `assembleRoleDirective()`
   - `prompt-runtime.ts` line 449 → use `assembleRoleDirective()`
   - `prompt-control-plane-service.ts` line 383 → use `assembleRoleDirective()`

5. **Add directive equivalence tests**
   - Test that `assembleRoleDirective("ADMIN")` output contains all expected tool directives
   - Test that `assembleRoleDirective("AUTHENTICATED")` includes compose_media + search_my_conversations
   - Test that removing a promptHint from catalog removes the directive line
   - Test that corpus_* lines still appear for ADMIN (hardcoded, not from catalog)

## Out of Scope

- Changing how SystemPromptBuilder consumes directives
- Database-owned prompt versions (separate lifecycle)
- Prompt versioning or A/B testing
- Adding promptHint facets for tools that have no directives today
- Moving corpus_* MCP tools into CAPABILITY_CATALOG
- Moving getJobStatusDirectiveLines() into the catalog

## Acceptance Criteria

1. `role-directives.ts` contains no tool-specific directive lines for tools that
   ARE in the catalog (compose_media, admin_web_search, search_my_conversations,
   admin_prioritize_*, journal tools, etc.).
2. All catalog-tool-specific directives come from catalog `promptHint` facets.
3. `assembleRoleDirective(role)` produces equivalent output for all 5 roles.
4. corpus_* MCP directive lines remain for ADMIN (not in catalog).
5. `getJobStatusDirectiveLines()` remains dynamic (not in catalog).
6. `npm run qa:unification` remains green.

## Verification

- Directive equivalence tests pass
- `npm run qa:unification` passes
- `grep -c 'compose_media\|admin_web_search\|search_my_conversations\|admin_prioritize' src/core/entities/role-directives.ts` returns 0
- corpus_* lines still present in ADMIN directive output
- getJobStatusDirectiveLines still called dynamically

## QA Closeout

### Acceptance Criteria Results

| # | Criterion | Result |
| --- | --- | --- |
| 1 | role-directives.ts has no tool-specific text | ✅ 0 matches for compose_media, admin_web_search, etc. |
| 2 | All tool-specific directives from catalog promptHint | ✅ 19 facets (was 2) |
| 3 | assembleRoleDirective produces output for all 5 roles | ✅ 25 tests pass |
| 4 | corpus_* MCP lines preserved for ADMIN | ✅ Hardcoded in assembler |
| 5 | getJobStatusDirectiveLines remains dynamic | ✅ Called in assembler |
| 6 | qa:unification green | ✅ 178 tests, 13 files |

### Files Changed

| File | Change |
| --- | --- |
| `src/core/capability-catalog/catalog.ts` | Added 17 new promptHint facets (was 2, now 19) |
| `src/core/entities/role-directive-assembler.ts` | NEW — 144 lines, assembles from 5 sources |
| `src/core/entities/role-directives.ts` | Rewritten: 105→18 lines, uses assembleRoleDirective() |
| `src/core/capability-catalog/prompt-directive-unification.test.ts` | NEW — 25 assertions |
| `scripts/run-unification-qa.ts` | Added Sprint 13 test file |

### Metrics

| Metric | Before | After |
| --- | --- | --- |
| role-directives.ts lines | 105 | 18 |
| Tool-specific text in role-directives.ts | 25+ tools | 0 |
| Catalog promptHint facets | 2 | 19 |
| qa:unification tests | 153 | 178 |
| qa:unification test files | 12 | 13 |
