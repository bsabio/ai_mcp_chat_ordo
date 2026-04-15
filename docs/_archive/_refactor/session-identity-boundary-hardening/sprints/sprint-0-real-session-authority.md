# Sprint 0 — Real Session Authority

> **Goal:** Make a validated real session the only source of authenticated
> identity.
> **Spec ref:** §2, §3.1, §6
> **Prerequisite:** None

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/lib/auth.ts` | `getSessionUser()` currently tries a real session and then falls back to mock auth |
| `src/app/api/auth/me/route.ts` | strict path already validates the real session token directly |
| `src/app/api/user-files/[id]/route.ts` | user-owned asset reads trust `getSessionUser()` |

---

## Task 0.1 — Remove standalone mock-cookie identity fallback

**What:** Change `getSessionUser()` so the mock-role cookie can only modify a
validated real session and never resolve a principal by itself.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/auth.ts` |
| **Spec** | Goal 1, Goal 2 |

### Verify Task 0.1

```bash
npm run typecheck
```

---

## Task 0.2 — Clear stale session state on validation failure

**What:** When session validation fails, clear invalid auth cookies instead of
silently carrying them forward.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/auth.ts` |
| **Spec** | Goal 3 |

### Verify Task 0.2

```bash
npx vitest run src/app/api/auth/auth-routes.test.ts
```