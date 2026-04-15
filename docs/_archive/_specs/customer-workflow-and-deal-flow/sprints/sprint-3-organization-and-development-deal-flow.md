# Sprint 3 - Organization And Development Deal Flow

> **Goal:** Add a first-class deal layer for organization and development workflows, let founder-reviewed consultation requests or qualified leads convert into draft deals, and support explicit customer agree or decline states.
> **Spec ref:** `FLOW-003`, `FLOW-025`, `FLOW-068`, `FLOW-069`, `FLOW-071`, `FLOW-076` through `FLOW-079`, `FLOW-086` through `FLOW-088`, `FLOW-105`, `FLOW-106`, `FLOW-117`, `FLOW-118`, `FLOW-120` through `FLOW-124`, `FLOW-132`, `FLOW-138`, `FLOW-140`, `FLOW-141`, `FLOW-143`, `FLOW-145`, `FLOW-147`
> **Prerequisite:** Sprint 2 complete
> **Test count target:** Full-suite baseline at Sprint 3 start is 779 tests (775 passed, 4 pre-existing failures). Sprint 3 must not increase the failure count.
> **Status:** Complete on 2026-03-19
> **Historical note (2026-03-24):** This sprint still documents the dashboard-era operational surface that existed when deal flow landed. References below to dashboard loaders, dashboard blocks, or dashboard page wiring should be read as historical implementation context rather than current runtime architecture.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/core/entities/conversation-routing.ts` | Runtime lane taxonomy is now stable across `organization`, `individual`, `development`, and `uncertain`, so Sprint 3 can safely narrow deal creation to organization and development without reopening routing scope |
| `src/core/entities/lead-record.ts` | `LeadRecord` now includes structured qualification fields: `authorityLevel`, `urgency`, `budgetSignal`, `technicalEnvironment`, and `trainingFit`, in addition to lane, contact details, summaries, and founder triage fields |
| `src/adapters/LeadRecordDataMapper.ts` | Supports `updateQualification()` and `updateTriageState()`, so deal creation can reuse qualified lead data instead of re-parsing transcripts |
| `src/app/api/admin/leads/[leadId]/triage/route.ts` | Founder can already move submitted leads through `new`, `contacted`, `qualified`, and `deferred`, providing a pre-deal qualification surface |
| `src/core/entities/consultation-request.ts` | Consultation requests now carry `pending`, `reviewed`, `scheduled`, and `declined` statuses plus founder notes |
| `src/core/use-cases/TriageConsultationRequestInteractor.ts` | Founder-side consultation status transitions already validate legal transitions and record `consultation_status_changed` events |
| `src/app/api/consultation-requests/[id]/route.ts` | Admin `GET` and `PATCH` routes already expose consultation-request review and scheduling transitions |
| `src/components/dashboard/ConsultationRequestsBlock.tsx` | Founder dashboard already supports inline consultation triage actions and founder notes, giving Sprint 3 a natural upstream source for deal creation |
| `src/lib/dashboard/dashboard-loaders.ts` | Lead queue and consultation queue loaders already exist, but there is no deal queue, deal summary block, or deal conversion loader yet |
| `src/lib/chat/conversation-root.ts` | Composition root already wires repositories and interactors for leads and consultation requests, so adding a deal repository and deal interactors follows an existing pattern |
| `src/core/use-cases/ConversationEventRecorder.ts` | Generic event recorder can already store new deal lifecycle events such as `deal_created`, `deal_status_changed`, and `deal_customer_response_recorded` |
| `src/lib/db/schema.ts` | No `deals` or `deal_records` table exists yet; Sprint 3 remains the first runtime implementation point for deal persistence |
| `docs/_business/specs/deals-and-estimation/spec.md` | Active business reference defines the deal contract, access model, and estimation boundaries; Sprint 3 should implement the minimum runtime slice needed for organization and development deals without pulling in later proposal or client-workspace scope |

---

## Task 3.1 - Add the minimal deal record contract and persistence layer

**What:** Introduce a durable deal record for organization and development workflows with the minimum fields needed for founder review, customer visibility, and explicit response states.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/db/schema.ts` |
| **Create** | `src/core/entities/deal-record.ts` |
| **Create** | `src/core/use-cases/DealRecordRepository.ts` |
| **Create** | `src/adapters/DealRecordDataMapper.ts` |
| **Create** | `src/adapters/DealRecordDataMapper.test.ts` |
| **Spec** | `FLOW-068`, `FLOW-069`, `FLOW-071`, `FLOW-076` through `FLOW-079`, `FLOW-120` through `FLOW-123`, `FLOW-132`, `FLOW-138`, `FLOW-140` |

### Task 3.1 Notes

Keep the first runtime deal shape intentionally small. Sprint 3 is not the proposal system and not the full client workspace.

Add a new `deal_records` table with at minimum:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `TEXT PRIMARY KEY` | `deal_{uuid}` |
| `conversation_id` | `TEXT NOT NULL` | FK to `conversations(id)` |
| `consultation_request_id` | `TEXT DEFAULT NULL` | FK to `consultation_requests(id)` when deal comes from a consultation request |
| `lead_record_id` | `TEXT DEFAULT NULL` | FK to `lead_records(id)` when deal comes from a qualified lead |
| `user_id` | `TEXT NOT NULL` | owner of the deal |
| `lane` | `TEXT NOT NULL` | must remain `organization` or `development` for Sprint 3 |
| `title` | `TEXT NOT NULL DEFAULT ''` | founder-facing deal title |
| `organization_name` | `TEXT DEFAULT NULL` | copied from lead data when available |
| `problem_summary` | `TEXT NOT NULL DEFAULT ''` | normalized summary of the buyer need |
| `proposed_scope` | `TEXT NOT NULL DEFAULT ''` | founder-editable draft scope |
| `recommended_service_type` | `TEXT NOT NULL DEFAULT ''` | consulting, advisory, delivery, hybrid |
| `estimated_hours` | `REAL DEFAULT NULL` | exploratory effort estimate |
| `estimated_training_days` | `REAL DEFAULT NULL` | only when enablement is part of the mix |
| `estimated_price` | `INTEGER DEFAULT NULL` | stored as integer dollars for Sprint 3 simplicity |
| `status` | `TEXT NOT NULL DEFAULT 'draft'` | `draft`, `qualified`, `estimate_ready`, `agreed`, `declined`, `on_hold` |
| `next_action` | `TEXT DEFAULT NULL` | founder next step |
| `assumptions` | `TEXT DEFAULT NULL` | free-text block |
| `open_questions` | `TEXT DEFAULT NULL` | free-text block |
| `founder_note` | `TEXT DEFAULT NULL` | internal-only review note |
| `customer_response_note` | `TEXT DEFAULT NULL` | optional client-visible context for agree/decline |
| `created_at` | `TEXT NOT NULL DEFAULT (datetime('now'))` | |
| `updated_at` | `TEXT NOT NULL DEFAULT (datetime('now'))` | |

Recommended constraints:

1. `UNIQUE(consultation_request_id)` when present
2. `UNIQUE(lead_record_id)` when present
3. Indexes on `user_id`, `status`, and `lane`
4. At least one of `consultation_request_id` or `lead_record_id` must be non-null at creation time

The entity should define a `DealStatus` union and a `DealRecord` interface that matches the table with camelCase names. Restrict Sprint 3 runtime creation to `organization` and `development`. `individual` remains Sprint 4 scope.

### Task 3.1 Verify

```bash
npx vitest run src/adapters/DealRecordDataMapper.test.ts
npm run typecheck
```

---

## Task 3.2 - Add a draft-deal creation interactor from qualified leads or reviewed consultation requests

**What:** Convert founder-reviewed upstream workflow objects into draft deals without redoing qualification work manually.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/use-cases/CreateDealFromWorkflowInteractor.ts` |
| **Create** | `src/core/use-cases/CreateDealFromWorkflowInteractor.test.ts` |
| **Modify** | `src/lib/chat/conversation-root.ts` |
| **Spec** | `FLOW-068`, `FLOW-069`, `FLOW-086`, `FLOW-105`, `FLOW-117`, `FLOW-118`, `FLOW-132`, `FLOW-138`, `FLOW-143`, `FLOW-145` |

### Task 3.2 Notes

The interactor should support two creation paths:

1. `createFromConsultationRequest(consultationRequestId)`
2. `createFromQualifiedLead(leadRecordId)`

Required rules:

1. Source object must exist.
2. Source lane must be `organization` or `development`.
3. Consultation request must be at least `reviewed` or `scheduled` before conversion.
4. Lead record must be `triageState === 'qualified'` before conversion.
5. One upstream object should not create multiple deals unless explicitly reopened later; enforce this at the data model level.
6. Draft deal title, problem summary, organization name, scope, next action, and estimate placeholders should be derived from existing lead/request data where possible.
7. Default created status should be `draft`.
8. Record a `deal_created` conversation event with source metadata.

The interactor should not invoke an AI estimator yet. Sprint 3 can carry placeholder hours/price values as null and let the founder fill them in through a minimal edit surface.

### Task 3.2 Verify

```bash
npx vitest run src/core/use-cases/CreateDealFromWorkflowInteractor.test.ts
npm run typecheck
```

---

## Task 3.3 - Add founder deal routes and explicit customer response handling

**What:** Expose the server boundaries needed for admin-side deal creation/editing and client-side agree/decline responses.

| Item | Detail |
| --- | --- |
| **Create** | `src/app/api/deals/route.ts` |
| **Create** | `src/app/api/deals/[id]/route.ts` |
| **Create** | `src/app/api/deals/[id]/response/route.ts` |
| **Create** | route tests near each new route |
| **Spec** | `FLOW-071`, `FLOW-120` through `FLOW-124`, `FLOW-132`, `FLOW-138`, `FLOW-140` |

### Task 3.3 Notes

Routes to add:

1. `POST /api/deals`
2. `GET /api/deals/:id`
3. `PATCH /api/deals/:id`
4. `POST /api/deals/:id/response`

Suggested responsibilities:

`POST /api/deals`

- Admin-only
- Creates a draft deal from either `consultationRequestId` or `leadRecordId`
- Returns `409` when a deal already exists for the source

`GET /api/deals/:id`

- Admin can fetch any deal
- Authenticated user can fetch only their own deal
- Anonymous users get `403`

`PATCH /api/deals/:id`

- Admin-only
- Allows founder to edit draft/qualified deal fields such as title, scope, service type, estimated effort, estimated price, next action, assumptions, open questions, and founder note
- Rejects malformed numeric estimate edits rather than silently dropping them when `estimatedHours`, `estimatedTrainingDays`, or `estimatedPrice` are present but not valid numbers
- Validates lane discipline: Sprint 3 must reject edits that try to reclassify an `individual` deal into this flow

`POST /api/deals/:id/response`

- Authenticated owner-only
- Accepts `{ response: 'agreed' | 'declined', note?: string }`
- Only `estimate_ready` deals are eligible for owner response; draft, qualified, and on-hold deals must be rejected until the founder makes them customer-visible
- Transitions the deal to `agreed` or `declined`
- Must reject already-final deals or non-owner access
- Records a `deal_customer_response_recorded` event

Keep route logic narrow. Customer-facing deal views and full portal UX remain later-phase scope.

### Task 3.3 Verify

```bash
npx vitest run src/app/api/deals/route.test.ts src/app/api/deals/[id]/route.test.ts src/app/api/deals/[id]/response/route.test.ts
```

---

## Task 3.4 - Surface deals in the founder workflow

**What:** Add a founder-facing deal queue so draft and qualified deals sit alongside leads and consultation requests instead of disappearing into API-only storage.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-loaders.ts` |
| **Modify** | `src/lib/dashboard/dashboard-blocks.ts` |
| **Create** | `src/components/dashboard/DealQueueBlock.tsx` |
| **Modify** | `src/app/dashboard/page.tsx` |
| **Modify** | related loader/page/component tests |
| **Spec** | `FLOW-087`, `FLOW-120`, `FLOW-141`, `FLOW-147` |

### Task 3.4 Notes

Add a dedicated `deal_queue` block for admins.

The loader should surface at minimum:

1. Draft deals
2. Qualified deals
3. Agreed deals awaiting follow-up
4. Declined deals with recorded response notes

Each row should show:

1. Deal title
2. Lane
3. Organization name or owner name
4. Status
5. Estimated price if available
6. Next action
7. Link back to the source conversation

Two acceptable UI shapes:

1. Dedicated deal queue block
2. Extension of the existing lead queue with a second section

Prefer a dedicated block. At Sprint 3 the deal layer becomes a distinct founder object, not just an annotation on leads.

### Task 3.4 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts src/components/dashboard/DealQueueBlock.test.tsx src/app/dashboard/page.test.tsx
```

---

## Task 3.5 - Record verification truthfully

**What:** Capture the real post-Sprint-3 state of the test suite and note any deviations.

| Item | Detail |
| --- | --- |
| **Run** | `npx vitest run 2>&1 \| tail -20` |
| **Run** | `npm run typecheck` |
| **Modify** | this sprint doc |
| **Modify** | `docs/_specs/customer-workflow-and-deal-flow/spec.md` only if implementation reveals a required deviation |
| **Spec** | `FLOW-029` |

### Task 3.5 Notes

Sprint 3 baseline: 779 tests (775 passed, 4 pre-existing failures in ChatInput.test.tsx ×3, ChatContainer.send-failure.test.tsx ×1). Sprint 3 must not increase the failure count.

### Task 3.5 Verify

```bash
npm run typecheck
npx vitest run
```

### Task 3.5 Results

1. `npm run typecheck` passed.
2. Focused Sprint 3 validation passed: `54` tests passed across the new interactor, route, loader, component, and dashboard page slices.
3. Full-suite verification finished at `817` total tests with `813` passing and the same `4` pre-existing UI failures.
4. The remaining failures are unchanged from baseline and are still limited to:
	`src/frameworks/ui/ChatInput.test.tsx` ×3 and `src/frameworks/ui/ChatContainer.send-failure.test.tsx` ×1.

---

## Completion Checklist

- [x] Organization and development workflows can create durable draft deal records from reviewed consultation requests or qualified leads
- [x] Deal records support explicit customer-facing agree or decline states
- [x] Deal routes enforce RBAC and owner-scoped visibility correctly for admin and authenticated users
- [x] Founder dashboard surfaces a deal queue alongside leads and consultation requests
- [x] Sprint 3 verification does not worsen the measured full-suite baseline

## QA Deviations

- 2026-03-20 QA fix: tightened `POST /api/deals/:id/response` so customers can only agree or decline deals once the founder has marked them `estimate_ready`. Earlier code accepted responses for any non-final deal state, which bypassed the founder-approval gate.
- 2026-03-20 QA fix: tightened `PATCH /api/deals/:id` numeric validation so malformed `estimatedHours`, `estimatedTrainingDays`, and `estimatedPrice` inputs fail with `400` instead of being silently ignored.

- 2026-03-19 QA: Sprint 3 starts with no existing `DealRecord` entity, repository, mapper, schema table, route, or dashboard block in `src/`, so this sprint is the first runtime implementation point for deals.
- 2026-03-19 QA: Sprint 2 already delivered consultation-request review and scheduling transitions, so Sprint 3 should convert from founder-reviewed workflow objects rather than recreating triage logic inside the deal layer.
- 2026-03-19 QA: `individual` remains out of scope for Sprint 3. The top-level spec explicitly reserves training-path handling for Sprint 4, so Sprint 3 deal creation must fail closed for `individual` lane sources.
- 2026-03-19 QA: The business deal spec defines richer phases such as `estimate-ready` and `proposal-sent`, but Sprint 3 should keep the runtime implementation to the smallest set needed for draft creation, founder qualification, and customer agree/decline responses. Proposal generation and client workspace remain later-phase scope.
- 2026-03-19 QA: Full-suite verification now ends at `817` total tests with `813` passing and the same `4` pre-existing UI placeholder failures. Sprint 3 added coverage without increasing the failure count.