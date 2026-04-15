# Session Identity Boundary Hardening — Refactor Spec

> **Status:** Planned
> **Date:** 2026-03-15
> **Scope:** Remove mock-cookie authentication fallback, keep role simulation
> bound to validated sessions, and clean up invalid session state.
> **Affects:** `src/lib/auth.ts`, `src/app/api/auth/switch/route.ts`,
> `src/app/api/auth/logout/route.ts`, auth-route tests, and any route that
> relies on `getSessionUser()`

---

## 1. Problem Statement

The mock-role cookie is still treated as a standalone identity source when no
valid real session exists.

Verified evidence:

1. `getSessionUser()` tries the real session token first.
2. If validation fails, it falls through to the legacy mock-role cookie.
3. The mock-role cookie resolves to a real user record via `findByActiveRole()`.
4. Multiple API routes trust `getSessionUser()` as their auth source.

Result: role simulation can outlive the real session boundary and act like a
real authenticated identity source instead of a role overlay on top of one.

---

## 2. Design Goals

1. A validated real session must be the only source of authenticated identity.
2. Role simulation must be an overlay, never a fallback identity mechanism.
3. Invalid session state should be cleared instead of silently retried.
4. Existing admin/dev simulation flows should keep working when a real session
   is present.
5. Tests must fail if mock cookies regain standalone-auth behavior.

---

## 3. Architecture Direction

### 3.1 Identity Precedence

| Source | Allowed use |
| --- | --- |
| `lms_session_token` | canonical authenticated identity |
| `lms_mock_session_role` | optional role overlay on a validated session |
| no valid session | anonymous only |

### 3.2 Invalid Session Cleanup

If session validation fails, the server should clear the stale session cookie.
If no valid session remains, the mock-role cookie should also be cleared so the
client does not keep carrying dead auth state.

### 3.3 Route Contract

Routes that need strict authentication may still call `validateSession()`
directly, but routes that use `getSessionUser()` must not become less safe than
that direct path.

---

## 4. Testing Strategy

| Area | Tests |
| --- | --- |
| Auth routes | mock cookie does not survive logout/expired session as identity |
| Session helper | mock cookie overlays only a validated real session |
| Regression | anonymous fallback remains available without creating auth |

Expected scope: 6-9 tests.

---

## 5. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Make validated session the sole identity authority |
| 1 | Preserve safe role simulation for authenticated sessions only |
| 2 | Add auth regression coverage and cleanup checks |

---

## 6. Done Criteria

1. `getSessionUser()` never resolves a real user from the mock-role cookie
   alone.
2. Role simulation still works as an overlay when a real session is valid.
3. Invalid session cookies are cleared during session resolution.
4. Tests prove logout or expiry cannot leave simulated auth behind.