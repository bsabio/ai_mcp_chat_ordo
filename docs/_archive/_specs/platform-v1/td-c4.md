# TD-C4 — Technical Debt: Convergence Closure and Canonical Vocabulary

> **Parent spec:** [Platform V1](spec.md) §9.4
> **Scope:** Track and close the remaining convergence work after TD-C3: collapsing compatibility layers, standardizing business vocabulary, replacing brittle migration-era architecture assertions with contract-level tests, clearing residual typecheck issues, and verifying the repo end to end.
> **Depends On:** [TD-C3](td-c3.md) — in progress / partially landed
> **Purpose:** This document is the canonical memory artifact for the remaining cleanup. It records the architectural decisions, workstreams, validation gates, and completion criteria until convergence is actually finished.

---

## §1 How To Use This Document

This file is not a one-time audit. It is the working ledger for the remaining convergence cleanup.

Use it to:

1. Record each remaining architectural idea as a concrete work item.
2. Mark which items are still migration guardrails versus permanent architecture.
3. Define the canonical vocabulary so future edits do not reintroduce drift.
4. Track exit criteria so compatibility layers are removed instead of lingering.
5. Keep implementation, validation, and documentation aligned while the work is in flight.

Status values used below:

| Status | Meaning |
| --- | --- |
| `Open` | Not yet started or not yet verified |
| `In Progress` | Active work is underway |
| `Blocked` | Cannot proceed without resolving a dependency or new failure |
| `Done` | Code, tests, and docs agree that the item is finished |

---

## §2 Current Position

TD-C4 is complete. The repo has crossed from transitional convergence into the canonical operator-owned state.

Known current position:

| Area | Current state |
| --- | --- |
| Focused convergence status | Canonical operator convergence slice passed (`98/98`) |
| Compatibility cleanup | Obsolete `src/lib/dashboard/` compatibility files were deleted after their callers were removed |
| Vocabulary convergence | Active runtime and tests now target `operator` and `task-origin-handoff` as the canonical vocabulary |
| Architecture tests | Core convergence tests now validate the canonical operator surface and deleted compatibility boundary instead of preserving shim files |
| Repo validation | `npm run quality` and `npm run build` passed after the convergence cleanup and repo-level lint fixes |

This work closed the convergence rather than extending it. The remaining dashboard references are historical documentation only.

---

## §3 Canonical Decisions

These decisions should govern every remaining refactor in this stream.

### §3.1 Canonical business vocabulary

1. `operator` is the canonical active term for the operator-facing orchestration surface.
2. `task-origin-handoff` is the canonical handoff term.
3. `dashboard` is legacy vocabulary. It should remain only inside explicitly temporary compatibility shims or historical docs that have not yet been migrated.
4. A business concept should have one canonical name in active code, tests, and docs. Short-term broad renames are preferable to long-term synonym drift.

### §3.2 Compatibility-layer policy

1. Compatibility layers are temporary migration devices, not permanent architecture.
2. Once all callers are moved, the compatibility layer should be collapsed immediately.
3. If a dashboard-named module still exists, its role must be explicit:
   - temporary shim,
   - historical doc reference, or
   - unresolved migration debt tracked in this file.
4. No new business logic should be added to a compatibility shim.

### §3.3 Architecture-test policy

1. Behavior and public contracts are the preferred long-term testing surface.
2. File-string assertions are acceptable only as temporary migration guardrails.
3. When a convergence area stabilizes, replace string-based structure checks with behavior tests, public API assertions, and boundary-level contract coverage.
4. Keep only the minimum structural audits necessary to prevent obvious regression of the convergence boundary.

---

## §4 Master Workstreams

### W1 — Collapse remaining compatibility layers

| Field | Detail |
| --- | --- |
| Status | `Done` |
| Why it matters | Transitional dashboard seams will keep reintroducing ambiguity and accidental coupling if they remain after callers are gone. |
| Primary goal | Move the remaining preserved implementation to canonical operator-owned modules and reduce dashboard-named modules to thin shims, then delete those shims when the last caller is removed. |

Concrete actions:

1. Inventory every active import that still targets dashboard-named modules.
2. Classify each dashboard file as one of:
   - still-active implementation,
   - temporary compatibility shim,
   - dead code safe to delete.
3. Finish retargeting operator-owned copied modules so they no longer import dashboard-local helpers, contracts, or shared barrels.
4. Convert residual dashboard modules to pure re-export shims where compatibility is still required.
5. Delete compatibility shims as soon as no active callers remain.

Priority candidates to verify during this workstream:

1. `src/lib/dashboard/dashboard-loaders.ts`
2. `src/lib/dashboard/dashboard-shared.ts`
3. `src/lib/dashboard/dashboard-contracts.ts`
4. `src/lib/dashboard/dashboard-helpers.ts`
5. `src/lib/dashboard/dashboard-types.ts`
6. `src/lib/dashboard/loaders/*`
7. `src/lib/operator/*` copies that may still carry dashboard-local imports

Exit criteria:

1. No active runtime path depends on dashboard-named implementation modules.
2. Any remaining dashboard files are either clearly documented shims or historical artifacts.
3. No new business logic lives in dashboard compatibility modules.
4. Deletion of the final shim set is explicitly tracked and completed.

### W2 — Enforce one canonical vocabulary per business concept

| Field | Detail |
| --- | --- |
| Status | `Done` |
| Why it matters | Mixed terminology makes the codebase harder to reason about and encourages duplicate abstractions around the same concept. |
| Primary goal | Standardize code, tests, and docs on one business term per concept and remove legacy synonyms from active paths. |

Concrete actions:

1. Define the canonical term for each active concept before renaming.
2. Create a rename map for residual legacy terms.
3. Apply broad renames in a focused burst rather than dragging them across many unrelated changes.
4. Update tests, docs, and public barrels in the same change set so naming stays coherent.
5. Preserve backward-compatible exports only when there is a real caller that still needs them.

Initial rename map to drive review:

| Legacy or drifting term | Canonical term |
| --- | --- |
| `dashboard` in active operator-facing code | `operator` |
| older handoff naming variants | `task-origin-handoff` |
| mixed block/loader naming that refers to the same operator concept | one operator-owned term per concept |

Exit criteria:

1. Active code paths use one term per business concept.
2. Tests and docs match the runtime vocabulary.
3. Residual legacy names exist only in compatibility shims or clearly historical documentation.

### W3 — Shift architecture tests toward behavior and public contracts

| Field | Detail |
| --- | --- |
| Status | `Done` |
| Why it matters | File-string assertions are useful during migration, but they become brittle once the architecture is stable and discourage internal refactoring. |
| Primary goal | Keep a small structural safety net while moving most convergence protection to public-contract and behavior-level tests. |

Concrete actions:

1. Identify which existing tests are migration guardrails versus long-term architecture tests.
2. Keep only the structural assertions that protect critical boundary rules.
3. Replace file-content assertions with behavior-level checks where the public contract can prove the same guarantee.
4. Add targeted tests around canonical operator facades and compatibility boundaries.
5. Remove temporary assertions once their protected migration step is complete.

Candidate test areas to review:

1. `tests/dashboard-elimination.test.ts`
2. `tests/td-c3-dashboard-split.test.ts`
3. `tests/td-a-booch-audit.test.ts`
4. `tests/td-c-martin-solid-audit.test.ts`
5. Any file-string or grep-style architecture checks added during convergence

Target end state:

1. Public operator-facing barrels are tested by importable behavior and contract shape.
2. Compatibility boundaries are tested by what callers can and cannot do, not by brittle file text.
3. Only a small number of structural audits remain, each justified inline.

### W4 — Clear residual typecheck and validation debt

| Field | Detail |
| --- | --- |
| Status | `Done` |
| Why it matters | Architectural cleanup is not complete if the repo still requires caveats around typecheck or validation. |
| Primary goal | Restore a clean deterministic validation baseline after the convergence edits. |

Concrete actions:

1. Run typecheck and fix convergence-induced typing regressions.
2. Run the focused architectural/regression slices that cover the renamed and collapsed surfaces.
3. Run full validation once targeted issues are closed.
4. Record the clean baseline in this document when achieved.

Exit criteria:

1. Typecheck passes without convergence-specific exceptions.
2. The relevant focused tests pass.
3. Full repo validation passes or any pre-existing exceptions are explicitly documented.

### W5 — Keep docs and code aligned during convergence

| Field | Detail |
| --- | --- |
| Status | `Done` |
| Why it matters | Long-running refactors fail when docs describe a future state that the code has not reached, or when code moves but the migration intent is lost. |
| Primary goal | Keep one accurate written record of the remaining work and update adjacent docs only when the runtime state actually changes. |

Concrete actions:

1. Treat this document as the authoritative tracker for the convergence cleanup.
2. Update TD-C4 whenever a workstream changes state, scope, or exit criteria.
3. Update TD-C3 or other related specs only when their historical description becomes misleading.
4. Record the final converged state here before closing the stream.

Exit criteria:

1. This document reflects the real runtime and validation state.
2. No active convergence assumption exists only in chat history.

---

## §5 Implementation Sequence

Recommended order of execution:

1. Finish compatibility-layer inventory and caller mapping.
2. Complete the remaining operator-owned extraction and shim collapse.
3. Apply the canonical rename burst where the concept map is already clear.
4. Repair any typecheck or focused regression fallout immediately.
5. Replace migration-only file-string assertions with contract and behavior tests in stabilized areas.
6. Run full validation.
7. Update this document with the final clean baseline and close the workstream.

This order is intentional. Deleting shims before caller mapping is risky, and converting tests before names and boundaries stabilize causes churn.

---

## §6 Tracking Ledger

Use this ledger as the ongoing change checklist.

| ID | Item | Status | Notes |
| --- | --- | --- | --- |
| C4-1 | Inventory dashboard-named callers and classify each file as implementation, shim, or dead code | `Done` | Active runtime callers were mapped; remaining dashboard files were dead compatibility shims |
| C4-2 | Remove dashboard-local imports from operator-owned modules | `Done` | Active operator modules now stand on operator-owned implementation only |
| C4-3 | Convert remaining dashboard modules to pure compatibility shims | `Done` | The temporary shim phase was completed and then retired |
| C4-4 | Delete compatibility shims whose callers are gone | `Done` | `src/lib/dashboard/` compatibility files were deleted |
| C4-5 | Define and apply canonical rename map for active concepts | `Done` | Active code and tests now target canonical operator vocabulary |
| C4-6 | Review migration-era architecture tests and label each as temporary or durable | `Done` | Convergence tests were retargeted to the canonical operator boundary |
| C4-7 | Replace brittle file-string assertions with behavior or contract assertions where convergence is stable | `Done` | Key convergence tests now assert exports, presence, and absence through runtime and file-existence contracts |
| C4-8 | Clear typecheck errors introduced or exposed by convergence work | `Done` | `npm run typecheck` passed |
| C4-9 | Run focused regression slices covering operator convergence | `Done` | Focused operator convergence slice passed (`98/98`) |
| C4-10 | Run full validation and record the clean baseline | `Done` | `npm run quality && npm run build` passed |

---

## §7 Completion Baseline

Final verified baseline on 2026-03-24:

1. Dashboard compatibility files under `src/lib/dashboard/` were removed.
2. Canonical loader behavior coverage now lives in `src/lib/operator/operator-signal-loaders.test.ts`.
3. Focused convergence validation passed: `98/98` tests across the operator loader suite and convergence audit slice.
4. `npm run typecheck` passed.
5. `npm run quality` passed.
6. `npm run build` passed.

---

## §8 Definition Of Done

TD-C4 is complete only when all of the following are true:

1. Compatibility layers have been collapsed wherever their callers are gone.
2. Active code uses canonical business vocabulary consistently.
3. Migration-era architecture tests have been reduced to the minimum justified structural set.
4. Behavior and public-contract tests cover the stable convergence boundaries.
5. Typecheck is clean.
6. Full validation is clean or any remaining exception is pre-existing, documented, and accepted.
7. This document reflects the finished state rather than an aspirational one.

TD-C4 is now the completion record for this convergence stream.
