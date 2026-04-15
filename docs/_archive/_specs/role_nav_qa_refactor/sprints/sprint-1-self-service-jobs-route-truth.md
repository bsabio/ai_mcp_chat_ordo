# Sprint 1 — Self-Service Jobs Route Truth

> **Status:** Complete
> **Goal:** Turn `/jobs` into a truthful signed-in workspace by finishing the route contract, adding selected-job detail and history, replacing refresh polling with live user-job sync, and hardening the role and browser regressions around self-service job ownership.
> **Spec refs:** §1.1 through §1.3, §2, §3.1 through §3.7, §4, §5, `RNQ-010` through `RNQ-014`, `RNQ-020` through `RNQ-026`, `RNQ-030` through `RNQ-034`, `RNQ-050` through `RNQ-052`, `RNQ-070`, `RNQ-080` through `RNQ-095`
> **Grounding docs:** [../admin-dashboard-nav-audit.md](../admin-dashboard-nav-audit.md), [../theme-mcp-contract-audit.md](../theme-mcp-contract-audit.md)
> **Prerequisite:** [sprint-0-inventory-and-capability-registry.md](sprint-0-inventory-and-capability-registry.md)

---

## Strategic Ideas

Sprint 1 should follow these four ideas directly.

1. **Per-job detail and durable history must become first-class.** A self-service jobs page is not truthful if it can only show cards and counts. The route needs a selected-job detail model, durable event history, and linkable selection semantics.
2. **Live SSE updates should replace route-refresh polling.** The signed-in jobs workspace already has `/api/jobs/events` and `/api/jobs/[jobId]/events`. The page should consume those APIs directly instead of depending on periodic `router.refresh()` as its primary synchronization path.
3. **Role and browser coverage must close around the new route.** Anonymous redirect, `APPRENTICE` visibility, owner-safe cancel and retry behavior, and empty-state truth need focused regression coverage so `/jobs` does not fall back into admin assumptions.
4. **Self-service and global jobs must stay separate.** Sprint 1 is about making `/jobs` truthful for signed-in users, not about reworking `/admin/jobs`, staff global access, or admin dashboard ownership.

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_specs/role_nav_qa_refactor/spec.md` | Current feature contract, route split, requirement IDs, and capability-policy model |
| `docs/_specs/role_nav_qa_refactor/sprints/sprint-0-inventory-and-capability-registry.md` | Completed authority baseline for current deferred job capabilities |
| `src/app/jobs/page.tsx` | Signed-in `/jobs` route with anonymous redirect, server-loaded workspace data, and deep-linkable selection |
| `src/components/jobs/JobsWorkspace.tsx` | Member-facing jobs workspace with summary cards, selected-job detail/history, live SSE sync, and owner cancel/retry actions |
| `src/lib/jobs/job-capability-registry.ts` | Current canonical deferred job capability registry and shared role helpers |
| `src/lib/shell/shell-navigation.ts` | Current shell/account route truth, including signed-in `/jobs` visibility for `APPRENTICE` |
| `src/app/api/jobs/route.ts` | User-scoped jobs list endpoint |
| `src/app/api/jobs/[jobId]/route.ts` | User-scoped single-job read plus owner cancel/retry actions |
| `src/app/api/jobs/events/route.ts` | User-scoped SSE event stream for current-account jobs |
| `src/app/api/jobs/[jobId]/events/route.ts` | User-scoped durable event history for one selected job |
| `src/app/jobs/page.test.tsx` | Route-level regression coverage for anonymous redirect and signed-in rendering |
| `src/components/jobs/JobsWorkspace.test.tsx` | Focused client-workspace regression surface for empty state, selection, live updates, and owner actions |
| `src/app/api/jobs/[jobId]/route.test.ts` | Existing owner-safe single-job route coverage |
| `src/app/api/jobs/[jobId]/events/route.test.ts` | Existing durable history route coverage |

---

## Cross-Layer Constraints

1. Capability truth still lives in `src/lib/jobs/job-capability-registry.ts`. Sprint 1 must not reintroduce route-local role arrays or tool-name assumptions to decide who can see `/jobs`.
2. Current self-service authorization remains rooted in authenticated conversation ownership. Sprint 1 may consume that model, surface it truthfully, and test it, but it should not replace it with a broader capability-aware authorization rewrite yet.
3. `/admin/jobs` remains the global operator queue in this sprint. Sprint 1 must not collapse self-service and admin pages into one shared route or quietly widen global access.
4. Use the existing signed-in jobs API family under `/api/jobs*` rather than routing the member workspace through `/api/chat/jobs*` or other admin-facing seams.
5. Reuse current jobs visual primitives where that keeps the implementation small, but do not pull admin drawer or admin sidebar semantics into the member workspace.

---

## Verified Exit State

Sprint 1 is now complete and verified.

1. `/jobs` is a stable signed-in route, and anonymous visitors are redirected to `/login`.
2. Shell and account exposure for `/jobs` is correct for `AUTHENTICATED`, `APPRENTICE`, `STAFF`, and `ADMIN`.
3. The workspace renders active-first summaries, selected-job detail, durable history, URL-backed selection, and owner-safe cancel or retry actions.
4. Live updates come from `/api/jobs/events` SSE with explicit reconnect and fallback behavior instead of `JobsRefreshTrigger` polling.
5. Focused route, component, API, and browser coverage now verify the self-service route truth end to end.
6. Remaining work belongs to later sprints: `/admin/jobs` capability-policy alignment, broader navigation convergence, and full role-matrix regression hardening.

---

## Resolved QA Findings

1. The selected-job depth gap is closed: `/jobs` now consumes `/api/jobs/[jobId]` and `/api/jobs/[jobId]/events` for detail and durable history.
2. `JobsRefreshTrigger` polling is no longer the primary sync path; the workspace now uses `/api/jobs/events` SSE with degraded fallback behavior.
3. Owner-safe cancel and retry actions now reconcile inside workspace state without requiring a full route reload after every mutation.
4. URL-stable `?jobId=` selection now preserves the chosen job across refresh and browser navigation.
5. The signed-in browser smoke now seeds real SQLite-backed jobs because the initial `/jobs` state is server-rendered rather than client-mocked.
6. Admin-global queue alignment and notification-surface expansion remain intentionally out of scope for Sprint 1 and are deferred to later sprints.

---

## Task 1.1 — Finish the `/jobs` route contract and server boundary

**What:** Lock `/jobs` into a durable self-service route boundary with explicit server-side loading semantics.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/jobs/page.tsx` |
| **Create if needed** | `src/lib/jobs/load-user-jobs-workspace.ts` |
| **Modify** | `src/app/jobs/page.test.tsx` |
| **Spec** | §1.1 through §1.3, §3.1, §3.4.1, `RNQ-010` through `RNQ-014`, `RNQ-050` through `RNQ-052` |

### Task 1.1 outcomes

1. Keep `/jobs` as a signed-in page and keep anonymous users redirected to `/login`.
2. Keep `/jobs` visible to all signed-in roles that can own self-service jobs, including `APPRENTICE`.
3. Move current server-side sorting and derived workspace data into a dedicated loader/helper if that keeps the page thin and makes later detail selection work easier to test.
4. Keep `/jobs` explicitly scoped to current-account work and do not leak global operator queue behavior into the route.
5. Preserve truthful empty-state behavior instead of hiding the route when the signed-in user has no visible jobs.

### Task 1.1 implementation subtasks

- [x] extract or confirm a dedicated server-side loader for signed-in jobs workspace data
- [x] normalize `jobId` search params at the page boundary
- [x] keep anonymous redirect and signed-in route rendering regressions green
- [x] confirm signed-in shell and account exposure stays correct for `APPRENTICE`

### Task 1.1 notes

1. This task should consolidate the current slice, not replace it with a larger redesign.
2. If deep-link selection uses `searchParams`, normalize it at the page boundary rather than burying URL parsing inside unrelated child components.
3. Do not add staff- or admin-global queue affordances to this route in the name of reuse.

### Verify Task 1.1

```bash
npx vitest run src/app/jobs/page.test.tsx src/lib/shell/shell-navigation.test.ts tests/shell-navigation-model.test.ts src/components/AccountMenu.test.tsx
```

---

## Task 1.2 — Add selected job detail, durable history, and deep-linkable state

**What:** Turn `/jobs` into a real workspace by giving users one selected job view, its current normalized status, and durable event history without leaving the page.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/jobs/JobsWorkspace.tsx` |
| **Create** | `src/components/jobs/JobDetailPanel.tsx` |
| **Create** | `src/components/jobs/JobHistoryTimeline.tsx` |
| **Modify or create** | focused tests under `src/components/jobs/` |
| **Consume** | `GET /api/jobs/[jobId]` and `GET /api/jobs/[jobId]/events` |
| **Spec** | §3.4.1, §3.6.1, `RNQ-026`, `RNQ-070`, `RNQ-082` through `RNQ-084` |

### Task 1.2 outcomes

1. The workspace can select a job and show its current normalized status, summary, metadata, and available owner-safe action.
2. The selected job state is URL-stable, preferably through a `jobId` search param, so refreshes and shareable links preserve the chosen job.
3. Durable event history for the selected job is rendered from `/api/jobs/[jobId]/events` rather than inferred only from list cards.
4. Empty-state truth remains intact when there are no jobs, and a separate no-selection state exists when the list loads but nothing is selected.
5. The page does not require a second route such as `/jobs/[jobId]` unless a later sprint decides that route complexity is justified.

### Task 1.2 implementation subtasks

- [x] add a selected-job loader path that can fetch one job outside the initial list when deep-linked
- [x] build a detail panel for normalized selected-job status, metadata, and owner-safe primary action
- [x] build a durable history timeline from `GET /api/jobs/[jobId]/events`
- [x] wire list-card selection to `?jobId=` deep links and preserve selection on refresh
- [x] cover selected-job rendering and history behavior in focused component and page tests

### Task 1.2 notes

1. Default selection should prefer the first active job, then fall back to the most recent terminal job.
2. Keep the event-history view normalized and compact; Sprint 1 is not the place to add a giant admin-style log viewer.
3. Continue using the existing job-status language and presenter semantics so summaries stay consistent with chat and API reads.

### Verify Task 1.2

```bash
npx vitest run src/components/jobs/JobsWorkspace.test.tsx src/app/api/jobs/[jobId]/route.test.ts src/app/api/jobs/[jobId]/events/route.test.ts
```

---

## Task 1.3 — Replace polling with signed-in SSE job sync

**What:** Make `/jobs` live by replacing `router.refresh()` polling with an SSE-backed client state model that consumes the existing signed-in job event stream.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/jobs/page.tsx` |
| **Modify** | `src/components/jobs/JobsWorkspace.tsx` |
| **Create** | `src/components/jobs/useJobsEventStream.ts` |
| **Create if needed** | `src/components/jobs/job-snapshot-reducer.ts` |
| **Create or modify** | focused client tests for stream reconciliation |
| **Consume** | `GET /api/jobs/events` |
| **Spec** | §3.6.1, §5, `RNQ-070`, `RNQ-080` through `RNQ-084`, `RNQ-095` |

### Task 1.3 outcomes

1. The `/jobs` client subscribes to `/api/jobs/events` for signed-in users and reconciles incoming job snapshots into local workspace state.
2. The page no longer depends on `JobsRefreshTrigger` polling as its primary synchronization path.
3. Owner cancel and retry actions update the workspace coherently without requiring a full route reload after every mutation.
4. Stream connection loss, reconnects, or unsupported environments degrade gracefully, preferably with a narrow fallback rather than silent staleness.
5. The selected job detail and its history remain stable while stream updates arrive.

### Task 1.3 implementation subtasks

- [x] add a signed-in jobs SSE hook scoped only to `/jobs`
- [x] reconcile streamed snapshots into local workspace state without losing the selected job
- [x] remove `JobsRefreshTrigger` as the primary sync path once SSE is stable
- [x] add explicit degraded-mode behavior when SSE cannot stay connected

### Task 1.3 notes

1. Keep the SSE hook focused on the signed-in jobs workspace; do not generalize it prematurely for admin jobs in this sprint.
2. Use the durable history endpoint for backfill and selection, and the SSE stream for live incremental reconciliation.
3. If a small fallback refresh remains necessary for degraded browsers, make it explicit and secondary rather than leaving polling as the default model.

### Verify Task 1.3

```bash
npx vitest run src/components/jobs/JobsWorkspace.test.tsx src/app/api/jobs/events/route.test.ts
```

---

## Task 1.4 — Harden owner actions, browser flows, and role regressions

**What:** Expand regression coverage so `/jobs` cannot quietly slide back into admin assumptions or lose signed-in route truth.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/jobs/page.test.tsx` |
| **Modify** | `src/components/jobs/JobsWorkspace.test.tsx` |
| **Modify** | `src/lib/shell/shell-navigation.test.ts` |
| **Modify** | `tests/shell-navigation-model.test.ts` |
| **Modify as needed** | `src/app/api/jobs/[jobId]/route.test.ts` and `src/app/api/jobs/[jobId]/events/route.test.ts` |
| **Create if needed** | focused browser coverage for account menu to `/jobs` and selected-job workflows |
| **Spec** | §3.7, §4, §5, `RNQ-080` through `RNQ-095` |

### Task 1.4 outcomes

1. Tests cover anonymous redirect, signed-in route rendering, and `APPRENTICE` visibility across shell and account navigation.
2. Tests cover selected-job deep linking, empty-state truth, and owner cancel or retry affordances by status.
3. Tests cover durable history rendering and live update reconciliation with mocked SSE behavior.
4. Tests continue to prove that owner-scoped job routes do not leak unauthorized data outside the current ownership model.
5. Sprint 1 exits with focused regressions around route truth instead of relying on broad future QA to rediscover these seams.

### Task 1.4 implementation subtasks

- [x] add page and component regressions for deep-linked selection and no-selection behavior
- [x] add owner-action regressions for selected-job cancel and retry flows
- [x] add browser or interaction coverage for account-menu navigation into `/jobs`
- [x] keep owner-scoped route tests aligned with current conversation-ownership authorization

### Task 1.4 notes

1. Prefer focused route, component, and browser tests over giant snapshots.
2. Keep the test matrix aligned with current owner-scoped behavior; full capability-aware auth hardening belongs to a later sprint.
3. This sprint should not try to absorb `/admin/jobs` coverage into member-route tests.

### Verify Task 1.4

```bash
npx vitest run src/app/jobs/page.test.tsx src/components/jobs/JobsWorkspace.test.tsx src/lib/shell/shell-navigation.test.ts tests/shell-navigation-model.test.ts src/app/api/jobs/[jobId]/route.test.ts src/app/api/jobs/[jobId]/events/route.test.ts
```

---

## Out Of Scope For Sprint 1

1. Capability-aware replacement of the current conversation-ownership authorization model.
2. `/admin/jobs` capability filtering, family grouping, or staff/global access changes.
3. Admin drawer, admin sidebar, or admin dashboard reorganization.
4. Member-safe notification rerouting beyond the job workspace itself.
5. New user-facing job creation flows for non-editorial work.

---

## Sprint 1 Verification Bundle

Use this bundle when re-verifying Sprint 1 completion:

```bash
npm run typecheck
npx vitest run src/app/jobs/page.test.tsx src/components/jobs/JobsWorkspace.test.tsx src/components/jobs/useJobsEventStream.test.tsx src/lib/shell/shell-navigation.test.ts tests/shell-navigation-model.test.ts src/components/AccountMenu.test.tsx 'src/app/api/jobs/[jobId]/route.test.ts' 'src/app/api/jobs/[jobId]/events/route.test.ts' src/app/api/jobs/events/route.test.ts
npx playwright test tests/browser-ui/jobs-page.spec.ts --workers=1 --reporter=line
npm run build
```

This bundle now includes the focused SSE reconciliation tests and the real signed-in `/jobs` browser smoke.

---

## Completion Checklist

- [x] `/jobs` is a stable signed-in route with no admin redirect fallback
- [x] signed-in `/jobs` visibility remains correct for `AUTHENTICATED`, `APPRENTICE`, `STAFF`, and `ADMIN`
- [x] the page supports selected-job detail and durable history through the existing signed-in APIs
- [x] live user-job sync replaces route-refresh polling as the primary update path
- [x] owner cancel and retry actions reconcile cleanly in the workspace
- [x] empty-state and no-selection states remain truthful and separate
- [x] focused route, component, and browser regressions cover anonymous redirect, signed-in visibility, and owner-safe actions
- [x] the Sprint 1 verification bundle passes

---

## Sprint 1 Exit Criteria

Sprint 1 is complete only when the repository has one truthful signed-in answer to all of the following:

1. how a signed-in user reaches `/jobs`
2. how a selected job is represented and revisited on refresh
3. how durable job history is inspected without leaving the self-service workspace
4. how live job updates arrive without relying on whole-route refresh polling
5. how cancel and retry stay owner-safe and role-safe

If `/jobs` is still shallow enough that a signed-in user must fall back to admin pages, page refreshes, or route-level guesswork to understand one job, Sprint 1 is not complete.
