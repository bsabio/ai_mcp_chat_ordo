# Sprint 14 — Full Unification Closeout and Public Release Hardening

> **Status:** Complete
> **Goal:** Final cleanup sprint: resolve any remaining pre-existing type errors,
> ensure full catalog-driven end-to-end flow, update all operational docs,
> and produce the final architecture deep-dive confirming zero fragmentation.
> **Prerequisite:** Sprints 9-13 complete ✅ (all verified)
> **Estimated scope:** Documentation + cleanup + final verification

## QA Findings Before Implementation

### Prerequisite status

All 5 prerequisite sprints are complete and verified:

| Sprint | Status | Key deliverable |
| --- | --- | --- |
| 9 — Data Access Migration | ✅ Complete | 33 `getDb()` callers → RepositoryFactory |
| 10 — Capability Catalog Expansion | ✅ Complete | 4 → 55+ catalog entries |
| 11 — MCP Domain/Transport Separation | ✅ Complete | analytics-tool.ts split, catalog mcpExport wired |
| 12 — Registry Convergence | ✅ Complete | 3 registries → catalog-driven projection |
| 13 — Prompt Directive Unification | ✅ Complete | 105-line ROLE_DIRECTIVES → 18-line assembler |

### Type error inventory (current state)

45 total type errors (all pre-existing, none from unification work):

**8 non-test source errors:**

| File | Error | Category |
| --- | --- | --- |
| `MediaRenderCard.tsx:73` | `unknown` not assignable to `ReactNode` | React types |
| `default-tool-registry.ts:20` | Function not assignable to `ToolComponent` | React types |
| `admin-prompts-actions.ts:32` | `string` not assignable to `PromptSlotType` | DB read narrowing |
| `admin-prompts-actions.ts:62` | `string` not assignable to `PromptSlotType` | DB read narrowing |
| `prompt-runtime.ts:449` | Implicit `any` indexing `Record<RoleName, string>` | Index signature |
| `deferred-job-handlers.ts:130` | `percent` not in `DeferredJobProgressUpdate` | Stale property |
| `ffmpeg.worker.ts:95` | `Uint8Array` not assignable to `BlobPart` | Web API types |
| `referral-ledger.ts:68` | Cannot find name `ConversationDataMapper` | Missing import |

**37 test-file errors:** All in UI component `.test.tsx` files (mock type mismatches).

### Operational docs that need updating

| Doc | Location | Current state |
| --- | --- | --- |
| `system-architecture.md` | `docs/operations/system-architecture.md` | Section 13 covers Sprints 4-7 only. Needs Sprints 9-13. |
| `release-gates-and-evidence.md` | `docs/operations/release-gates-and-evidence.md` | No mention of Sprint 9+. Needs Phase 2 gate entries. |
| `02-post-unification-architecture.md` | `docs/_refactor/unification/` | Covers Sprints 0-8 only. Needs Phase 2 addendum. |
| `docs/README.md` | `docs/README.md` | References architecture docs correctly. May need minor updates. |

> [!IMPORTANT]
> The original Sprint 14 doc referenced `system-architecture.md` as if it were
> in the unification directory. It is actually at `docs/operations/system-architecture.md`.
> Similarly, `release-gates-and-evidence.md` exists at `docs/operations/`.

### Architecture doc numbering

| File | Content | Created by |
| --- | --- | --- |
| `01-current-state-architecture.md` | Pre-unification state | Phase 1 research |
| `02-post-unification-architecture.md` | Post-Sprint-8 state | Sprint 8 closeout |
| `02-problem-catalog.md` | 9 fragmentation problems | Phase 1 research |
| `03-target-architecture.md` | Target architecture vision | Phase 1 research |

> [!WARNING]
> The original Sprint 14 doc said "Produce `03-fully-unified-architecture.md`"
> but `03-target-architecture.md` already exists. The final architecture
> deep-dive should be a NEW file: `04-fully-unified-architecture.md` or
> update `02-post-unification-architecture.md` with a Phase 2 addendum.

### Problem catalog vs "6 fragmentation areas"

The original Sprint 14 doc said "confirm all 6 fragmentation areas are resolved."
The actual problem catalog (`02-problem-catalog.md`) lists **9 problems**:

| # | Problem | Resolution |
| --- | --- | --- |
| P1 | No Single Capability Source of Truth | ✅ Sprints 5, 10, 12 |
| P2 | App Chat Not MCP-First (narrative divergence) | ✅ Sprints 7, 11 |
| P3 | Provider Creation Duplicated | ✅ Sprint 4 |
| P4 | Prompt Ownership Split | ✅ Sprints 1, 2, 13 |
| P5 | MCP Server Boundary Too Broad | ✅ Sprints 7, 11 |
| P6 | Heavy Seam Mocking Hides Contract Drift | ✅ Sprints 3, 6 |
| P7 | Prompt/UI Capability Info Not Unified | ✅ Sprints 10, 12, 13 |
| P8 | Admin Paths Don't Reuse Domain Workflow | ⚠️ Partially (Sprint 1, 9) |
| P9 | Architecture Better Than Unified (meta) | ✅ All sprints |

## Tasks

1. **Type error remediation**
   - Fix or formally triage the 8 non-test source errors listed above
   - Fix or formally triage the 37 test-file type errors
   - Verify zero errors across all `core/`, `adapters/`, `lib/` source files
   - Note: `.next/` generated types are excluded by convention

2. **End-to-end catalog flow verification**
   - Add integration test: catalog entry → ToolDescriptor → presentation card
     → job capability → prompt directive (full pipeline)
   - Verify that adding a new catalog entry automatically appears in all
     downstream registries (presentation, job, browser, prompt directive)
   - Test that removing a promptHint facet removes the directive from
     `assembleRoleDirective()` output

3. **Operational documentation update**
   - Expand Section 13 of `docs/operations/system-architecture.md` to cover
     Sprints 9-13 (data access migration, full catalog, MCP separation,
     registry convergence, prompt directive unification)
   - Add Phase 2 gate entries to `docs/operations/release-gates-and-evidence.md`
   - Add Phase 2 addendum to `docs/_refactor/unification/02-post-unification-architecture.md`
   - Review `docs/README.md` for any stale architecture references

4. **Final architecture deep-dive**
   - Produce `docs/_refactor/unification/04-fully-unified-architecture.md`
   - Compare against `01-current-state-architecture.md` (pre-unification)
     and `02-post-unification-architecture.md` (post-Sprint-8)
   - Confirm all 9 fragmentation problems from `02-problem-catalog.md` are
     resolved or formally documented as accepted residual

5. **Program closeout**
   - Update `sprints/README.md` with final program status (Phase 2 COMPLETE)
   - Record any new residual risks
   - Run full release-gate ladder (`npm run quality`)

## Out of Scope

- Fixing pre-existing test type errors that don't affect runtime
- Adding new features or capabilities to the catalog
- Changing the catalog's data model or projection interfaces
- Prompt versioning or A/B testing infrastructure

## Acceptance Criteria

1. Zero type errors across all non-test source files (excluding `.next/`).
2. Full catalog-driven flow proven by end-to-end integration test.
3. `docs/operations/system-architecture.md` Section 13 covers Sprints 9-13.
4. `docs/operations/release-gates-and-evidence.md` has Phase 2 entries.
5. Final architecture deep-dive confirms all 9 problems from the problem
   catalog are resolved or accepted as residual.
6. `sprints/README.md` shows Phase 2 COMPLETE status.

## Verification

- `npm run qa:unification` passes (190+ tests)
- `npx tsc --noEmit` reports zero non-test errors (excluding .next/)
- All 9 fragmentation problems mapped to resolution evidence

## QA Closeout

### Acceptance Criteria Results

| # | Criterion | Result |
| --- | --- | --- |
| 1 | Zero non-test source type errors | ✅ 0 (was 8) |
| 2 | End-to-end catalog flow test | ✅ 13 tests in e2e-catalog-flow.test.ts |
| 3 | system-architecture.md covers Sprints 9-14 | ✅ Section 13 expanded |
| 4 | release-gates-and-evidence.md Phase 2 entries | ✅ 7 new gate entries |
| 5 | Final architecture deep-dive | ✅ 04-fully-unified-architecture.md |
| 6 | README.md COMPLETE status | ✅ "COMPLETE — Phase 1 and Phase 2 both finished" |

### Files Changed

| File | Change |
| --- | --- |
| `admin-prompts-actions.ts` | FIX: Cast promptType to PromptSlotType |
| `prompt-runtime.ts` | FIX: Cast role to keyof typeof ROLE_DIRECTIVES |
| `deferred-job-handlers.ts` | FIX: Rename percent→progressPercent, phaseLabel→progressLabel |
| `ffmpeg.worker.ts` | FIX: Cast Uint8Array to BlobPart |
| `referral-ledger.ts` | FIX: Add missing ConversationDataMapper import |
| `MediaRenderCard.tsx` | FIX: Use != null check for unknown type |
| `default-tool-registry.ts` | FIX: Wrap MediaRenderCard in ToolComponent adapter |
| `e2e-catalog-flow.test.ts` | NEW: 13 end-to-end pipeline tests |
| `run-unification-qa.ts` | Updated: Sprint 14 test + count |
| `system-architecture.md` | Updated: Section 13 covers Sprints 0-14 |
| `release-gates-and-evidence.md` | Updated: Phase 2 gate entries |
| `02-post-unification-architecture.md` | Updated: Phase 2 completions |
| `04-fully-unified-architecture.md` | NEW: Final architecture deep-dive |
| `sprints/README.md` | Updated: COMPLETE status |

### Metrics

| Metric | Before | After |
| --- | --- | --- |
| Non-test type errors | 8 | 0 |
| Total type errors | 45 | 37 |
| qa:unification tests | 178 | 191 |
| qa:unification files | 13 | 14 |
| Program status | Phase 2 IN PROGRESS | COMPLETE |
