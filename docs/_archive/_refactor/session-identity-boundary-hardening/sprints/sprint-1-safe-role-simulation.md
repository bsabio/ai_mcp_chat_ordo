# Sprint 1 — Safe Role Simulation

> **Goal:** Preserve the role-switching workflow without letting it become a
> substitute for real authentication.
> **Spec ref:** §2, §3.1, §3.3, §6
> **Prerequisite:** Sprint 0 complete

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/app/api/auth/switch/route.ts` | switch route requires a non-anonymous user and sets the mock-role cookie |
| `src/lib/auth.ts` | `setMockSession()` issues the overlay cookie |
| `src/app/layout.tsx` | UI session rendering consumes `getSessionUser()` |

---

## Task 1.1 — Keep simulation overlay semantics explicit

**What:** Make the auth helper and switch route comments/contracts explicit that
simulation only overlays a validated real session.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/auth.ts` |
| **Modify if needed** | `src/app/api/auth/switch/route.ts` |
| **Spec** | Goal 2, Goal 4 |

### Verify Task 1.1

```bash
npm run typecheck
```