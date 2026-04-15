# Sprint 0 — Index Repair Primitives

> **Goal:** Add the minimum safe primitives needed to rebuild conversation
> embeddings under canonical ownership.
> **Spec ref:** §3.1, §3.2
> **Prerequisite:** None

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/lib/chat/embed-conversation.ts` | `embedConversation(conversationId, userId)` indexes conversation documents with owner-prefixed `sourceId` |
| `src/core/use-cases/tools/search-my-conversations.tool.ts` | search filters vector records by `sourceId.startsWith(`${userId}/`)` |
| `src/lib/chat/tool-composition-root.ts` | `getEmbeddingPipelineFactory()` |
| `src/adapters/ConversationDataMapper.ts` | `transferOwnership(fromUserId, toUserId)` |

---

## Task 0.1 — Define a repair helper for canonical reindexing

**What:** Introduce a helper that can re-embed a conversation using the current
SQL owner and remove or supersede stale owner-prefixed records.

| Item | Detail |
| --- | --- |
| **Create or modify** | `src/lib/chat/embed-conversation.ts` and adjacent helper file if needed |
| **Spec** | Goal 1, Goal 3 |

### Implementation notes

1. The helper should take a `conversationId` and canonical `userId`.
2. It should be idempotent.
3. If the vector-store adapter exposes source-ID deletion, use it. Otherwise,
   fall back to a deterministic reindex path and document remaining cleanup.

### Verify Task 0.1

```bash
npm run typecheck
```

---

## Task 0.2 — Add focused tests around owner-prefixed search results

**What:** Extend `search-my-conversations` tests to encode the ownership-prefix
contract explicitly.

| Item | Detail |
| --- | --- |
| **Modify** | `src/core/use-cases/tools/search-my-conversations.tool.test.ts` |
| **Spec** | Goal 4 |

### Required cases

| Case | Expected |
| --- | --- |
| matching `userId/conversationId` prefix | returned |
| stale anonymous prefix after migration | excluded |
| canonical reindexed prefix | returned |

### Verify Task 0.2

```bash
npx vitest run src/core/use-cases/tools/search-my-conversations.tool.test.ts
```

---

## Task 0.3 — Add unit coverage for repair helper

**What:** Add tests proving the reindex helper updates ownership-visible search
behavior without changing conversation content.

### Verify Task 0.3

```bash
npx vitest run
```
