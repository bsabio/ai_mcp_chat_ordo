# Structured Logging — Refactor Spec

> **Status:** Complete
> **Date:** 2026-04-07
> **Completed:** 2026-04-07
> **Scope:** Replace `console.*` logging with a structured JSON logger that
> supports log levels, correlation IDs, and production-grade output, without
> requiring changes to every file in the codebase at once.
> **Affects:** `src/core/common/`, `src/adapters/`, `src/proxy.ts`,
> `src/core/tool-registry/ToolExecutionContext.ts`, `src/lib/jobs/`,
> `src/app/api/auth/`, `src/app/api/chat/`, `package.json`
> **Motivation:** The deployed application handles user conversations, LLM
> calls, and deferred jobs. All logging is `console.log` or `console.error`
> with no structure, no log levels, no correlation IDs, and no JSON output.
> Production debugging requires SSH access and manual `docker logs` grep. A
> structured logger would enable filtered log queries, request tracing, and
> aggregation without changing the single-container deployment model.
> **Requirement IDs:** `SLG-001` through `SLG-099`

---

## 1. Problem Statement

### 1.1 Current state

Logging across the codebase uses raw `console.*` calls. There is a
`ConsoleLogger` adapter referenced in the component tree, but it wraps
`console.log` without structure. Route handlers, tool executors, and deferred
job processors all emit unstructured text.

### 1.2 Verified issues

| # | Issue | Evidence | Impact |
| --- | --- | --- | --- |
| 1 | **No log levels** | All output is `console.log` or `console.error` | Cannot filter by severity in production `[SLG-001]` |
| 2 | **No correlation IDs** | Requests have no shared trace identifier | Cannot follow a single request across middleware, route, and tool execution `[SLG-002]` |
| 3 | **No JSON output** | Logs are plain text | Cannot aggregate or query logs programmatically `[SLG-003]` |
| 4 | **No context propagation** | `ToolExecutionContext` carries `userId` and `conversationId` but not a logger | Tool interactors cannot emit structured logs with request context `[SLG-004]` |

### 1.3 Root cause

Logging was not formalized during initial development. The `console.*` approach
works during development but does not scale to production observability.

### 1.4 Why it matters

When a deferred job fails or an LLM call times out in production, the only
diagnostic path is `docker logs | grep`. Structured logging with correlation
IDs would allow tracing a request from proxy entry through auth, route handler,
tool execution, and LLM call.

---

## 2. Design Goals

1. Define a `Logger` interface in `src/core/common/Logger.ts` with `info`,
   `warn`, `error`, and `debug` methods that accept a message and a structured
   context object. `[SLG-010]`
2. Implement a `PinoLogger` adapter in `src/adapters/PinoLogger.ts` that
   outputs JSON in production and pretty-prints in development. `[SLG-011]`
3. Generate a `requestId` (correlation ID) in the proxy middleware and
   propagate it through request headers. `[SLG-012]`
4. Add an optional `logger` field to `ToolExecutionContext` so tool
   interactors can emit structured logs. `[SLG-013]`
5. Instrument the 10 highest-value code paths first: auth login, auth
   register, chat stream, deferred job claim, deferred job complete, deferred
   job fail, blog image generation, blog article production, rate-limit 429
   events, and proxy errors. `[SLG-014]`
6. Keep the migration incremental — do not require every file to adopt the
   logger in one pass. `[SLG-015]`
7. Add `pino` as the only new runtime dependency. `[SLG-016]`

---

## 3. Architecture

### 3.1 System boundaries

The logger interface lives in `src/core/common/` (clean architecture: no
framework dependencies). The Pino adapter lives in `src/adapters/`. The proxy
middleware creates the root logger and generates correlation IDs. Route handlers
and tool executors receive child loggers with bound context.

### 3.2 Recommended component inventory

| Component | Location | Purpose |
| --- | --- | --- |
| Logger interface | `src/core/common/Logger.ts` | Framework-agnostic logging contract |
| PinoLogger adapter | `src/adapters/PinoLogger.ts` | Concrete Pino implementation with JSON/pretty modes |
| Request ID middleware | `src/proxy.ts` | Generates `x-request-id` header, creates child logger |
| Context propagation | `src/core/tool-registry/ToolExecutionContext.ts` | Optional `logger` field on tool context |
| Instrumented paths | Various route and service files | First 10 code paths migrated from `console.*` |

### 3.3 Logger interface

```typescript
export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}
```

### 3.4 Output format

```json
{
  "level": "info",
  "time": 1712534400000,
  "requestId": "req_a1b2c3d4",
  "userId": "usr_abc123",
  "msg": "Chat stream started",
  "conversationId": "conv_xyz789"
}
```

---

## 4. Security

- Log output must never include passwords, session tokens, API keys, or
  full LLM prompt contents.
- Correlation IDs must be opaque random values, not derived from user data.
- The logger must not throw exceptions that disrupt request processing.

---

## 5. Testing Strategy

- Unit tests for `PinoLogger`: verify JSON output shape, log levels, child
  logger bindings.
- Integration verification: confirm `x-request-id` header appears in proxy
  responses.
- No tests for log content of instrumented paths — logging is observability,
  not behavior.

---

## 6. Sprint Plan

| Sprint | Focus |
| --- | --- |
| Sprint 0 | Logger interface, PinoLogger adapter, dependency install, unit tests |
| Sprint 1 | Request ID middleware, context propagation, first 10 instrumented paths |

---

## 7. Future Considerations

- Log aggregation (Loki, CloudWatch, Datadog) requires only a log forwarder
  reading JSON from stdout — no application changes needed after this spec.
- Request-scoped loggers via `AsyncLocalStorage` would eliminate the need to
  pass loggers explicitly, but that pattern adds complexity without clear
  benefit at the current scale.
- Audit logging (who changed what) is a separate concern from operational
  logging and should be a dedicated spec if needed.
