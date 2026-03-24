# Sprint 4 - Implementation Checklist

> Status: Complete on 2026-03-19

> Concrete file-by-file targets for each Sprint 4 task.
> Cross-reference: `sprint-4-individual-training-path-and-founder-follow-up.md`
> **Historical note (2026-03-24):** The file targets below reflect the dashboard-era implementation boundary in place when Sprint 4 landed. Dashboard-named paths listed here are historical references, not active runtime files.

---

## Task 4.1 - Minimal training-path record contract and persistence

**Goal:** Add the first runtime `TrainingPathRecord` so qualified individual demand becomes a durable founder-managed downstream object.

### 4.1.1 Add the `training_path_records` table

| Action | File |
| --- | --- |
| **Modify** | `src/lib/db/schema.ts` |

Add a new `CREATE TABLE IF NOT EXISTS training_path_records` block after `deal_records`.

Columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `TEXT PRIMARY KEY` | `training_{uuid}` |
| `conversation_id` | `TEXT NOT NULL` | FK to `conversations(id)` |
| `lead_record_id` | `TEXT DEFAULT NULL` | FK to `lead_records(id)` |
| `consultation_request_id` | `TEXT DEFAULT NULL` | FK to `consultation_requests(id)` |
| `user_id` | `TEXT NOT NULL` | FK to `users(id)` |
| `lane` | `TEXT NOT NULL` | Sprint 4 runtime must restrict to `individual` |
| `current_role_or_background` | `TEXT DEFAULT NULL` | |
| `technical_depth` | `TEXT DEFAULT NULL` | reuse training-fit vocabulary where possible |
| `primary_goal` | `TEXT DEFAULT NULL` | |
| `preferred_format` | `TEXT DEFAULT NULL` | |
| `apprenticeship_interest` | `TEXT DEFAULT NULL` | `yes`, `maybe`, `no`, `unknown` |
| `recommended_path` | `TEXT NOT NULL DEFAULT 'continue_conversation'` | `operator_intensive`, `operator_lab`, `mentorship_sprint`, `apprenticeship_screening`, `continue_conversation` |
| `fit_rationale` | `TEXT DEFAULT NULL` | |
| `customer_summary` | `TEXT DEFAULT NULL` | client-visible |
| `status` | `TEXT NOT NULL DEFAULT 'draft'` | `draft`, `recommended`, `screening_requested`, `deferred`, `closed` |
| `next_action` | `TEXT DEFAULT NULL` | |
| `founder_note` | `TEXT DEFAULT NULL` | internal-only |
| `created_at` | `TEXT NOT NULL DEFAULT (datetime('now'))` | |
| `updated_at` | `TEXT NOT NULL DEFAULT (datetime('now'))` | |

Constraints:

1. `lane` must remain `individual`
2. `UNIQUE(lead_record_id)` when present
3. `UNIQUE(consultation_request_id)` when present
4. at least one source id must be present at creation time
5. indexes: `idx_training_path_records_user`, `idx_training_path_records_status`, `idx_training_path_records_recommended_path`

### 4.1.2 Create the training-path entity

| Action | File |
| --- | --- |
| **Create** | `src/core/entities/training-path-record.ts` |

Define:

1. `TrainingPathRecommendation` union
2. `TrainingPathStatus` union
3. `ApprenticeshipInterest` union
4. `TrainingPathRecord` interface mirroring the table shape with camelCase names
5. `TrainingPathRecordSeed` for creation
6. `TrainingPathRecordUpdate` for founder edits
7. type guards for recommendation, status, and apprenticeship interest

### 4.1.3 Create the training-path repository interface

| Action | File |
| --- | --- |
| **Create** | `src/core/use-cases/TrainingPathRecordRepository.ts` |

Define repository methods for:

1. `create(seed)`
2. `findById(id)`
3. `findByConversationId(conversationId)`
4. `findByLeadRecordId(leadRecordId)`
5. `findByConsultationRequestId(consultationRequestId)`
6. `listByStatus(status)`
7. `listByRecommendedPath(recommendedPath)`
8. `update(id, update)`
9. `updateStatus(id, status, metadata?)`

### 4.1.4 Create the training-path data mapper

| Action | File |
| --- | --- |
| **Create** | `src/adapters/TrainingPathRecordDataMapper.ts` |

Implement the repository against SQLite using the same mapper style as leads, consultation requests, and deals.

### 4.1.5 Add focused tests for the training-path data mapper

| Action | File |
| --- | --- |
| **Create** | `src/adapters/TrainingPathRecordDataMapper.test.ts` |

Cover at minimum:

1. `create()` produces a correctly shaped draft record
2. `findByLeadRecordId()` returns the created record
3. duplicate source ids throw or reject
4. `update()` persists founder-editable fields
5. `updateStatus()` transitions to `recommended`
6. `findByConsultationRequestId()` returns null when no record exists

### 4.1 Verify

```bash
npx vitest run src/adapters/TrainingPathRecordDataMapper.test.ts
npm run typecheck
```

---

## Task 4.2 - Founder creation and recommendation interactor

**Goal:** Convert founder-reviewed individual workflow sources into downstream training-path records.

### 4.2.1 Create the interactor

| Action | File |
| --- | --- |
| **Create** | `src/core/use-cases/CreateTrainingPathFromWorkflowInteractor.ts` |

Add:

1. `createFromQualifiedLead(adminUserId, leadRecordId)`
2. `createFromConsultationRequest(adminUserId, consultationRequestId)`

Required guards:

1. source object must exist
2. source lane must be `individual`
3. lead triage state must be `qualified`
4. consultation request must be `reviewed` or `scheduled`
5. duplicate source conversion must be rejected
6. recommendation defaults must be deterministic from lead/request signals

### 4.2.2 Wire the composition root

| Action | File |
| --- | --- |
| **Modify** | `src/lib/chat/conversation-root.ts` |

Add `getTrainingPathRecordRepository()` and `getCreateTrainingPathFromWorkflowInteractor()`.

### 4.2.3 Add focused tests

| Action | File |
| --- | --- |
| **Create** | `src/core/use-cases/CreateTrainingPathFromWorkflowInteractor.test.ts` |

### 4.2 Verify

```bash
npx vitest run src/core/use-cases/CreateTrainingPathFromWorkflowInteractor.test.ts
npm run typecheck
```

---

## Task 4.3 - Founder routes and owner-safe training-path read access

**Goal:** Expose admin-side training-path creation/editing and owner-side approved-record retrieval.

### 4.3.1 Add `POST /api/training-paths`

| Action | File |
| --- | --- |
| **Create** | `src/app/api/training-paths/route.ts` |

Accept either `leadRecordId` or `consultationRequestId`. Require `ADMIN` role.

### 4.3.2 Add `GET/PATCH /api/training-paths/:id`

| Action | File |
| --- | --- |
| **Create** | `src/app/api/training-paths/[id]/route.ts` |

`GET`:

1. admin can fetch any record
2. authenticated owner can fetch only their own record
3. owner payload excludes `founderNote`

`PATCH`:

1. admin-only
2. update recommendation, rationale, summary, follow-up state, and founder note

### 4.3.3 Add route tests

| Action | File |
| --- | --- |
| **Create** | route tests near each new route |

### 4.3 Verify

```bash
npx vitest run src/app/api/training-paths/route.test.ts src/app/api/training-paths/[id]/route.test.ts
```

---

## Task 4.4 - Founder training-path queue

**Goal:** Surface training-path records alongside leads, consultation requests, and deals in the admin dashboard.

### 4.4.1 Add the training-path loader

| Action | File |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-loaders.ts` |

Add `TrainingPathQueueBlockData` and `loadTrainingPathQueueBlock(user)`.

### 4.4.2 Register the dashboard block

| Action | File |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-blocks.ts` |

Add `training_path_queue` as an admin pipeline block.

### 4.4.3 Create the block component

| Action | File |
| --- | --- |
| **Create** | `src/components/dashboard/TrainingPathQueueBlock.tsx` |

### 4.4.4 Wire it into the dashboard page

| Action | File |
| --- | --- |
| **Modify** | `src/app/dashboard/page.tsx` |

### 4.4.5 Add tests

| Action | File |
| --- | --- |
| **Modify** | related loader, page, and component tests |

### 4.4 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-loaders.test.ts src/components/dashboard/TrainingPathQueueBlock.test.tsx src/app/dashboard/page.test.tsx
```

---

## Task 4.5 - Deterministic workflow eval harness

**Goal:** Add repeatable scenario checks for the full customer workflow, including the individual learner path.

### 4.5.1 Create the eval helper

| Action | File |
| --- | --- |
| **Create** | `tests/helpers/customerWorkflowEvalHarness.ts` |

### 4.5.2 Add workflow eval tests

| Action | File |
| --- | --- |
| **Create** | `tests/customer-workflow-evals.test.ts` |

Cover at minimum:

1. organization buyer path
2. individual learner path
3. development prospect path
4. founder dashboard action summary across downstream objects

### 4.5.3 Add a package script if helpful

| Action | File |
| --- | --- |
| **Modify** | `package.json` |

Only add a dedicated script if it materially improves repeatability.

### 4.5 Verify

```bash
npx vitest run tests/customer-workflow-evals.test.ts
```

---

## Task 4.6 - Record verification truthfully

**Goal:** Capture the real post-Sprint-4 state and document any remaining deviations.

### 4.6.1 Run verification

| Action | File |
| --- | --- |
| **Run** | `npm run typecheck` |
| **Run** | `npx vitest run` |

### 4.6.2 Update sprint docs

| Action | File |
| --- | --- |
| **Modify** | `docs/_specs/customer-workflow-and-deal-flow/sprints/sprint-4-individual-training-path-and-founder-follow-up.md` |
| **Modify** | `docs/_specs/customer-workflow-and-deal-flow/spec.md` only if implementation reveals a required deviation |
