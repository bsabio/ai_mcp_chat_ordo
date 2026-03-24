# Sprint 2 - Qualification And Founder Stage Transitions

> **Goal:** Extend lead qualification with structured signals, add founder-facing consultation-request triage workflow, and wire simple stage transitions through the API and dashboard.
> **Spec ref:** `FLOW-059`, `FLOW-061` through `FLOW-065`, `FLOW-073` through `FLOW-080`, `FLOW-120`, `FLOW-124`, `FLOW-132`, `FLOW-141`
> **Prerequisite:** Sprint 1 complete
> **Test count target:** Full-suite baseline at Sprint 2 start is 761 tests (757 passed, 4 pre-existing failures). Sprint 2 must not increase the failure count.
> **Historical note (2026-03-24):** This sprint was implemented before the dashboard compatibility layer was removed. Dashboard loader, dashboard page, and dashboard component references below are historical implementation guidance rather than the current operator-owned runtime shape.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/core/entities/consultation-request.ts` | Defines `ConsultationRequestStatus` union (`pending`, `reviewed`, `scheduled`, `declined`), `ConsultationRequest` interface, `ConsultationRequestSeed`, and `isConsultationRequestStatus()` type guard |
| `src/core/use-cases/ConsultationRequestRepository.ts` | Repository interface already includes `updateStatus(id, status, metadata?)` — not yet called by any interactor or route |
| `src/adapters/ConsultationRequestDataMapper.ts` | Implements `updateStatus()` against SQLite; already tested for `pending → reviewed` transition and null return for unknown IDs |
| `src/core/use-cases/RequestConsultationInteractor.ts` | Handles creation only; records `consultation_requested` event with `{ consultationRequestId, lane }` metadata |
| `src/app/api/consultation-requests/route.ts` | `POST` only — creates new requests; no PATCH/PUT or `[id]` sub-routes exist |
| `src/lib/dashboard/dashboard-loaders.ts` | `loadConsultationRequestQueueBlock()` is read-only display of pending requests; no founder action affordance |
| `src/components/dashboard/ConsultationRequestsBlock.tsx` | Renders pending requests with title, lane, summary, message count, timestamp, and conversation link; no status-change controls |
| `src/core/entities/lead-record.ts` | `LeadRecord` has `lane`, `roleOrTitle`, `trainingGoal`, `problemSummary`, `triageState`, `founderNote`, but no structured qualification signals for authority, urgency, budget, technical environment, or training-fit |
| `src/lib/db/schema.ts` | `lead_records` table has no columns for structured qualification fields beyond free-text |
| `src/adapters/LeadRecordDataMapper.ts` | `updateTriageState(id, triageState, metadata?)` updates founder triage; no method for qualification field persistence |
| `src/core/use-cases/ConversationEventRecorder.ts` | Generic event recorder; accepts any `eventType: string` with arbitrary metadata |
| `src/lib/chat/conversation-root.ts` | Exports `getConsultationRequestRepository()` and `getRequestConsultationInteractor()`; no triage interactor yet |

---

## Task 2.1 - Add structured lead qualification fields

**What:** Extend the lead record with structured qualification signals so downstream workflow decisions can rely on more than free-text fields.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/db/schema.ts` |
| **Modify** | `src/core/entities/lead-record.ts` |
| **Modify** | `src/adapters/LeadRecordDataMapper.ts` |
| **Create** | focused tests for new qualification field persistence |
| **Spec** | `FLOW-059` through `FLOW-065` |

### Task 2.1 Notes

Add the minimum structured fields needed for qualification scoring without overloading the lead into a deal object.

Recommended additions to `lead_records`:

| Column | Type | Notes |
| --- | --- | --- |
| `authority_level` | `TEXT DEFAULT NULL` | `decision_maker`, `influencer`, `evaluator`, `unknown` |
| `urgency` | `TEXT DEFAULT NULL` | `immediate`, `this_quarter`, `exploring`, `unknown` |
| `budget_signal` | `TEXT DEFAULT NULL` | `confirmed`, `likely`, `unclear`, `none` |
| `technical_environment` | `TEXT DEFAULT NULL` | Free-text for development workflows — stack, platform, constraints |
| `training_fit` | `TEXT DEFAULT NULL` | `beginner`, `intermediate`, `advanced`, `career_transition`, `unknown` |

These fields are nullable because they may not be collected for every lead. They should be persistable via a new `updateQualification(id, fields)` method on the data mapper and reflected in the `LeadRecord` entity.

The contact-capture submission flow (`submitCapture`) does not need to collect these fields at capture time. They can be populated later by system heuristics or founder review.

Do not introduce a separate qualification entity. Keep qualification fields on the existing lead record to avoid premature abstraction.

### Task 2.1 Verify

```bash
npx vitest run src/adapters/LeadRecordDataMapper.test.ts
npm run typecheck
```

---

## Task 2.2 - Add consultation-request triage interactor

**What:** Create a use-case interactor that lets an admin transition consultation requests through founder workflow stages with validation.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/use-cases/TriageConsultationRequestInteractor.ts` |
| **Create** | `src/core/use-cases/TriageConsultationRequestInteractor.test.ts` |
| **Modify** | `src/lib/chat/conversation-root.ts` |
| **Spec** | `FLOW-075`, `FLOW-080`, `FLOW-120`, `FLOW-124`, `FLOW-132` |

### Task 2.2 Notes

The interactor should:

1. Accept `(adminUserId, consultationRequestId, newStatus, founderNote?)`.
2. Validate that the request exists.
3. Enforce legal status transitions:
   - `pending → reviewed` — founder has looked at it
   - `pending → declined` — founder declines without review
   - `reviewed → scheduled` — founder moves to schedule
   - `reviewed → declined` — founder declines after review
   - `scheduled → reviewed` — un-schedule (revert)
   - All other transitions are illegal.
4. Call `consultationRequestRepo.updateStatus(id, status, { founderNote })`.
5. Record a `consultation_status_changed` event with `{ consultationRequestId, fromStatus, toStatus, founderNote }`.

Constructor dependencies: `ConsultationRequestRepository`, `ConversationEventRecorder` (optional).

Add a composition-root factory:

```ts
export function getTriageConsultationRequestInteractor(): TriageConsultationRequestInteractor { ... }
```

### Task 2.2 Verify

```bash
npx vitest run src/core/use-cases/TriageConsultationRequestInteractor.test.ts
npm run typecheck
```

---

## Task 2.3 - Add consultation-request triage route

**What:** Expose an HTTP boundary for founder-initiated status transitions on consultation requests.

| Item | Detail |
| --- | --- |
| **Create** | `src/app/api/consultation-requests/[id]/route.ts` |
| **Create** | `src/app/api/consultation-requests/[id]/route.test.ts` |
| **Spec** | `FLOW-120`, `FLOW-124`, `FLOW-132`, `FLOW-141` |

### Task 2.3 Notes

`PATCH /api/consultation-requests/:id`

Request body:

```json
{
  "status": "reviewed",
  "founderNote": "Looks like a strong fit for org consulting — schedule next week."
}
```

Guards:

- Require `ADMIN` role via `getSessionUser()`
- Return `404` if request not found
- Return `400` for missing or invalid status
- Return `422` for illegal status transition
- Return `200` with the updated record on success
- Use `runRouteTemplate(...)` for consistent error handling

Also add `GET /api/consultation-requests/:id` to fetch a single consultation request for admin review.

### Task 2.3 Verify

```bash
npx vitest run src/app/api/consultation-requests/[id]/route.test.ts
```

---

## Task 2.4 - Add founder triage controls to the dashboard

**What:** Extend the consultation requests dashboard block so the founder can take triage actions without leaving the dashboard.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-loaders.ts` |
| **Modify** | `src/components/dashboard/ConsultationRequestsBlock.tsx` |
| **Modify** | `src/components/dashboard/ConsultationRequestsBlock.test.tsx` |
| **Modify** | `src/app/dashboard/page.test.tsx` |
| **Spec** | `FLOW-087`, `FLOW-120`, `FLOW-141`, `FLOW-147` |

### Task 2.4 Notes

Add lightweight triage actions to each pending request card:

1. "Mark reviewed" button — transitions `pending → reviewed`
2. "Decline" button — transitions `pending → declined`
3. Optional founder note text input

These actions should call `PATCH /api/consultation-requests/:id` via a client-side fetch. The component should optimistically update or reload after the action.

Also extend `loadConsultationRequestQueueBlock` to return requests in `reviewed` status alongside `pending`, so the founder can see the full triage queue.

Two acceptable implementation shapes:

1. Inline form controls in the existing block cards
2. A small modal or expandable panel per request

Prefer the simpler option. The dashboard is not a full admin panel — it's a daily review surface.

### Task 2.4 Verify

```bash
npx vitest run src/components/dashboard/ConsultationRequestsBlock.test.tsx src/app/dashboard/page.test.tsx
```

---

## Task 2.5 - Record verification truthfully

**What:** Capture the real post-Sprint-2 state of the test suite and note any deviations.

| Item | Detail |
| --- | --- |
| **Run** | `npx vitest run 2>&1 \| tail -20` |
| **Run** | `npm run typecheck` |
| **Modify** | this sprint doc |
| **Modify** | `docs/_specs/customer-workflow-and-deal-flow/spec.md` only if implementation reveals a required deviation |
| **Spec** | `FLOW-029` |

### Task 2.5 Notes

Sprint 2 baseline: 761 tests (757 passed, 4 pre-existing failures in ChatInput.test.tsx ×3, ChatContainer.send-failure.test.tsx ×1). Sprint 2 must not increase the failure count.

### Task 2.5 Verify

```bash
npm run typecheck
npx vitest run
```

---

## Completion Checklist

- [x] Lead records support structured qualification fields for authority, urgency, budget, technical environment, and training-fit
- [x] Consultation requests can be transitioned through legal status stages by an admin
- [x] An API route exposes consultation-request triage with RBAC and stage-legality validation
- [x] The founder dashboard surfaces triage controls for pending and reviewed consultation requests
- [x] Sprint 2 verification does not worsen the measured full-suite baseline

## QA Deviations

- 2026-03-19 QA: Sprint 2 baseline measured at 761 tests (757 passed, 4 pre-existing failures). The 4 failures are in ChatInput.test.tsx (3) and ChatContainer.send-failure.test.tsx (1), unrelated to workflow scope.
- 2026-03-19 QA: The `ConsultationRequestRepository.updateStatus()` interface and `ConsultationRequestDataMapper.updateStatus()` implementation already exist from Sprint 1, including test coverage for `pending → reviewed` and null-return for unknown IDs. Sprint 2 builds on this foundation rather than recreating it.
- 2026-03-19 QA: FLOW-066 (exit-friction reason) was already delivered in Sprint 1 via `inferFrictionReason()`. Sprint 2 does not need to re-implement it but should not regress it.
- 2026-03-19 QA: The original Sprint 2 header over-referenced `FLOW-060` and `FLOW-066`. `FLOW-060` (anonymous vs authenticated origin) remains conversation-level via `session_source` and was not added as a lead-record field in this sprint. `FLOW-066` was already delivered in Sprint 1. The Sprint 2 spec-ref header was narrowed to match the implemented scope.
- 2026-03-19 QA: Task 2.3 adds both `GET` and `PATCH` for `/api/consultation-requests/:id`. The original sprint doc emphasized `PATCH`, but `GET` was added because the same admin review surface benefits from a direct read boundary and the repository support already exists.

## Verification Results (2026-03-19)

| Metric | Value |
| --- | --- |
| Focused Sprint 2 test files | 6 passed |
| Focused Sprint 2 tests | 44 passed |
| Full-suite test files | 135 total (133 passed, 2 failed) |
| Full-suite tests | 779 total (775 passed, 4 failed) |
| Typecheck | Clean — `tsc --noEmit` zero errors |
| Pre-existing failures | ChatInput.test.tsx (3 tests), ChatContainer.send-failure.test.tsx (1 test) |
| Sprint 2–caused failures | 0 |

Sprint 2 added 18 net new tests and did not worsen the pre-existing 4-failure full-suite baseline.
