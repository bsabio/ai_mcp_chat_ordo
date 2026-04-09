# Permission Denial Log

> **Status:** Draft v0.1
> **Date:** 2026-04-08
> **Scope:** Add a structured `PermissionDenial` collection layer to OrdoSite's tool execution pipeline so that blocked tool invocations are recorded, aggregated per turn, and surfaced in observability and analytics rather than silently discarded as thrown exceptions. Modeled on the `PermissionDenial` dataclass and per-turn denial collection pattern from the Claude Code harness.
> **Dependencies:** [RBAC](../../rbac/spec.md), [Tool Architecture](../../tool-architecture/spec.md), [Deferred Job Orchestration](../../deferred-job-orchestration/spec.md)
> **Affects:** `src/core/tool-registry/RbacGuardMiddleware.ts`, `src/core/tool-registry/ToolExecutionContext.ts`, `src/lib/chat/stream-pipeline.ts`, observability layer
> **Motivation:** When the RBAC guard middleware blocks a tool call, the result is a thrown `ToolAccessDeniedError` that propagates up and is caught somewhere in the streaming pipeline — but the denial itself is not recorded, counted, or surfaced anywhere. Claude Code's harness explicitly models denials as `PermissionDenial` dataclass instances that are collected per turn, returned as part of the `TurnResult`, and available for downstream audit and analytics. OrdoSite needs the same structured treatment: denials should be first-class events, not silent exceptions.
> **Requirement IDs:** `PDL-001` through `PDL-099`

---

## 1. Problem Statement

### 1.1 Current State

`RbacGuardMiddleware` throws `ToolAccessDeniedError` when a role lacks permission to execute a tool. The error propagates up through the middleware stack. How and where it is caught is inconsistent — in some paths it may surface as a 500, a generic error message, or be silently swallowed. There is no structured record of what was denied, for whom, and why. `[PDL-001]`

### 1.2 Verified Gaps

| # | Gap | Impact |
|---|---|---|
| 1 | **No denial record per turn** | When a role attempts a tool it cannot use, the attempt disappears. There is no count, no audit trail, no observable signal. |
| 2 | **No analytics on denial patterns** | Operators cannot see which tools anonymous or lower-privilege users most commonly attempt and get blocked on — a key signal for capability roadmap decisions. |
| 3 | **No structured denial response to LLM** | When a tool is denied, the LLM receives an error or nothing. There is no structured "you tried this tool and it was denied" message to help the model course-correct. |
| 4 | **Error handling is inconsistent** | `ToolAccessDeniedError` may be caught and handled differently at different points in the streaming pipeline depending on where in the turn it fires. |
| 5 | **No denial threshold detection** | Repeated denied attempts (e.g., probing for admin tools) cannot be detected or rate-limited because denials are ephemeral exception instances. |

### 1.3 Root Cause

RBAC denial is modeled as an exception event rather than a structured data event. Exceptions are correct for error propagation but are the wrong vehicle for business-meaningful observability signals. `[PDL-002]`

### 1.4 Why It Matters

Without a structured denial log:

- Security signals are invisible — repeated probing of restricted tools goes undetected
- Capability gaps cannot be measured — operators can't see what users are trying and being blocked on
- The LLM cannot be guided when it selects a tool the current role cannot access
- Denial handling is inconsistent across the stream pipeline

`[PDL-003]`

---

## 2. Design Goals

1. **Denials are data, not only exceptions.** Every blocked tool invocation must produce a structured `PermissionDenial` record in addition to the existing error propagation behavior. `[PDL-010]`
2. **Denials are collected per turn.** The `PermissionDenial` collection must be scoped to the current request turn and returned as part of the turn result. `[PDL-011]`
3. **Denials feed observability.** Every denial must be emitted to the structured logging / analytics pipeline. `[PDL-012]`
4. **LLM receives a structured denial result.** When a tool is denied, the model should receive a structured tool result explaining the denial (not an error, not silence). `[PDL-013]`
5. **Denial threshold detection is possible.** The denial log must be queryable per user and per time window to support future rate-limiting or alert logic. `[PDL-014]`
6. **Non-breaking.** The existing `ToolAccessDeniedError` throw behavior must be preserved for callers that catch it — the denial record is additive. `[PDL-015]`

---

## 3. Architecture

### 3.1 PermissionDenial Model

```typescript
export interface PermissionDenial {
  /** The tool name that was denied */
  toolName: string;
  /** The role that attempted the invocation */
  attemptedRole: RoleName;
  /** Human-readable reason for the denial */
  reason: string;
  /** ISO timestamp */
  deniedAt: string;
  /** The conversation this denial occurred in */
  conversationId: string;
  /** The user who attempted the invocation, if authenticated */
  userId?: string;
}
```

`[PDL-031]`

### 3.2 Denial Collector

```typescript
export class PermissionDenialLog {
  private denials: PermissionDenial[] = [];

  record(denial: PermissionDenial): void {
    this.denials.push(denial);
  }

  getAll(): PermissionDenial[] {
    return [...this.denials];
  }

  count(): number {
    return this.denials.length;
  }

  hasDenials(): boolean {
    return this.denials.length > 0;
  }

  /** Drain and reset — used when handing off to turn result */
  flush(): PermissionDenial[] {
    const all = this.getAll();
    this.denials = [];
    return all;
  }
}
```

`[PDL-032]`

### 3.3 Updated ToolExecutionContext

`ToolExecutionContext` gains an optional `denialLog` slot so middlewares can record denials without requiring a separate dependency:

```typescript
export interface ToolExecutionContext {
  role: RoleName;
  userId: string;
  conversationId: string;
  currentPathname?: string;
  currentPageSnapshot?: string;
  /** Collects permission denials during this turn. Injected by the pipeline, not the LLM caller. */
  denialLog?: PermissionDenialLog;
}
```

`[PDL-033]`

### 3.4 Updated RbacGuardMiddleware

`RbacGuardMiddleware` is extended to record the denial before throwing:

```typescript
export class RbacGuardMiddleware implements ToolMiddleware {
  constructor(private readonly registry: ToolRegistry) {}

  async execute(
    name: string,
    input: Record<string, unknown>,
    context: ToolExecutionContext,
    next: ToolExecuteFn,
  ): Promise<unknown> {
    if (!this.registry.canExecute(name, context.role)) {
      const denial: PermissionDenial = {
        toolName: name,
        attemptedRole: context.role,
        reason: `Role '${context.role}' does not have permission to execute tool '${name}'.`,
        deniedAt: new Date().toISOString(),
        conversationId: context.conversationId,
        userId: context.userId,
      };

      // Record in the per-turn log
      context.denialLog?.record(denial);

      // Emit to observability
      logEvent("warn", "tool.access_denied", {
        tool: name,
        role: context.role,
        userId: context.userId,
        conversationId: context.conversationId,
      });

      // Return structured denial result instead of throwing in stream context
      return {
        _denied: true,
        toolName: name,
        message: `Tool '${name}' is not available for your current role.`,
      };
    }

    return next(name, input, context);
  }
}
```

> **Note on throw vs. return:** The original middleware threw `ToolAccessDeniedError`. This spec changes the behavior to return a structured denial result so the LLM receives a tool result rather than an error crash. The error class is preserved for callers outside the streaming context that still catch exceptions. `[PDL-034]`

### 3.5 LLM-Facing Denial Result

The structured denial return is surfaced to the LLM as a tool result:

```typescript
// In stream handling, when tool result is { _denied: true }:
const toolResultContent = denial._denied
  ? `Tool '${denial.toolName}' is not available for your current role. ` +
    `Please use an available tool or ask the user to take this action directly.`
  : actualResult;
```

This gives the model a chance to suggest an alternative rather than hallucinating a result or repeating the denied tool call. `[PDL-035]`

### 3.6 Per-Turn Denial Collection in Stream Pipeline

```typescript
// In ChatStreamPipeline or route handler:
const denialLog = new PermissionDenialLog();

const execContext: ToolExecutionContext = {
  role,
  userId,
  conversationId,
  denialLog,  // injected here
  ...
};

// After the turn completes:
const denials = denialLog.flush();

if (denials.length > 0) {
  logEvent("info", "turn.permission_denials", {
    conversationId,
    userId,
    denialCount: denials.length,
    tools: denials.map(d => d.toolName),
  });
  // Optionally persist to analytics table
  await analytics.recordDenials(denials);
}
```

`[PDL-036]`

### 3.7 Denial Persistence Table (Optional, Sprint 2)

For analytics and threshold detection:

```sql
CREATE TABLE IF NOT EXISTS tool_permission_denials (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  user_id TEXT DEFAULT NULL,
  tool_name TEXT NOT NULL,
  attempted_role TEXT NOT NULL,
  reason TEXT NOT NULL,
  denied_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_denials_user_denied_at
  ON tool_permission_denials(user_id, denied_at);

CREATE INDEX IF NOT EXISTS idx_denials_tool_denied_at
  ON tool_permission_denials(tool_name, denied_at);
```

`[PDL-037]`

### 3.8 Denial Threshold Detection (Sprint 3)

```typescript
// Example: detect if a user has hit more than N denials in a time window
export async function checkDenialThreshold(
  userId: string,
  windowMinutes: number = 15,
  maxDenials: number = 10,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const count = await db
    .selectFrom("tool_permission_denials")
    .where("user_id", "=", userId)
    .where("denied_at", ">=", since)
    .select(db.fn.count("id").as("count"))
    .executeTakeFirstOrThrow();
  return Number(count.count) >= maxDenials;
}
```

`[PDL-038]`

---

## 4. Security And Access

1. **Denial records are server-only.** `PermissionDenial` objects must never be returned to the client or the LLM verbatim — only the simplified tool result string is forwarded. `[PDL-040]`
2. **Denial log is scoped to the authenticated request.** The `denialLog` injected into `ToolExecutionContext` is a request-scoped instance, not a shared singleton. `[PDL-041]`
3. **Admin-only denial analytics.** The `tool_permission_denials` table must only be queryable through admin-gated endpoints or internal observability tooling. `[PDL-042]`
4. **Threshold alerts do not expose tool names to client.** Threshold detection results in a rate-limit action or internal flag only — the client is not told which tools triggered the threshold. `[PDL-043]`
5. **Denial log does not store user input.** `PermissionDenial` records must capture only tool name, role, timestamp, and IDs — not the input arguments the caller passed. `[PDL-044]`
6. **Observability logs are sanitized.** Log events emitted by `RbacGuardMiddleware` must not include tool input payloads. `[PDL-045]`

---

## 5. Testing Strategy

### 5.1 Unit Tests

| Area | Estimated Count | What's Tested |
|---|---|---|
| `PermissionDenialLog.record()` | 4 | Entry appended, count incremented |
| `PermissionDenialLog.flush()` | 4 | Returns all entries, resets to empty |
| `RbacGuardMiddleware` denial path | 6 | Denied role → structured result returned, log populated |
| `RbacGuardMiddleware` allow path | 4 | Allowed role → `next` called, no denial recorded |
| Structured denial result format | 4 | `_denied: true`, correct toolName, user-friendly message |
| Log event emission on denial | 4 | `logEvent("warn", "tool.access_denied", ...)` fired |

### 5.2 Integration Tests

| Area | Estimated Count | What's Tested |
|---|---|---|
| Per-turn denial collection | 5 | Multiple denied tools in one turn accumulate in the log |
| Denial flushed after turn | 4 | `flush()` returns correct denials, next turn starts clean |
| LLM receives denial tool result | 4 | Model sees structured result, not an error crash |
| Observability emission | 4 | `turn.permission_denials` log event emitted when denials > 0 |
| Analytics persist (Sprint 2) | 4 | Denials written to `tool_permission_denials` table |
| Threshold detection (Sprint 3) | 4 | Correct count returned for user within time window |

### 5.3 Existing Test Preservation

The `ToolAccessDeniedError` class must remain exported and catchable for callers outside the stream context. The middleware change from throw to return must not break any existing unit test that catches the error — those tests should be updated to reflect the new structured-return behavior in the streaming context. `[PDL-050]`

---

## 6. Sprint Plan

| Sprint | Name | Goal | Estimated Tests |
|---|---|---|---|
| **0** | **Denial Model And Collection** | Define `PermissionDenial`, `PermissionDenialLog`. Update `ToolExecutionContext`. Unit tests. | +18 |
| **1** | **Middleware And Pipeline Wiring** | Update `RbacGuardMiddleware` to record and return structured denial. Inject `denialLog` in stream pipeline. Add observability emission. | +18 |
| **2** | **Persistence And Analytics** | Add `tool_permission_denials` table. Persist denials after each turn. Admin-gated query endpoint. | +12 |
| **3** | **Threshold Detection** | Implement `checkDenialThreshold()`. Wire into rate-limit or alert hook. | +10 |

---

## 7. Future Considerations

1. Denial-driven capability suggestions — when a user is repeatedly denied a tool, the system surfaces an upgrade path or alternative action.
2. Per-session denial summary in `/status` command — show count of denied tool attempts in the current session.
3. Denial heatmap in admin observability — visualize which tools get the most denied attempts across all users.
4. Fine-grained denial reasons — differentiate between role-denied, maintenance-window-denied, and rate-limit-denied for cleaner analytics segmentation.
5. Denial webhooks — emit a webhook when a threshold is crossed for integration with external alerting systems.
