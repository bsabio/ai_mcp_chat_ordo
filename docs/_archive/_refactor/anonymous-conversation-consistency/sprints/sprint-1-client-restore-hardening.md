# Sprint 1 — Client Restore Hardening

> **Goal:** Make the client restore flow encode the correct endpoint contract
> instead of silently swallowing policy errors.
> **Spec ref:** §3.3, §5
> **Prerequisite:** Sprint 0 complete

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/hooks/useGlobalChat.tsx` | mount effect fetches `/api/conversations/active` and hydrates reducer |
| `src/adapters/ChatStreamAdapter.ts` | stream route contract uses `conversationId` option |
| `src/lib/chat/resolve-user.ts` | anonymous cookie-backed identity helper |
| `src/core/use-cases/ConversationInteractor.ts` | `getActiveForUser(userId)` |

---

## Task 1.1 — Differentiate restore outcomes in ChatProvider

**What:** Update the mount-time restore logic so `404` is the expected no-data
case and `401` is treated as a policy/configuration error rather than a silent
default.

| Item | Detail |
| --- | --- |
| **Modify** | `src/hooks/useGlobalChat.tsx` |
| **Spec** | Goal 4, Goal 5 |

### Implementation notes

1. Keep the hero message for `404`.
2. Avoid replacing state for non-OK responses other than `404`.
3. Log or surface a controlled warning path for `401` so policy regressions are
   diagnosable during development.
4. Keep network failures non-fatal.

### Verify Task 1.1

```bash
npm run typecheck
```

---

## Task 1.2 — Add route integration tests for anonymous restore

**What:** Add focused tests proving the route works with an anonymous cookie and
without an authenticated session token.

| Item | Detail |
| --- | --- |
| **Create or modify** | `tests` or `src/app/api/conversations/active/*.test.ts` using existing route-test conventions |
| **Spec** | Testing Strategy |

### Required cases

| Case | Expected |
| --- | --- |
| active conversation exists for anonymous cookie | `200` + messages returned |
| no active conversation for anonymous cookie | `404` |
| archive active anonymous conversation | success and conversation archived |

### Verify Task 1.2

```bash
npx vitest run src/app/api/auth/auth-routes.test.ts src/proxy.test.ts
```

---

## Task 1.3 — Add provider-level restore regression coverage

**What:** Add a test around the `ChatProvider` bootstrap path so refresh
behavior is encoded in the client layer, not only in route tests.

| Item | Detail |
| --- | --- |
| **Modify or create** | client/provider test file near `src/hooks/useGlobalChat.tsx` or existing UI tests |
| **Spec** | Goal 5 |

### Verify Task 1.3

```bash
npx vitest run
```
