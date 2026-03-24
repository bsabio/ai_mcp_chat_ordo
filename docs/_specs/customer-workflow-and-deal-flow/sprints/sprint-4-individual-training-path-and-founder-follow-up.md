# Sprint 4 - Individual Training Path And Founder Follow-Up

> **Goal:** Add a first-class downstream workflow for `individual` demand, let founder-reviewed leads or consultation requests turn into training-path recommendations instead of deals, surface recommendation mix and apprenticeship candidates in the dashboard, and add deterministic workflow eval coverage.
> **Spec ref:** `FLOW-026`, `FLOW-029`, `FLOW-052`, `FLOW-070`, `FLOW-087`, `FLOW-107` through `FLOW-112`, `FLOW-120` through `FLOW-124`, `FLOW-132`, `FLOW-139`, `FLOW-141`, `FLOW-144`, `FLOW-147`
> **Prerequisite:** Sprint 3 complete
> **Business refs:** `docs/_business/specs/lane-routing-and-training-path/spec.md`, `docs/_business/specs/deals-and-estimation/spec.md`
> **Test count target:** Full-suite baseline at Sprint 4 start is 817 tests (813 passed, 4 pre-existing failures). Sprint 4 must not increase the failure count.
> **Status:** Complete on 2026-03-19
> **Historical note (2026-03-24):** This sprint documents the training-path workflow as it landed against the then-active dashboard surface. References below to dashboard loaders, dashboard blocks, or `src/app/dashboard/page.tsx` are historical implementation context rather than the current operator-owned runtime boundary.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/core/entities/conversation-routing.ts` | Runtime lane taxonomy is stable across `organization`, `individual`, `development`, and `uncertain`, so Sprint 4 can focus on downstream workflow instead of reopening lane classification |
| `src/lib/chat/routing-analysis.ts` | Individual-specific signals already include training, mentorship, operator development, and apprenticeship language, giving Sprint 4 a durable upstream signal source |
| `src/lib/chat/routing-context.ts` and `src/lib/chat/routing-consumers.ts` | Individual conversations already get lane-specific prompt framing plus a contact-capture profile that asks for `name`, `email`, `roleOrTitle`, and optional `trainingGoal` |
| `src/app/api/chat/contact-capture/route.ts` | Contact capture already persists `trainingGoal` for individual leads without requiring organization-only fields |
| `src/core/entities/lead-record.ts` | Lead records already persist `trainingGoal`, `trainingFit`, founder note, and triage state, which gives Sprint 4 enough information to seed a training-path recommendation record |
| `src/app/api/admin/leads/[leadId]/triage/route.ts` | Founder can already move submitted leads into `qualified`, creating a natural upstream gate for individual training-path creation |
| `src/core/entities/consultation-request.ts` and `src/app/api/consultation-requests/[id]/route.ts` | Signed-in individual users can already request consultation, and founder review states (`reviewed`, `scheduled`, `declined`) already exist if Sprint 4 needs consultation-driven follow-up |
| `src/core/use-cases/CreateDealFromWorkflowInteractor.ts` | Sprint 3 established the pattern for converting qualified upstream workflow records into a first-class downstream object; Sprint 4 should mirror that shape but avoid forcing `individual` demand into deals |
| `src/core/use-cases/ConversationEventRecorder.ts` | Existing event recording can capture `training_path_recommended` and follow-up status transitions without new infrastructure |
| `src/lib/dashboard/dashboard-loaders.ts` and `src/app/dashboard/page.tsx` | Founder dashboard already surfaces anonymous opportunities, lead queue, consultation queue, funnel recommendations, and deal queue, so Sprint 4 can add an individual-specific block instead of creating a new dashboard shell |
| `tests/helpers/homepageEvalHarness.ts` | The repo already uses a small deterministic eval-harness pattern in Vitest; Sprint 4 can follow the same style for workflow scenario checks instead of inventing a separate eval runner |
| `docs/_specs/conversation-lane-routing/spec.md` | The lane-routing spec already anticipated a `training_path_recommended` event, which gives Sprint 4 a clean audit and analytics contract |

---

## Task 4.1 - Add the minimal individual training-path record and persistence layer

**What:** Introduce a durable downstream record for `individual` workflows that stores the founder-approved recommendation, fit rationale, and follow-up state without reusing the deal model.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/db/schema.ts` |
| **Create** | `src/core/entities/training-path-record.ts` |
| **Create** | `src/core/use-cases/TrainingPathRecordRepository.ts` |
| **Create** | `src/adapters/TrainingPathRecordDataMapper.ts` |
| **Create** | `src/adapters/TrainingPathRecordDataMapper.test.ts` |
| **Spec** | `FLOW-052`, `FLOW-070`, `FLOW-107`, `FLOW-108`, `FLOW-111`, `FLOW-112`, `FLOW-120` through `FLOW-123`, `FLOW-132`, `FLOW-139`, `FLOW-144` |

### Task 4.1 Notes

Keep the first runtime training-path shape intentionally small. Sprint 4 is the recommendation and founder follow-up layer, not the full enrollment system.

Add a new `training_path_records` table with at minimum:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `TEXT PRIMARY KEY` | `training_{uuid}` |
| `conversation_id` | `TEXT NOT NULL` | FK to `conversations(id)` |
| `lead_record_id` | `TEXT DEFAULT NULL` | FK to `lead_records(id)` when created from a qualified lead |
| `consultation_request_id` | `TEXT DEFAULT NULL` | FK to `consultation_requests(id)` when created after founder review of a consultation request |
| `user_id` | `TEXT NOT NULL` | owner of the record |
| `lane` | `TEXT NOT NULL` | must remain `individual` |
| `current_role_or_background` | `TEXT DEFAULT NULL` | copied from lead capture when available |
| `technical_depth` | `TEXT DEFAULT NULL` | use the existing training-fit vocabulary where possible |
| `primary_goal` | `TEXT DEFAULT NULL` | normalized from `trainingGoal` and founder edits |
| `preferred_format` | `TEXT DEFAULT NULL` | pace, format, or scheduling preference |
| `apprenticeship_interest` | `TEXT DEFAULT NULL` | `yes`, `maybe`, `no`, or `unknown` |
| `recommended_path` | `TEXT NOT NULL DEFAULT 'continue_conversation'` | `operator_intensive`, `operator_lab`, `mentorship_sprint`, `apprenticeship_screening`, or `continue_conversation` |
| `fit_rationale` | `TEXT DEFAULT NULL` | founder-facing explanation for the recommendation |
| `customer_summary` | `TEXT DEFAULT NULL` | client-visible explanation of the next step |
| `status` | `TEXT NOT NULL DEFAULT 'draft'` | `draft`, `recommended`, `screening_requested`, `deferred`, `closed` |
| `next_action` | `TEXT DEFAULT NULL` | founder follow-up action |
| `founder_note` | `TEXT DEFAULT NULL` | internal-only note |
| `created_at` | `TEXT NOT NULL DEFAULT (datetime('now'))` | |
| `updated_at` | `TEXT NOT NULL DEFAULT (datetime('now'))` | |

Recommended constraints:

1. `lane` must remain `individual`
2. `UNIQUE(lead_record_id)` when present
3. `UNIQUE(consultation_request_id)` when present
4. At least one source id must be present at creation time
5. Indexes on `user_id`, `status`, and `recommended_path`

The entity should define a `TrainingPathRecommendation` union, a `TrainingPathStatus` union, and a `TrainingPathRecord` interface with camelCase names.

### Task 4.1 Verify

```bash
npx vitest run src/adapters/TrainingPathRecordDataMapper.test.ts
npm run typecheck
```

---

## Task 4.2 - Add founder creation and recommendation interactors for individual workflow sources

**What:** Convert qualified `individual` leads or reviewed consultation requests into training-path records and record recommendation events using the existing workflow patterns.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/use-cases/CreateTrainingPathFromWorkflowInteractor.ts` |
| **Create** | `src/core/use-cases/CreateTrainingPathFromWorkflowInteractor.test.ts` |
| **Modify** | `src/lib/chat/conversation-root.ts` |
| **Spec** | `FLOW-070`, `FLOW-107` through `FLOW-112`, `FLOW-132`, `FLOW-139`, `FLOW-144` |

### Task 4.2 Notes

The interactor should support two creation paths:

1. `createFromQualifiedLead(adminUserId, leadRecordId)`
2. `createFromConsultationRequest(adminUserId, consultationRequestId)`

Required rules:

1. Source object must exist.
2. Source lane must be `individual`.
3. Lead record must be `triageState === 'qualified'` before conversion.
4. Consultation request must be at least `reviewed` or `scheduled` before conversion.
5. One upstream object should not create multiple training-path records unless explicitly reopened later; enforce this at the data model level.
6. The interactor should derive a sensible default `recommendedPath` from existing lead data:
   - `career_transition` or explicit apprenticeship language can seed `apprenticeship_screening`
   - advanced operator-development signals can seed `mentorship_sprint`
   - lighter skill-building cases can seed `operator_intensive` or `operator_lab`
   - uncertain fit should fall back to `continue_conversation`
7. Record a `training_path_recommended` conversation event with source metadata and the recommended path.

Sprint 4 should keep the recommendation logic simple and deterministic. Do not introduce a separate AI recommender yet.

### Task 4.2 Verify

```bash
npx vitest run src/core/use-cases/CreateTrainingPathFromWorkflowInteractor.test.ts
npm run typecheck
```

---

## Task 4.3 - Add founder routes and customer-safe read access for training-path records

**What:** Expose the server boundaries needed for founder-side creation and editing plus owner-safe retrieval of approved training-path recommendations.

| Item | Detail |
| --- | --- |
| **Create** | `src/app/api/training-paths/route.ts` |
| **Create** | `src/app/api/training-paths/[id]/route.ts` |
| **Create** | route tests near each new route |
| **Spec** | `FLOW-070`, `FLOW-111`, `FLOW-112`, `FLOW-120` through `FLOW-124`, `FLOW-132`, `FLOW-139` |

### Task 4.3 Notes

Routes to add:

1. `POST /api/training-paths`
2. `GET /api/training-paths/:id`
3. `PATCH /api/training-paths/:id`

Suggested responsibilities:

`POST /api/training-paths`

- Admin-only
- Creates a training-path record from either `leadRecordId` or `consultationRequestId`
- Returns `409` when a record already exists for the source

`GET /api/training-paths/:id`

- Admin can fetch any record
- Authenticated owner can fetch only their own record
- Anonymous users get `403`
- Owner-facing payload must exclude internal-only fields such as `founderNote`

`PATCH /api/training-paths/:id`

- Admin-only
- Allows founder to edit recommendation, fit rationale, customer summary, status, preferred format, next action, and founder note
- Enforces legal status transitions and lane discipline
- Records `training_path_status_changed` when the visible follow-up state changes

Sprint 4 does not need a customer mutation route yet. Reading the founder-approved recommendation is sufficient for the first runtime slice.

### Task 4.3 Verify

```bash
npx vitest run src/app/api/training-paths/route.test.ts src/app/api/training-paths/[id]/route.test.ts
```

---

## Task 4.4 - Surface recommendation mix and apprenticeship candidates in the founder dashboard

**What:** Add a founder-facing training-path queue so individual demand is visible as a downstream workflow object, not just as leads mixed into the generic lead queue.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-loaders.ts` |
| **Modify** | `src/lib/dashboard/dashboard-blocks.ts` |
| **Create** | `src/components/dashboard/TrainingPathQueueBlock.tsx` |
| **Modify** | `src/app/dashboard/page.tsx` |
| **Modify** | related loader, block, and page tests |
| **Spec** | `FLOW-087`, `FLOW-141`, `FLOW-144`, `FLOW-147` |

### Task 4.4 Notes

Add a dedicated `training_path_queue` block for admins.

The loader should surface at minimum:

1. Draft recommendations awaiting founder cleanup
2. Recommended records ready for customer follow-up
3. Apprenticeship-screening recommendations
4. Deferred records that still need a later touchpoint

Each row should show:

1. Customer name
2. Recommended path
3. Technical depth or training fit
4. Primary goal
5. Status
6. Next action
7. Link back to the source conversation

The block summary should also include:

1. Count by `recommendedPath`
2. Apprenticeship-candidate count
3. Records needing founder follow-up now

Prefer a dedicated block over extending the lead queue. Sprint 4 makes individual follow-up a first-class founder workflow object.

### Task 4.4 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts src/components/dashboard/TrainingPathQueueBlock.test.tsx src/app/dashboard/page.test.tsx
```

---

## Task 4.5 - Add deterministic workflow eval coverage for the full process

**What:** Add a small deterministic eval harness that checks the key workflow scenarios described in the top-level spec, with specific Sprint 4 coverage for the individual learner path.

| Item | Detail |
| --- | --- |
| **Create** | `tests/helpers/customerWorkflowEvalHarness.ts` |
| **Create** | `tests/customer-workflow-evals.test.ts` |
| **Modify** | `package.json` only if a dedicated script improves repeatability |
| **Modify** | this sprint doc with the actual verification result after implementation |
| **Spec** | `FLOW-029`, `FLOW-143`, `FLOW-144`, `FLOW-145`, `FLOW-147` |

### Task 4.5 Notes

Follow the same pattern as `tests/helpers/homepageEvalHarness.ts`: deterministic fixture setup, structured checks, and a report that explains exactly which workflow expectations passed or failed.

Minimum scenarios:

1. Organization buyer progresses from chat to signup to consultation request to qualified deal draft
2. Individual learner progresses from chat to signup to training recommendation and founder follow-up
3. Development prospect progresses from chat to signup to scoped implementation deal draft
4. Founder dashboard review exposes the expected `NOW`, `NEXT`, and `WAIT` actions across leads, consultation requests, deals, and training paths

If browser-driven validation is still needed later, document that separately. Sprint 4 should still land deterministic regression coverage inside Vitest.

### Task 4.5 Verify

```bash
npx vitest run tests/customer-workflow-evals.test.ts
```

---

## Task 4.6 - Record verification truthfully

**What:** Capture the real post-Sprint-4 state of the suite and note any deviations.

| Item | Detail |
| --- | --- |
| **Run** | `npx vitest run 2>&1 \| tail -20` |
| **Run** | `npm run typecheck` |
| **Modify** | this sprint doc |
| **Modify** | `docs/_specs/customer-workflow-and-deal-flow/spec.md` only if implementation reveals a required deviation |
| **Spec** | `FLOW-029` |

### Task 4.6 Notes

Sprint 4 baseline: 817 tests (813 passed, 4 pre-existing failures in `ChatInput.test.tsx` and `ChatContainer.send-failure.test.tsx`). Sprint 4 must not increase the failure count.

### Task 4.6 Verify

```bash
npm run typecheck
npx vitest run
```

---

## Completion Checklist

- [x] `training_path_records` persistence exists with tests
- [x] Founder can create a training-path record from a qualified individual lead or reviewed consultation request
- [x] Owner-safe and admin routes exist for training-path records
- [x] Founder dashboard surfaces recommendation mix and apprenticeship candidates
- [x] Deterministic workflow eval coverage exists for the individual learner path plus full-process regression scenarios
- [x] `npm run typecheck` passes
- [x] Full-suite failure count does not exceed the pre-existing baseline

---

## Verification Results

1. Focused persistence verification passed: `src/adapters/TrainingPathRecordDataMapper.test.ts` (6 tests)
2. Focused creation-flow verification passed: `src/core/use-cases/CreateTrainingPathFromWorkflowInteractor.test.ts` (8 tests)
3. Focused route verification passed: `src/app/api/training-paths/route.test.ts` and `src/app/api/training-paths/[id]/route.test.ts` (16 tests)
4. Focused dashboard verification passed: `src/components/dashboard/TrainingPathQueueBlock.test.tsx`, `src/lib/dashboard/dashboard-blocks.test.ts`, `src/lib/dashboard/dashboard-visibility.test.ts`, `src/lib/dashboard/dashboard-loaders.test.ts`, and `src/app/dashboard/page.test.tsx` (43 tests)
5. Deterministic workflow eval verification passed: `tests/customer-workflow-evals.test.ts` (4 tests)
6. Full-suite verification passed: 147 test files, 856 tests, 856 passed
7. Final typecheck passed: `npm run typecheck`

---

## QA Notes

1. Sprint 4 intentionally reuses the Sprint 3 downstream-record pattern instead of extending `DealRecord` to cover `individual` demand. That keeps training-path follow-up distinct from commercial deal flow.
2. The first runtime slice stops at founder-approved recommendation visibility. Full enrollment mechanics, scheduling, and automated follow-up sequences remain later-phase scope.
3. The deterministic eval harness should verify workflow state and dashboard exposure, not claim to replace future browser or model-behavior checks.
4. The pre-existing ChatInput placeholder failures were cleaned before Sprint 4 implementation, so Sprint 4 finished on a fully green suite rather than preserving the older baseline drift.