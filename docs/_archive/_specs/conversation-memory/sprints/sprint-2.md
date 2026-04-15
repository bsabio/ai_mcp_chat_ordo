# Sprint 2 — Conversation Embedding + Search

**Goal:** Archived conversations are embedded and searchable. Authenticated
users can recall past discussions via `search_my_conversations`.

## Pre-existing infrastructure (from earlier sprints)

The following are already in place and should be reused, not re-created:

- **`ConversationMetadata` type** — defined in `src/core/search/ports/Chunker.ts`
  (Vector Search sprint). Part of the `ChunkMetadata` discriminated union.
- **`EmbeddingPipelineFactory.createForSource("conversation")`** — stub exists
  in `src/core/search/EmbeddingPipelineFactory.ts`; currently throws
  `"ConversationChunker not yet implemented"`. Task 2.2 replaces the throw.
- **Existing throw-test** — `tests/search/embedding-pipeline.test.ts` has a test
  asserting the throw. This test must be updated (or replaced) to verify the
  pipeline is returned instead.
- **`summary` message part type** (`{ type: "summary"; text; coversUpToMessageId }`)
  — added in Sprint 1. Task 2.1 chunker should treat summary messages as
  `"document"` level chunks per §9.2.
- **Archive route** (`POST /api/conversations/active/archive`) — created in
  Sprint 0 (task 0.15). Task 2.3 hooks embedding into this route after
  archival completes.
- **`source_id` convention** — spec §9.3 defines `"{userId}/{conversationId}"`.
  The existing `idx_emb_source_id` index supports prefix filtering for
  user-scoped search (task 2.5).

| Task | Description | Req |
| ---- | ----------- | --- |
| 2.1 | Implement `ConversationChunker` (turn-pair chunking; summary msgs → `"document"` level) | CONVO-040 |
| 2.2 | Replace throw in `EmbeddingPipelineFactory.createForSource("conversation")` with real pipeline; update existing throw-test | CONVO-040 |
| 2.3 | Trigger embedding on archive (wire into `archiveActive()` or archive route) | CONVO-040 |
| 2.4 | Define `ConversationSearchResult` type in `src/core/search/types.ts` | CONVO-040 |
| 2.5 | Create `search_my_conversations` tool descriptor + command (user-scoped via `source_id` prefix) | CONVO-040 |
| 2.6 | Register in tool composition root | CONVO-040 |
| 2.7 | Update `ChatPolicyInteractor` ROLE_DIRECTIVES for AUTHENTICATED+ roles | CONVO-040 |
| 2.8 | Unit + integration tests (~7 new) | |
| 2.9 | Full suite green, build clean | |

**Deliverable: ~403 existing + ~7 new = ~410 tests, conversation search
working.**
