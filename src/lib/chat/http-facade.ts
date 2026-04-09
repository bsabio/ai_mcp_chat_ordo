import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createRequestId,
  logEvent,
} from "@/lib/observability/logger";
import { recordRouteMetric } from "@/lib/observability/metrics";
import { AppError, mapErrorToResponse } from "@/core/common/errors";

export type RouteContext = {
  route: string;
  requestId: string;
  startedAt: number;
};

function durationMs(startedAt: number) {
  return Date.now() - startedAt;
}

export function startRoute(route: string, request: NextRequest): RouteContext {
  const context = {
    route,
    requestId: createRequestId(request.headers),
    startedAt: Date.now(),
  };

  logEvent("info", "request.start", {
    route: context.route,
    requestId: context.requestId,
  });
  return context;
}

export function successJson(
  context: RouteContext,
  payload: Record<string, unknown>,
  init?: ResponseInit,
) {
  const elapsed = durationMs(context.startedAt);
  recordRouteMetric(context.route, elapsed, false);
  logEvent("info", "request.success", {
    route: context.route,
    requestId: context.requestId,
    durationMs: elapsed,
  });

  return NextResponse.json({ ...payload, requestId: context.requestId }, init);
}

export function successText(
  context: RouteContext,
  content: string,
  headers?: HeadersInit,
) {
  const elapsed = durationMs(context.startedAt);
  recordRouteMetric(context.route, elapsed, false);
  logEvent("info", "request.success", {
    route: context.route,
    requestId: context.requestId,
    durationMs: elapsed,
  });

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "x-request-id": context.requestId,
      ...headers,
    },
  });
}

export function errorJson(
  context: RouteContext,
  message: string,
  status: number,
  init?: ResponseInit,
  errorCode?: string,
) {
  const elapsed = durationMs(context.startedAt);
  const resolvedCode = errorCode ?? (status === 404 ? "NOT_FOUND" : status === 401 || status === 403 ? "AUTH_ERROR" : status >= 500 ? "INTERNAL_ERROR" : "VALIDATION_ERROR");
  const isServerError = status >= 500;

  recordRouteMetric(context.route, elapsed, isServerError);
  logEvent(isServerError ? "error" : "info", "request.error", {
    route: context.route,
    requestId: context.requestId,
    durationMs: elapsed,
    errorCode: resolvedCode,
    status,
    message,
  });

  return NextResponse.json(
    { error: message, errorCode: resolvedCode, requestId: context.requestId },
    {
      ...init,
      status,
    },
  );
}

export async function runRouteTemplate({
  route,
  request,
  execute,
  validationMessages = [],
}: {
  route: string;
  request: NextRequest;
  execute: (context: RouteContext) => Promise<Response>;
  /** @deprecated Prefer throwing a canonical AppError subclass instead. Remove after 2025-10-01. */
  validationMessages?: string[];
}) {
  const context = startRoute(route, request);

  try {
    return await execute(context);
  } catch (error) {
    // Canonical AppError subclasses carry their own status/errorCode.
    if (error instanceof AppError) {
      const mapped = mapErrorToResponse(error, context.requestId);
      const elapsed = durationMs(context.startedAt);
      const isServerError = mapped.status >= 500;

      recordRouteMetric(context.route, elapsed, isServerError);
      logEvent(isServerError ? "error" : "info", "request.error", {
        route: context.route,
        requestId: context.requestId,
        durationMs: elapsed,
        errorCode: mapped.body.errorCode,
        status: mapped.status,
        message: mapped.body.error,
      });

      return NextResponse.json(mapped.body, { status: mapped.status });
    }

    // Legacy fallback: plain Errors with message-based validation matching.
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    const status = validationMessages.includes(message) ? 400 : 500;
    return errorJson(context, message, status);
  }
}
