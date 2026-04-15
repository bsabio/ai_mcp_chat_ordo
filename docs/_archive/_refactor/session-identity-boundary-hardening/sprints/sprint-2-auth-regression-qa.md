# Sprint 2 — Auth Regression QA

> **Goal:** Lock the new session boundary in with regression tests.
> **Spec ref:** §4, §6
> **Prerequisite:** Sprint 1 complete

---

## Task 2.1 — Add invalid-session cleanup coverage

**What:** Prove expired or invalid session state is cleared and does not leave
simulated authentication behind.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/api/auth/auth-routes.test.ts` |
| **Spec** | Done Criteria 3, Done Criteria 4 |

### Verify Task 2.1

```bash
npx vitest run src/app/api/auth/auth-routes.test.ts
```

---

## Task 2.2 — Add standalone mock-cookie regression coverage

**What:** Prove a mock-role cookie alone resolves to anonymous, not a real
principal.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/api/auth/auth-routes.test.ts` or a focused auth-helper test |
| **Spec** | Done Criteria 1 |

### Verify Task 2.2

```bash
npx vitest run src/app/api/auth/auth-routes.test.ts
```