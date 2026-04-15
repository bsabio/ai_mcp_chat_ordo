# Spec 02: RBAC Policy Consolidation

**Priority:** High
**Risk if deferred:** Policy drift between middleware and registry layers causes inconsistent access control
**Files in scope:**
- `src/core/tool-registry/RbacGuardMiddleware.ts` (~20 lines)
- `src/core/tool-registry/ToolRegistry.ts` (~71 lines)

---

## Problem Statement

Role-based access control is enforced in two places with duplicated logic:

1. **RbacGuardMiddleware** (lines 8–14): Checks `registry.canExecute(name, role)` before delegating to the next executor.
2. **ToolRegistry.execute()** (lines 33–46): Repeats the exact same `canExecute()` check before running the tool command.

Both layers call the same `canExecute()` method, but the duplication means:
- A change to authorization semantics must be applied in both places or one becomes stale.
- Error messages and error types can diverge between layers.
- Test coverage must duplicate assertions across both enforcement points.

---

## Architectural Approach

### Decision: Middleware is the canonical enforcement point

The middleware pattern exists specifically to intercept cross-cutting concerns before execution. The registry's job is registration, lookup, and execution — not policy enforcement.

### Step 1: Remove RBAC checks from `ToolRegistry.execute()`

Strip the `canExecute()` guard and the role parameter dependency from `execute()`. The method should assume the caller has already passed authorization:

```typescript
// ToolRegistry.ts — execute() after refactor
async execute(
  name: string,
  input: Record<string, unknown>,
  context: ToolExecutionContext,
): Promise<ToolResult> {
  const descriptor = this.tools.get(name);
  if (!descriptor) {
    throw new ToolNotFoundError(name);
  }
  const raw = await descriptor.command.execute(input, context);
  return descriptor.resultFormatter
    ? descriptor.resultFormatter(raw)
    : raw;
}
```

### Step 2: Keep `canExecute()` as a public query method on the registry

The middleware and any other consumer (UI tool-list filtering, descriptor introspection) still need `canExecute()`. It stays on the registry as a **query**, not as an enforcement gate inside `execute()`.

### Step 3: Ensure RbacGuardMiddleware produces clear, typed errors

Standardize the error shape:

```typescript
// RbacGuardMiddleware.ts
if (!registry.getDescriptor(name)) {
  throw new ToolNotFoundError(name);
}
if (!registry.canExecute(name, context.role)) {
  throw new ToolAccessDeniedError(name, context.role);
}
return next(name, input, context);
```

### Step 4: Add a thin assertion in `execute()` for defense-in-depth (optional)

If the team wants belt-and-suspenders, add a `console.assert` or a debug-only invariant — NOT a thrown error that duplicates policy:

```typescript
if (process.env.NODE_ENV !== "production") {
  console.assert(
    this.canExecute(name, context.role),
    `RBAC: execute() called without authorization for ${name}`,
  );
}
```

---

## Constraints — Do NOT Introduce

- **Do not** remove `canExecute()` from the registry. It is a valid query method used for UI filtering and introspection.
- **Do not** move role definitions into the middleware. Roles stay in `ToolDescriptor`. The middleware reads them; it does not own them.
- **Do not** create a separate authorization service/class for this. The current middleware + registry query pattern is the right level of abstraction.
- **Do not** change the `ToolExecutionContext` shape. It still carries `role` for audit logging and downstream use.

---

## Required Tests

### Unit Tests — `tests/rbac-policy-consolidation.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `RbacGuardMiddleware rejects tool call when role is not in descriptor.roles` | Register tool with `roles: ["ADMIN"]`, call as `STAFF`, expect `ToolAccessDeniedError`. |
| 2 | `RbacGuardMiddleware passes through when role matches` | Register tool with `roles: ["ADMIN", "STAFF"]`, call as `STAFF`, expect success. |
| 3 | `RbacGuardMiddleware throws ToolNotFoundError for unregistered tool` | Call middleware with a non-existent tool name. |
| 4 | `ToolRegistry.execute() no longer throws on role mismatch` | Call `registry.execute()` directly (bypassing middleware) with mismatched role — must NOT throw RBAC error. (This confirms enforcement is removed from execute.) |
| 5 | `canExecute() still returns correct boolean` | Test `canExecute()` independently with matching and non-matching roles. |
| 6 | `Error types are distinct and serializable` | `ToolNotFoundError` and `ToolAccessDeniedError` carry `name`, `role`, and serialize to JSON cleanly. |

### Regression Test

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `Full executor pipeline (middleware → registry.execute) enforces RBAC exactly once` | Spy on `canExecute()` — confirm it is called exactly once per tool execution (from middleware), not twice. |

---

## Acceptance Criteria

- [ ] `ToolRegistry.execute()` no longer calls `canExecute()`.
- [ ] `RbacGuardMiddleware` is the sole enforcement point for role-based access.
- [ ] `canExecute()` remains available as a public query on `ToolRegistry`.
- [ ] `ToolNotFoundError` and `ToolAccessDeniedError` are distinct, typed error classes.
- [ ] All existing RBAC-related tests pass (updated to match new single-layer enforcement).
- [ ] New tests above pass.
