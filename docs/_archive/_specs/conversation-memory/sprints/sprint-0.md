# Sprint 0 — Anonymous Sessions + Active Conversation Resume + Instrumentation

**Goal:** All users (including anonymous) get server-side conversation
persistence that survives page refreshes. Single-conversation model.
Conversation events table and metadata columns provide the instrumentation
foundation for all later sprints. Anonymous → authenticated migration
ensures no data is lost on registration.

| Task | Description | Req |
| ---- | ----------- | --- |
| 0.1 | Schema migration: add `status TEXT DEFAULT 'active'` + index | CONVO-050 |
| 0.2 | Schema migration: `conversation_events` table + indexes | CONVO-070 |
| 0.3 | Schema migration: metadata columns on `conversations` (`converted_from`, `message_count`, `first_message_at`, `last_tool_used`, `session_source`, `prompt_version`) | CONVO-070 |
| 0.4 | Schema migration: `token_estimate` column on `messages` | CONVO-070 |
| 0.5 | Add `findActiveByUser()` and `archiveByUser()` to `ConversationRepository` port | CONVO-010, CONVO-050 |
| 0.6 | Implement in `ConversationDataMapper` | CONVO-010, CONVO-050 |
| 0.7 | Implement `ConversationEventRecorder` use-case + `ConversationEventDataMapper` adapter | CONVO-070 |
| 0.8 | Implement `resolveUserId()` helper with `lms_anon_session` cookie | CONVO-020 |
| 0.9 | Implement `migrateAnonymousConversations()` in `ConversationInteractor` | CONVO-080 |
| 0.10 | Wire migration into registration flow (NextAuth callback or register route) | CONVO-080 |
| 0.11 | Remove `shouldPersist` gate in stream route; use `resolveUserId()` | CONVO-020 |
| 0.12 | Wire event emission: `started` on create, `message_sent` on append, `tool_used` on tool call | CONVO-070 |
| 0.13 | Update `appendMessage()` to increment `message_count`, set `first_message_at`, compute `token_estimate` | CONVO-070 |
| 0.14 | Create `GET /api/conversations/active` route | CONVO-010 |
| 0.15 | Create `POST /api/conversations/active/archive` route (emits `archived` event) | CONVO-050 |
| 0.16 | Update `ConversationInteractor`: `archiveActive()`, adjust `create()` | CONVO-050 |
| 0.17 | Update `ChatProvider` mount — single `GET /api/conversations/active` | CONVO-010 |
| 0.18 | Remove multi-conversation UI (sidebar, list, delete, load) | CONVO-050 |
| 0.19 | Add "New conversation" button that archives + resets | CONVO-050 |
| 0.20 | Unit + integration tests (~18 new) | |
| 0.21 | Full suite green, build clean | |

**Deliverable: 376 existing + ~18 new = ~394 tests, conversations survive
refresh for all users, event instrumentation live, anon→auth migration
working.**
