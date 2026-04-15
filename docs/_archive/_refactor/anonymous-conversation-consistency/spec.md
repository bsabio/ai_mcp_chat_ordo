# Anonymous Conversation Consistency — Refactor Spec

> **Status:** Planned
> **Date:** 2026-03-15
> **Scope:** Make anonymous conversation persistence internally consistent
> across middleware, route handlers, and client bootstrapping so guest users can
> reliably resume active conversations after refresh.
> **Affects:** `src/proxy.ts`, `src/proxy.test.ts`,
> `src/app/api/conversations/active/route.ts`,
> `src/app/api/conversations/active/archive/route.ts`,
> `src/app/api/conversations/route.ts`, `src/hooks/useGlobalChat.tsx`,
> `src/lib/chat/resolve-user.ts`, related conversation API tests

---

## 1. Problem Statement

Anonymous conversation persistence is implemented in the write path but blocked
in parts of the read path.

Verified evidence:

1. The edge route guard protects every route under `/api/conversations` in
   `src/proxy.ts`, which requires an `lms_session_token` cookie.
2. `GET /api/conversations/active` uses `resolveUserId()` rather than
   `validateSession()`, which indicates it is intentionally designed to support
   anonymous users.
3. `ChatProvider` calls `/api/conversations/active` on mount to restore the
   current conversation.
4. `POST /api/chat/stream` persists anonymous messages through the
   `resolveUserId()` flow and creates anonymous-backed conversations.

Result: guest users can create an active conversation but cannot reliably load
it after refresh because middleware rejects the restore endpoint before route
logic runs.

---

## 2. Design Goals

1. One ownership model per endpoint.
2. Anonymous restore flow must work without a real session token.
3. Auth-required conversation management endpoints must stay protected.
4. Middleware policy and route behavior must agree.
5. Client bootstrap behavior must distinguish `401`, `404`, and network failure.

---

## 3. Architecture Direction

### 3.1 Route Classes

Split conversation routes into two categories:

| Category | Examples | Identity source |
| --- | --- | --- |
| Restore/current-session routes | `/api/conversations/active`, `/api/conversations/active/archive` | `resolveUserId()` |
| Authenticated account-management routes | `/api/conversations`, `/api/conversations/[id]` | `validateSession()` |

### 3.2 Middleware Policy

`src/proxy.ts` should stop blanket-protecting the entire
`/api/conversations` prefix. Instead, it should protect only the endpoints that
require a real authenticated account.

### 3.3 Client Restore Contract

`src/hooks/useGlobalChat.tsx` should treat responses as follows:

| Status | Meaning | Client behavior |
| --- | --- | --- |
| `200` | Active conversation exists | Hydrate messages + conversation ID |
| `404` | No active conversation | Keep hero state |
| `401` | Misconfiguration or auth-only endpoint | Surface controlled fallback and do not silently mask the policy mismatch |

---

## 4. Security Notes

1. Anonymous support applies only to the active-conversation flow backed by the
   anonymous cookie, not to arbitrary conversation listing or retrieval.
2. Any route that accepts a conversation ID must continue checking ownership in
   `ConversationInteractor`.
3. Middleware should not grant access broader than the route logic can enforce.

---

## 5. Testing Strategy

Add or update tests in these categories:

| Area | Tests |
| --- | --- |
| Middleware | Exact route allow/deny matrix for anonymous vs authenticated |
| Route integration | `GET /api/conversations/active` works with anonymous cookie only |
| Client behavior | `ChatProvider` mount handles `200`, `404`, `401` correctly |
| Regression | Anonymous chat survives refresh end-to-end |

Expected scope: 8-12 tests.

---

## 6. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Narrow middleware protection and align endpoint policy |
| 1 | Harden client restore flow and add route integration coverage |
| 2 | End-to-end regression, cleanup, and documentation verification |

---

## 7. Done Criteria

1. Anonymous users can create, refresh, and resume an active conversation.
2. Authenticated-only conversation routes still reject anonymous access.
3. Middleware tests and route tests encode the new contract.
4. No route depends on middleware behavior that contradicts its own identity
   resolver.
