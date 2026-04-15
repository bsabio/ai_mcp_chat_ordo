import type { ToolExecutionContext } from "./ToolExecutionContext";

export type HookFailureMode = "fatal" | "best_effort";

export type ToolExecuteFn = (
  name: string,
  input: Record<string, unknown>,
  context: ToolExecutionContext,
) => Promise<unknown>;

export interface ToolMiddleware {
  execute(
    name: string,
    input: Record<string, unknown>,
    context: ToolExecutionContext,
    next: ToolExecuteFn,
  ): Promise<unknown>;
}

export interface ToolExecutionHookState {
  name: string;
  input: Record<string, unknown>;
  context: ToolExecutionContext;
  meta: Record<string, unknown>;
}

export interface ToolExecutionSuccessHookState extends ToolExecutionHookState {
  result: unknown;
}

export interface ToolExecutionErrorHookState extends ToolExecutionHookState {
  error: unknown;
}

export interface ToolExecutionShortCircuit {
  type: "short_circuit";
  result: unknown;
}

export interface ToolExecutionHook {
  readonly failureMode?: HookFailureMode;
  beforeToolExecute?(state: ToolExecutionHookState): Promise<ToolExecutionShortCircuit | void> | ToolExecutionShortCircuit | void;
  afterToolExecute?(state: ToolExecutionSuccessHookState): Promise<void> | void;
  onToolExecuteError?(state: ToolExecutionErrorHookState): Promise<void> | void;
}

export function shortCircuitToolExecution(result: unknown): ToolExecutionShortCircuit {
  return {
    type: "short_circuit",
    result,
  };
}

function isShortCircuitResult(result: ToolExecutionShortCircuit | void): result is ToolExecutionShortCircuit {
  return Boolean(result && result.type === "short_circuit");
}

function isBestEffortHook(hook: { failureMode?: HookFailureMode }): boolean {
  return hook.failureMode === "best_effort";
}

export function createToolExecutionHookRunner(
  hooks: ToolExecutionHook[],
  executeFn: ToolExecuteFn,
): ToolExecuteFn {
  return async (name, input, context) => {
    const baseState: ToolExecutionHookState = {
      name,
      input,
      context,
      meta: {},
    };
    const enteredHooks: ToolExecutionHook[] = [];

    try {
      for (const hook of hooks) {
        const beforeHook = hook.beforeToolExecute;
        if (!beforeHook) {
          enteredHooks.push(hook);
          continue;
        }

        try {
            const hookResult = await beforeHook.call(hook, baseState);
          if (isShortCircuitResult(hookResult)) {
            return hookResult.result;
          }
          enteredHooks.push(hook);
        } catch (error) {
          if (isBestEffortHook(hook)) {
            continue;
          }
          throw error;
        }
      }

      const result = await executeFn(name, input, context);
      const successState: ToolExecutionSuccessHookState = {
        ...baseState,
        result,
      };

      for (const hook of hooks) {
        try {
          await hook.afterToolExecute?.(successState);
        } catch (hookError) {
          // Hook observability failures should not corrupt tool execution results.
          void hookError;
        }
      }

      return result;
    } catch (error) {
      const errorState: ToolExecutionErrorHookState = {
        ...baseState,
        error,
      };

      for (const hook of enteredHooks) {
        try {
          await hook.onToolExecuteError?.(errorState);
        } catch (hookError) {
          // Error hooks are best-effort and should not mask the original failure.
          void hookError;
        }
      }

      throw error;
    }
  };
}

/**
 * Composes middleware around a registry's execute method.
 * Applied outer → inner: first middleware in array is outermost.
 */
export function composeMiddleware(
  middlewares: ToolMiddleware[],
  executeFn: ToolExecuteFn,
): ToolExecuteFn {
  return middlewares.reduceRight<ToolExecuteFn>(
    (next, mw) => (name, input, context) => mw.execute(name, input, context, next),
    executeFn,
  );
}
