# Error Standardization — Refactor Spec

> **Status:** Complete (Sprint 0 + Sprint 1)
> **Date:** 2026-04-07
> **Scope:** Consolidate scattered error classes into a centralized registry,
> create a deterministic error-class-to-HTTP-status mapping, and standardize
> all API routes on a single response envelope.
> **Affects:** `src/core/entities/errors.ts`, `src/core/use-cases/*.ts`,
> `src/app/api/**/*.ts`, `src/lib/observability/logger.ts`
> **Motivation:** Error classes are defined in 13+ files with duplicate
> semantics (e.g., `NotFoundError`, `UserProfileNotFoundError`,
> `ConsultationRequestNotFoundError`). Route handlers manually map error
> classes to HTTP status codes with no shared registry. API responses use
> two incompatible envelopes: `{ error }` in auth routes and
> `{ error, errorCode, requestId }` in template-based routes. Clients
> cannot parse errors consistently.
> **Requirement IDs:** `ERR-001` through `ERR-099`

---

## 1. Problem Statement

### 1.1 Current state

Custom error classes are scattered across 13+ interactor files. Every route
handler independently maps `instanceof` checks to HTTP status codes. Two
response formats coexist: auth routes return `{ error: string }` while
`runRouteTemplate`-based routes return `{ error, errorCode, requestId }`.

### 1.2 Verified issues

| # | Issue | Evidence | Impact |
| --- | --- | --- | --- |
| 1 | **Fragmented error classes** | `NotFoundError` in `ConversationInteractor`, `UserProfileNotFoundError` in `GetUserProfileInteractor`, `ConsultationRequestNotFoundError` in `TriageConsultationRequestInteractor`, `WorkflowSourceNotFoundError` in `CreateDealFromWorkflowInteractor` | Four classes with identical "not found" semantics `[ERR-001]` |
| 2 | **No error-to-status registry** | Each route handler manually maps error class → HTTP status | Same semantic error can produce different status codes across routes `[ERR-002]` |
| 3 | **Two response envelopes** | Auth routes: `{ error }`, template routes: `{ error, errorCode, requestId }` | Clients cannot parse errors uniformly `[ERR-003]` |
| 4 | **`getErrorCode()` uses string matching** | `logger.ts` maps error messages to codes via `message.includes()` | Fragile — changing an error message silently changes the error code `[ERR-004]` |

### 1.3 Root cause

Error handling was implemented per-feature rather than as a cross-cutting
concern. The `runRouteTemplate` helper formalized one pattern, but older auth
routes predate it and were never migrated.

### 1.4 Why it matters

API consumers (the chat UI, admin dashboard, future mobile clients) must
handle errors from every endpoint. Without a uniform envelope and
deterministic status codes, each client duplicates error-parsing logic and
is brittle to API changes.

---

## 2. Design Goals

1. Create a canonical set of base error classes in
   `src/core/common/errors.ts`: `NotFoundError`, `ValidationError`,
   `ConflictError`, `AuthorizationError`, `ForbiddenError`,
   `RateLimitError`. Each carries a `statusCode` property. `[ERR-010]`
2. Domain-specific errors extend the canonical bases (e.g.,
   `ConsultationRequestNotFoundError extends NotFoundError`). `[ERR-011]`
3. Create a `mapErrorToResponse(error: unknown)` function that returns
   `{ status, body: { error, errorCode, requestId? } }` based on the
   error's `statusCode` and `name` properties. `[ERR-012]`
4. Standardize all API routes on the `{ error, errorCode, requestId }`
   envelope. `[ERR-013]`
5. Replace `getErrorCode()` string matching with class-based
   resolution. `[ERR-014]`
6. Migrate incrementally — start with auth routes, then template routes, then
   remaining routes. `[ERR-015]`

---

## 3. Architecture

### 3.1 Canonical error hierarchy

```
AppError (abstract)
├── NotFoundError          → 404
├── ValidationError        → 400
├── ConflictError          → 409
├── AuthorizationError     → 401
├── ForbiddenError         → 403
├── RateLimitError         → 429
└── InternalError          → 500
```

Each class sets `this.statusCode` and `this.errorCode` (e.g.,
`"NOT_FOUND"`, `"VALIDATION_ERROR"`).

### 3.2 Error response envelope

All 4xx and 5xx responses use:

```json
{
  "error": "Human-readable message",
  "errorCode": "NOT_FOUND",
  "requestId": "req_a1b2c3d4"
}
```

`requestId` is included when the structured logging refactor adds
correlation IDs. Until then, it may be omitted.

### 3.3 mapErrorToResponse

```typescript
export function mapErrorToResponse(
  error: unknown,
  requestId?: string
): { status: number; body: Record<string, unknown> } {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        error: error.message,
        errorCode: error.errorCode,
        ...(requestId && { requestId }),
      },
    };
  }
  return {
    status: 500,
    body: {
      error: "Internal server error",
      errorCode: "INTERNAL_ERROR",
      ...(requestId && { requestId }),
    },
  };
}
```

### 3.4 Integration with existing helpers

`runRouteTemplate` and `errorJson` in `src/lib/observability/` should
delegate to `mapErrorToResponse` so all routes get uniform behavior.

---

## 4. Security

- 500 errors must never expose stack traces or internal details to clients.
- Error messages for auth failures must be generic ("Invalid credentials")
  to prevent enumeration.
- `mapErrorToResponse` must treat unknown errors as 500 with a safe message.

---

## 5. Testing Strategy

- Unit tests for `mapErrorToResponse`: verify status code and body shape for
  each canonical error type, plus unknown errors.
- Unit tests verifying domain errors inherit the correct status code.
- Integration verification: confirm auth routes now return `errorCode` field.

---

## 6. Sprint Plan

| Sprint | Focus |
| --- | --- |
| Sprint 0 | Canonical error classes, `mapErrorToResponse`, unit tests |
| Sprint 1 | Migrate auth routes and remaining non-template routes to standard envelope |

---

## 7. Future Considerations

- A Zod-based validation layer could automatically produce `ValidationError`
  instances from schema failures, removing manual validation entirely.
- Error telemetry (counting error codes per endpoint) becomes trivial once
  all errors carry an `errorCode`.
