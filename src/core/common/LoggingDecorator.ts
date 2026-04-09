import type { UseCase } from "./UseCase";
import { logEvent } from "@/lib/observability/logger";

/**
 * Decorator: Logging
 * 
 * Automatically logs use-case execution, parameters, and duration.
 * Adheres to the Decorator pattern (GoF).
 */
export class LoggingDecorator<TReq, TRes> implements UseCase<TReq, TRes> {
  constructor(
    private readonly decoratee: UseCase<TReq, TRes>,
    private readonly useCaseName: string
  ) {}

  async execute(request: TReq): Promise<TRes> {
    const start = Date.now();
    logEvent("info", "usecase.start", { useCase: this.useCaseName });
    
    try {
      const result = await this.decoratee.execute(request);
      const duration = Date.now() - start;
      logEvent("info", "usecase.success", { useCase: this.useCaseName, durationMs: duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logEvent("error", "usecase.error", { useCase: this.useCaseName, durationMs: duration, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}
