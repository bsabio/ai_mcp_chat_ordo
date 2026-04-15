# Sprint 5 — Polish & Hardening

> **Goal:** Production-ready quality. Error handling, loading states, observability.
> **Spec ref:** §8 Phase 4
> **Prerequisite:** Sprint 4 complete

## Sprint 0–4 outcomes affecting this sprint

- **Auto-title (Phase 4 item 2) — DONE in Sprint 4.** `ConversationInteractor.appendMessage()` already auto-titles from first user message, truncated to 80 chars. Tested in `ConversationInteractor.test.ts`.
- **Delete conversation UI (Phase 4 item 3) — DONE in Sprint 4.** `ConversationSidebar.tsx` has a delete button per conversation, wired to `deleteConversation()` in `useGlobalChat`.
- **Login/register loading states (Phase 4 item 5, partial) — DONE in Sprint 2.** Both pages have `loading` state, disabled button, and "Signing in…"/"Creating account…" text.
- **`SessionDataMapper.deleteExpired()` — EXISTS from Sprint 1.** Port + adapter implemented and tested; not yet wired into startup or opportunistic lifecycle.
- **`ChatPolicyInteractor` — NEW in Sprint 3.** Implements `UseCase<{ role: RoleName }, string>` and should be wrapped with `LoggingDecorator`.
- **`ConversationInteractor` — NOT `UseCase<T,R>` compatible.** It has multiple methods (create, get, list, delete, appendMessage) rather than a single `execute()`. Cannot be wrapped with `LoggingDecorator` directly.

---

## Task 5.1 — Session cleanup

**What:** Wire expired session pruning into the application lifecycle. The `SessionRepository.deleteExpired()` port and `SessionDataMapper` adapter already exist from Sprint 1.

| Item | Detail |
| ------ | -------- |
| **Modify** | `src/lib/auth.ts` — call `sessionRepo.deleteExpired()` opportunistically inside `validateSession()` (fire-and-forget after successful validation, e.g., 1-in-100 probability to avoid per-request cost) |
| **Modify** | `src/lib/db/schema.ts` — call `deleteExpired()` once during `ensureSchema()` startup to prune stale sessions on cold boot |
| **Spec** | AUTH-7 |
| **Tests** | Integration: create expired session → trigger prune → verify deleted; create valid session → verify NOT deleted |
| **Existing** | `SessionDataMapper.deleteExpired()` already tested in `SessionDataMapper.test.ts` (Sprint 1) |

---

## ~~Task 5.2 — Conversation auto-title~~ COMPLETED IN SPRINT 4

Auto-title is already implemented in `ConversationInteractor.appendMessage()` (Sprint 4, Task 4.3). First user message → `updateTitle()` with 80-char truncation. Covered by tests in `ConversationInteractor.test.ts`:

- `auto-titles from first user message when title is empty`
- `truncates auto-title to 80 chars`
- `does NOT auto-title for assistant messages`
- `does NOT auto-title when title already set`

**No work remaining.**

---

## Task 5.3 — Client error handling

**What:** Proper handling of 401/403 HTTP responses in client-side API calls. Currently, `useGlobalChat` catches errors generically but doesn't distinguish auth failures from other errors.

| Item | Detail |
| ------ | -------- |
| **Modify** | `src/hooks/useGlobalChat.tsx` — in `refreshConversations()`, `loadConversation()`, `deleteConversation()`, and `sendMessage()`: detect 401 responses → redirect to `/login`; detect 403 → show "Access denied" error message |
| **Spec** | TEST-EDGE-01, TEST-EDGE-04, Phase 4 item 4 |
| **Tests** | Manual: expire a session cookie → next API call redirects to login; attempt to access a protected resource without auth → 401 redirect |

---

## Task 5.4 — Conversation sidebar loading states

**What:** Add loading indicators for conversation list fetching and conversation switching. Login/register loading states are already implemented (Sprint 2).

| Item | Detail |
| ------ | -------- |
| **Modify** | `src/hooks/useGlobalChat.tsx` — add `isLoadingConversations` and `isLoadingMessages` state |
| **Modify** | `src/frameworks/ui/ConversationSidebar.tsx` — show loading indicator during conversation list fetch |
| **Modify** | `src/frameworks/ui/ChatContainer.tsx` — show loading indicator during conversation switch (loadConversation) |
| **Spec** | Phase 4 item 5 |
| **Already done** | Login page: "Signing in…" + disabled button; Register page: "Creating account…" + disabled button |
| **Tests** | Manual verification |

---

## Task 5.5 — LoggingDecorator for UseCase-compatible interactors

**What:** Wrap all `UseCase<TReq, TRes>`-compatible interactors with the existing `LoggingDecorator` for observability, matching the pattern used in `src/lib/book-library.ts`.

| Item | Detail |
| ------ | -------- |
| **Modify** | `src/lib/auth.ts` — in `getAuthInteractors()`, wrap `RegisterUserInteractor`, `AuthenticateUserInteractor`, `ValidateSessionInteractor` with `LoggingDecorator` |
| **Modify** | `src/lib/chat/tools.ts` or wherever `ChatPolicyInteractor` is instantiated — wrap with `LoggingDecorator` |
| **Not applicable** | `ConversationInteractor` — uses multi-method interface (create/get/list/delete/appendMessage), not `UseCase<T,R>.execute()`. Not compatible with `LoggingDecorator`. Observability for conversation operations is handled by structured logging in API routes via `runRouteTemplate()`. |
| **Spec** | §2A Design Pattern Summary (Decorator row), Phase 4 item 6 |
| **Tests** | Build + existing tests pass; verify log output shows decorator-wrapped interactor names |
