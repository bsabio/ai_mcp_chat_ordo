import { NextRequest, NextResponse } from "next/server";
import { createRequestId, getErrorCode, logEvent } from "@/lib/observability/logger";
import { recordRouteMetric } from "@/lib/observability/metrics";

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

  logEvent("info", "request.start", { route: context.route, requestId: context.requestId });
  return context;
}

export function successJson(context: RouteContext, payload: Record<string, unknown>, init?: ResponseInit) {
  const elapsed = durationMs(context.startedAt);
  recordRouteMetric(context.route, elapsed, false);
  logEvent("info", "request.success", {
    route: context.route,
    requestId: context.requestId,
    durationMs: elapsed,
  });

  return NextResponse.json({ ...payload, requestId: context.requestId }, init);
}

export function successText(context: RouteContext, content: string, headers?: HeadersInit) {
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

export function errorJson(context: RouteContext, message: string, status: number) {
  const elapsed = durationMs(context.startedAt);
  const errorCode = getErrorCode(message);

  recordRouteMetric(context.route, elapsed, true);
  logEvent("error", "request.error", {
    route: context.route,
    requestId: context.requestId,
    durationMs: elapsed,
    errorCode,
    message,
  });

  return NextResponse.json({ error: message, errorCode, requestId: context.requestId }, { status });
}

export async function runRouteTemplate({
  route,
  request,
  execute,
  validationMessages = ["messages must be a non-empty array.", "No user message found."],
}: {
  route: string;
  request: NextRequest;
  execute: (context: RouteContext) => Promise<Response>;
  validationMessages?: string[];
}) {
  const context = startRoute(route, request);

  try {
    return await execute(context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    const status = validationMessages.includes(message) ? 400 : 500;
    return errorJson(context, message, status);
  }
}
