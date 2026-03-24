# Sprint 4 - Solopreneur Admin Completion And Actionability

> **Goal:** Finish the admin dashboard as a credible solopreneur operator console by replacing the `system_health` scaffold with truthful runtime data, making `routing_review` directly actionable from each queue item, and shipping the next tranche of admin-only intelligence blocks that close the gap between the current dashboard and the solo-operator business brief.
> **Spec ref:** `DRB-035`, `DRB-042` through `DRB-045`, `DRB-060` through `DRB-065`, `DRB-079`, `DRB-082` through `DRB-089`, `DRB-100` through `DRB-109`
> **Prerequisite:** Sprint 3 complete
> **Test count target:** 677 existing + 18 new = 695 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/app/dashboard/page.tsx` | Sprint 4 now loads and renders an expanded admin operator console, including real `system_health`, `anonymous_opportunities`, `recurring_pain_themes`, and `funnel_recommendations` blocks |
| `src/lib/dashboard/dashboard-blocks.ts` | The shipped registry now defines the Sprint 4 admin-complete block catalog for the current solo-founder baseline |
| `src/lib/dashboard/dashboard-loaders.ts` | The loader layer now owns truthful `ready` versus `empty` state for workspace, routing review, lead queue, system health, anonymous opportunities, recurring themes, and funnel recommendations |
| `src/components/dashboard/RoutingReviewBlock.tsx` | The routing review block now exposes direct conversation drill-ins for each queue type while remaining read-only |
| `src/components/dashboard/LeadQueueBlock.tsx` and `src/components/dashboard/RecentConversationsBlock.tsx` | The dashboard already contains established reopen-link patterns that Sprint 4 should reuse for actionable drill-ins |
| `scripts/admin-diagnostics.ts`, `scripts/admin-health-sweep.ts`, `operations/admin-runbook.md`, and `release/manifest.json` | The repo already has operational data sources that can inform a truthful `system_health` block rather than leaving it as decorative scaffolding |
| `docs/_business/specs/solo-operator-dashboard/spec.md` and `docs/_specs/dashboard-rbac-blocks/spec.md` | The business and architecture specs already expect the solo founder to see hot leads, deals requiring review, high-intent anonymous conversations, recurring pain themes, and funnel recommendation surfaces from the dashboard |

---

## Inherited Baseline Sprint 4 Must Preserve

Sprint 4 must extend the shipped dashboard rather than re-open settled Sprint 0 through Sprint 3 behavior.

Current baseline to treat as non-regression scope:

1. `/dashboard` remains a signed-in route that redirects anonymous users to `/login`.
2. The block registry remains the source of truth for dashboard block IDs, role allowlists, categories, and priorities.
3. Authenticated and staff users still receive workspace-only blocks unless the registry is explicitly changed.
4. Admin users continue to receive `lead_queue`, `routing_review`, and `system_health`, with deterministic ordering enforced by the shared helper.
5. `lead_queue` remains the writable founder workflow surface for triage state, founder notes, and `last_contacted_at`.
6. `routing_review` remains read-only in terms of data mutation, even after Sprint 4 adds drill-in links.
7. Hidden admin blocks must continue to fail closed and must not load protected data for non-admin roles.
8. Recent conversation and lead-queue reopen links through `/?conversationId=<id>` remain the canonical conversation drill-in pattern.

---

## Task 4.1 - Replace the `system_health` scaffold with a truthful admin operations block

**What:** Promote `system_health` from a placeholder card into a real admin-only operations block backed by server-owned diagnostics data.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-loaders.ts` |
| **Modify** | `src/lib/dashboard/dashboard-loaders.test.ts` |
| **Create** | `src/components/dashboard/SystemHealthBlock.tsx` |
| **Create** | `src/components/dashboard/SystemHealthBlock.test.tsx` |
| **Modify** | `src/app/dashboard/page.tsx` |
| **Modify** | `src/app/dashboard/page.test.tsx` |
| **Spec** | `DRB-035`, `DRB-060` through `DRB-065`, `DRB-082`, `DRB-087`, `DRB-106` |

### Task 4.1 Notes

The goal is not to build a full observability console. The goal is to give a solo founder truthful answers to a narrow set of operational questions from the same workspace shell.

Minimum useful `system_health` surface:

1. release/build identity, such as version or manifest timestamp
2. runtime or environment status summary suitable for a founder/operator, not raw infrastructure noise
3. admin-runbook-oriented warnings or checks when something is degraded
4. empty state only when the system cannot provide trustworthy health data, not as a permanent placeholder

Do not fetch diagnostics from the client. This block must use a server-owned loader and remain admin-only.

### Task 4.1 Positive Tests

1. `loadSystemHealthBlock(user)` returns `ready` with truthful diagnostics for an admin user when release and runtime data are available.
2. The dashboard page renders `SystemHealthBlock` instead of `DashboardPlaceholderBlock` for admins.
3. The block displays a degraded/warning summary when the loader returns warnings but still has usable data.
4. The block stays ordered last among current admin blocks unless a higher-level ordering policy is explicitly updated.

### Task 4.1 Negative Tests

1. `loadSystemHealthBlock(user)` throws or fails closed for non-admin users.
2. The dashboard route does not call the system-health loader for `AUTHENTICATED` or `STAFF` users.
3. The block does not render fake success values when the diagnostics source is unavailable; it renders an explicit empty/degraded contract instead.
4. Existing admin blocks do not regress back into placeholder rendering because of the new system-health loader wiring.

### Task 4.1 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts src/components/dashboard/SystemHealthBlock.test.tsx src/app/dashboard/page.test.tsx
```

---

## Task 4.2 - Make `routing_review` actionable with direct conversation drill-ins

**What:** Turn the routing review queues into real workflow entry points by linking each queue item back to the underlying conversation using the established reopen pattern.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-loaders.ts` |
| **Modify** | `src/lib/dashboard/dashboard-loaders.test.ts` |
| **Modify** | `src/components/dashboard/RoutingReviewBlock.tsx` |
| **Modify** | `src/components/dashboard/RoutingReviewBlock.test.tsx` |
| **Modify** | `src/app/dashboard/page.test.tsx` if route-level assertions need coverage |
| **Spec** | `DRB-035`, `DRB-042` through `DRB-045`, `DRB-079`, `DRB-087`, `DRB-103` through `DRB-109` |

### Task 4.2 Notes

Sprint 4 should preserve `routing_review` as read-only analytics, but it must stop being a dead-end summary.

Required behavior:

1. each recent lane change item exposes a link into `/?conversationId=<id>`
2. each uncertain conversation item exposes the same drill-in path
3. each follow-up-ready item exposes the same drill-in path
4. the block remains read-only with respect to routing mutations; drill-in is navigation, not edit-in-place

This should reuse the same conversation reopen path already trusted by `recent_conversations` and `lead_queue`.

### Task 4.2 Positive Tests

1. Routing review loader rows include a normalized `href` for all three queue types.
2. The rendered block exposes conversation links for recent changes, uncertain items, and follow-up-ready items.
3. Clicking or rendering those links preserves the `/?conversationId=<id>` reopen contract instead of inventing a second navigation pattern.
4. Existing empty-state messaging still renders when a queue subsection has no items.

### Task 4.2 Negative Tests

1. Non-admin users still cannot load routing-review data or see the block.
2. Queue rows with missing conversation IDs are dropped or handled safely rather than producing broken links.
3. The block does not expose mutation controls, editable lane fields, or founder-write affordances that would violate its read-only boundary.
4. Adding links does not displace `lead_queue` ahead-of-`routing_review` ordering or workspace reopen behavior.

### Task 4.2 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts src/components/dashboard/RoutingReviewBlock.test.tsx src/app/dashboard/page.test.tsx
```

---

## Task 4.3 - Ship the next solopreneur admin intelligence tranche

**What:** Add the next set of admin-only dashboard blocks that make the dashboard materially closer to the solo-operator business brief instead of stopping at leads plus routing review.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-blocks.ts` |
| **Modify** | `src/lib/dashboard/dashboard-loaders.ts` |
| **Modify** | `src/lib/dashboard/dashboard-loaders.test.ts` |
| **Create** | new admin-only block components and tests under `src/components/dashboard/` |
| **Modify** | `src/app/dashboard/page.tsx` |
| **Modify** | `src/app/dashboard/page.test.tsx` |
| **Modify** | `src/lib/dashboard/dashboard-ordering.test.ts` and `src/lib/dashboard/dashboard-visibility.test.ts` as needed |
| **Spec** | `DRB-035`, `DRB-045`, `DRB-079`, `DRB-082` through `DRB-089`, `DRB-100` through `DRB-109` |

### Task 4.3 Notes

To keep Sprint 4 bounded but meaningful, this sprint should add the highest-value missing admin-only tranche rather than every future dashboard idea at once.

Implemented Sprint 4 tranche:

1. `anonymous_opportunities`: high-intent anonymous conversations worth founder attention
2. `recurring_pain_themes`: repeated demand and problem signals grouped from conversation and lead summaries
3. `funnel_recommendations`: concise next-step recommendations derived from dashboard and analytics signals

`deals_review` remains intentionally deferred because the repo still lacks a truthful deals domain and persistence layer. Sprint 4 closes the current admin-console gap without fabricating a commercial object model that has not shipped yet.

Each new block must have:

1. a registry entry with explicit priority and category
2. a server-owned loader returning truthful `ready` or `empty`
3. a truthful empty state rather than filler content
4. direct drill-ins or next actions when actionable rows exist

### Task 4.3 Positive Tests

1. Admin users see the new tranche of blocks in the expected order based on priority, category, and runtime state.
2. Each new loader returns `ready` when its underlying data source has actionable items.
3. Each new block renders concrete summaries or queue rows rather than placeholder copy when data exists.
4. At least one direct action or drill-in is available per ready-state block so the founder can move from signal to action.
5. Empty-state blocks remain visible when they still provide useful orientation and become hidden only when role gating requires it.

### Task 4.3 Negative Tests

1. Non-admin users do not see or load the new intelligence blocks.
2. Empty-state blocks do not invent fake deals, anonymous leads, or recommendations.
3. Ordering remains deterministic when one or more new blocks are `empty` while existing blocks are `ready`.
4. Broken or partial source data is normalized into safe empty-state behavior instead of throwing at render time.
5. The new tranche does not push workspace blocks below tertiary admin scaffolding for signed-in non-admin users.

### Task 4.3 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts src/lib/dashboard/dashboard-ordering.test.ts src/lib/dashboard/dashboard-visibility.test.ts src/app/dashboard/page.test.tsx src/components/dashboard/*.test.tsx
```

---

## Task 4.4 - Add solopreneur-oriented admin regression coverage

**What:** Lock the dashboard against regressions now that it is expanding beyond the initial admin pipeline surfaces.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/dashboard/page.test.tsx` |
| **Modify** | `src/lib/dashboard/dashboard-loaders.test.ts` |
| **Modify** | `src/lib/dashboard/dashboard-ordering.test.ts` |
| **Modify** | `src/lib/dashboard/dashboard-visibility.test.ts` |
| **Modify** | component tests for all affected admin blocks |
| **Spec** | `DRB-100` through `DRB-109` |

### Task 4.4 Notes

This regression layer should test the dashboard the way a solo founder actually uses it: one admin identity, mixed ready/empty states, and direct movement from signal to action.

Required coverage areas:

1. admin dashboard remains actionable even when some blocks are empty and others are ready
2. workspace reopen paths still work after adding more admin blocks
3. all admin-only loaders remain fail-closed
4. ordering remains comprehensible under mixed-state pressure rather than just under happy-path all-ready data

### Task 4.4 Positive Tests

1. Admin sees a coherent mixed-state dashboard where ready pipeline blocks stay above empty intelligence and operations blocks.
2. Recent conversations, lead queue, and routing review all continue to expose working conversation drill-ins.
3. A ready `system_health` block and at least one ready intelligence block coexist without breaking ordering or layout expectations.
4. Founder-write behavior remains limited to lead triage while all other admin blocks stay read-only.

### Task 4.4 Negative Tests

1. Hidden admin blocks never load for signed-in non-admin users, even as the block catalog expands.
2. The presence of additional admin blocks does not remove or reorder the signed-in workspace blocks for non-admin users.
3. No new admin block accidentally introduces client-only security checks in place of server-enforced loader boundaries.
4. The addition of multiple new blocks does not cause duplicate registry IDs, unstable sorting, or placeholder fallback rendering for implemented blocks.

### Task 4.4 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts src/lib/dashboard/dashboard-visibility.test.ts src/lib/dashboard/dashboard-ordering.test.ts src/app/dashboard/page.test.tsx src/components/dashboard/*.test.tsx
```

---

## Task 4.5 - Record the admin-complete solopreneur contract

**What:** Update the dashboard spec and Sprint 4 record so the repo reflects the intended admin-complete operator console rather than the earlier transitional baseline.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/dashboard-rbac-blocks/spec.md` |
| **Modify** | `docs/_specs/dashboard-rbac-blocks/sprints/sprint-4-solopreneur-admin-completion-and-actionability.md` |
| **Spec** | `DRB-035`, `DRB-045`, `DRB-082` through `DRB-089`, `DRB-100` through `DRB-109` |

### Task 4.5 Notes

Document at minimum:

1. that the primary solopreneur operator persona is the `ADMIN` role
2. which blocks are considered part of the admin-complete dashboard baseline after Sprint 4
3. which admin blocks are writable versus read-only
4. the canonical drill-in pattern for conversation-backed admin queues
5. any intentionally deferred solo-operator surfaces that remain out of scope after Sprint 4

### Task 4.5 Verify

```bash
npm run typecheck
```

---

## Completion Checklist

- [x] `system_health` is no longer a placeholder and instead renders truthful server-owned diagnostics for admins
- [x] `routing_review` queue items are directly actionable through conversation drill-ins without becoming writable
- [x] The next admin-only solopreneur intelligence tranche is shipped as real dashboard blocks with truthful ready and empty states
- [x] Non-admin users still do not load or see admin-only operational and intelligence blocks
- [x] Dashboard ordering remains deterministic and comprehensible after the admin block catalog expands
- [x] The spec documents the admin-complete solopreneur dashboard baseline and any intentionally deferred surfaces

## Implementation Verification

- `npm run test -- src/lib/dashboard/dashboard-blocks.test.ts src/lib/dashboard/dashboard-visibility.test.ts src/lib/dashboard/dashboard-ordering.test.ts src/lib/dashboard/dashboard-loaders.test.ts src/app/dashboard/page.test.tsx src/components/dashboard/*.test.tsx`
- `npm run typecheck`

## QA Deviations

- Sprint 4 assumes the solopreneur operator persona is `ADMIN`; no expansion of founder-operational access to `STAFF` is implied unless the registry and tests are explicitly changed.
- Sprint 4 should reuse the existing `/?conversationId=<id>` reopen pattern for routing-review and any new conversation-backed admin queues rather than creating multiple drill-in conventions.
- Sprint 4 does not ship `deals_review`. That remains deferred until the deals system exists as a truthful server-backed domain rather than a placeholder block.
- Sprint 4 must not solve the entire future analytics roadmap in one pass. The scope is to close the three current QA gaps: a real `system_health` block, actionable routing review, and the next meaningful admin-only block tranche.