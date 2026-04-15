# Conversation Search Migration Integrity — Refactor Spec

> **Status:** Planned
> **Date:** 2026-03-15
> **Scope:** Preserve conversation-search correctness when anonymous
> conversations are migrated to an authenticated account during either
> registration or login.
> **Affects:** `src/app/api/auth/register/route.ts`,
> `src/app/api/auth/login/route.ts`,
> `src/core/use-cases/ConversationInteractor.ts`,
> `src/adapters/ConversationDataMapper.ts`, `src/lib/chat/embed-conversation.ts`,
> `src/core/use-cases/tools/search-my-conversations.tool.ts`, vector-store and
> migration-related tests

---

## 1. Problem Statement

Anonymous conversation ownership is migrated in SQLite, but the conversation
search index remains keyed to the old owner-prefixed `sourceId`.

Verified evidence:

1. Registration calls `migrateAnonymousConversations(anonUserId, result.user.id)`.
2. Ownership transfer updates `conversations.user_id` and `converted_from` only.
3. Conversation indexing derives `sourceId` as `${userId}/${conversationId}`.
4. `search_my_conversations` filters embeddings by that prefix.

Result: conversations that were created anonymously and later transferred to a
real account can disappear from `search_my_conversations`, even though the SQL
ownership record says they belong to the new user.

---

## 2. Design Goals

1. SQL ownership and search ownership must always match.
2. Registration and login migration must preserve future recall behavior.
3. Backfill/reindex path must exist for already-migrated data.
4. Search tool filtering should remain strict to current owner.
5. Tests must cover migration, archive-time indexing, and backfill behavior.

---

## 3. Architecture Direction

### 3.1 Ownership Sources

| Data store | Current owner key | Must become |
| --- | --- | --- |
| `conversations.user_id` | SQL user ID | canonical owner |
| `embeddings.source_id` for conversation docs | `${userId}/${conversationId}` | must reflect canonical owner |
| `ConversationMetadata.userId` | user ID in metadata | must reflect canonical owner |

### 3.2 Migration Options

Implementation may use either of these strategies:

1. Re-embed migrated conversations under the new owner ID and remove old
   conversation embeddings.
2. Add a dedicated vector-store ownership rewrite path if the adapter supports
   safe targeted mutation.

The first option is preferred unless a safe adapter-level rewrite is already
available.

### 3.3 Backfill Requirement

Because some migrations may already have happened, add a one-off repair path
that can rebuild conversation embeddings from canonical SQL ownership.

---

## 4. Testing Strategy

| Area | Tests |
| --- | --- |
| Migration unit tests | ownership transfer triggers index repair for registration and login |
| Search tool tests | migrated conversations searchable only under new owner |
| Integration | archive + register path preserves searchability |
| Repair | backfill command or helper fixes stale ownership prefixes |

Expected scope: 10-14 tests.

---

## 5. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Add canonical reindex/repair primitives for conversation embeddings |
| 1 | Wire repair into authentication-success migration and archive flow verification |
| 2 | Add backfill tooling, regression tests, and operational notes |

---

## 6. Done Criteria

1. A migrated anonymous conversation is searchable under the new authenticated
   user.
2. The same conversation is not searchable under the stale anonymous owner ID.
3. Existing stale data can be repaired without manual DB surgery.
4. Tests fail if SQL ownership and vector ownership diverge again.
