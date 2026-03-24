# Sprint 1 — Implementation Checklist

> Concrete file-by-file targets for each Sprint 1 task.
> Cross-reference: `sprint-1-anonymous-continuity-and-consultation-request.md`
> **Historical note (2026-03-24):** The file targets in this checklist reflect the dashboard-era implementation boundary that existed when Sprint 1 landed. Dashboard-named files listed below are historical references, not active runtime paths.

---

## Task 1.1 — Anonymous conversion-friction summaries

**Goal:** Give the founder a per-opportunity explanation of likely conversion friction instead of raw counts alone.

### 1.1.1 Extend the anonymous opportunity data shape

| Action | File |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-loaders.ts` |

Add a `likelyFrictionReason` field to `AnonymousOpportunity` and populate it from heuristic logic inside `loadAnonymousOpportunitiesBlock()`.

Heuristic inputs already available in the query row:

- `lane` (still `uncertain`?)
- `lane_confidence`
- `message_count`
- `recommended_next_step` (null = no next-step surfaced)
- `session_source` (`anonymous_cookie`)
- `detected_need_summary` (null = no need detected)
- conversation `updated_at` vs current time (stale?)

The friction reason must preserve all four lanes (`organization`, `individual`, `development`, `uncertain`) without collapsing development into organization.

### 1.1.2 Surface friction in the anonymous opportunities block

| Action | File |
| --- | --- |
| **Modify** | `src/components/dashboard/AnonymousOpportunitiesBlock.tsx` |

Render the new `likelyFrictionReason` field per opportunity row. A single line of text below the existing `recommendedNextStep` line is sufficient.

### 1.1.3 Update anonymous opportunities block tests

| Action | File |
| --- | --- |
| **Modify** | `src/components/dashboard/AnonymousOpportunitiesBlock.test.tsx` |

Add fixture data with non-null `likelyFrictionReason` and assert it renders.

### 1.1.4 Update dashboard loader tests

| Action | File |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-loaders.test.ts` |

Add or extend anonymous-opportunity test cases to assert:

1. a `development`-lane opportunity gets a friction reason that mentions development
2. an `uncertain`-lane opportunity gets a friction reason that mentions uncertain routing
3. the fixture shape matches the new `AnonymousOpportunity` type

### 1.1.5 Update dashboard page test if payload shape changed

| Action | File |
| --- | --- |
| **Modify** | `src/app/dashboard/page.test.tsx` |

Only needed if mock shapes break after adding the new field.

### 1.1 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts src/components/dashboard/AnonymousOpportunitiesBlock.test.tsx src/app/dashboard/page.test.tsx
```

---

## Task 1.2 — Minimal consultation request record

**Goal:** Define the persistence contract and data mapper for consultation requests.

### 1.2.1 Add the `consultation_requests` table

| Action | File |
| --- | --- |
| **Modify** | `src/lib/db/schema.ts` |

Add a new `CREATE TABLE IF NOT EXISTS consultation_requests` block after the `lead_records` table, following the same idempotent pattern used for other tables.

Columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `TEXT PRIMARY KEY` | `cr_{uuid}` |
| `conversation_id` | `TEXT NOT NULL` | FK to `conversations(id)` |
| `user_id` | `TEXT NOT NULL` | FK to `users(id)` |
| `lane` | `TEXT NOT NULL DEFAULT 'uncertain'` | Captured from conversation routing snapshot at request time |
| `request_summary` | `TEXT NOT NULL DEFAULT ''` | User-facing or system-derived summary of what the consultation is about |
| `status` | `TEXT NOT NULL DEFAULT 'pending'` | `pending`, `reviewed`, `scheduled`, `declined` |
| `founder_note` | `TEXT DEFAULT NULL` | Optional admin-side response |
| `created_at` | `TEXT NOT NULL DEFAULT (datetime('now'))` | |
| `updated_at` | `TEXT NOT NULL DEFAULT (datetime('now'))` | |

Constraints:

- `UNIQUE(conversation_id)` — one request per conversation
- FK on `conversation_id` with `ON DELETE CASCADE`
- Indexes: `idx_cr_conversation`, `idx_cr_user`, `idx_cr_status`

### 1.2.2 Create the consultation request entity

| Action | File |
| --- | --- |
| **Create** | `src/core/entities/consultation-request.ts` |

Define:

- `ConsultationRequestStatus` union: `"pending" | "reviewed" | "scheduled" | "declined"`
- `ConsultationRequest` interface: mirrors the table shape above with camelCase naming
- `isConsultationRequestStatus(value)` type guard

### 1.2.3 Create the consultation request repository interface

| Action | File |
| --- | --- |
| **Create** | `src/core/use-cases/ConsultationRequestRepository.ts` |

Define `ConsultationRequestRepository` with:

- `create(seed)` → `ConsultationRequest`
- `findById(id)` → `ConsultationRequest | null`
- `findByConversationId(conversationId)` → `ConsultationRequest | null`
- `listByStatus(status)` → `ConsultationRequest[]`
- `updateStatus(id, status, metadata?)` → `ConsultationRequest | null`

### 1.2.4 Create the consultation request data mapper

| Action | File |
| --- | --- |
| **Create** | `src/adapters/ConsultationRequestDataMapper.ts` |

Implement `ConsultationRequestRepository` against the SQLite table using the same `better-sqlite3` patterns as `LeadRecordDataMapper`.

### 1.2.5 Create the request-consultation use case

| Action | File |
| --- | --- |
| **Create** | `src/core/use-cases/RequestConsultationInteractor.ts` |

Constructor dependencies:

- `ConsultationRequestRepository`
- `ConversationRepository` (to verify ownership and pull the current routing snapshot)
- `ConversationEventRecorder` (optional, to record a `consultation_requested` event)

Method: `requestConsultation(userId, conversationId, requestSummary)` → `ConsultationRequest`

Guards:

- conversation must exist and belong to `userId`
- a request must not already exist for this conversation (enforce at code level as well as DB constraint)
- pull `lane` from the conversation's current `routingSnapshot.lane`

### 1.2.6 Add the composition-root factory

| Action | File |
| --- | --- |
| **Modify** | `src/lib/chat/conversation-root.ts` |

Add:

```ts
export function getConsultationRequestRepository(): ConsultationRequestDataMapper { ... }
export function getRequestConsultationInteractor(): RequestConsultationInteractor { ... }
```

Wire `ConsultationRequestDataMapper`, `ConversationDataMapper`, and `ConversationEventRecorder` into the interactor.

### 1.2.7 Add focused tests for the data mapper

| Action | File |
| --- | --- |
| **Create** | `src/adapters/ConsultationRequestDataMapper.test.ts` |

Cover:

1. `create()` produces a correctly shaped record
2. `findByConversationId()` returns null when no request exists
3. `findByConversationId()` returns the created record
4. duplicate `conversation_id` throws or rejects
5. `updateStatus()` transitions from `pending` to `reviewed`

### 1.2.8 Add focused tests for the interactor

| Action | File |
| --- | --- |
| **Create** | `src/core/use-cases/RequestConsultationInteractor.test.ts` |

Cover:

1. creates a consultation request from a valid owned conversation
2. rejects if conversation does not belong to user
3. rejects if a request already exists for this conversation
4. lane is pulled from the conversation's routing snapshot, not from the caller

### 1.2 Verify

```bash
npx vitest run src/adapters/ConsultationRequestDataMapper.test.ts src/core/use-cases/RequestConsultationInteractor.test.ts
npm run typecheck
```

---

## Task 1.3 — Signed-in consultation request route

**Goal:** Expose an HTTP boundary for creating consultation requests.

### 1.3.1 Create the consultation request route

| Action | File |
| --- | --- |
| **Create** | `src/app/api/consultation-requests/route.ts` |

`POST /api/consultation-requests`

Request body:

```json
{
  "conversationId": "conv_...",
  "requestSummary": "I need help scoping an internal workflow redesign."
}
```

Guard:

- Require an authenticated (non-anonymous) user via `getSessionUser()`
- Delegate to `getRequestConsultationInteractor().requestConsultation(...)`
- Return `201` with the created record on success
- Return `400` for missing fields
- Return `409` if a request already exists
- Return `403` if conversation is not owned by user
- Use `runRouteTemplate(...)` for consistent error handling

### 1.3.2 Create route tests

| Action | File |
| --- | --- |
| **Create** | `src/app/api/consultation-requests/route.test.ts` |

Cover:

1. `POST` with valid auth and body returns `201` with a consultation request record
2. anonymous user gets `403`
3. missing `conversationId` gets `400`
4. missing `requestSummary` gets `400`
5. non-owned conversation gets `403`
6. duplicate request for same conversation gets `409`

### 1.3 Verify

```bash
npx vitest run src/app/api/consultation-requests/route.test.ts
```

---

## Task 1.4 — Surface consultation requests in the founder workflow

**Goal:** Let the admin see pending consultation requests without rereading transcripts.

### 1.4.1 Add a consultation-request dashboard loader

| Action | File |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-loaders.ts` |

Add:

- `ConsultationRequestQueueBlockData` interface with summary counts and a list of pending requests
- `loadConsultationRequestQueueBlock(user)` function

The loader should join `consultation_requests` to `conversations` to get the title, lane, and message count. Only `ADMIN` role should get data.

### 1.4.2 Register the new dashboard block

| Action | File |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-blocks.ts` |

Add `"consultation_requests"` to the `DashboardBlockId` union and append a new `DashboardBlockDefinition` entry:

- `id: "consultation_requests"`
- `category: "pipeline"`
- `loadPriority: "primary"`
- `allowedRoles: ["ADMIN"]`
- `requiresData: true`

### 1.4.3 Create the consultation requests dashboard component

| Action | File |
| --- | --- |
| **Create** | `src/components/dashboard/ConsultationRequestsBlock.tsx` |

Render each pending request with: conversation title, lane, request summary, created-at timestamp, and a link to open the conversation.

### 1.4.4 Wire the block into the dashboard page

| Action | File |
| --- | --- |
| **Modify** | `src/app/dashboard/page.tsx` |

1. Import `loadConsultationRequestQueueBlock` and `ConsultationRequestsBlock`
2. Add it to the admin `Promise.all(...)` loader array
3. Add the block node to the admin main lane alongside `lead_queue`, `routing_review`, and `anonymous_opportunities`
4. Add the payload to the runtime context and visibility flow

### 1.4.5 Update dashboard visibility and ordering if needed

| Action | File |
| --- | --- |
| **Maybe modify** | `src/lib/dashboard/dashboard-visibility.ts` |
| **Maybe modify** | `src/lib/dashboard/dashboard-ordering.ts` |

Only if the new block needs explicit visibility or ordering rules beyond what the existing admin-block pattern provides.

### 1.4.6 Add the consultation requests block test

| Action | File |
| --- | --- |
| **Create** | `src/components/dashboard/ConsultationRequestsBlock.test.tsx` |

Cover:

1. renders pending requests with title, lane, and summary
2. renders an empty-state explanation when no requests exist
3. renders a link to open the source conversation

### 1.4.7 Update dashboard loader tests

| Action | File |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-loaders.test.ts` |

Add tests for `loadConsultationRequestQueueBlock`:

1. returns pending requests for admins
2. returns empty when no pending requests exist

### 1.4.8 Update dashboard page test

| Action | File |
| --- | --- |
| **Modify** | `src/app/dashboard/page.test.tsx` |

1. Add a mock for `loadConsultationRequestQueueBlock`
2. Assert the consultation requests block renders for admins
3. Assert it does not render for non-admin Staff users
4. Update the expected admin block order

### 1.4 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts src/components/dashboard/ConsultationRequestsBlock.test.tsx src/app/dashboard/page.test.tsx
```

---

## Task 1.5 — Record verification truthfully

**Goal:** Capture the real post-Sprint-1 state of the test suite and note any deviations.

### 1.5.1 Measure the full-suite baseline before Sprint 1 starts

| Action | File |
| --- | --- |
| **Run** | `npx vitest run 2>&1 \| tail -20` |

Record the total test count and failure count in the sprint doc.

### 1.5.2 Run full-suite after Sprint 1 is complete

| Action | File |
| --- | --- |
| **Run** | `npx vitest run 2>&1 \| tail -20` |
| **Run** | `npm run typecheck` |

Compare with baseline. Record the delta in the sprint doc.

### 1.5.3 Update the sprint doc

| Action | File |
| --- | --- |
| **Modify** | `docs/_specs/customer-workflow-and-deal-flow/sprints/sprint-1-anonymous-continuity-and-consultation-request.md` |

Mark checklist items and record any QA deviations.

### 1.5.4 Update the workflow spec only if a deviation is discovered

| Action | File |
| --- | --- |
| **Maybe modify** | `docs/_specs/customer-workflow-and-deal-flow/spec.md` |

---

## File Summary

### Files to create (8)

| File | Task |
| --- | --- |
| `src/core/entities/consultation-request.ts` | 1.2 |
| `src/core/use-cases/ConsultationRequestRepository.ts` | 1.2 |
| `src/core/use-cases/RequestConsultationInteractor.ts` | 1.2 |
| `src/adapters/ConsultationRequestDataMapper.ts` | 1.2 |
| `src/adapters/ConsultationRequestDataMapper.test.ts` | 1.2 |
| `src/core/use-cases/RequestConsultationInteractor.test.ts` | 1.2 |
| `src/app/api/consultation-requests/route.ts` | 1.3 |
| `src/app/api/consultation-requests/route.test.ts` | 1.3 |
| `src/components/dashboard/ConsultationRequestsBlock.tsx` | 1.4 |
| `src/components/dashboard/ConsultationRequestsBlock.test.tsx` | 1.4 |

### Files to modify (9)

| File | Task(s) |
| --- | --- |
| `src/lib/dashboard/dashboard-loaders.ts` | 1.1, 1.4 |
| `src/lib/dashboard/dashboard-loaders.test.ts` | 1.1, 1.4 |
| `src/components/dashboard/AnonymousOpportunitiesBlock.tsx` | 1.1 |
| `src/components/dashboard/AnonymousOpportunitiesBlock.test.tsx` | 1.1 |
| `src/lib/db/schema.ts` | 1.2 |
| `src/lib/chat/conversation-root.ts` | 1.2 |
| `src/lib/dashboard/dashboard-blocks.ts` | 1.4 |
| `src/app/dashboard/page.tsx` | 1.1 (if needed), 1.4 |
| `src/app/dashboard/page.test.tsx` | 1.1 (if needed), 1.4 |

### Files to maybe modify (2)

| File | Task |
| --- | --- |
| `src/lib/dashboard/dashboard-visibility.ts` | 1.4 |
| `src/lib/dashboard/dashboard-ordering.ts` | 1.4 |

---

## Execution Order

The recommended implementation sequence is:

1. **1.5.1** — baseline measurement (run before any code changes)
2. **1.2.1** — schema table (unblocks everything in Task 1.2)
3. **1.2.2** — entity
4. **1.2.3** — repository interface
5. **1.2.4** — data mapper
6. **1.2.5** — interactor
7. **1.2.6** — composition root
8. **1.2.7 + 1.2.8** — focused tests (verify Task 1.2 is solid before building the route)
9. **1.3.1 + 1.3.2** — route and route tests
10. **1.1.1 through 1.1.5** — anonymous friction (independent of consultation flow)
11. **1.4.1 through 1.4.8** — dashboard surface (depends on 1.2 and 1.1 being done)
12. **1.5.2 + 1.5.3 + 1.5.4** — final verification and doc update
