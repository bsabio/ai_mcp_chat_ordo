# Sprint 5 - Founder-Approved Customer Continuity

> **Goal:** Close the last high-value workflow gap by making founder-approved downstream records discoverable to signed-in users, while tightening owner access so customer-visible continuity only comes from reviewed records.
> **Spec ref:** `FLOW-003`, `FLOW-019`, `FLOW-052`, `FLOW-071`, `FLOW-088`, `FLOW-120` through `FLOW-124`, `FLOW-140`, `FLOW-141`, `FLOW-147`
> **Prerequisite:** Sprint 4 complete
> **Business refs:** `docs/_business/specs/deals-and-estimation/spec.md`, `docs/_business/specs/lane-routing-and-training-path/spec.md`
> **Verified test count:** `70 focused route, dashboard, and workflow-eval tests` across `src/app/api/deals/[id]/route.test.ts` (11), `src/app/api/training-paths/[id]/route.test.ts` (11), `src/lib/dashboard/dashboard-loaders.test.ts` (24), `src/lib/dashboard/dashboard-visibility.test.ts` (11), `src/app/dashboard/page.test.tsx` (6), `src/components/dashboard/CustomerWorkflowContinuityBlock.test.tsx` (2), and `tests/customer-workflow-evals.test.ts` (5)
> **Status:** Complete on 2026-03-20
> **Historical note (2026-03-24):** This sprint closed customer continuity while the dashboard-era surface still existed. References below to dashboard loaders, dashboard visibility/block registration, or dashboard page rendering should be read as historical implementation context rather than the current operator-owned runtime boundary.

---

## Outcome

Sprint 4 completed the founder-side workflow for consultation requests, deals, and individual training paths. Sprint 5 is now complete: the repo exposes founder-approved downstream continuity to signed-in users, keeps owner reads gated to approved states, and verifies the surface with focused route, dashboard, and eval coverage.

1. `FLOW-088` is satisfied through the signed-in dashboard continuity block, which now exposes owner-safe detail links plus conversation follow-up for approved deals and training recommendations.
2. `FLOW-121` is satisfied through explicit owner-facing visibility guards on deals and training paths plus regression coverage that keeps founder-only fields hidden.
3. `FLOW-123` remains structurally sound because owner payloads continue to sanitize founder-only fields; Sprint 5 should preserve that pattern rather than redesign the models.
4. `FLOW-147` remains satisfied for founder operations because Sprint 5 did not add extra founder dashboard complexity.

Sprint 5 should stay small and finish the value loop instead of expanding into proposals, enrollment, or a full client portal.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/app/api/deals/[id]/route.ts` | Owner-safe deal detail already exists and strips internal founder fields, so Sprint 5 can tighten visibility rules instead of inventing a new deal read path |
| `src/app/api/training-paths/[id]/route.ts` | Owner-safe training-path detail already exists and already distinguishes admin from owner payloads |
| `src/core/entities/deal-record.ts` | Deal status unions already distinguish customer-response states from founder-internal draft and estimate states |
| `src/core/entities/training-path-record.ts` | Training-path status unions already distinguish recommendation and follow-up states, giving Sprint 5 a clear place to define customer-visible statuses |
| `src/lib/dashboard/dashboard-loaders.ts` | Dashboard loaders already assemble server-side data blocks, so Sprint 5 can add a customer continuity block without adding a separate frontend state system |
| `src/lib/dashboard/dashboard-blocks.ts` and `src/lib/dashboard/dashboard-visibility.ts` | Block registration and role-based visibility are already centralized |
| `src/app/dashboard/page.tsx` | The signed-in non-admin dashboard currently renders only conversation workspace and recent conversations, which is the exact place where a minimal continuity block belongs |
| `src/components/dashboard/CustomerWorkflowContinuityBlock.tsx` | The customer continuity block already exists and renders `Now` and `Next` groupings for approved deals and training recommendations |
| `src/components/dashboard/CustomerWorkflowContinuityBlock.test.tsx` | Focused rendering coverage already exists for approved continuity items and the empty state |
| `src/lib/dashboard/dashboard-loaders.test.ts` | Includes focused customer-continuity loader coverage for approved and unapproved downstream records |
| `src/lib/dashboard/dashboard-visibility.test.ts` | Includes visibility coverage for the `customer_workflow_continuity` block in authenticated non-admin runtime context |
| `src/app/api/consultation-requests/[id]/route.ts` | Consultation workflow already exists, so Sprint 5 does not need to reopen consultation creation or review states |
| `tests/customer-workflow-evals.test.ts` | Deterministic workflow eval coverage already includes a customer-continuity scenario instead of requiring a new harness |

---

## Task 5.1 - Enforce founder-approved owner visibility on downstream records

**What:** Tighten owner-facing record reads so authenticated users can only fetch downstream records after the founder has moved them into a customer-visible state.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/api/deals/[id]/route.ts` |
| **Modify** | `src/app/api/training-paths/[id]/route.ts` |
| **Modify** | any shared helpers or entity helpers needed to define customer-visible statuses |
| **Modify** | route tests near each route |
| **Spec** | `FLOW-071`, `FLOW-088`, `FLOW-120` through `FLOW-124`, `FLOW-140` |

### Task 5.1 Notes

Sprint 5 should make the approval rule explicit rather than leaving it implicit in owner-safe sanitization.

Required rules:

1. Admin users keep full access to all downstream states.
2. Authenticated owners can fetch only their own record and only when the record is in a founder-approved customer-visible status.
3. Founder-internal draft or pre-approval states must return `403` or `404` to owners rather than leaking that a downstream object exists.
4. Owner payloads must keep excluding founder-only fields such as `founderNote`, internal source identifiers, and internal scoring or rationale that is not meant for the customer.
5. Keep the customer-visible status rules small and explicit in code so tests can assert them directly.

Suggested first-cut visibility rules:

1. Deals become customer-visible only once they reach a founder-approved owner-visible state such as `estimate_ready`, `agreed`, or `declined`.
2. Training paths become customer-visible only once they reach a founder-approved recommendation state such as `recommended`, `screening_requested`, `deferred`, or `closed`.

Do not add a new approval table or a separate publication workflow. Status-based visibility is enough for the first complete slice.

### Task 5.1 Verify

```bash
npx vitest run src/app/api/deals/[id]/route.test.ts src/app/api/training-paths/[id]/route.test.ts
npm run typecheck
```

Verification passed on 2026-03-20.

---

## Task 5.2 - Add a signed-in dashboard continuity block for approved next steps

**What:** Give authenticated users a minimal workspace block that shows founder-approved downstream records and the next action they can actually take.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-loaders.ts` |
| **Modify** | `src/lib/dashboard/dashboard-blocks.ts` |
| **Modify** | `src/lib/dashboard/dashboard-visibility.ts` |
| **Modify** | `src/components/dashboard/CustomerWorkflowContinuityBlock.tsx` |
| **Modify** | `src/app/dashboard/page.tsx` |
| **Modify** | related loader, visibility, block, and page tests |
| **Spec** | `FLOW-003`, `FLOW-019`, `FLOW-052`, `FLOW-088`, `FLOW-121`, `FLOW-123`, `FLOW-141` |

### Task 5.2 Notes

This block should stay intentionally narrow. It is not a full portal and does not need separate navigation, messaging, or document management.

The block should:

1. Render only for authenticated non-admin users.
2. Show founder-approved deals and founder-approved training-path recommendations associated with the signed-in user.
3. Group items into a practical `Now` and `Next` view, with an optional empty state when no approved follow-up exists yet.
4. Prefer customer-safe fields that already exist, such as `customerSummary`, `status`, `recommendedPath`, scoped deal title or summary, and any existing customer response state.
5. Link to the existing owner-safe detail routes for each record instead of creating a new detail UI in Sprint 5.

Each item should show at minimum:

1. Record type
2. Title or recommendation label
3. Customer-visible summary
4. Current status
5. Clear next action text

The empty state should explain that founder-reviewed next steps will appear here once ready, which preserves continuity without exposing internal queue states.

Do not add consultation-request pipeline detail here unless it is already represented through a founder-approved downstream record. The point of Sprint 5 is to satisfy `FLOW-088`, not to expose raw internal review stages.

### Task 5.2 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts src/lib/dashboard/dashboard-visibility.test.ts src/app/dashboard/page.test.tsx src/components/dashboard/CustomerWorkflowContinuityBlock.test.tsx
npm run typecheck
```

Verification passed on 2026-03-20.

---

## Task 5.3 - Extend tests and workflow evals for customer continuity

**What:** Prove that customer continuity now follows the spec and that owners cannot see unapproved downstream records.

| Item | Detail |
| --- | --- |
| **Modify** | `tests/customer-workflow-evals.test.ts` |
| **Modify if needed** | any shared eval fixtures needed for approved and unapproved downstream states |
| **Spec** | `FLOW-088`, `FLOW-121`, `FLOW-123`, `FLOW-140`, `FLOW-147` |

### Task 5.3 Notes

Add the minimum new coverage needed to lock the behavior in place.

Required checks:

1. Owner cannot fetch an unapproved deal or training-path record.
2. Owner can fetch the same record after it reaches a customer-visible status.
3. The signed-in dashboard shows approved downstream records and hides founder-only notes.
4. Existing founder dashboard behavior stays intact.

The repo already contains a customer-continuity eval scenario, so Sprint 5 prep should treat the deterministic eval as a verification surface first and expand it only if the approval boundary changes.

Add or preserve one deterministic eval that covers this end-to-end shape:

1. Signed-in individual or buyer completes the workflow.
2. Founder reviews and approves the downstream record.
3. Customer dashboard now shows the approved next step.
4. Customer detail view excludes founder-only metadata.

### Task 5.3 Verify

```bash
npx vitest run tests/customer-workflow-evals.test.ts
npm run test -- --runInBand
```

Focused eval verification passed on 2026-03-20 via `npx vitest run tests/customer-workflow-evals.test.ts` as part of the 70-test Sprint 5 slice.

---

## Definition Of Done

Sprint 5 is done when all of the following are true.

1. Owner-facing downstream detail routes require both ownership and a founder-approved customer-visible state.
2. Signed-in users have a discoverable dashboard block that surfaces approved deals and training-path recommendations.
3. Customer-visible payloads continue to exclude founder-only notes and internal workflow metadata.
4. Tests and evals cover the approved-versus-unapproved access boundary and the new dashboard continuity surface.
5. The result feels complete enough to move on without reopening proposals, enrollment, or a full client portal.