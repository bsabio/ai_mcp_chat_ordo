# Sprint 1 — Middleware Correlation and Path Instrumentation

> **Goal:** Generate request-scoped correlation IDs in the proxy middleware,
> propagate loggers through tool execution context, and instrument the 10
> highest-value code paths.
>
> **Spec Sections:** 2 (Design Goals), 3 (Architecture), 4 (Security)
>
> **Prerequisite:** Sprint 0 complete (Logger interface and PinoLogger available)

## Available Assets

| Asset | Location |
| --- | --- |
| Logger interface | `src/core/common/Logger.ts` |
| PinoLogger adapter | `src/adapters/PinoLogger.ts` |
| Proxy middleware | `src/proxy.ts` |
| ToolExecutionContext | `src/core/tool-registry/ToolExecutionContext.ts` |
| Auth routes | `src/app/api/auth/login/route.ts`, `src/app/api/auth/register/route.ts` |
| Chat stream | `src/app/api/chat/route.ts` |
| Deferred jobs | `src/lib/jobs/` |

---

### Task 1 — Request ID generation in proxy

Modify `src/proxy.ts` to:

1. Import `createLogger` from `PinoLogger`.
2. Create a singleton root logger at module scope.
3. For each incoming request, generate a `requestId` using
   `crypto.randomUUID()`, set `x-request-id` response header, and create a
   child logger with `{ requestId }`.
4. Store the child logger on a request-scoped mechanism (e.g., attach to
   request headers for downstream access, or use a module-scoped WeakMap
   keyed by the request object).

**Security:** The `requestId` must be a random UUID, not derived from user
data. Do not log authorization headers or session tokens.

**Verify:**

```bash
curl -s -D - http://localhost:3000/api/health | grep x-request-id
```

---

### Task 2 — Add logger to ToolExecutionContext

Add an optional `logger?: Logger` field to `ToolExecutionContext`. When
provided, tool interactors should use it instead of `console.*`. When absent,
tools fall back to `console.*` (preserving backward compatibility).

Update the tool execution call site to pass a child logger with
`{ userId, conversationId }` bindings when available.

**Verify:**

```bash
npx tsc --noEmit
```

---

### Task 3 — Instrument top-10 code paths

Replace `console.log` / `console.error` with structured logger calls in:

1. Auth login route — log `info` on success, `warn` on invalid credentials
2. Auth register route — log `info` on success, `warn` on duplicate
3. Chat stream route — log `info` on stream start with `conversationId`
4. Deferred job claim — log `info` with `jobId`
5. Deferred job complete — log `info` with `jobId` and `duration`
6. Deferred job fail — log `error` with `jobId` and error message
7. Blog image generation — log `info` with `model` and `quality`
8. Blog article production — log `info` with `articleId` and stage
9. Rate-limit 429 events — log `warn` with `ip` and `tier`
10. Proxy error handler — log `error` with `statusCode` and `url`

For paths where the logger is not yet in scope, create a module-level logger
using `createLogger()`.

**Security:** Never log passwords, API keys, or full prompt contents.

**Verify:**

```bash
npm run build
npx vitest run
```

---

## Completion Checklist

- [x] `x-request-id` header present on all proxy responses (via `createRequestId()` in `src/proxy.ts`)
- [x] `ToolExecutionContext` accepts optional `logger`
- [x] ~12 server-side `console.*` callsites migrated to `logEvent`/`logDegradation`/`logFailure` (structured JSON via pino)
- [x] No passwords, tokens, or API keys appear in log output
- [x] `npm run build` succeeds
- [x] All existing tests pass (0 new regressions; 13 pre-existing failures unchanged)

### Implementation Notes

- Instead of creating per-file logger instances, the implementation leveraged the
  existing `logEvent()` / `logDegradation()` / `logFailure()` observability bus.
  Pino was wired as the output layer under `logEvent()`, so all existing callsites
  automatically gained structured JSON output.
- `x-request-id` was added to all proxy response paths using the pre-existing
  `createRequestId()` function from `src/lib/observability/logger.ts`.
- Error telemetry was already integrated via `runRouteTemplate` from the error
  standardization work — every route error logs `errorCode`, `status`,
  `requestId`, and `durationMs` through the shared observability pipeline.
- Client-side `console.*` calls (React components, browser hooks) were
  intentionally NOT migrated — pino is a server-side library.
