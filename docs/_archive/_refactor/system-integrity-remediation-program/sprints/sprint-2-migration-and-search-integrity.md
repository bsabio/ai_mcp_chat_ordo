# Sprint 2 — Migration And Search Integrity

> **Goal:** Ensure canonical conversation ownership and conversation-search
> visibility remain aligned after authentication-success migration.
> **Spec ref:** §5.3, §8
> **Prerequisite:** Sprint 1 complete

---

## Coordinated Workstream

1. `conversation-search-migration-integrity`

## Required outcomes

1. Registration and login both migrate anonymous conversations.
2. Search ownership is repaired at the same time SQL ownership moves.
3. Migrated conversations are recallable only by the new canonical owner.
4. A repair path exists for already-converted stale data.

### Verify Sprint 2

```bash
npx vitest run src/app/api/auth/auth-routes.test.ts src/core/use-cases/tools/search-my-conversations.tool.test.ts src/lib/chat/embed-conversation.test.ts
npm run repair:conversation-indexes
```

Run the repair command only against a seeded local or test dataset for
verification. Its purpose here is to prove the backfill path exists and runs,
not to treat production data repair as part of normal developer QA. The direct
repair-helper test remains required because the command can report zero repairs
when no converted local data is present.