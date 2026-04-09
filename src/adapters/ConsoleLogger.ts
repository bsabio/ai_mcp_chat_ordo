import type { Logger } from "../core/services/ErrorHandler";

export class ConsoleLogger implements Logger {
  constructor(private readonly bindings?: Record<string, unknown>) {}

  info(message: string, context?: Record<string, unknown>): void {
    console.info(`[INFO] ${message}`, { ...this.bindings, ...context });
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, { ...this.bindings, ...context });
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, { ...this.bindings, ...context });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${message}`, { ...this.bindings, ...context });
    }
  }

  child(childBindings: Record<string, unknown>): Logger {
    return new ConsoleLogger({ ...this.bindings, ...childBindings });
  }
}
