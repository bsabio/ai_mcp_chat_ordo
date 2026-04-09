# Hook Pipeline — PreToolUse And PostToolUse Lifecycle Hooks

> **Status:** Draft v0.1
> **Date:** 2026-04-08
> **Scope:** Extend OrdoSite's tool middleware composition model to support registered `PreToolUse` and `PostToolUse` lifecycle hooks. Hooks can observe, mutate, inject context into, or deny tool invocations without modifying tool implementations. Modeled on the `toolHooks.ts` and `toolExecution.ts` patterns from the original Claude Code harness.
> **Dependencies:** [Tool Architecture](../../tool-architecture/spec.md), [Deferred Job Orchestration](../../deferred-job-orchestration/spec.md), [RBAC](../../rbac/spec.md)
> **Affects:** `src/core/tool-registry/ToolMiddleware.ts`, `src/lib/chat/tool-composition-root.ts`, `src/core/tool-registry/ToolRegistry.ts`, individual tool bundle registrations
> **Motivation:** OrdoSite's `composeMiddleware()` is already the right abstraction for cross-cutting tool behavior, but today it only has two middlewares: logging and RBAC. The Claude Code harness provides a richer model — hooks that fire at the individual tool level (per-tool-name), can inject context, deny execution, or rewrite results, and are registered independent of the tool itself. This enables corpus-context injection, analytics recording, guardrails, and rate limiting without coupling those concerns to tool command implementations.
> **Requirement IDs:** `HPL-001` through `HPL-099`

---

## 1. Problem Statement

### 1.1 Current State

The middleware pipeline in `composeMiddleware()` is global — every middleware runs on every tool call in the same order. There is no way to attach behavior to a specific tool without either modifying the tool's `ToolCommand.execute()` method or adding conditional logic inside a global middleware. `[HPL-001]`

### 1.2 Verified Gaps

| # | Gap | Impact |
|---|---|---|
| 1 | **No per-tool lifecycle callbacks** | Cross-cutting tool-specific logic (e.g., "inject corpus context before librarian-tool fires") must live inside the tool command or a dedicated global middleware full of `if (name === "x")` conditionals. |
| 2 | **No pre-execution context injection** | Tools cannot receive enriched context from outside their own command without modifying the tool's implementation or the execution context type. |
| 3 | **No deny/gate at hook level** | The only execution denial path is `RbacGuardMiddleware`, which gates by role. There is no tool-specific, condition-based deny (e.g., rate-limit by tool or deny during maintenance windows). |
| 4 | **No post-execution result mutation** | Analytics recording, result enrichment, and audit logging all require adding code to tool commands or building additional global middleware. |
| 5 | **No hook composition per bundle** | Tool bundles have no way to declare their own lifecycle hooks encapsulated alongside their tool registrations. |

### 1.3 Root Cause

The middleware pipeline operates at the tool call level globally. There is no hook-point system that maps to individual tool names or tool categories. `[HPL-002]`

### 1.4 Why It Matters

Without a hook pipeline:

- Every cross-cutting tool behavior requires touching tool implementations or accumulating conditional logic in global middlewares
- Corpus-context injection cannot be generalized across multiple tools
- Analytics and audit logging are duplicated or omitted per tool
- Future guardrails (rate limiting, content policy, maintenance windows) have no clean attachment point

`[HPL-003]`

---

## 2. Design Goals

1. **Per-tool-name hook registration.** Hooks must be registerable against a specific tool name, a tool category, or a wildcard pattern. `[HPL-010]`
2. **PreToolUse hooks can mutate input or deny execution.** A `PreToolUse` hook must be able to: (a) enrich the input, (b) deny the execution with a structured result, or (c) pass through unchanged. `[HPL-011]`
3. **PostToolUse hooks can observe or transform output.** A `PostToolUse` hook must be able to: (a) record the result for analytics, (b) transform or enrich the result, or (c) re-throw as a structured error. `[HPL-012]`
4. **Hooks are registered alongside tool bundles.** Each tool bundle must be able to declare its own hooks in the same registration call that registers its tools. `[HPL-013]`
5. **Hook execution is ordered and composable.** Multiple hooks on the same tool/category must execute in registration order, outermost first. `[HPL-014]`
6. **Hook failures are isolated.** A failing hook must not crash the tool execution pipeline unless the hook explicitly re-throws. `[HPL-015]`
7. **Hook registration is type-safe.** Hooks must be typed against the tool's known input and output types where possible. `[HPL-016]`
8. **Non-breaking.** Existing middleware and tool execution must not change for tools with no registered hooks. `[HPL-017]`

---

## 3. Architecture

### 3.1 Hook Types

```typescript
export type HookMatchPattern =
  | { type: "tool_name"; name: string }
  | { type: "tool_category"; category: ToolCategory }
  | { type: "wildcard" };

export type PreToolHookResult =
  | { action: "pass"; input?: Record<string, unknown> } // pass through, optionally mutating input
  | { action: "deny"; result: unknown };                // short-circuit with a synthetic result

export type PostToolHookResult =
  | { action: "pass"; result?: unknown }               // pass through, optionally transforming result
  | { action: "error"; error: Error };                 // convert result to a structured error

export interface PreToolHook {
  readonly match: HookMatchPattern;
  before(
    name: string,
    input: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<PreToolHookResult>;
}

export interface PostToolHook {
  readonly match: HookMatchPattern;
  after(
    name: string,
    input: Record<string, unknown>,
    result: unknown,
    context: ToolExecutionContext,
  ): Promise<PostToolHookResult>;
}
```

`[HPL-031]`

### 3.2 Hook Registry

```typescript
export class ToolHookRegistry {
  private preHooks: PreToolHook[] = [];
  private postHooks: PostToolHook[] = [];

  registerPre(hook: PreToolHook): void {
    this.preHooks.push(hook);
  }

  registerPost(hook: PostToolHook): void {
    this.postHooks.push(hook);
  }

  matchingPreHooks(name: string, category?: ToolCategory): PreToolHook[] {
    return this.preHooks.filter(h => matchesPattern(h.match, name, category));
  }

  matchingPostHooks(name: string, category?: ToolCategory): PostToolHook[] {
    return this.postHooks.filter(h => matchesPattern(h.match, name, category));
  }
}

function matchesPattern(
  pattern: HookMatchPattern,
  name: string,
  category?: ToolCategory,
): boolean {
  if (pattern.type === "wildcard") return true;
  if (pattern.type === "tool_name") return pattern.name === name;
  if (pattern.type === "tool_category") return category === pattern.category;
  return false;
}
```

`[HPL-032]`

### 3.3 Hook Execution Middleware

Hooks are executed as a dedicated `ToolMiddleware` that wraps the existing registry:

```typescript
export class HookPipelineMiddleware implements ToolMiddleware {
  constructor(
    private readonly hookRegistry: ToolHookRegistry,
    private readonly descriptorLookup: (name: string) => ToolDescriptor | undefined,
  ) {}

  async execute(
    name: string,
    input: Record<string, unknown>,
    context: ToolExecutionContext,
    next: ToolExecuteFn,
  ): Promise<unknown> {
    const descriptor = this.descriptorLookup(name);
    const category = descriptor?.category;

    // Run PreToolUse hooks
    let currentInput = input;
    for (const hook of this.hookRegistry.matchingPreHooks(name, category)) {
      const preResult = await hook.before(name, currentInput, context).catch(err => {
        logEvent("warn", "hook.pre.error", { hook: hook.constructor.name, tool: name, error: String(err) });
        return { action: "pass" as const };
      });

      if (preResult.action === "deny") return preResult.result;
      if (preResult.action === "pass" && preResult.input) {
        currentInput = preResult.input;
      }
    }

    // Execute tool
    const result = await next(name, currentInput, context);

    // Run PostToolUse hooks
    let currentResult = result;
    for (const hook of this.hookRegistry.matchingPostHooks(name, category)) {
      const postResult = await hook.after(name, currentInput, currentResult, context).catch(err => {
        logEvent("warn", "hook.post.error", { hook: hook.constructor.name, tool: name, error: String(err) });
        return { action: "pass" as const };
      });

      if (postResult.action === "error") throw postResult.error;
      if (postResult.action === "pass" && postResult.result !== undefined) {
        currentResult = postResult.result;
      }
    }

    return currentResult;
  }
}
```

`[HPL-033]`

### 3.4 Middleware Stack Order

The hook pipeline middleware must be inserted between the logging middleware and the RBAC guard:

```typescript
// Current:
[LoggingMiddleware, RbacGuardMiddleware] → registry.execute

// New:
[LoggingMiddleware, RbacGuardMiddleware, HookPipelineMiddleware] → registry.execute
```

Rationale: RBAC must fire before hooks so denied executions never run pre-hooks. Logging must be outermost to capture total duration including hook overhead. `[HPL-034]`

### 3.5 Bundle-Level Hook Registration

Tool bundles declare hooks alongside tool registrations:

```typescript
// Example: corpus bundle with a context-injection PreToolUse hook
export function registerCorpusTools(
  reg: ToolRegistry,
  hookReg: ToolHookRegistry,
  opts: { corpusRepo: CorpusRepository; handler?: SearchHandler },
): void {
  reg.register(librarianToolDescriptor(opts));
  reg.register(searchCorpusToolDescriptor(opts));

  // Inject active corpus context before librarian-tool fires
  hookReg.registerPre({
    match: { type: "tool_name", name: "search_corpus" },
    async before(name, input, context) {
      const corpusContext = await opts.corpusRepo.getActiveContext(context.userId);
      return {
        action: "pass",
        input: { ...input, _corpusContext: corpusContext },
      };
    },
  });
}
```

`[HPL-035]`

### 3.6 Analytics PostToolUse Hook

```typescript
// Analytics recording hook — wildcard, catches all tools
hookReg.registerPost({
  match: { type: "wildcard" },
  async after(name, input, result, context) {
    await analyticsService.recordToolInvocation({
      tool: name,
      conversationId: context.conversationId,
      userId: context.userId,
      role: context.role,
    }).catch(() => {}); // analytics failure must never affect tool result
    return { action: "pass" };
  },
});
```

`[HPL-036]`

### 3.7 Rate-Limit PreToolUse Hook

```typescript
hookReg.registerPre({
  match: { type: "tool_category", category: "content" },
  async before(name, input, context) {
    const allowed = await rateLimiter.check(`tool:${name}:${context.userId}`);
    if (!allowed) {
      return {
        action: "deny",
        result: { error: "Rate limit exceeded. Please wait before using this tool again." },
      };
    }
    return { action: "pass" };
  },
});
```

`[HPL-037]`

---

## 4. Security And Access

1. **Hooks cannot bypass RBAC.** The RBAC guard middleware fires before `HookPipelineMiddleware`. A `PreToolUse` hook cannot grant access to a denied tool. `[HPL-040]`
2. **Deny results are sanitized.** The synthetic result returned by a denying `PreToolUse` hook must not expose internal system details. `[HPL-041]`
3. **Analytics hooks must not log input content.** Post-tool hooks recording analytics must capture only tool name, duration, and role metadata — not raw user input or result content. `[HPL-042]`
4. **Hook failures are isolated.** A hook that throws unexpectedly must log the error and pass through, not crash the tool pipeline, unless the hook explicitly calls `{ action: "error" }`. `[HPL-043]`
5. **Context injection is server-controlled.** Input injected by a `PreToolUse` hook must originate from trusted server-side data sources only, not from client-supplied request parameters. `[HPL-044]`
6. **Hook registration is boot-time only.** Hooks must be registered at server startup, not dynamically during request handling. `[HPL-045]`

---

## 5. Testing Strategy

### 5.1 Unit Tests

| Area | Estimated Count | What's Tested |
|---|---|---|
| `matchesPattern()` | 8 | Tool name, category, wildcard match/no-match |
| `ToolHookRegistry.matchingPreHooks()` | 6 | Correct hook selection per name and category |
| `PreToolUse` pass and deny | 8 | Input mutation, deny short-circuit, pass-through |
| `PostToolUse` pass and transform | 6 | Result mutation, error conversion, pass-through |
| Hook failure isolation | 6 | Throwing hook → logs error, pipeline continues |
| Analytics hook | 4 | Records invocation without affecting result |
| Rate-limit hook | 4 | Deny path when rate limit exceeded |

### 5.2 Integration Tests

| Area | Estimated Count | What's Tested |
|---|---|---|
| Corpus context injection | 5 | `search_corpus` receives enriched input from pre-hook |
| Analytics recording per invocation | 4 | Post-hook fires for every tool call system-wide |
| RBAC still fires before hooks | 4 | Denied role cannot trigger any pre-hook side effects |
| Middleware stack order | 4 | Logging → RBAC → hooks → execute sequence validated |
| Multi-hook ordering | 4 | Two hooks on same tool execute in registration order |

### 5.3 Existing Test Preservation

Tools with no registered hooks must execute identically to current behavior. `HookPipelineMiddleware` with an empty registry must be a transparent pass-through. `[HPL-050]`

---

## 6. Sprint Plan

| Sprint | Name | Goal | Estimated Tests |
|---|---|---|---|
| **0** | **Hook Types And Registry** | Define `PreToolHook`, `PostToolHook`, `ToolHookRegistry`. Add `matchesPattern()`. Unit tests. | +24 |
| **1** | **Middleware Integration** | Implement `HookPipelineMiddleware`. Wire into `composeMiddleware()` stack. Verify pass-through for hookless tools. | +18 |
| **2** | **Corpus And Analytics Hooks** | Register corpus context injection hook for `search_corpus`. Register wildcard analytics recording post-hook. | +12 |
| **3** | **Rate-Limit And Guardrail Hooks** | Register per-category rate-limit pre-hooks. Add deny result formatting. | +10 |

---

## 7. Future Considerations

1. Named hook registration — assign IDs to hooks for targeted removal and runtime inspection.
2. Async hook ordering — allow hooks to declare dependencies on other hooks for explicit sequencing.
3. Hook metrics — expose hook execution latency separately from tool execution latency in observability.
4. MCP tool hooks — extend the hook registry to also wrap MCP server tool calls with the same lifecycle.
5. Plugin-provided hooks — allow future plugin bundles to register their own hooks at registration time.
