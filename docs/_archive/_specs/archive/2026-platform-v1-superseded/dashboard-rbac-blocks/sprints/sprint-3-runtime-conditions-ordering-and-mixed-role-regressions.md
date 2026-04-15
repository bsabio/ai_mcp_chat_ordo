# Sprint 3 - Runtime Conditions, Ordering, And Mixed-Role Regressions

> **Goal:** Complete the dashboard block system with runtime condition handling, empty-state rules, deterministic ordering, and mixed-role regression coverage while explicitly preserving the shipped functionality from Sprints 0, 1, and 2.
> **Spec ref:** `DRB-033`, `DRB-035`, `DRB-055` through `DRB-057`, `DRB-085` through `DRB-089`, `DRB-093`, `DRB-100` through `DRB-109`
> **Prerequisite:** Sprint 2 complete
> **Test count target:** 668 existing + 9 new = 677 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/lib/dashboard/dashboard-blocks.ts` | Sprint 0 established the centralized block registry and the shipped baseline order now places `lead_queue` ahead of `routing_review` for admins |
| `src/lib/dashboard/dashboard-visibility.ts` | Sprint 0 already defines role filtering plus the baseline runtime-state contract that Sprint 3 must formalize rather than replace |
| `src/lib/dashboard/dashboard-loaders.ts` | Sprint 1 and Sprint 2 already ship server-owned loaders for `conversation_workspace`, `recent_conversations`, `lead_queue`, and `routing_review` |
| `src/app/dashboard/page.tsx` | The dashboard route already renders filtered block definitions from registry metadata and conditionally loads admin-only blocks without hardcoding role logic into individual cards |
| `src/components/dashboard/ConversationWorkspaceBlock.tsx` and `src/components/dashboard/RecentConversationsBlock.tsx` | Sprint 1 already shipped the signed-in workspace baseline, including recent-conversation links that reopen a selected thread through the homepage restore flow |
| `src/components/dashboard/RoutingReviewBlock.tsx` and `src/components/dashboard/LeadQueueBlock.tsx` | Sprint 2 already shipped concrete admin pipeline surfaces, and `lead_queue` is now a writable founder workflow rather than a placeholder |
| `src/app/api/admin/routing-review/route.ts` and `src/app/api/admin/leads/[leadId]/triage/route.ts` | Admin dashboard work now has both a stable read-only routing queue and an explicit admin-only lead-triage mutation route |
| `docs/_specs/dashboard-rbac-blocks/spec.md` | The spec already defines runtime states (`ready`, `empty`, `hidden`), operator-value ordering, and the security rule that client visibility is not a permission boundary |

---

## Inherited Baseline Sprint 3 Must Preserve

Sprint 3 is not a clean-slate layout sprint. It must preserve all shipped behavior from earlier sprints while adding explicit runtime and ordering policy.

Current baseline to treat as non-regression scope:

1. `/dashboard` is a signed-in route that redirects anonymous users to `/login`.
2. The registry remains the source of truth for block metadata, role allowlists, category, and priority.
3. Authenticated and staff users receive workspace-only blocks: `conversation_workspace` and `recent_conversations`.
4. Recent conversation items reopen a selected thread through `/?conversationId=<id>` and rely on the homepage restore path shipped in Sprint 1 QA follow-up work.
5. Admin users additionally receive `lead_queue`, `routing_review`, and `system_health`, with `lead_queue` ordered ahead of `routing_review`.
6. `routing_review` is a read-only operational block backed by the shared analytics loader path.
7. `lead_queue` is no longer placeholder-only: it loads submitted contact captures, triage counts, founder notes, `last_contacted_at`, and current triage state.
8. `lead_queue` is also no longer read-only: admins can persist `new`, `contacted`, `qualified`, and `deferred` through the dedicated PATCH route.
9. `lead_queue` already supports in-block filtering by `all`, `new`, `contacted`, `qualified`, and `deferred`.
10. Hidden admin blocks must not trigger protected loader calls for authenticated or staff users.

---

## Task 3.1 - Implement per-block runtime state evaluation

**What:** Promote the basic visibility helpers into a stable evaluator that can return `ready`, `empty`, or `hidden` for each block based on server and client context.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-visibility.ts` |
| **Modify** | `src/lib/dashboard/dashboard-visibility.test.ts` |
| **Spec** | `DRB-033`, `DRB-055` through `DRB-057`, `DRB-106` |

### Task 3.1 Notes

This sprint should distinguish between:

1. **hidden**: role disallows the block entirely
2. **empty**: role allows it, but there is nothing useful to show right now
3. **ready**: role allows it and the block has actionable content

Examples:

1. `conversation_workspace` becomes `empty` when the signed-in user has no active conversation
2. `recent_conversations` becomes `empty` when the user has no prior conversation history but remains visible as a workspace-orientation surface
3. `routing_review` becomes `empty` when the admin queue has no items
4. `lead_queue` becomes `empty` when there are no submitted leads in scope, but remains `hidden` for non-admin users even if lead data exists elsewhere
5. `system_health` remains role-gated first and should not opportunistically load protected diagnostics for non-admin roles

Sprint 3 should treat shipped loader payload state as the primary runtime signal. Do not duplicate loader logic in client components just to derive `ready` vs `empty` a second time.

Implementation note: the shipped Sprint 3 route passes loader-derived block states into the shared runtime context so the visibility helper can stay centralized without reimplementing per-block loader rules.

### Task 3.1 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-visibility.test.ts
```

---

## Task 3.2 - Formalize dashboard ordering from category and state

**What:** Replace static or incidental ordering with an explicit operator-value ordering helper that respects priority, category, and runtime state.

| Item | Detail |
| --- | --- |
| **Create or Modify** | `src/lib/dashboard/dashboard-ordering.ts` |
| **Create or Modify** | corresponding tests |
| **Modify** | `src/app/dashboard/page.tsx` |
| **Spec** | `DRB-085` through `DRB-089`, `DRB-102` |

### Task 3.2 Notes

Ordering should remain predictable across roles.

Suggested precedence:

1. primary `ready` blocks
2. primary `empty` blocks
3. secondary `ready` blocks
4. secondary `empty` blocks
5. tertiary/system blocks last

Keep the helper deterministic and testable. Do not let component render order be the only source of truth.

Implementation note: the shipped ordering helper ranks by load-priority bucket first, then category, then registry order as the stable tiebreak.

The ordering helper must preserve already-shipped operator intent from prior sprints:

1. workspace users should continue to see `conversation_workspace` and `recent_conversations` first
2. admin users should continue to see `lead_queue` before `routing_review`
3. `system_health` should remain last unless a future sprint explicitly changes the policy
4. empty-but-useful orientation blocks should not leapfrog more actionable `ready` blocks

### Task 3.2 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-ordering.test.ts src/app/dashboard/page.test.tsx
```

---

## Task 3.3 - Add mixed-role and mixed-state regression coverage

**What:** Ensure the dashboard stays coherent when different roles, empty states, and runtime conditions interact.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/dashboard/page.test.tsx` |
| **Modify** | `src/lib/dashboard/dashboard-loaders.test.ts` |
| **Modify** | `src/lib/dashboard/dashboard-visibility.test.ts` |
| **Modify** | block component tests as needed |
| **Spec** | `DRB-103` through `DRB-109` |

### Task 3.3 Notes

Cover at minimum:

1. authenticated, staff, and admin users receive different block sets from the same dashboard route
2. empty-state blocks remain visible when they are still useful orientation surfaces
3. hidden blocks do not load protected data
4. ordering remains stable across mixed-role scenarios

If staff gains selected operational blocks, verify that explicitly instead of relying on broad admin behavior.

Because Sprint 2 pulled forward real founder workflow, mixed-state regression coverage should now include more than visibility alone:

1. admin lead queue still renders existing founder notes and `last_contacted_at` metadata in ready state
2. lead-queue filters do not change role boundaries or cause hidden blocks to load for non-admin users
3. the explicit admin mutation exception remains narrow: only the triage route is writable, while routing review and the rest of the dashboard remain read-only
4. Sprint 1 workspace behaviors such as reopening a selected recent conversation are not accidentally displaced by new ordering or runtime wrappers

### Task 3.3 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts src/lib/dashboard/dashboard-visibility.test.ts src/app/dashboard/page.test.tsx src/components/dashboard/*.test.tsx
```

---

## Task 3.4 - Record the final dashboard-block operating contract

**What:** Preserve the final block-state rules and ordering policy so future dashboard work extends the system instead of bypassing it.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/dashboard-rbac-blocks/spec.md` if architecture details changed materially |
| **Modify** | `docs/_specs/dashboard-rbac-blocks/sprints/sprint-3-runtime-conditions-ordering-and-mixed-role-regressions.md` |
| **Spec** | `DRB-055` through `DRB-057`, `DRB-085` through `DRB-089` |

### Task 3.4 Notes

Document any of the following if they shift during implementation:

1. which blocks use `empty` rather than `hidden` when no data exists
2. whether category or priority is the stronger ordering signal
3. any staff-role exceptions to the default role map
4. the explicit exception that `lead_queue` is an admin-writable operational block while most dashboard surfaces remain read-only
5. which already-shipped behaviors from Sprints 0, 1, and 2 were promoted into Sprint 3 regression scope

### Task 3.4 Verify

```bash
npm run typecheck
```

---

## Completion Checklist

- [x] Each shipped dashboard block can resolve to `ready`, `empty`, or `hidden` without regressing Sprint 0, 1, or 2 behavior
- [x] Dashboard ordering is explicit, deterministic, and preserves shipped operator-value intent across workspace and admin roles
- [x] Mixed-role scenarios are covered by regression tests, including authenticated, staff, and admin combinations
- [x] Hidden blocks do not load protected data and empty blocks remain visible only when they still provide useful orientation
- [x] Sprint 1 workspace reopen behavior and Sprint 2 lead-triage workflow are included in Sprint 3 non-regression coverage
- [x] The final dashboard operating contract documents the narrow writable exception for admin lead triage

## Implementation Verification

- Focused validation passed: `npm run test -- src/lib/dashboard/dashboard-visibility.test.ts src/lib/dashboard/dashboard-ordering.test.ts src/app/dashboard/page.test.tsx`

## QA Deviations

- Sprint 3 must inherit the Sprint 0 anonymous redirect to `/login` rather than redefining anonymous handling.
- Sprint 3 must inherit the Sprint 1 server-loaded workspace baseline and selected-conversation reopen path instead of replacing it with dashboard-owned client state.
- Sprint 3 must inherit the Sprint 2 admin lead queue as a real workflow surface, not downgrade it to a placeholder or read-only summary.
