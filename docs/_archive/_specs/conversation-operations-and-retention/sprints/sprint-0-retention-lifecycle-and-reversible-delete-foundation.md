# Sprint 0 — Retention, Lifecycle, And Reversible Delete Foundation

> **Goal:** Freeze the lifecycle defaults and replace irreversible self-service delete with a tombstone-based foundation: scoped history queries, restore, admin deleted-state visibility, and route compatibility. Stop-generation UX, import/export, and privacy-flow UI are explicitly deferred.
> **Spec Sections:** `COR-031` through `COR-036`, `COR-060` through `COR-080`
> **Prerequisite:** Current conversation continuity, archive-on-new-chat behavior, and admin conversation browse/detail flows are already in place.

---

## Available Assets

| Asset | Verified detail |
| --- | --- |
| `docs/_specs/conversation-operations-and-retention/artifacts/retention-and-lifecycle-matrix.md` | Canonical defaults now exist for anonymous TTL, trash restore window, admin purge eligibility, and role-scoped management actions. |
| `src/lib/db/migrations.ts` | Uses `addColumnIfNotExists(...)` for additive conversation columns and indexes; this is the correct place to add tombstone fields and new conversation indexes. |
| `src/adapters/ConversationDataMapper.ts` | `listByUser(userId)` currently returns all owned conversations ordered by `updated_at`, and `delete(id)` performs a physical delete. Admin methods already exist via `listForAdmin(...)`, `countForAdmin(...)`, and `archiveById(...)`. |
| `src/core/use-cases/ConversationRepository.ts` | Current port exposes `listByUser(userId)`, `delete(id)`, `updateTitle(...)`, `archiveByUser(...)`, and `transferOwnership(...)`, but no soft-delete or restore semantics. |
| `src/core/use-cases/ConversationInteractor.ts` | Current interactor exposes `list(userId)`, `delete(conversationId, userId)`, `archiveActive(userId)`, `getActiveForUser(...)`, and `migrateAnonymousConversations(...)`. |
| `src/app/api/conversations/route.ts` | Signed-in `GET` returns all self-owned conversations and `POST` ensures an active conversation. No scope filtering exists yet. |
| `src/app/api/conversations/[id]/route.ts` | `GET` returns owned conversation detail; `DELETE` calls `interactor.delete(...)` and hard-removes the conversation today. |
| `src/lib/admin/conversations/admin-conversations-actions.ts` | Admin takeover, hand-back, and bulk archive already exist, so deleted-state visibility and restore should follow the same server-action pattern rather than inventing a parallel admin mutation model. |

---

## Tasks

### 1. Treat the retention matrix as locked input

Use the artifact defaults in `artifacts/retention-and-lifecycle-matrix.md` as Sprint 0 requirements rather than reopening policy discovery during implementation.

Sprint 0 must assume:

- anonymous session TTL = 30 days
- anonymous recent-history cap = 10 conversations
- self-service trash restore window = 30 days
- signed-in archived retention = indefinite by default
- ordinary admin purge is out of scope for this sprint

Verify: documentation-only; no runtime command required.

### 2. Add tombstone schema columns and indexes

Extend the conversation schema through `src/lib/db/migrations.ts` using the existing additive migration helpers.

Add at minimum:

- `deleted_at TEXT DEFAULT NULL`
- `deleted_by_user_id TEXT DEFAULT NULL`
- `delete_reason TEXT DEFAULT NULL`
- `purge_after TEXT DEFAULT NULL`
- `restored_at TEXT DEFAULT NULL`

Also add indexes that support:

- self-service history scoped by `(user_id, status, deleted_at)`
- admin deleted-state filtering
- future purge sweeps by `purge_after`

Do not add hard-purge jobs, export/import payload columns, or stop-stream registry state in this sprint.

Verify: `npx vitest run src/adapters/ConversationDataMapper.test.ts src/core/use-cases/ConversationInteractor.test.ts`

### 3. Extend repository and interactor semantics for reversible delete

Update `ConversationRepository` and `ConversationInteractor` so the lifecycle contract becomes explicit.

Required changes:

- add scoped listing support for `active | archived | deleted | all`
- add a soft-delete operation that records actor identity and `purge_after`
- add a restore operation that clears the tombstone fields
- add an explicit rename/update-title path with ownership validation
- keep `delete(...)` as a compatibility wrapper that now means soft-delete for ordinary self-service callers

The interactor, not the route layer, should compute policy-derived values such as `purge_after`.

Verify: `npx vitest run src/core/use-cases/ConversationInteractor.test.ts src/adapters/ConversationDataMapper.test.ts`

### 4. Update self-service routes without breaking callers

Bring the user-facing conversation API into alignment with the new foundation.

Required route behavior:

- `GET /api/conversations` accepts `scope=active|archived|deleted|all`
- `PATCH /api/conversations/[id]` supports `rename`, `archive`, and `move_to_trash`
- `POST /api/conversations/[id]/restore` restores a soft-deleted conversation
- `DELETE /api/conversations/[id]` keeps returning `{ deleted: true }` but now performs soft-delete

Explicitly out of scope:

- export/import routes
- stop-generation routes
- anonymous bounded-history UI

Verify: add focused route coverage and run `npx vitest run src/app/api/conversations/route.test.ts src/app/api/conversations/[id]/route.test.ts`

### 5. Extend admin browse/detail to understand deleted state

Update the admin conversation loaders/actions so admins can inspect deleted conversations and restore them.

Required behavior:

- admin list filters must support a deleted state without conflating it with `status = archived`
- admin detail must display tombstone metadata when present
- add a restore server action using the existing admin server-action pattern

Explicitly out of scope:

- bulk purge
- privacy-request workflow UI
- reassignment UI

Verify: `npx vitest run tests/admin-prompts-conversations.test.tsx tests/admin-processes.test.ts`

### 6. Coverage, compatibility notes, and out-of-scope lock

Add or update tests that prove:

- deleted conversations disappear from default self-service lists
- deleted conversations are restorable within the configured window
- `DELETE /api/conversations/[id]` no longer cascades message loss immediately
- admin filters can still inspect deleted conversations

Record the following as explicitly deferred past Sprint 0:

- stop-generation runtime and UI
- transcript export/import
- attachment portability UI
- purge worker and privacy/compliance UX

Verify: `npx vitest run src/adapters/ConversationDataMapper.test.ts src/core/use-cases/ConversationInteractor.test.ts tests/admin-prompts-conversations.test.tsx`

---

## Completion Checklist

- [ ] retention defaults treated as fixed Sprint 0 inputs
- [ ] tombstone conversation columns added via migrations
- [ ] scoped list, soft-delete, restore, and rename semantics added to repository/interactor
- [ ] self-service conversation routes support scoped history and reversible delete
- [ ] admin conversations can inspect and restore deleted items
- [ ] focused tests pass
- [ ] out-of-scope items are recorded so Sprint 0 does not sprawl

## QA Deviations

- None yet.
