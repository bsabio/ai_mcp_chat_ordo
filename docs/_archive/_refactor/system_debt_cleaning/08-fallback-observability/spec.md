# Spec 08: Fallback Observability & Structured Logging

**Priority:** High
**Risk if deferred:** Graceful degradation hides real failures; production incidents have no actionable diagnostic data
**Files in scope:**
- `src/app/api/chat/stream/route.ts` (fallback paths in routing analysis, attachment assignment)
- `src/lib/chat/` (catch-and-continue patterns in orchestrator, stream helpers)
- All `catch` blocks across `src/` that swallow errors or log with `console.error`

---

## Problem Statement

The codebase uses "best effort" / "catch and continue" patterns throughout. When routing analysis fails, the system falls back silently. When attachment assignment fails, it continues. These are individually reasonable, but collectively they create **observability loss**:

1. Failures are caught, logged with `console.error`, and forgotten. No structured metadata (reason codes, affected entity IDs, timing).
2. Multiple fallback paths compound — a request may hit 3 fallback branches and still "succeed," making the root cause invisible.
3. The codebase's own internal audit flagged a high count of bare `catch` blocks.
4. No distinction between "expected degradation" (e.g., no DB available) and "unexpected failure" (e.g., serialization error).

---

## Architectural Approach

### Step 1: Define a structured log event type

```typescript
// src/lib/observability/log-event.ts
export interface StructuredLogEvent {
  level: "warn" | "error";
  code: string;            // e.g., "ROUTING_ANALYSIS_FAILED", "ATTACHMENT_ASSIGN_FAILED"
  message: string;
  context?: Record<string, unknown>;  // conversationId, userId, toolName, etc.
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  timestamp: string;
}
```

### Step 2: Define a catalog of reason codes

```typescript
// src/lib/observability/reason-codes.ts
export const REASON_CODES = {
  // Chat stream
  ROUTING_ANALYSIS_FAILED: "ROUTING_ANALYSIS_FAILED",
  ATTACHMENT_ASSIGN_FAILED: "ATTACHMENT_ASSIGN_FAILED",
  CONVERSATION_LOOKUP_FAILED: "CONVERSATION_LOOKUP_FAILED",
  MESSAGE_PERSIST_FAILED: "MESSAGE_PERSIST_FAILED",
  
  // Orchestrator
  TOOL_EXECUTION_FAILED: "TOOL_EXECUTION_FAILED",
  TOOL_ROUND_LIMIT_EXCEEDED: "TOOL_ROUND_LIMIT_EXCEEDED",
  
  // Embedder
  EMBEDDER_PIPELINE_LOAD_FAILED: "EMBEDDER_PIPELINE_LOAD_FAILED",
  EMBEDDING_FAILED: "EMBEDDING_FAILED",
  
  // TTS
  TTS_CACHE_READ_FAILED: "TTS_CACHE_READ_FAILED",
  TTS_PROVIDER_FAILED: "TTS_PROVIDER_FAILED",
  TTS_TIMEOUT: "TTS_TIMEOUT",
  
  // General
  UNKNOWN_ROUTE_ERROR: "UNKNOWN_ROUTE_ERROR",
} as const;
```

### Step 3: Create a logging function that emits structured events

```typescript
// src/lib/observability/logger.ts
import type { StructuredLogEvent } from "./log-event";

export function logEvent(event: StructuredLogEvent): void {
  const output = JSON.stringify(event);
  if (event.level === "error") {
    console.error(output);
  } else {
    console.warn(output);
  }
}

export function logDegradation(
  code: string,
  message: string,
  context?: Record<string, unknown>,
  err?: unknown,
): void {
  logEvent({
    level: "warn",
    code,
    message,
    context,
    error: err instanceof Error
      ? { name: err.name, message: err.message, stack: err.stack }
      : undefined,
    timestamp: new Date().toISOString(),
  });
}

export function logFailure(
  code: string,
  message: string,
  context?: Record<string, unknown>,
  err?: unknown,
): void {
  logEvent({
    level: "error",
    code,
    message,
    context,
    error: err instanceof Error
      ? { name: err.name, message: err.message, stack: err.stack }
      : undefined,
    timestamp: new Date().toISOString(),
  });
}
```

### Step 4: Replace bare catches with structured logging

**Before:**
```typescript
try {
  routingResult = await analyzeRouting(conversation);
} catch {
  // fallback — continue without routing
}
```

**After:**
```typescript
try {
  routingResult = await analyzeRouting(conversation);
} catch (err) {
  logDegradation(
    REASON_CODES.ROUTING_ANALYSIS_FAILED,
    "Routing analysis failed; proceeding with default routing",
    { conversationId },
    err,
  );
  // fallback — continue without routing
}
```

### Step 5: Audit and classify all catch blocks

Walk through `src/` and classify each `catch` block:

| Classification | Action |
|---|---|
| **Expected degradation** (DB unavailable, optional feature) | Use `logDegradation()` with a reason code. Keep the fallback. |
| **Unexpected failure** (serialization error, type error) | Use `logFailure()` with a reason code. Consider re-throwing if the caller can handle it. |
| **Bare catch with no logging** | Add `logFailure()` at minimum. These are the highest-risk blocks. |
| **Catch that re-throws** | Leave as-is; the caller handles logging. |

### Step 6: Do NOT add a logging framework dependency

Use `console.error` / `console.warn` with JSON serialization. The output format (JSON lines) is compatible with any log aggregator. Adding Winston/Pino/Bunyan is out of scope.

---

## Constraints — Do NOT Introduce

- **Do not** add a third-party logging library. Structured JSON to stdout/stderr is sufficient.
- **Do not** add metrics counters or histogram tracking in this spec. That is a separate observability concern.
- **Do not** remove fallback behavior. The goal is to **illuminate** degradation paths, not eliminate them.
- **Do not** change the external API contract. Clients should see the same responses; only internal logging changes.
- **Do not** log sensitive data (API keys, message content, user tokens) in the structured events.

---

## Required Tests

### Unit Tests — `tests/fallback-observability.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `logDegradation emits structured JSON to console.warn` | Spy on `console.warn`, call `logDegradation()`, parse output as JSON, confirm `code`, `message`, `level: "warn"`, `timestamp` present. |
| 2 | `logFailure emits structured JSON to console.error` | Same as above but for `console.error` and `level: "error"`. |
| 3 | `error serialization captures name, message, and stack` | Pass a real `Error` object, confirm the `error` field has all three properties. |
| 4 | `non-Error objects are handled gracefully` | Pass a string or plain object as `err`, confirm no crash and `error` field is undefined. |
| 5 | `reason codes are string constants` | All values in `REASON_CODES` are non-empty strings. Type-level and runtime check. |
| 6 | `sensitive fields are not logged` | Call `logDegradation` with context containing `apiKey` and `password` — confirm they do NOT appear in output (or add a sanitizer). |

### Regression Tests — `tests/catch-block-audit.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `no bare catch blocks without logging in src/app or src/lib` | Grep source files for `catch` blocks. Confirm each non-empty catch either calls `logDegradation`, `logFailure`, `console.error`, or re-throws. Flag any bare `catch {}` or `catch { /* comment only */ }`. |

### Integration Test — `tests/degradation-logging-integration.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `chat stream route emits ROUTING_ANALYSIS_FAILED when analysis throws` | Mock routing analysis to throw, send chat request, capture console.warn output, parse JSON, confirm reason code. |
| 2 | `chat stream route still returns a valid response after degradation` | Same as above but also assert the HTTP response is 200/streaming (degraded but functional). |

---

## Acceptance Criteria

- [ ] `logDegradation()` and `logFailure()` are defined in `src/lib/observability/logger.ts`.
- [ ] Reason codes are cataloged in `src/lib/observability/reason-codes.ts`.
- [ ] All bare `catch` blocks in `src/app/` and `src/lib/` are replaced with structured logging calls.
- [ ] Fallback behavior is preserved — no user-facing behavior changes.
- [ ] Log output is JSON-serialized, parseable by standard log aggregators.
- [ ] No sensitive data appears in log events.
- [ ] All existing tests pass.
- [ ] New tests above pass.
