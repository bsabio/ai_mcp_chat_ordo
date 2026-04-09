import { describe, it, expect } from "vitest";
import {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
  AuthorizationError,
  ForbiddenError,
  RateLimitError,
  InternalError,
  mapErrorToResponse,
} from "@/core/common/errors";

/* ---- Domain error imports ---- */
import { InvalidCredentialsError } from "@/core/use-cases/AuthenticateUserInteractor";
import { ConversationNotFoundError, MessageLimitError } from "@/core/use-cases/ConversationInteractor";
import { RegistrationValidationError, DuplicateEmailError } from "@/core/use-cases/RegisterUserInteractor";
import { UserProfileNotFoundError } from "@/core/use-cases/GetUserProfileInteractor";
import { UserProfileValidationError, UserProfileConflictError } from "@/core/use-cases/UpdateUserProfileInteractor";
import { InvalidSessionError } from "@/core/use-cases/ValidateSessionInteractor";
import { ConsultationRequestNotFoundError, ConsultationRequestTransitionError } from "@/core/use-cases/TriageConsultationRequestInteractor";
import { ConsultationRequestError, DuplicateConsultationRequestError } from "@/core/use-cases/RequestConsultationInteractor";
import { ResourceNotFoundError, ContentAccessDeniedError } from "@/core/entities/errors";
import { ToolAccessDeniedError, UnknownToolError } from "@/core/tool-registry/errors";

/* ------------------------------------------------------------------ */
/*  Canonical error hierarchy                                          */
/* ------------------------------------------------------------------ */

describe("Canonical error classes", () => {
  const cases: Array<[string, AppError, number, string]> = [
    ["NotFoundError", new NotFoundError("gone"), 404, "NOT_FOUND"],
    ["ValidationError", new ValidationError("bad"), 400, "VALIDATION_ERROR"],
    ["ConflictError", new ConflictError("dup"), 409, "CONFLICT"],
    ["AuthorizationError", new AuthorizationError("who"), 401, "AUTH_ERROR"],
    ["ForbiddenError", new ForbiddenError("nope"), 403, "FORBIDDEN"],
    ["RateLimitError", new RateLimitError("slow"), 429, "RATE_LIMITED"],
    ["InternalError", new InternalError("oops"), 500, "INTERNAL_ERROR"],
  ];

  it.each(cases)(
    "%s carries statusCode=%i and errorCode=%s",
    (_, error, expectedStatus, expectedCode) => {
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(expectedStatus);
      expect(error.errorCode).toBe(expectedCode);
    },
  );

  it("sets name to the constructor name", () => {
    expect(new NotFoundError("x").name).toBe("NotFoundError");
    expect(new ValidationError("x").name).toBe("ValidationError");
  });
});

/* ------------------------------------------------------------------ */
/*  mapErrorToResponse                                                 */
/* ------------------------------------------------------------------ */

describe("mapErrorToResponse", () => {
  it("returns correct status and body for each canonical type", () => {
    const err = new NotFoundError("Record not found");
    const result = mapErrorToResponse(err, "req_123");

    expect(result.status).toBe(404);
    expect(result.body).toEqual({
      error: "Record not found",
      errorCode: "NOT_FOUND",
      requestId: "req_123",
    });
  });

  it("returns 500 for unknown errors with a safe message", () => {
    const result = mapErrorToResponse(new TypeError("unexpected"), "req_456");

    expect(result.status).toBe(500);
    expect(result.body.error).toBe("Internal server error");
    expect(result.body.errorCode).toBe("INTERNAL_ERROR");
    expect(result.body.requestId).toBe("req_456");
  });

  it("returns 500 for non-Error values", () => {
    const result = mapErrorToResponse("just a string");

    expect(result.status).toBe(500);
    expect(result.body.error).toBe("Internal server error");
  });

  it("never includes stack traces in the body", () => {
    const err = new InternalError("boom");
    const result = mapErrorToResponse(err);

    expect(JSON.stringify(result.body)).not.toContain("at ");
    expect(result.body).not.toHaveProperty("stack");
  });

  it("omits requestId when not provided", () => {
    const result = mapErrorToResponse(new ValidationError("bad"));

    expect(result.body).not.toHaveProperty("requestId");
  });
});

/* ------------------------------------------------------------------ */
/*  Domain errors inherit canonical status codes                       */
/* ------------------------------------------------------------------ */

describe("Domain errors inherit canonical statusCode", () => {
  const domainCases: Array<[string, AppError, number, string]> = [
    ["InvalidCredentialsError", new InvalidCredentialsError("bad pw"), 401, "AUTH_ERROR"],
    ["InvalidSessionError", new InvalidSessionError("expired"), 401, "AUTH_ERROR"],
    ["ConversationNotFoundError", new ConversationNotFoundError("gone"), 404, "NOT_FOUND"],
    ["MessageLimitError", new MessageLimitError("too many"), 400, "VALIDATION_ERROR"],
    ["RegistrationValidationError", new RegistrationValidationError("bad email"), 400, "VALIDATION_ERROR"],
    ["DuplicateEmailError", new DuplicateEmailError("taken"), 409, "CONFLICT"],
    ["UserProfileNotFoundError", new UserProfileNotFoundError("usr_1"), 404, "NOT_FOUND"],
    ["UserProfileValidationError", new UserProfileValidationError("bad"), 400, "VALIDATION_ERROR"],
    ["UserProfileConflictError", new UserProfileConflictError("dup"), 409, "CONFLICT"],
    ["ConsultationRequestNotFoundError", new ConsultationRequestNotFoundError("gone"), 404, "NOT_FOUND"],
    ["ConsultationRequestTransitionError", new ConsultationRequestTransitionError("invalid"), 400, "VALIDATION_ERROR"],
    ["ConsultationRequestError", new ConsultationRequestError("nope"), 400, "VALIDATION_ERROR"],
    ["DuplicateConsultationRequestError", new DuplicateConsultationRequestError("dup"), 409, "CONFLICT"],
    ["ResourceNotFoundError", new ResourceNotFoundError("gone"), 404, "NOT_FOUND"],
    ["ContentAccessDeniedError", new ContentAccessDeniedError("no", "member"), 403, "FORBIDDEN"],
    ["ToolAccessDeniedError", new ToolAccessDeniedError("calc", "ANONYMOUS"), 403, "FORBIDDEN"],
    ["UnknownToolError", new UnknownToolError("missing"), 404, "NOT_FOUND"],
  ];

  it.each(domainCases)(
    "%s → status %i, errorCode %s",
    (_, error, expectedStatus, expectedCode) => {
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(expectedStatus);
      expect(error.errorCode).toBe(expectedCode);
    },
  );

  it("domain errors work with mapErrorToResponse", () => {
    const result = mapErrorToResponse(new DuplicateEmailError("taken"), "req_x");
    expect(result.status).toBe(409);
    expect(result.body.errorCode).toBe("CONFLICT");
  });
});
