# Sprint 2 - Founder And Admin Operations Blocks

> **Goal:** Promote founder/admin operational intelligence into admin-only dashboard blocks so routing review and future lead triage live in the dashboard instead of remaining isolated route or MCP surfaces.
> **Spec ref:** `DRB-035`, `DRB-042` through `DRB-045`, `DRB-060` through `DRB-065`, `DRB-078` through `DRB-080`, `DRB-082` through `DRB-089`, `DRB-091` through `DRB-094`
> **Prerequisite:** Sprint 1 complete
> **Test count target:** 658 existing + 10 new = 668 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `mcp/analytics-tool.ts` | The analytics layer already exposes `conversation_analytics(metric: "routing_review")`, which returns recently changed, uncertain, and follow-up-ready routing queues suitable for founder-facing dashboard blocks |
| `src/app/api/admin/routing-review/route.ts` | The repo now has a read-only admin-only route that returns the routing review queue with `timeRange` and `limit` controls |
| `src/app/api/admin/routing-review/route.test.ts` | Existing route tests already cover admin-only access, invalid query validation, and the current route contract |
| `docs/_specs/progressive-contact-capture/spec.md` | Contact capture explicitly expects leads to become dashboard-prioritized records, making a future `lead_queue` block a direct dependency |
| `docs/_business/specs/solo-operator-dashboard/spec.md` | The business dashboard spec prioritizes hot leads, deals pipeline, high-intent anonymous conversations, and recommendation surfaces for the founder workflow |
| `src/lib/dashboard/dashboard-blocks.ts` | Sprint 0 should already define admin-capable block IDs and category metadata |
| `src/lib/dashboard/dashboard-loaders.ts` | Sprint 1 should already establish the pattern for server-owned block data loading |

---

## Task 2.1 - Add admin-only block loaders for routing review and lead operations

**What:** Extend the dashboard loader layer with admin-only operational block data sourced from existing read-only boundaries.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-loaders.ts` |
| **Modify** | `src/lib/dashboard/dashboard-loaders.test.ts` |
| **Spec** | `DRB-060` through `DRB-065`, `DRB-078` through `DRB-080`, `DRB-091` through `DRB-094` |

### Task 2.1 Notes

Start with the routing review block and a truthful placeholder/empty block for leads if contact-capture backend work is not yet fully surfaced.

Recommended first loaders:

1. `loadRoutingReviewBlock(user)` backed by `GET /api/admin/routing-review` or equivalent direct server call
2. `loadLeadQueueBlock(user)` returning either real lead data or a temporary empty-state contract until progressive contact-capture surfaces are finished

Admin-only loader functions should fail closed for non-admin users.

### Task 2.1 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts src/app/api/admin/routing-review/route.test.ts
```

---

## Task 2.2 - Render founder/admin operational blocks on the dashboard

**What:** Surface admin-only routing review and pipeline blocks in the dashboard’s primary action area.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/dashboard/page.tsx` |
| **Create** | `src/components/dashboard/RoutingReviewBlock.tsx` |
| **Create** | `src/components/dashboard/LeadQueueBlock.tsx` |
| **Create** | supporting tests near the new components |
| **Spec** | `DRB-035`, `DRB-079`, `DRB-082`, `DRB-087` |

### Task 2.2 Notes

The routing review block should present concrete operational queues, not just summary counts.

Minimum useful rendering:

1. recent lane changes with timestamps
2. uncertain conversations needing review
3. follow-up-ready conversations

The lead queue block should be intentionally scoped. If the lead pipeline is not yet fully implemented, render a truthful placeholder state with the planned data shape rather than fake content.

### Task 2.2 Verify

```bash
npx vitest run src/app/dashboard/page.test.tsx src/components/dashboard/RoutingReviewBlock.test.tsx src/components/dashboard/LeadQueueBlock.test.tsx
```

---

## Task 2.3 - Add founder/admin block ordering and categorization rules

**What:** Ensure operational blocks land in the right dashboard zone instead of appearing as an undifferentiated list.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-blocks.ts` |
| **Modify** | `src/lib/dashboard/dashboard-visibility.ts` or dedicated ordering helper |
| **Modify** | block rendering/tests as needed |
| **Spec** | `DRB-082` through `DRB-089` |

### Task 2.3 Notes

Sprint 2 should treat founder/admin operational blocks as primary action blocks.

At minimum, ensure:

1. `routing_review` appears before lower-priority intelligence blocks
2. `lead_queue` appears alongside other pipeline/priority surfaces
3. system-maintenance blocks remain lower in the layout

Do not implement user-customizable ordering yet.

### Task 2.3 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-blocks.test.ts src/app/dashboard/page.test.tsx
```

---

## Task 2.4 - Add admin dashboard regression coverage

**What:** Lock the founder/admin block boundary before Sprint 3 introduces more runtime conditions and mixed-role layout behavior.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/dashboard/page.test.tsx` |
| **Modify** | `src/lib/dashboard/dashboard-loaders.test.ts` |
| **Modify or Create** | admin block component tests |
| **Spec** | `DRB-105`, `DRB-108`, `DRB-109` |

### Task 2.4 Notes

Cover at minimum:

1. admin users receive routing review and other operational blocks
2. authenticated and staff users do not receive admin-only blocks unless explicitly allowed by the registry
3. admin blocks remain read-only in their UI and loader contracts
4. routing review block data stays aligned with the existing admin route contract

### Task 2.4 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts src/app/dashboard/page.test.tsx src/components/dashboard/*.test.tsx
```

---

## Task 2.5 - Record the founder/admin block boundary

**What:** Preserve decisions about whether dashboard blocks call routes directly, which operational blocks shipped, and what remained intentionally placeholder.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/dashboard-rbac-blocks/sprints/sprint-2-founder-and-admin-operations-blocks.md` |
| **Spec** | `DRB-042` through `DRB-045`, `DRB-078` through `DRB-080` |

### Task 2.5 Notes

Document any of the following if they shift during implementation:

1. whether the routing review block uses the admin API route or a shared server loader path
2. whether staff receives any founder-operational blocks in Sprint 2
3. which pipeline blocks are placeholder-only pending contact-capture or deals work

### Task 2.5 Verify

```bash
npm run typecheck
```

---

## Completion Checklist

- [x] Admin-only dashboard blocks exist for routing review and operational pipeline work
- [x] Admin block data is loaded through server-owned, fail-closed loaders
- [x] Founder/admin blocks render concrete review queues rather than summary-only placeholders where data exists
- [x] Operational blocks appear in the dashboard’s primary action area
- [x] Focused tests cover admin-only access, block ordering, and read-only behavior

## QA Deviations

- Sprint 2 uses a shared server loader path for routing review via `conversationAnalytics(metric: "routing_review")` rather than round-tripping through the admin HTTP route from the dashboard page. The read-only admin route remains available as a separate inspection boundary.
- Staff does not receive any founder-operational blocks in Sprint 2. Admin-only visibility remains the shipped boundary for `routing_review`, `lead_queue`, and `system_health`.
- QA pass on 2026-03-18 found the original Sprint 2 `lead_queue` placeholder to be the remaining product gap and noted that pipeline ordering should prioritize `lead_queue` ahead of `routing_review` for admins. The shipped implementation now loads submitted contact captures directly from persisted `lead_records` joined with conversation routing context and surfaces `lead_queue` before `routing_review` in the admin block order.
- Founder-owned lead triage state was pulled forward on 2026-03-18 so the dashboard no longer behaves like a read-only inbox. Submitted leads now carry persisted `triage_state` values (`new`, `contacted`, `qualified`, `deferred`) and admins can update them directly from the `lead_queue` block through an admin-only PATCH route.
- Founder notes, `last_contacted_at`, and in-block state filters were also pulled forward on 2026-03-18. The lead queue now behaves like a working founder pipeline: admins can record notes, log contact timestamps, and filter the queue by `all`, `new`, `contacted`, `qualified`, or `deferred` without leaving the dashboard.
