# Sprint 1 — Identity And Anonymous Flow

> **Goal:** Land the work that stabilizes user resolution, guest persistence,
> and auth-success behavior before search or summary changes build on them.
> **Spec ref:** §4.1, §5.1, §5.2
> **Prerequisite:** Sprint 0 complete

---

## Coordinated Workstreams

1. `anonymous-conversation-consistency`
2. `session-identity-boundary-hardening`

## Required outcomes

1. Guest users can create, restore, and archive an active conversation through
   one consistent identity source.
2. Mock-role cookies never create authenticated identity on their own.
3. Invalid real-session state is cleaned up rather than retried implicitly.
4. Login and registration can safely inherit the same migration boundary.
5. Client restore behavior distinguishes `200`, `404`, and `401` outcomes for
   the active-conversation bootstrap path.

### Verify Sprint 1

```bash
npx vitest run src/proxy.test.ts src/app/api/auth/auth-routes.test.ts src/app/api/conversations/active/route.test.ts
npx vitest run src/hooks/useGlobalChat.test.tsx
```