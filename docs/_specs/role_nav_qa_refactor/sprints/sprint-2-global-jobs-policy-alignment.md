# Sprint 2 — Global Jobs Policy Alignment

> **Status:** Complete
> **Goal:** Make `/admin/jobs` capability-aware by deriving global inventory, filters, detail affordances, and cancel or retry actions from the shared job capability registry instead of raw admin-only assumptions.
> **Spec refs:** §1.2 through §1.3, §2, §3.1 through §3.7, §4, §5, `RNQ-011` through `RNQ-014`, `RNQ-020` through `RNQ-025`, `RNQ-030` through `RNQ-043`, `RNQ-053` through `RNQ-055`, `RNQ-060` through `RNQ-071`, `RNQ-080` through `RNQ-095`
> **Grounding docs:** [../admin-dashboard-nav-audit.md](../admin-dashboard-nav-audit.md), [../theme-mcp-contract-audit.md](../theme-mcp-contract-audit.md)
> **Prerequisite:** [sprint-1-self-service-jobs-route-truth.md](sprint-1-self-service-jobs-route-truth.md)

---

## Strategic Ideas

Sprint 2 should follow these four ideas directly.

1. **Capability policy must become the global queue truth.** `/admin/jobs` should no longer treat every stored `tool_name` as globally viewable and actionable just because the page is admin-gated.
2. **Current behavior should stay stable while the implementation changes.** The live registry still marks every real deferred handler as admin-only editorial work, so Sprint 2 should preserve shipped admin behavior while moving the route onto the registry path that future roles and job families will need.
3. **Global queue filters should describe policy-aware concepts.** Operators should be able to browse by capability family and registered job type, not only raw `tool_name` strings pulled directly from storage.
4. **Action safety must be policy-first.** Cancel and retry affordances should only appear or execute when both job status and `globalActionRoles` allow them.

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_specs/role_nav_qa_refactor/spec.md` | Current feature contract, route split, requirement IDs, and capability-policy model |
| `docs/_specs/role_nav_qa_refactor/sprints/sprint-0-inventory-and-capability-registry.md` | Canonical registry and current authority baseline |
| `docs/_specs/role_nav_qa_refactor/sprints/sprint-1-self-service-jobs-route-truth.md` | Verified self-service `/jobs` baseline that Sprint 2 must preserve |
| `src/lib/jobs/job-capability-registry.ts` | Current global and self-service role helpers plus tool-by-tool capability metadata |
| `src/app/admin/jobs/page.tsx` | Current admin jobs browse route with status/tool filters, bulk actions, and refresh trigger |
| `src/app/admin/jobs/[id]/page.tsx` | Current admin jobs detail page with payload JSON, event timeline, and status-driven actions |
| `src/lib/admin/jobs/admin-jobs.ts` | Current admin jobs filters, list loader, and detail loader built over raw mapper reads |
| `src/lib/admin/jobs/admin-jobs-actions.ts` | Current single and bulk cancel or retry server actions |
| `src/components/admin/JobsTableClient.tsx` | Current jobs table with raw `toolName`, status, progress, and bulk-action affordances |
| `src/adapters/JobQueueDataMapper.ts` | Raw admin queue methods such as `listForAdmin`, `countForAdmin`, `countByStatus`, `countByToolName`, and `listEventsForJob` |
| `src/lib/shell/shell-navigation.ts` | Current `admin-jobs` route metadata and ADMIN-only exposure |
| `src/lib/admin/admin-navigation.ts` | Current canonical admin navigation list that includes `admin-jobs` |
| `tests/jobs-system-dashboard.test.ts` | Updated source and loader coverage for the admin jobs browse/detail surfaces after removing stale `/jobs` redirect history |

---

## Cross-Layer Constraints

1. Sprint 2 must not regress the shipped self-service `/jobs` route or its signed-in SSE model. This sprint is about the global operator queue only.
2. `/admin/jobs` remains admin-gated in this sprint. Do not widen page access, shell exposure, or admin navigation to `STAFF` unless the capability registry, page gate, and tests all change together.
3. The capability registry remains the source of truth. Sprint 2 must not introduce new route-local role arrays for global job visibility or actions.
4. `JobQueueDataMapper` is still the raw storage seam. Capability filtering should sit above the mapper or be parameterized into mapper calls through explicit allowed-tool filters rather than buried in page components.
5. `JobsRefreshTrigger` may remain as the browse-page sync mechanism for now. Live SSE for `/admin/jobs` is not the purpose of Sprint 2.
6. The browse page already renders `AdminPagination`, and Sprint 2 now threads the resolved `limit` and `offset` values into `loadAdminJobList()`. Broader admin pagination polish and richer user-name hydration remain adjacent debts, not the core policy-alignment objective for this sprint.

---

## Verified Exit State

Sprint 2 is complete and verified.

1. `/admin/jobs` browse results, family and capability filters, and counts are now restricted to registry-visible job types for the current operator roles.
2. The browse and detail view models now expose capability metadata including `toolLabel`, `toolFamily`, `toolFamilyLabel`, `defaultSurface`, and policy-derived action affordances.
3. Single-job and bulk cancel or retry actions now enforce both valid status and registry-backed global manage permission on the server, failing closed for unregistered tools.
4. Capability filtering is pushed into `JobQueueDataMapper` through explicit `toolNames` allowlists rather than being left to page-only filtering.
5. `/admin/jobs` route exposure remains ADMIN-only and aligned with the current page gate, shell route truth, and admin navigation truth.
6. Focused regressions now cover registry helpers, list loader, page wiring, detail rendering, and single and bulk action enforcement, with the legacy sprint-5 source audit updated to the current `/jobs` and admin-jobs reality.
7. Verification passed on 2026-03-31 with `npm run typecheck`, the focused Sprint 2 Vitest bundle (`8` files, `62` tests), and `npm run build`. No dedicated admin-jobs browser smoke was added in this sprint.

---

## Resolved QA Findings

1. Global queue truth no longer comes only from admin page gating and route metadata; browse, detail, and action paths now consume shared registry helpers directly.
2. Status counts and capability filters are scoped to globally viewable job types rather than every stored row in `job_requests`.
3. The admin jobs detail page now explains capability label, family, default surface, and whether the current role is globally manageable or view-only.
4. Unregistered or future job types now fail closed in browse, detail, and action paths.
5. The legacy sprint-5 jobs source test file was updated during implementation, and Sprint 2 QA found one additional stale redirect audit in `tests/job-visibility-solid.test.ts`, which now reflects the signed-in `/jobs` workspace instead of the removed admin redirect.
6. Pagination alignment improved within scope by threading resolved `limit` and `offset` into the loader, while broader admin pagination cleanup remains intentionally out of scope.
7. Live SSE for `/admin/jobs` remains out of scope, and `JobsRefreshTrigger` remains the browse sync mechanism for this sprint.

---

## Task 2.1 — Add explicit global job policy helpers

**What:** Extend the shared job capability layer with helpers that answer global queue questions directly instead of forcing `/admin/jobs` to infer them from route role and raw tool names.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/jobs/job-capability-registry.ts` |
| **Create if needed** | `src/lib/jobs/job-global-policy.ts` |
| **Modify** | `src/lib/jobs/job-capability-registry.test.ts` |
| **Create if needed** | focused global-policy tests alongside the registry tests |
| **Spec** | §1.2, §3.3, §3.5, §4, `RNQ-021`, `RNQ-040` through `RNQ-043`, `RNQ-060`, `RNQ-092` |

### Task 2.1 outcomes

1. Export shared helpers that answer whether a role can globally view or act on a given tool name.
2. Export admin-facing metadata helpers for capability label, family, and default surface so `/admin/jobs` can render policy-aware UI without duplicating registry parsing.
3. Define explicit fail-closed behavior for unregistered tool names in the global queue path.
4. Preserve the current live handler set as admin-only editorial work while making the helper surface future-role-ready.
5. Keep the helper surface small and declarative so later sprints can reuse it for route exposure and QA matrices.

### Task 2.1 implementation subtasks

- [x] add global-view and global-action helper functions keyed by tool name and role
- [x] export family and label metadata in a form the admin jobs browse/detail views can consume directly
- [x] define explicit fail-closed handling for unregistered tool names
- [x] extend registry tests to cover global-view and global-action policy lookups

### Task 2.1 notes

1. Current behavior for admins should not change visibly after this task because every real handler is already admin-only.
2. Avoid putting admin-page concerns such as filters or table labels into the core registry module unless the data is truly cross-surface.
3. If a helper needs to return a policy state, prefer explicit states such as `registered` or `unregistered` over silent `null` branching spread across callers.

### Verify Task 2.1

```bash
npx vitest run src/lib/jobs/job-capability-registry.test.ts
```

---

## Task 2.2 — Align admin browse filters and list loaders to capability policy

**What:** Make `/admin/jobs` browse results, counts, and filters derive from the shared global policy instead of raw storage rows.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/admin/jobs/admin-jobs.ts` |
| **Modify** | `src/app/admin/jobs/page.tsx` |
| **Modify** | `src/components/admin/JobsTableClient.tsx` |
| **Modify if needed** | `src/adapters/JobQueueDataMapper.ts` |
| **Create if needed** | focused loader tests under `src/lib/admin/jobs/` |
| **Spec** | §3.1, §3.4.2, §3.6.2, `RNQ-030`, `RNQ-034`, `RNQ-043`, `RNQ-053`, `RNQ-071`, `RNQ-092` |

### Task 2.2 outcomes

1. `loadAdminJobList()` filters global inventory through the capability registry for the current role rather than assuming every stored tool is globally visible.
2. Status counts, tool filters, and any new family filter reflect only globally viewable job types.
3. The view model carries capability label and family metadata in addition to the raw tool name.
4. The browse UI can filter by job family while still allowing operators to drill into exact tool names.
5. Unregistered or globally invisible tools fail closed in the browse inventory instead of appearing as implicitly allowed admin jobs.

### Task 2.2 implementation subtasks

- [x] add capability-aware filtering to the admin list loader
- [x] derive filter options from globally visible capabilities rather than only `countByToolName()` output
- [x] add family metadata and any needed family filter to the browse view model and UI
- [x] cover visible-row, count, and filter behavior with focused loader and page tests

### Task 2.2 notes

1. All current real rows should still remain visible to admins after this task because the registry currently grants global view to admins for every live handler.
2. Prefer reusing one shared policy helper in list loading, count shaping, and filter building rather than scattering `toolName` checks across the page and table.
3. Sprint 2 now threads resolved `limit` and `offset` into the loader, but it intentionally stops short of a broader admin pagination redesign or richer user-name hydration pass.

### Verify Task 2.2

```bash
npx vitest run src/lib/admin/jobs/admin-jobs.test.ts tests/jobs-system-dashboard.test.ts
```

---

## Task 2.3 — Align detail affordances and server actions to `globalActionRoles`

**What:** Make single-job and bulk actions in `/admin/jobs` truthful by requiring both a valid job status and global action permission from the capability registry.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/admin/jobs/[id]/page.tsx` |
| **Modify** | `src/lib/admin/jobs/admin-jobs.ts` |
| **Modify** | `src/lib/admin/jobs/admin-jobs-actions.ts` |
| **Modify** | `src/app/admin/jobs/page.tsx` |
| **Create if needed** | focused action tests for single and bulk flows |
| **Spec** | §3.4.2, §3.6.2, §4, `RNQ-043`, `RNQ-053` through `RNQ-055`, `RNQ-071`, `RNQ-083`, `RNQ-092` through `RNQ-094` |

### Task 2.3 outcomes

1. The detail loader exposes capability metadata needed to explain why a job is globally actionable or view-only.
2. Cancel and retry buttons render only when both status and `globalActionRoles` allow the action.
3. Single-job and bulk actions reject requests for unregistered or globally non-actionable job types even when the caller has reached the admin page.
4. Error messaging distinguishes policy rejection from invalid-status rejection when practical.
5. The current live editorial queue keeps its admin-only action behavior, but it now gets there through shared policy checks.

### Task 2.3 implementation subtasks

- [x] add capability metadata to the admin detail view model
- [x] derive `canCancel` and `canRetry` from both status and global action policy
- [x] enforce capability-aware action checks in single and bulk job actions
- [x] add focused tests for policy-denied and status-denied action paths

### Task 2.3 notes

1. Keep `requireAdminPageAccess()` in place for this sprint; policy checks are additive, not a replacement for page access.
2. Rejecting an action should happen on the server even if the UI already hid the button.
3. If the detail page needs a small capability summary card, prefer using the existing admin-card pattern over inventing a new layout system here.

### Verify Task 2.3

```bash
npx vitest run src/lib/admin/jobs/admin-jobs-actions.test.ts src/app/admin/jobs/[id]/page.test.tsx
```

---

## Task 2.4 — Add focused global queue policy regressions

**What:** Add regression coverage proving that `/admin/jobs` now follows the capability registry end to end and remains aligned with current admin-only route exposure.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/jobs/job-capability-registry.test.ts` |
| **Modify or create** | `src/lib/admin/jobs/admin-jobs.test.ts` |
| **Modify or create** | `src/app/admin/jobs/page.test.tsx` |
| **Modify or create** | `src/app/admin/jobs/[id]/page.test.tsx` |
| **Modify** | `tests/jobs-system-dashboard.test.ts` |
| **Modify if needed** | `src/lib/shell/shell-navigation.test.ts` and `tests/shell-navigation-model.test.ts` |
| **Spec** | §3.7, §4, §5, `RNQ-080` through `RNQ-095` |

### Task 2.4 outcomes

1. Tests prove that global browse results and counts are shaped by capability policy, not raw admin assumptions.
2. Tests prove that single and bulk actions require both allowed status and allowed `globalActionRoles`.
3. Tests prove that current `/admin/jobs` route exposure remains ADMIN-only unless policy, navigation, and page gates are all changed together.
4. Tests prove that unregistered tool names fail closed in the global queue path.
5. Sprint 2 exits with regression coverage that future staff/global access work must intentionally update rather than accidentally bypass.

### Task 2.4 implementation subtasks

- [x] add list-loader regressions for globally visible and invisible tool sets
- [x] add detail and action regressions for capability-denied paths
- [x] update admin jobs source and page tests so they assert policy-aware loaders and actions rather than raw admin assumptions
- [x] verify shell and admin route exposure stay aligned with current ADMIN-only page access

### Task 2.4 notes

1. Prefer loader, action, and page tests over giant snapshots.
2. Keep Sprint 2 coverage focused on the global queue and capability policy; the broader role-by-route matrix still belongs to Sprint 4.
3. If a browser smoke is added here, keep it tightly scoped to admin filter and action affordance truth rather than general shell navigation.

### Verify Task 2.4

```bash
npx vitest run src/lib/jobs/job-capability-registry.test.ts src/lib/admin/jobs/admin-jobs.test.ts src/app/admin/jobs/page.test.tsx src/app/admin/jobs/[id]/page.test.tsx tests/jobs-system-dashboard.test.ts src/lib/shell/shell-navigation.test.ts tests/shell-navigation-model.test.ts
```

---

## Out Of Scope For Sprint 2

1. Widening `/admin/jobs` beyond `ADMIN` to `STAFF` or any other role.
2. Navigation convergence across shell, account, admin drawer, and admin sidebar beyond the minimal route-truth assertions needed to keep `/admin/jobs` aligned.
3. Any new SSE or live-stream architecture for the admin jobs queue.
4. Self-service `/jobs` changes, user-job authorization redesign, or non-admin job creation flows.
5. Admin dashboard regrouping, notification feed work, or broader pagination cleanup.

---

## Sprint 2 Verification Bundle

Run this bundle before marking Sprint 2 complete:

```bash
npm run typecheck
npx vitest run src/lib/jobs/job-capability-registry.test.ts src/lib/admin/jobs/admin-jobs.test.ts src/lib/admin/jobs/admin-jobs-actions.test.ts src/app/admin/jobs/page.test.tsx src/app/admin/jobs/[id]/page.test.tsx tests/jobs-system-dashboard.test.ts src/lib/shell/shell-navigation.test.ts tests/shell-navigation-model.test.ts
npm run build
```

If focused browser coverage is added during the sprint, include that admin jobs smoke in the verification bundle before exit.

---

## Completion Checklist

- [x] global job visibility derives from the shared capability registry rather than raw admin assumptions
- [x] `/admin/jobs` browse filters and counts reflect only globally viewable job types
- [x] the browse and detail view models expose capability label and family metadata
- [x] single and bulk cancel or retry actions require both valid status and `globalActionRoles`
- [x] unregistered or unauthorized tool names fail closed in the global queue path
- [x] current ADMIN-only route exposure remains aligned with the actual page gate and policy helpers
- [x] the Sprint 2 verification bundle passes

---

## Sprint 2 Exit Criteria

Sprint 2 is complete only when the repository has one truthful global answer to all of the following:

1. which deferred job types the current operator role may see in `/admin/jobs`
2. why a job appears in the global queue instead of only in self-service surfaces
3. how job family and capability metadata shape the browse filters and detail UI
4. when cancel or retry is disabled because of status versus because of policy
5. how future staff or mixed-family global access would be added without rewriting the page around ad hoc `ADMIN` checks

If `/admin/jobs` still relies on raw `tool_name` presence, page-level status booleans, or route-only admin assumptions to decide who can see and manage a job, Sprint 2 is not complete.
