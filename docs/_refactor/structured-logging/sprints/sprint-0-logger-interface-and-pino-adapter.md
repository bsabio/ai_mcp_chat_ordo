# Sprint 0 — Logger Interface and Pino Adapter

> **Goal:** Define the Logger interface, implement the PinoLogger adapter,
> install pino, and verify output shape with unit tests.
>
> **Spec Sections:** 2 (Design Goals), 3 (Architecture)
>
> **Prerequisite:** None

## Available Assets

| Asset | Location |
| --- | --- |
| Existing ConsoleLogger | `src/adapters/` (search for ConsoleLogger) |
| ToolExecutionContext | `src/core/tool-registry/ToolExecutionContext.ts` |
| Clean-architecture common dir | `src/core/common/` |

---

### Task 1 — Install pino and pino-pretty

Install `pino` as a production dependency and `pino-pretty` as a dev
dependency.

```bash
npm i pino
npm i -D pino-pretty
```

**Verify:**

```bash
node -e "require('pino')" && echo "ok"
```

---

### Task 2 — Create Logger interface

Create `src/core/common/Logger.ts` with the `Logger` interface defined in
spec section 3.3. The interface must include `info`, `warn`, `error`, `debug`,
and `child` methods.

Export the interface as a named export.

**Verify:**

```bash
npx tsc --noEmit src/core/common/Logger.ts
```

---

### Task 3 — Implement PinoLogger adapter

Create `src/adapters/PinoLogger.ts` implementing the `Logger` interface.

Requirements:

- Accept a `pino.Logger` instance in the constructor.
- Delegate `info`, `warn`, `error`, `debug` to the underlying Pino instance, passing
  the context object as the first argument and message as the second (Pino
  convention).
- `child()` returns a new `PinoLogger` wrapping `pino.child(bindings)`.
- Export a factory function `createLogger(options?: { level?: string }): Logger`
  that creates a root Pino instance:
  - `level`: configurable, default `"info"`.
  - `transport`: use `pino-pretty` when `NODE_ENV !== "production"`, otherwise
    no transport (raw JSON to stdout).

**Verify:**

```bash
npx tsc --noEmit src/adapters/PinoLogger.ts
```

---

### Task 4 — Unit tests

Create `tests/structured-logging.test.ts` with the following test cases:

1. `PinoLogger.info() outputs JSON with "level" and "msg" fields`
2. `PinoLogger.child() binds context to all subsequent log calls`
3. `PinoLogger.error() includes context object in output`
4. `createLogger() defaults to "info" level`

Use a Pino `destination` stream writing to an in-memory buffer for assertion.

**Verify:**

```bash
npx vitest run tests/structured-logging.test.ts
```

---

## Completion Checklist

- [x] `pino` in `dependencies`, `pino-pretty` in `devDependencies`
- [x] `src/core/services/ErrorHandler.ts` `Logger` interface extended with `child()` (reused existing interface instead of creating separate `Logger.ts`)
- [x] `src/adapters/PinoLogger.ts` exports `PinoLogger` class, `createLogger` factory, and `createRawPinoInstance`
- [x] `tests/structured-logging.test.ts` passes (11 tests)
- [x] `npm run build` succeeds

### Implementation Notes

- The `Logger` interface already existed in `src/core/services/ErrorHandler.ts`.
  Rather than creating a duplicate `src/core/common/Logger.ts`, we extended the
  existing interface with the `child()` method.
- `ConsoleLogger` was updated to implement `child()` with binding propagation.
- Pino was wired as the output layer for the existing `logEvent()` observability
  bus (`src/lib/observability/logger.ts`), providing structured JSON output for
  all existing logging callsites without per-file migration.
