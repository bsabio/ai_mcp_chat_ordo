import type { ToolMiddleware, ToolExecuteFn } from "./ToolMiddleware";
import type { ToolExecutionContext } from "./ToolExecutionContext";
import { logEvent } from "@/lib/observability/logger";

export class LoggingMiddleware implements ToolMiddleware {
  async execute(
    name: string,
    input: Record<string, unknown>,
    context: ToolExecutionContext,
    next: ToolExecuteFn,
  ): Promise<unknown> {
    const start = Date.now();
    const log = context.logger ?? { info: (msg: string, ctx?: Record<string, unknown>) => logEvent("info", msg, ctx ?? {}), warn: (msg: string, ctx?: Record<string, unknown>) => logEvent("warn", msg, ctx ?? {}), error: (msg: string, ctx?: Record<string, unknown>) => logEvent("error", msg, ctx ?? {}) };

    log.info(`tool.start`, { tool: name, role: context.role });

    try {
      const result = await next(name, input, context);
      const duration = Date.now() - start;
      log.info(`tool.success`, { tool: name, durationMs: duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      log.error(`tool.error`, { tool: name, durationMs: duration, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}
