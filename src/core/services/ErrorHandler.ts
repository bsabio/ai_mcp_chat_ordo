export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export interface AppError extends Error {
  code: string;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
}

export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

export class ErrorHandler {
  constructor(private logger: Logger) {}

  handle(error: unknown, context?: Record<string, unknown>): void {
    if (this.isAppError(error)) {
      this.logger.error(`[${error.code}] ${error.message}`, {
        ...context,
        severity: error.severity,
        stack: error.stack,
      });
    } else if (error instanceof Error) {
      this.logger.error(error.message, { ...context, stack: error.stack });
    } else {
      this.logger.error("An unknown error occurred", { ...context, error });
    }
  }

  private isAppError(error: unknown): error is AppError {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string" &&
      "severity" in error &&
      typeof error.severity === "string"
    );
  }
}
