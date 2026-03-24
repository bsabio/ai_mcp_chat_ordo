# Sprint 3 — Implementation Checklist

> Concrete file-by-file targets for each Sprint 3 task.
> Cross-reference: `sprint-3-organization-and-development-deal-flow.md`
> **Historical note (2026-03-24):** The file targets below reflect the dashboard-era implementation boundary in place when Sprint 3 shipped. Dashboard-named paths listed here are historical references, not the current operator-owned runtime surface.

---

## Task 3.1 — Minimal deal record contract and persistence

**Goal:** Add the first runtime `DealRecord` so organization and development opportunities can become durable founder-managed deals.

### 3.1.1 Add the `deal_records` table

| Action | File |
| --- | --- |
| **Modify** | `src/lib/db/schema.ts` |

Add a new `CREATE TABLE IF NOT EXISTS deal_records` block after `consultation_requests`.

Columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `TEXT PRIMARY KEY` | `deal_{uuid}` |
| `conversation_id` | `TEXT NOT NULL` | FK to `conversations(id)` |
| `consultation_request_id` | `TEXT DEFAULT NULL` | FK to `consultation_requests(id)` |
| `lead_record_id` | `TEXT DEFAULT NULL` | FK to `lead_records(id)` |
| `user_id` | `TEXT NOT NULL` | FK to `users(id)` |
| `lane` | `TEXT NOT NULL` | Sprint 3 runtime must restrict to `organization` or `development` |
| `title` | `TEXT NOT NULL DEFAULT ''` | |
| `organization_name` | `TEXT DEFAULT NULL` | |
| `problem_summary` | `TEXT NOT NULL DEFAULT ''` | |
| `proposed_scope` | `TEXT NOT NULL DEFAULT ''` | |
| `recommended_service_type` | `TEXT NOT NULL DEFAULT ''` | |
| `estimated_hours` | `REAL DEFAULT NULL` | |
| `estimated_training_days` | `REAL DEFAULT NULL` | |
| `estimated_price` | `INTEGER DEFAULT NULL` | exploratory price in dollars |
| `status` | `TEXT NOT NULL DEFAULT 'draft'` | `draft`, `qualified`, `estimate_ready`, `agreed`, `declined`, `on_hold` |
| `next_action` | `TEXT DEFAULT NULL` | |
| `assumptions` | `TEXT DEFAULT NULL` | |
| `open_questions` | `TEXT DEFAULT NULL` | |
| `founder_note` | `TEXT DEFAULT NULL` | internal-only |
| `customer_response_note` | `TEXT DEFAULT NULL` | visible in response handling |
| `created_at` | `TEXT NOT NULL DEFAULT (datetime('now'))` | |
| `updated_at` | `TEXT NOT NULL DEFAULT (datetime('now'))` | |

Constraints:

1. `UNIQUE(consultation_request_id)` when present
2. `UNIQUE(lead_record_id)` when present
3. Indexes: `idx_deal_records_user`, `idx_deal_records_status`, `idx_deal_records_lane`

### 3.1.2 Create the deal record entity

| Action | File |
| --- | --- |
| **Create** | `src/core/entities/deal-record.ts` |

Define:

1. `DealLane` union: `organization | development`
2. `DealStatus` union: `draft | qualified | estimate_ready | agreed | declined | on_hold`
3. `DealRecord` interface mirroring the table shape with camelCase names
4. `DealRecordSeed` for creation
5. `DealRecordUpdate` for founder edits
6. `isDealLane()` and `isDealStatus()` type guards

### 3.1.3 Create the deal repository interface

| Action | File |
| --- | --- |
| **Create** | `src/core/use-cases/DealRecordRepository.ts` |

Define repository methods for:

1. `create(seed)`
2. `findById(id)`
3. `findByConversationId(conversationId)`
4. `findByConsultationRequestId(consultationRequestId)`
5. `findByLeadRecordId(leadRecordId)`
6. `listByStatus(status)`
7. `update(id, update)`
8. `updateStatus(id, status, metadata?)`

### 3.1.4 Create the deal data mapper

| Action | File |
| --- | --- |
| **Create** | `src/adapters/DealRecordDataMapper.ts` |

Implement the repository against SQLite using the same `better-sqlite3` style as lead and consultation request mappers.

### 3.1.5 Add focused tests for the deal data mapper

| Action | File |
| --- | --- |
| **Create** | `src/adapters/DealRecordDataMapper.test.ts` |

Cover at minimum:

1. `create()` produces a correctly shaped draft record
2. `findByConsultationRequestId()` returns the created record
3. duplicate `consultation_request_id` throws or rejects
4. `update()` persists founder-editable fields
5. `updateStatus()` transitions to `agreed`
6. `findByLeadRecordId()` returns null when no record exists

### 3.1 Verify

```bash
npx vitest run src/adapters/DealRecordDataMapper.test.ts
npm run typecheck
```

---

## Task 3.2 — Draft-deal creation interactor

**Goal:** Convert founder-reviewed consultation requests or qualified leads into draft deals.

### 3.2.1 Create the interactor

| Action | File |
| --- | --- |
| **Create** | `src/core/use-cases/CreateDealFromWorkflowInteractor.ts` |

Add:

1. `createFromConsultationRequest(consultationRequestId)`
2. `createFromQualifiedLead(leadRecordId)`

Required guards:

1. source object must exist
2. source lane must be `organization` or `development`
3. consultation request must be `reviewed` or `scheduled`
4. lead triage state must be `qualified`
5. duplicate source conversion must be rejected

### 3.2.2 Wire the composition root

| Action | File |
| --- | --- |
| **Modify** | `src/lib/chat/conversation-root.ts` |

Add `getDealRecordRepository()` and `getCreateDealFromWorkflowInteractor()`.

### 3.2.3 Add focused tests

| Action | File |
| --- | --- |
| **Create** | `src/core/use-cases/CreateDealFromWorkflowInteractor.test.ts` |

### 3.2 Verify

```bash
npx vitest run src/core/use-cases/CreateDealFromWorkflowInteractor.test.ts
npm run typecheck
```

---

## Task 3.3 — Founder deal routes and customer response route

**Goal:** Expose admin-side deal creation/editing and owner-side agree/decline handling.

### 3.3.1 Add `POST /api/deals`

| Action | File |
| --- | --- |
| **Create** | `src/app/api/deals/route.ts` |

Accept either `consultationRequestId` or `leadRecordId`. Require `ADMIN` role.

### 3.3.2 Add `GET/PATCH /api/deals/:id`

| Action | File |
| --- | --- |
| **Create** | `src/app/api/deals/[id]/route.ts` |

`GET`:

1. admin can fetch any deal
2. authenticated owner can fetch only their own deal

`PATCH`:

1. admin-only
2. update draft/qualified deal fields
3. reject malformed numeric estimate edits instead of silently dropping them

### 3.3.3 Add `POST /api/deals/:id/response`

| Action | File |
| --- | --- |
| **Create** | `src/app/api/deals/[id]/response/route.ts` |

Accept `{ response: 'agreed' | 'declined', note?: string }`. Owner-only.
Reject requests unless the deal is already `estimate_ready`.

### 3.3.4 Add route tests

| Action | File |
| --- | --- |
| **Create** | route tests near each new route |

### 3.3 Verify

```bash
npx vitest run src/app/api/deals/route.test.ts src/app/api/deals/[id]/route.test.ts src/app/api/deals/[id]/response/route.test.ts
```

---

## Task 3.4 — Founder deal queue

**Goal:** Surface deal records alongside leads and consultation requests in the admin dashboard.

### 3.4.1 Add the deal loader

| Action | File |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-loaders.ts` |

Add `DealQueueBlockData` and `loadDealQueueBlock(user)`.

### 3.4.2 Register the dashboard block

| Action | File |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-blocks.ts` |

Add `deal_queue` as an admin pipeline block.

### 3.4.3 Create the block component

| Action | File |
| --- | --- |
| **Create** | `src/components/dashboard/DealQueueBlock.tsx` |

### 3.4.4 Wire it into the dashboard page

| Action | File |
| --- | --- |
| **Modify** | `src/app/dashboard/page.tsx` |

### 3.4.5 Add tests

| Action | File |
| --- | --- |
| **Modify** | related loader, page, and component tests |

### 3.4 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts src/components/dashboard/DealQueueBlock.test.tsx src/app/dashboard/page.test.tsx
```

---

## Task 3.5 — Record verification truthfully

**Goal:** Capture the actual Sprint 3 test and typecheck state.

### 3.5.1 Run final verification

| Action | File |
| --- | --- |
| **Run** | `npx vitest run 2>&1 \| tail -20` |
| **Run** | `npm run typecheck` |

### 3.5.2 Update sprint docs if needed

| Action | File |
| --- | --- |
| **Modify** | `docs/_specs/customer-workflow-and-deal-flow/sprints/sprint-3-organization-and-development-deal-flow.md` |
| **Modify** | `docs/_specs/customer-workflow-and-deal-flow/spec.md` only if implementation reveals a deviation |