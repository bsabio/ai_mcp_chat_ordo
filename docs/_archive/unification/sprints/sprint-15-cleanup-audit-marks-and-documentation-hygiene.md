# Sprint 15 — Cleanup, Audit Marks, and Documentation Hygiene

> **Status:** Complete
> **Goal:** Fix Sprint 14 type regressions, add audit comments to all approved
> `getDb()` call sites, normalize sprint status text, update stale doc references,
> and archive the residual risk register with resolution annotations.
> **Prerequisite:** Sprint 14 complete ✅
> **Estimated scope:** ~25 files touched, zero behavioral changes

## QA Findings Before Implementation

1. **3 type errors in `e2e-catalog-flow.test.ts`** — lines 51, 66, 76 access
   `def.job` and `def.browser` on catalog entries where TypeScript infers a
   narrow per-entry type from the object literal. The `CapabilityDefinition`
   interface declares `job?:` and `browser?:` as optional, but `Object.entries()`
   produces a union of all per-entry literal types, so entries without `job` or
   `browser` cause TS2339. Tests pass at runtime (Vitest 13/13) but fail
   `tsc --noEmit`. This is a Sprint 14 regression.
   - **Error TS2339** at lines 51, 66: Property 'job' does not exist
   - **Error TS2339** at line 76: Property 'browser' does not exist
   - **Fix:** Cast `def` to `CapabilityDefinition` in filter callbacks, or use
     `'job' in def` / `'browser' in def` narrowing.
   - **Current total type errors:** 40 (after fix: 37)

2. **18 approved `getDb()` callers have no in-code audit comments.** The
   approval list lives only in `data-access-canary.test.ts`, not at the call
   sites themselves. Someone reading `auth.ts` or `referral-ledger.ts` has no
   idea why `getDb()` is acceptable there.

   Files (18 total):
   - **Raw SQL route handlers (3):** `affiliates/[userId]/route.ts`,
     `routing-review/route.ts`, `qr/[code]/route.ts`
   - **Raw SQL lib modules (6):** `admin-attribution.ts`, `admin-leads.ts`,
     `admin-search.ts`, `auth.ts`, `embed-conversation.ts`, `resolve-user.ts`
   - **Search (1):** `search-pipeline.ts`
   - **Request-scoped grouping (1):** `conversation-root.ts`
   - **Operator helpers (2):** `operator-loader-helpers.ts`, `admin-review-loaders.ts`
   - **Raw SQL + DataMapper mix (1):** `prompt-control-plane-service.ts`
   - **Referral modules — default parameter + raw SQL (4):** `admin-referral-analytics.ts`,
     `referral-analytics.ts`, `referral-ledger.ts`, `referral-resolver.ts`

3. **Sprint 0 status says "Implemented on 2026-04-11"** and Sprint 1 says
   "Implemented" while all others say "Complete."

4. **`spec.md` status says "Ready for implementation"** — program is well past that.

5. **Sprint 8 residual risk register** has 11 items. Three are resolved:
   - Item #3 (role directives not catalog-derived) → resolved by Sprint 13
     `assembleRoleDirective()`
   - Item #7 (legacy getDb() callers) → resolved by Sprint 9 data-access migration
   - Item #11 (analytics-tool.ts mixed concerns) → resolved by Sprint 11
     domain/transport split
   No resolution annotations exist. The register has no "Resolved" or "Status"
   column — resolution must be added.

6. **15 research docs need staleness banners.** All numbered docs except
   `02-post-unification-architecture.md` and `04-fully-unified-architecture.md`
   (which describe current state). This includes `02-problem-catalog.md` which
   describes the original 9 problems.

   Docs needing banner:
   `01`, `02-problem-catalog`, `03`, `04-capability-unification`, `05`, `06`,
   `07`, `08`, `09`, `10`, `11`, `12`, `13`, `14`, `15`

7. **Doc 14** (`14-concrete-runtime-interface-set.md`) has **zero**
   implementation-status annotations. All 3 proposed interfaces
   (`PromptRuntime`, `ProviderRuntime`, `PromptControlPlaneService`) need
   annotating with their actual implementation status.

## Tasks

1. **Fix e2e-catalog-flow.test.ts type errors (3 errors → 0)**
   - At line 51: change `def.job !== undefined` to
     `(def as CapabilityDefinition).job !== undefined` (or use `'job' in def`)
   - At line 66: same pattern for `def.job === undefined`
   - At line 76: change `def.browser !== undefined` to
     `(def as CapabilityDefinition).browser !== undefined`
   - Import `CapabilityDefinition` from `capability-definition.ts`
   - Verify: `npx tsc --noEmit | grep "e2e-catalog-flow"` returns nothing
   - Verify: total error count drops from 40 to 37

2. **Add audit comments to 18 approved `getDb()` call sites**
   - Each `getDb()` call in an approved file gets a comment on the line above:
     `// getDb() approved: <reason> — see data-access-canary.test.ts (Sprint 9)`
   - Reasons by category:
     - "raw SQL route handler" (3 files)
     - "raw SQL query" (6 files)
     - "search pipeline raw SQL" (1 file)
     - "intentional request-scoped grouping (Sprint 6)" (1 file)
     - "operator raw SQL helpers" (2 files)
     - "raw SQL + DataMapper mix" (1 file)
     - "referral default parameter + raw SQL" (4 files)

3. **Normalize sprint status text**
   - Sprint 0: "Implemented on 2026-04-11" → "Complete"
   - Sprint 1: "Implemented" → "Complete"

4. **Update spec.md**
   - Status line: "Ready for implementation" →
     "Complete — Phase 1, Phase 2 finished. Phase 3 planned."
   - Add note referencing `04-fully-unified-architecture.md` as the
     canonical post-program architecture document

5. **Archive residual risk register**
   - Add a "Resolution" column to each table
   - Item #3: "✅ Resolved — Sprint 13 `assembleRoleDirective()` from catalog"
   - Item #7: "✅ Resolved — Sprint 9 data-access migration + canary test"
   - Item #11: "✅ Resolved — Sprint 11 `analytics-domain.ts` / `analytics-tool.ts` split"
   - Items #9, #10: "Planned — Sprint 16 provider instrumentation"
   - Items #1, #2, #4, #5, #6, #8: "Accepted — documented in `04-fully-unified-architecture.md`"
   - Add archive banner: "Archived post-Phase 2. See also `04-fully-unified-architecture.md`
     for the final resolution matrix."

6. **Add staleness banner to 15 research docs**
   - Add to each (after the title, before the first paragraph):
     ```
     > **Historical snapshot.** This document describes the pre-unification system
     > state and was used as research input for the sprint program. For current
     > architecture, see `02-post-unification-architecture.md` and
     > `04-fully-unified-architecture.md`.
     ```
   - Apply to: `01`, `02-problem-catalog`, `03`, `04-capability-unification`,
     `05`, `06`, `07`, `08`, `09`, `10`, `11`, `12`, `13`, `14`, `15`
   - Do NOT apply to: `02-post-unification-architecture.md`,
     `04-fully-unified-architecture.md`

7. **Annotate Doc 14 implementation status**
   - Add a new section "## Implementation Status" (or annotate inline):
   - `PromptRuntime` → "✅ Implemented:
     `src/lib/chat/prompt-runtime.ts` — `build()` returns
     `PromptRuntimeResult { text, slotRefs, sections, warnings }`.
     Used by chat route and eval flows."
   - `ProviderRuntime` → "⚠️ Partial: Only `resolveProviderPolicy()` exists
     in `src/lib/chat/provider-policy.ts`. `runTurn` and `runStream` methods
     from §4.2 were not implemented. Provider policy unification was achieved
     at the function level, not the facade level. Sprint 16 creates a thin
     `ProviderRuntime` facade."
   - `PromptControlPlaneService` → "✅ Implemented:
     `src/lib/prompts/prompt-control-plane-service.ts` — used by admin
     (`admin-prompts-actions.ts`) and MCP (`prompt-tool.ts`). Emits
     `prompt_version_changed` events from both surfaces."

## Out of Scope

- Any behavioral code changes
- New test logic (the e2e fix is type-only)
- Changing how `getDb()` callers actually work
- Adding new acceptance tests to the QA runner

## Acceptance Criteria

| # | Criterion | Verification |
| --- | --- | --- |
| AC1 | `tsc --noEmit` reports ≤37 errors (down from 40) | `npx tsc --noEmit 2>&1 \| grep "error TS" \| wc -l` |
| AC2 | All 18 approved `getDb()` files have audit comments | `grep -c "getDb.*approved\|getDb.*Sprint 9" <file>` > 0 for each |
| AC3 | All 15 sprint docs (0–14) say "Complete" | `grep "Status:" sprint-*.md` |
| AC4 | `spec.md` says "Complete" | `grep "Status:" spec.md` |
| AC5 | Risk register has resolution annotations for #3, #7, #11 | `grep "Resolved" sprint-8-residual-risk-register.md` |
| AC6 | 15 research docs have staleness banners | `grep -c "Historical snapshot" docs/_refactor/unification/[0-9]*.md` = 15 |
| AC7 | Doc 14 has implementation-status annotations | `grep "Implemented\|Partial" 14-concrete-runtime-interface-set.md` |

## Verification

```bash
# AC1: Type errors
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l  # expect ≤37

# AC2: Audit comments
for f in auth.ts conversation-root.ts referral-ledger.ts; do
  grep -c "getDb.*approved\|getDb.*Sprint 9" $(find src -name "$f" -not -path "*.test.*") 
done

# AC3: Sprint statuses
grep "Status:" docs/_refactor/unification/sprints/sprint-{0,1,2,3,4,5,6,7,8,9}*.md \
  docs/_refactor/unification/sprints/sprint-1[0-4]*.md | grep -v Complete

# AC4-AC7: Doc verification
grep "Status:" docs/_refactor/unification/spec.md
grep -c "Resolved" docs/_refactor/unification/artifacts/sprint-8-residual-risk-register.md
grep -c "Historical snapshot" docs/_refactor/unification/[0-9]*.md
grep -c "Implemented\|Partial" docs/_refactor/unification/14-concrete-runtime-interface-set.md

# Full QA: unification suite unchanged
npm run qa:unification  # expect 191 tests, 14 files
```
