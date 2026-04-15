# Sprint 1 — Authentication Success Migration Wiring

> **Goal:** Ensure anonymous-to-authenticated conversion repairs conversation
> search ownership at the same time SQL ownership is transferred, regardless
> of whether the user authenticates via registration or login.
> **Spec ref:** §2, §3.2, §6
> **Prerequisite:** Sprint 0 complete

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/app/api/auth/register/route.ts` | registration route migrates anonymous conversations and clears anon cookie |
| `src/app/api/auth/login/route.ts` | login route is the other auth-success boundary and must keep migration parity |
| `src/core/use-cases/ConversationInteractor.ts` | `migrateAnonymousConversations(anonUserId, newUserId)` returns migrated count |
| `src/app/api/conversations/active/archive/route.ts` | authenticated archive path calls `embedConversation(archived.id, userId)` |

---

## Task 1.1 — Repair search index during auth-success migration

**What:** Extend the registration and login migration paths so transferred
conversations are also reindexed under the new owner.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/api/auth/register/route.ts` |
| **Modify** | `src/app/api/auth/login/route.ts` |
| **Modify** | `src/core/use-cases/ConversationInteractor.ts` or helper layer as needed |
| **Spec** | Goal 1, Goal 2 |

### Implementation notes

1. Prefer returning migrated conversation IDs from the migration path if the
   caller needs them for reindexing.
2. Keep cookie clearing after successful migration.
3. Make repair failures visible in logs and decide whether they are fatal or
   compensating work; document that decision in code comments.

### Verify Task 1.1

```bash
npm run typecheck
```

---

## Task 1.2 — Add integration coverage for migration + search recall

**What:** Prove a conversation created anonymously remains searchable after the
user registers.

| Item | Detail |
| --- | --- |
| **Create or modify** | conversation-memory or auth-route integration tests |
| **Spec** | Done Criteria 1, Done Criteria 2 |

### Verify Task 1.2

```bash
npx vitest run
```

---

## Task 1.3 — Verify archive path still indexes authenticated conversations

**What:** Confirm the new repair logic does not regress the existing archive-time
embedding flow for non-anonymous users.

### Verify Task 1.3

```bash
npx vitest run
```
