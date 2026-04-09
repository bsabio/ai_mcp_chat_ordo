# Sprint 0 — Canonical Error Classes and Mapper

> **Goal:** Create the canonical error hierarchy in `src/core/common/errors.ts`,
> implement `mapErrorToResponse`, and verify with unit tests. No route changes
> in this sprint.
>
> **Spec Sections:** 2 (Design Goals), 3 (Architecture §3.1, §3.3)
>
> **Prerequisite:** None

## Available Assets

| Asset | Location |
| --- | --- |
| Existing entity errors | `src/core/entities/errors.ts` |
| Existing error code mapper | `src/lib/observability/logger.ts` (`getErrorCode`) |
| Route template helper | `src/lib/observability/` (search for `runRouteTemplate`) |
| Interactor errors (scattered) | `src/core/use-cases/*.ts` |

---

### Task 1 — Create canonical error classes

Create `src/core/common/errors.ts` with:

- Abstract `AppError` base class extending `Error`, with `statusCode: number`
  and `errorCode: string` properties.
- `NotFoundError` (404, `"NOT_FOUND"`)
- `ValidationError` (400, `"VALIDATION_ERROR"`)
- `ConflictError` (409, `"CONFLICT"`)
- `AuthorizationError` (401, `"AUTH_ERROR"`)
- `ForbiddenError` (403, `"FORBIDDEN"`)
- `RateLimitError` (429, `"RATE_LIMITED"`)
- `InternalError` (500, `"INTERNAL_ERROR"`)

All classes accept a `message` string in the constructor.

**Verify:**

```bash
npx tsc --noEmit src/core/common/errors.ts
```

---

### Task 2 — Implement mapErrorToResponse

Add `mapErrorToResponse()` to `src/core/common/errors.ts` (or a separate
`src/core/common/error-mapper.ts` file) as described in spec section 3.3.

Requirements:

- If `error instanceof AppError`, use its `statusCode`, `errorCode`, and
  `message`.
- Otherwise, return 500 with `"Internal server error"` and `"INTERNAL_ERROR"`.
- Accept an optional `requestId` parameter.
- Never expose stack traces in the response body.

**Verify:**

```bash
npx tsc --noEmit
```

---

### Task 3 — Re-base domain errors on canonical classes

Update existing domain-specific error classes to extend the canonical bases
instead of raw `Error`:

- `ConsultationRequestNotFoundError extends NotFoundError`
- `UserProfileNotFoundError extends NotFoundError`
- `WorkflowSourceNotFoundError extends NotFoundError`
- `DuplicateEmailError extends ConflictError`
- `DuplicateConsultationRequestError extends ConflictError`
- `DealAlreadyExistsError extends ConflictError`
- `InvalidCredentialsError extends AuthorizationError`
- `InvalidSessionError extends AuthorizationError`
- Existing `ValidationError` in `RegisterUserInteractor` → import from common

Leave domain errors in their current files for now — just change the extends
clause and import.

**Verify:**

```bash
npx tsc --noEmit
npx vitest run
```

---

### Task 4 — Unit tests

Create `tests/error-standardization.test.ts` with:

1. `AppError subclasses carry correct statusCode and errorCode`
2. `mapErrorToResponse returns correct status for each error type`
3. `mapErrorToResponse returns 500 for unknown errors`
4. `mapErrorToResponse never includes stack traces`
5. `domain errors inherit canonical statusCode`

**Verify:**

```bash
npx vitest run tests/error-standardization.test.ts
```

---

## Completion Checklist

- [x] `src/core/common/errors.ts` exports `AppError` and 7 subclasses
- [x] `mapErrorToResponse` exported and tested
- [x] Domain errors re-based on canonical classes (no route changes yet)
- [x] `tests/error-standardization.test.ts` passes (~5 tests) — 31 tests passing
- [x] `npm run build` succeeds
- [x] All existing tests pass (domain errors still work via inheritance)
