import type {
  ToolExecutionHook,
  ToolExecutionHookState,
  ToolExecuteFn,
  ToolMiddleware,
} from "./ToolMiddleware";
import type { ToolExecutionContext } from "./ToolExecutionContext";
import type { ToolRegistry } from "./ToolRegistry";
import { ToolAccessDeniedError, UnknownToolError } from "./errors";

export class RbacGuardMiddleware implements ToolExecutionHook, ToolMiddleware {
  constructor(private readonly registry: ToolRegistry) {}

  async execute(
    name: string,
    input: Record<string, unknown>,
    context: ToolExecutionContext,
    next: ToolExecuteFn,
  ): Promise<unknown> {
    await this.beforeToolExecute({
      name,
      input,
      context,
      meta: {},
    });
    return next(name, input, context);
  }

  beforeToolExecute(state: ToolExecutionHookState): void | Promise<void> {
    const descriptor = this.registry.getDescriptor(state.name);
    if (!descriptor) {
      throw new UnknownToolError(state.name);
    }
    if (!this.registry.canExecute(state.name, state.context.role)) {
      throw new ToolAccessDeniedError(state.name, state.context.role);
    }
  }
}
