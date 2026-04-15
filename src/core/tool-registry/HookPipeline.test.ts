import { describe, expect, it, vi } from "vitest";

import { LoggingMiddleware } from "./LoggingMiddleware";
import { RbacGuardMiddleware } from "./RbacGuardMiddleware";
import {
  createToolExecutionHookRunner,
  shortCircuitToolExecution,
  type ToolExecutionErrorHookState,
  type ToolExecutionHookState,
  type ToolExecutionSuccessHookState,
  type ToolExecuteFn,
} from "./ToolMiddleware";
import type { ToolExecutionContext } from "./ToolExecutionContext";
import { ToolAccessDeniedError } from "./errors";

const EXECUTION_CONTEXT: ToolExecutionContext = {
  role: "ADMIN",
  userId: "usr_test",
  conversationId: "conv_test",
};

function createLoggerMock() {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };
  logger.child.mockReturnValue(logger);
  return logger;
}

describe("createToolExecutionHookRunner", () => {
  it("runs hooks in registration order around successful execution", async () => {
    const callOrder: string[] = [];
    const executeFn: ToolExecuteFn = vi.fn(async () => {
      callOrder.push("execute");
      return "ok";
    });

    const runner = createToolExecutionHookRunner([
      {
        beforeToolExecute(state) {
          state.meta.first = true;
          callOrder.push("hook-1:before");
        },
        afterToolExecute(state) {
          expect(state.meta.first).toBe(true);
          callOrder.push(`hook-1:after:${String(state.result)}`);
        },
      },
      {
        beforeToolExecute() {
          callOrder.push("hook-2:before");
        },
        afterToolExecute() {
          callOrder.push("hook-2:after");
        },
      },
    ], executeFn);

    await expect(runner("inspect_runtime_context", {}, EXECUTION_CONTEXT)).resolves.toBe("ok");
    expect(callOrder).toEqual([
      "hook-1:before",
      "hook-2:before",
      "execute",
      "hook-1:after:ok",
      "hook-2:after",
    ]);
  });

  it("supports hook short-circuiting without invoking the executor", async () => {
    const executeFn: ToolExecuteFn = vi.fn(async () => "unexpected");

    const runner = createToolExecutionHookRunner([
      {
        beforeToolExecute() {
          return shortCircuitToolExecution({ ok: true, source: "hook" });
        },
      },
    ], executeFn);

    await expect(runner("inspect_runtime_context", {}, EXECUTION_CONTEXT)).resolves.toEqual({ ok: true, source: "hook" });
    expect(executeFn).not.toHaveBeenCalled();
  });

  it("swallows after-hook failures and preserves the original tool result", async () => {
    const executeFn: ToolExecuteFn = vi.fn(async () => "ok");

    const runner = createToolExecutionHookRunner([
      {
        afterToolExecute() {
          throw new Error("after hook failed");
        },
      },
    ], executeFn);

    await expect(runner("inspect_runtime_context", {}, EXECUTION_CONTEXT)).resolves.toBe("ok");
  });

  it("invokes error hooks and rethrows the original tool failure", async () => {
    const executeError = new Error("tool failed");
    const onError = vi.fn();
    const executeFn: ToolExecuteFn = vi.fn(async () => {
      throw executeError;
    });

    const runner = createToolExecutionHookRunner([
      {
        beforeToolExecute(state) {
          state.meta.started = true;
        },
        onToolExecuteError: onError,
      },
    ], executeFn);

    await expect(runner("inspect_runtime_context", {}, EXECUTION_CONTEXT)).rejects.toThrow(executeError);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      name: "inspect_runtime_context",
      error: executeError,
      meta: expect.objectContaining({ started: true }),
    }));
  });

  it("runs LoggingMiddleware and RbacGuardMiddleware together on the hook-runner path", async () => {
    const logger = createLoggerMock();
    const executeFn: ToolExecuteFn = vi.fn(async () => ({ ok: true }));
    const registry = {
      getDescriptor: vi.fn(() => ({ name: "calculator" })),
      canExecute: vi.fn(() => true),
    };

    const runner = createToolExecutionHookRunner([
      new LoggingMiddleware(),
      new RbacGuardMiddleware(registry as never),
    ], executeFn);

    await expect(runner("calculator", { expression: "2+2" }, {
      ...EXECUTION_CONTEXT,
      role: "ANONYMOUS",
      logger,
    })).resolves.toEqual({ ok: true });

    expect(executeFn).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith("tool.start", expect.objectContaining({ tool: "calculator", role: "ANONYMOUS" }));
    expect(logger.info).toHaveBeenCalledWith("tool.success", expect.objectContaining({ tool: "calculator" }));
  });

  it("logs and rejects when RBAC denies execution on the hook-runner path", async () => {
    const logger = createLoggerMock();
    const executeFn: ToolExecuteFn = vi.fn(async () => "unexpected");
    const registry = {
      getDescriptor: vi.fn(() => ({ name: "generate_audio" })),
      canExecute: vi.fn(() => false),
    };

    const runner = createToolExecutionHookRunner([
      new LoggingMiddleware(),
      new RbacGuardMiddleware(registry as never),
    ], executeFn);

    await expect(runner("generate_audio", {}, {
      ...EXECUTION_CONTEXT,
      role: "ANONYMOUS",
      logger,
    })).rejects.toBeInstanceOf(ToolAccessDeniedError);

    expect(executeFn).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("tool.start", expect.objectContaining({ tool: "generate_audio" }));
    expect(logger.error).toHaveBeenCalledWith("tool.error", expect.objectContaining({ tool: "generate_audio" }));
  });

  it("isolates best-effort before-hook failures so authorization still runs", async () => {
    const executeFn: ToolExecuteFn = vi.fn(async () => "unexpected");
    const registry = {
      getDescriptor: vi.fn(() => ({ name: "admin_secret" })),
      canExecute: vi.fn(() => false),
    };

    const runner = createToolExecutionHookRunner([
      {
        failureMode: "best_effort",
        beforeToolExecute() {
          throw new Error("logger unavailable");
        },
      },
      new RbacGuardMiddleware(registry as never),
    ], executeFn);

    await expect(runner("admin_secret", {}, EXECUTION_CONTEXT)).rejects.toBeInstanceOf(ToolAccessDeniedError);
    expect(executeFn).not.toHaveBeenCalled();
    expect(registry.canExecute).toHaveBeenCalledWith("admin_secret", "ADMIN");
  });
});

describe("legacy middleware compatibility adapters", () => {
  it("LoggingMiddleware.execute awaits async hook lifecycle methods", async () => {
    const callOrder: string[] = [];

    class AsyncLoggingMiddleware extends LoggingMiddleware {
      override async beforeToolExecute(state: ToolExecutionHookState): Promise<void> {
        await Promise.resolve();
        callOrder.push("before");
        await super.beforeToolExecute(state);
      }

      override async afterToolExecute(state: ToolExecutionSuccessHookState): Promise<void> {
        await Promise.resolve();
        callOrder.push(`after:${String(state.result)}`);
      }

      override async onToolExecuteError(_state: ToolExecutionErrorHookState): Promise<void> {
        await Promise.resolve();
        callOrder.push("error");
      }
    }

    const middleware = new AsyncLoggingMiddleware();
    const next: ToolExecuteFn = vi.fn(async () => {
      callOrder.push("next");
      return "ok";
    });

    await expect(middleware.execute("calculator", {}, EXECUTION_CONTEXT, next)).resolves.toBe("ok");
    expect(callOrder).toEqual(["before", "next", "after:ok"]);
  });

  it("RbacGuardMiddleware.execute awaits async authorization before invoking next", async () => {
    const next: ToolExecuteFn = vi.fn(async () => "unexpected");

    class AsyncRbacGuardMiddleware extends RbacGuardMiddleware {
      override async beforeToolExecute(state: ToolExecutionHookState): Promise<void> {
        await Promise.resolve();
        return super.beforeToolExecute(state);
      }
    }

    const middleware = new AsyncRbacGuardMiddleware({
      getDescriptor: vi.fn(() => ({ name: "admin_secret" })),
      canExecute: vi.fn(() => false),
    } as never);

    await expect(middleware.execute("admin_secret", {}, EXECUTION_CONTEXT, next)).rejects.toBeInstanceOf(ToolAccessDeniedError);
    expect(next).not.toHaveBeenCalled();
  });
});