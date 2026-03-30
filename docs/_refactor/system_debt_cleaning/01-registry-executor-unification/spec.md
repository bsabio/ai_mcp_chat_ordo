# Spec 01: Registry/Executor Unification

**Priority:** Critical
**Risk if deferred:** Silent behavioral drift between tool descriptors and tool execution
**Files in scope:**
- `src/lib/chat/tool-composition-root.ts` (primary — factory functions)
- `src/core/tool-registry/ToolRegistry.ts`
- `src/app/api/chat/stream/route.ts` (call site — registry + executor)
- `src/lib/chat/tools.ts` (call site — re-exports + `createToolResults`)
- `src/lib/evals/live-runtime.ts` (call site — both)
- `src/lib/evals/live-runner.ts` (call site — `getToolExecutor`)
- `src/lib/jobs/deferred-job-notifications.ts` (call site — `getToolRegistry` for descriptor lookup)

---

## Problem Statement

`getToolRegistry()` calls `createToolRegistry()` on every invocation, re-instantiating the entire registry including all ~43 registered tools, new `LocalEmbedder` instances, and the full service graph. `getToolExecutor()` internally calls `getToolRegistry()` again, creating its own separate registry instance. This means:

1. The registry used for descriptor lookup (tool schemas, deferred mode flags) and the registry used for execution may not share the same instance.
2. Every call rebuilds expensive objects (LocalEmbedder, repository wiring, search pipelines).
3. If tool registration order or conditional logic changes between calls, the two registries can diverge silently.

---

## Architectural Approach

### Step 1: Introduce a memoized composition root factory

Create a single factory function that returns a frozen `{ registry, executor }` tuple. The executor MUST be built from the same registry instance.

```typescript
// src/lib/chat/tool-composition-root.ts

interface ToolCompositionResult {
  readonly registry: ToolRegistry;
  readonly executor: ToolExecutor;
}

let cached: ToolCompositionResult | null = null;

export function getToolComposition(): ToolCompositionResult {
  if (!cached) {
    const registry = buildRegistry(/* repos, services */);
    const executor = buildExecutor(registry);
    cached = Object.freeze({ registry, executor });
  }
  return cached;
}
```

### Step 2: Make `buildExecutor` accept a registry parameter

The executor builder must receive the registry rather than constructing one. Use the existing `composeMiddleware` utility (middleware are classes, not functions):

```typescript
import { composeMiddleware } from "@/core/tool-registry/ToolMiddleware";
import { LoggingMiddleware } from "@/core/tool-registry/LoggingMiddleware";
import { RbacGuardMiddleware } from "@/core/tool-registry/RbacGuardMiddleware";

function buildExecutor(registry: ToolRegistry): ToolExecuteFn {
  return composeMiddleware(
    [new LoggingMiddleware(), new RbacGuardMiddleware(registry)],
    registry.execute.bind(registry),
  );
}
```

### Step 3: Update all call sites

Replace separate `getToolRegistry()` / `getToolExecutor()` calls with `getToolComposition()` across all consumers:

```typescript
// In route.ts (line 514 + 571) — before
const toolRegistry = getToolRegistry();
// ... 50 lines later ...
baseExecutor: getToolExecutor(),

// After
const { registry: toolRegistry, executor: baseExecutor } = getToolComposition();
```

All call sites requiring migration:

| File | Current usage | Migration |
|------|--------------|----------|
| `src/app/api/chat/stream/route.ts` | `getToolRegistry()` at L514 + `getToolExecutor()` at L571 | `getToolComposition()` |
| `src/lib/chat/tools.ts` | Re-exports both + uses in `getToolsForRole()` and `createToolResults()` | Update re-exports to `getToolComposition`; sunset `createToolResults` |
| `src/lib/evals/live-runtime.ts` | Both at L31 + L37 | `getToolComposition()` |
| `src/lib/evals/live-runner.ts` | `getToolExecutor()` at L252 | `getToolComposition().executor` |
| `src/lib/jobs/deferred-job-notifications.ts` | `getToolRegistry().getDescriptor()` at L43 | `getToolComposition().registry.getDescriptor()` |

### Step 4: Remove standalone `getToolRegistry()` and `getToolExecutor()` exports

Mark them as deprecated immediately. Remove after all call sites are migrated. Do NOT keep backward-compatible re-exports beyond one release cycle.

Also address `src/lib/chat/tools.ts` which currently re-exports both functions AND contains the deprecated `createToolResults()`. This file should either:
- Re-export from `getToolComposition()` and update its internal usage, or
- Be sunset entirely if all consumers are migrated.

### Step 5: Add a cache-invalidation hook for tests

Tests need to reset the memoized composition root between runs:

```typescript
/** @internal — test-only */
export function _resetToolComposition(): void {
  cached = null;
}
```

---

## Constraints — Do NOT Introduce

- **Do not** make the composition root async. Keep it synchronous; lazy async resources (like LocalEmbedder pipelines) should remain lazy inside their own classes.
- **Do not** turn this into a full DI container. A simple memoized factory is sufficient.
- **Do not** change the ToolRegistry public API. The registry interface stays the same; only the wiring changes.
- **Do not** share the memoized instance across parallel test suites without the reset hook — Vitest runs in parallel.

---

## Required Tests

### Unit Tests — `tests/registry-executor-unification.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `getToolComposition returns same registry and executor on repeated calls` | Memoization works; `===` identity check on both `registry` and `executor`. |
| 2 | `executor operates on the same registry used for descriptor lookup` | Register a test tool, look it up via `registry.getDescriptor()`, execute it via `executor()`, confirm both see the same tool. |
| 3 | `_resetToolComposition causes fresh instances on next call` | Call `getToolComposition()`, reset, call again — new instances with `!==`. |
| 4 | `executor receives identical RBAC context as registry` | Register a tool with `roles: ["ADMIN"]`. Execute as `STAFF` via executor — must fail. Confirm `registry.canExecute()` returns the same result. |
| 5 | `composition result is frozen` | Attempt to mutate properties on the returned object — must throw or silently fail. |

### Integration Test — `tests/registry-executor-integration.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `chat stream route uses single composition root` | Mock `getToolComposition`, send a chat request, assert the mock was called exactly once and both registry and executor came from it. |
| 2 | `deferred tool descriptor lookup matches executor behavior` | Register a deferred tool, confirm `registry.getDescriptor(name).executionMode === "deferred"`, then execute via executor and confirm deferred-mode branch was taken. |

---

## Acceptance Criteria

- [ ] `getToolRegistry()` and `getToolExecutor()` are removed or deprecated with `@deprecated` JSDoc.
- [ ] `getToolComposition()` is the sole public API for obtaining registry + executor.
- [ ] The returned object is frozen and memoized.
- [ ] All existing tests pass without modification (except import paths).
- [ ] New tests above pass.
- [ ] No new `LocalEmbedder` instances are created per-call (memoization ensures `createToolRegistry()` runs once; the `new LocalEmbedder()` at line 140, plus instances in `embedding-module.ts` and `search-pipeline.ts`, are only constructed during that single run).
- [ ] All 5 non-test call sites are migrated to `getToolComposition()`.
- [ ] `src/lib/chat/tools.ts` re-exports are updated or the file is sunset.
