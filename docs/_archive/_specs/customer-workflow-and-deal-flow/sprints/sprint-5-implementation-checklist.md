# Sprint 5 - Implementation Checklist

> Status: Complete on 2026-03-20

> Concrete file-by-file targets for each Sprint 5 task.
> Cross-reference: `sprint-5-founder-approved-customer-continuity.md`
> **Historical note (2026-03-24):** The file targets below reflect the dashboard-era implementation boundary in place when Sprint 5 landed. Dashboard-named paths listed here are historical references, not active runtime files.

---

## Task 5.1 - Founder-approved owner visibility on downstream records

**Goal:** Make owner access explicitly depend on both record ownership and a founder-approved customer-visible status.

### 5.1.1 Add explicit customer-visible status helpers

| Action | File |
| --- | --- |
| **Modify** | `src/core/entities/deal-record.ts` |
| **Modify** | `src/core/entities/training-path-record.ts` |
| **Modify** | any small shared helper file only if existing patterns make that cleaner |

Add small, testable helpers for customer-visible states instead of scattering status checks inside route handlers.

Required behavior:

1. deals are customer-visible only in founder-approved owner-visible states such as `estimate_ready`, `agreed`, or `declined`
2. training paths are customer-visible only in founder-approved follow-up states such as `recommended`, `screening_requested`, `deferred`, or `closed`
3. helpers should be easy to import into route tests and dashboard loaders

### 5.1.2 Tighten owner read rules for deals

| Action | File |
| --- | --- |
| **Modify** | `src/app/api/deals/[id]/route.ts` |

Keep the current admin behavior, but change owner access rules so:

1. `ADMIN` can still read any deal
2. authenticated owner can read only their own deal
3. owner must also be blocked unless the deal is in a customer-visible status
4. owner payload must continue to exclude internal-only fields such as `founderNote`, `leadRecordId`, and `consultationRequestId`
5. pre-approval states should fail without leaking internal workflow detail

### 5.1.3 Tighten owner read rules for training paths

| Action | File |
| --- | --- |
| **Modify** | `src/app/api/training-paths/[id]/route.ts` |

Keep the current admin behavior, but change owner access rules so:

1. `ADMIN` can still read any training path
2. authenticated owner can read only their own training path
3. owner must also be blocked unless the record is in a founder-approved customer-visible status
4. owner payload must continue to exclude internal-only fields such as `founderNote`, `leadRecordId`, and `consultationRequestId`
5. draft recommendations must stay founder-only

### 5.1.4 Extend route tests for approved versus unapproved access

| Action | File |
| --- | --- |
| **Modify** | `src/app/api/deals/[id]/route.test.ts` |
| **Modify** | `src/app/api/training-paths/[id]/route.test.ts` |

Cover at minimum:

1. owner gets blocked for their own unapproved deal
2. owner can read the same deal once it reaches a customer-visible status
3. owner gets blocked for their own draft training path
4. owner can read the same training path once it reaches a founder-approved status
5. owner payload still excludes founder-only fields after approval

### 5.1 Verify

```bash
npx vitest run src/app/api/deals/[id]/route.test.ts src/app/api/training-paths/[id]/route.test.ts
npm run typecheck
```

---

## Task 5.2 - Signed-in dashboard continuity block

**Goal:** Give authenticated non-admin users a simple place to see founder-approved downstream records and understand their next step.

### 5.2.1 Add a loader for customer continuity items

| Action | File |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-loaders.ts` |

Add a loader and payload type for a customer-safe continuity block.

The loader should:

1. run only for authenticated non-admin users
2. collect founder-approved deals for the current user
3. collect founder-approved training-path records for the current user
4. map both record types into a unified customer-safe item shape
5. return an empty-state payload when no approved downstream records exist yet

Suggested item fields:

1. `kind`
2. `id`
3. `title`
4. `summary`
5. `status`
6. `nextAction`
7. `href`
8. `group` such as `now` or `next`

### 5.2.2 Register the new dashboard block

| Action | File |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-blocks.ts` |
| **Modify** | `src/lib/dashboard/dashboard-visibility.ts` |

Add a customer block such as `customer_workflow_continuity`.

Visibility rules:

1. visible to authenticated non-admin users
2. hidden for anonymous users
3. hidden for admin users unless the existing architecture requires an explicit exclusion branch
4. should not depend on raw consultation-request or founder-queue state

### 5.2.3 Create the block component

| Action | File |
| --- | --- |
| **Modify** | `src/components/dashboard/CustomerWorkflowContinuityBlock.tsx` |

Render a minimal customer-safe view.

Include:

1. section title and short explanation
2. `Now` and `Next` groupings when items exist
3. per-item record type, title, summary, status, and next action
4. links to the existing owner-safe detail routes
5. empty state that explains founder-reviewed next steps will appear here once ready

Do not add customer mutation controls, inbox patterns, or document download UI in Sprint 5.

### 5.2.4 Wire the continuity block into the dashboard page

| Action | File |
| --- | --- |
| **Modify** | `src/app/dashboard/page.tsx` |

Update signed-in non-admin rendering so the continuity block appears alongside the existing workspace and recent-conversation blocks.

### 5.2.5 Add dashboard tests

| Action | File |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-loaders.test.ts` |
| **Modify** | `src/lib/dashboard/dashboard-visibility.test.ts` |
| **Modify** | `src/app/dashboard/page.test.tsx` |
| **Modify** | `src/components/dashboard/CustomerWorkflowContinuityBlock.test.tsx` |

Cover at minimum:

1. approved deals and training paths load into the continuity payload
2. unapproved records are excluded from the payload
3. the block is visible for authenticated non-admin users and hidden for admins
4. the signed-in dashboard renders the new block
5. founder-only fields never appear in the rendered output
6. the empty state renders when no approved records exist

### 5.2 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts src/lib/dashboard/dashboard-visibility.test.ts src/app/dashboard/page.test.tsx src/components/dashboard/CustomerWorkflowContinuityBlock.test.tsx
npm run typecheck
```

---

## Task 5.3 - Customer continuity eval coverage

**Goal:** Lock the new owner-visibility boundary and customer continuity surface into deterministic regression coverage.

### 5.3.1 Extend workflow eval fixtures and assertions

| Action | File |
| --- | --- |
| **Modify** | `tests/customer-workflow-evals.test.ts` |
| **Modify** | any small eval helper or shared fixture file needed to keep the scenarios readable |

Add one end-to-end continuity scenario that proves:

1. a signed-in user completes the workflow and gets a downstream record
2. that record is hidden while still unapproved
3. founder approval moves it into a customer-visible state
4. the customer dashboard then shows the approved next step
5. the customer detail surface still excludes founder-only fields

The repo already contains a customer continuity eval case, so only expand fixtures or assertions when the approval-boundary contract changes.

If it is cleaner, split the scenario into one deal-focused case and one training-path-focused case, but keep the total surface small.

### 5.3.2 Keep founder-side behavior covered

| Action | File |
| --- | --- |
| **Modify** | existing workflow eval assertions only as needed |

Make sure Sprint 5 does not regress the founder dashboard and downstream workflow behavior that Sprint 4 already verified.

### 5.3 Verify

```bash
npx vitest run tests/customer-workflow-evals.test.ts
npm run test -- --runInBand
```

---

## Sprint 5 Exit Check

Before marking Sprint 5 complete, confirm all of the following:

1. owner-facing downstream detail routes enforce both ownership and founder-approved visibility
2. signed-in users see a discoverable dashboard block for approved next steps
3. founder-only notes and internal workflow metadata remain hidden from customer payloads and UI
4. route tests, dashboard tests, and workflow evals cover the new continuity behavior
5. no proposal, enrollment, or full client-portal scope leaked into the sprint

Validated on 2026-03-20 with:

```bash
npm exec vitest run 'src/app/api/deals/[id]/route.test.ts' 'src/app/api/training-paths/[id]/route.test.ts' 'src/lib/dashboard/dashboard-loaders.test.ts' 'src/lib/dashboard/dashboard-visibility.test.ts' 'src/app/dashboard/page.test.tsx' 'src/components/dashboard/CustomerWorkflowContinuityBlock.test.tsx' 'tests/customer-workflow-evals.test.ts'
npm run typecheck
```