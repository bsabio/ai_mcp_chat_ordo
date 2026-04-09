/**
 * Canonical error hierarchy for the application.
 *
 * Every error class carries a deterministic `statusCode` and `errorCode`
 * so route handlers and middleware can map errors to HTTP responses
 * without instanceof chains or string matching.
 */

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly errorCode = "NOT_FOUND";
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = "VALIDATION_ERROR";
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly errorCode = "CONFLICT";
}

export class AuthorizationError extends AppError {
  readonly statusCode = 401;
  readonly errorCode = "AUTH_ERROR";
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly errorCode = "FORBIDDEN";
}

export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly errorCode = "RATE_LIMITED";
}

export class InternalError extends AppError {
  readonly statusCode = 500;
  readonly errorCode = "INTERNAL_ERROR";
}

/**
 * Map any thrown value to a standard HTTP error response shape.
 *
 * - Known `AppError` subclasses → use their statusCode/errorCode.
 * - Unknown errors → 500 with a generic message (never leaks internals).
 */
export function mapErrorToResponse(
  error: unknown,
  requestId?: string,
): { status: number; body: { error: string; errorCode: string; requestId?: string } } {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        error: error.message,
        errorCode: error.errorCode,
        ...(requestId ? { requestId } : {}),
      },
    };
  }

  return {
    status: 500,
    body: {
      error: "Internal server error",
      errorCode: "INTERNAL_ERROR",
      ...(requestId ? { requestId } : {}),
    },
  };
}
