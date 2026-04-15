# Sprint 1 — Route Migration to Standard Envelope

> **Goal:** Migrate all API routes to use the standard error response envelope
> via `mapErrorToResponse`, starting with auth routes and finishing with any
> remaining non-template routes.
>
> **Spec Sections:** 2 (Design Goals §4, §5, §6), 3 (Architecture §3.4)
>
> **Prerequisite:** Sprint 0 complete (canonical errors and mapper available)

## Available Assets

| Asset | Location |
| --- | --- |
| Canonical errors | `src/core/common/errors.ts` |
| mapErrorToResponse | `src/core/common/errors.ts` (or `error-mapper.ts`) |
| Auth routes | `src/app/api/auth/login/route.ts`, `src/app/api/auth/register/route.ts` |
| Profile route | `src/app/api/profile/route.ts` |
| Referral routes | `src/app/api/referral/*/route.ts` |
| runRouteTemplate | `src/lib/observability/` |
| getErrorCode | `src/lib/observability/logger.ts` |

---

### Task 1 — Migrate auth routes

Update `src/app/api/auth/login/route.ts` and
`src/app/api/auth/register/route.ts` to:

1. Import `mapErrorToResponse` from common errors.
2. Replace manual `NextResponse.json({ error: ... })` catch blocks with
   `mapErrorToResponse(error)`.
3. Return `NextResponse.json(body, { status })` from the mapper result.

After migration, auth error responses must include `errorCode` and match the
standard envelope.

**Verify:**

```bash
npx vitest run tests/auth*.test.ts
```

---

### Task 2 — Migrate remaining non-template routes

Identify all routes that use direct `NextResponse.json` error responses
instead of `runRouteTemplate`. Migrate each to use `mapErrorToResponse`.

Known candidates:

- `src/app/api/profile/route.ts`
- `src/app/api/referral/visit/route.ts`
- Any other routes not using `runRouteTemplate`

**Verify:**

```bash
npm run build
npx vitest run
```

---

### Task 3 — Update runRouteTemplate to use mapper

Modify `runRouteTemplate` and `errorJson` to delegate to
`mapErrorToResponse` internally. This ensures all template-based routes
automatically benefit from the canonical error mapping.

Replace the `getErrorCode()` string-matching function with class-based
resolution. `getErrorCode()` can be deprecated or removed.

**Verify:**

```bash
npx vitest run
```

---

## Completion Checklist

- [x] Auth routes return `{ error, errorCode }` envelope
- [x] All non-template routes migrated to `mapErrorToResponse` or include `errorCode`
- [x] `runRouteTemplate` delegates to `mapErrorToResponse`
- [x] `getErrorCode()` string matching deprecated (Remove after 2025-10-01)
- [x] `npm run build` succeeds
- [x] All existing tests pass
