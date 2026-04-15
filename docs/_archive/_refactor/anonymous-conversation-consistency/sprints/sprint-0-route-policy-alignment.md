# Sprint 0 — Route Policy Alignment

> **Goal:** Align middleware and route behavior so anonymous restore/archive
> endpoints are reachable, while account-scoped conversation endpoints remain
> authenticated.
> **Spec ref:** §3.1, §3.2, §4
> **Prerequisite:** None

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/proxy.ts` | `PROTECTED_API_PREFIXES`, `isProtectedRoute(pathname)`, `proxy(request)` |
| `src/app/api/conversations/active/route.ts` | `GET(request)` uses `resolveUserId()` |
| `src/app/api/conversations/active/archive/route.ts` | `POST(request)` uses `resolveUserId()` and `embedConversation()` for non-anonymous users |
| `src/app/api/conversations/route.ts` | `GET` and `POST` validate `lms_session_token` |
| `src/app/api/conversations/[id]/route.ts` | `GET` and `DELETE` validate `lms_session_token` |
| `src/proxy.test.ts` | Current allow/deny matrix |

---

## Task 0.1 — Narrow the protected-route list

**What:** Replace the broad `/api/conversations` prefix rule with an explicit
allow/deny list that keeps active restore/archive public-to-anonymous-cookie but
still protects account-scoped endpoints.

| Item | Detail |
| --- | --- |
| **Modify** | `src/proxy.ts` |
| **Spec** | Goal 1, Goal 2, Goal 3 |

### Implementation notes

1. Keep `/api/auth/me`, `/api/auth/logout`, and `/api/auth/switch` protected.
2. Protect `/api/conversations` and `/api/conversations/[id]`.
3. Do **not** protect `/api/conversations/active` or
   `/api/conversations/active/archive` in middleware.
4. Make route classification explicit so future additions do not inherit an
   overly broad prefix match by accident.

### Verify Task 0.1

```bash
npx vitest run src/proxy.test.ts
```

---

## Task 0.2 — Update middleware tests to encode the new contract

**What:** Rewrite the middleware test matrix so it documents anonymous restore
behavior directly.

| Item | Detail |
| --- | --- |
| **Modify** | `src/proxy.test.ts` |
| **Spec** | Goal 2, Goal 4 |

### Required cases

| Case | Expected |
| --- | --- |
| `/api/chat/stream` without cookie | `200` |
| `/api/conversations/active` without cookie | `200` |
| `/api/conversations/active/archive` without cookie | `200` |
| `/api/conversations` without cookie | `401` |
| `/api/conversations/[id]` without cookie | `401` |
| protected auth routes with cookie | `200` |

### Verify Task 0.2

```bash
npx vitest run src/proxy.test.ts
```

---

## Task 0.3 — Add route-level auth comment and policy note

**What:** Add short clarifying comments in the two active-conversation routes so
the anonymous behavior is intentional and future edits do not reintroduce the
middleware mismatch.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/api/conversations/active/route.ts` |
| **Modify** | `src/app/api/conversations/active/archive/route.ts` |
| **Spec** | Goal 4 |

### Verify Task 0.3

```bash
npm run typecheck
```
