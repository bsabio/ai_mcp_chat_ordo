import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequestId, getErrorCode, logEvent } from "@/lib/observability/logger";
import { getMetricsSnapshot, recordRouteMetric, resetMetrics } from "@/lib/observability/metrics";

describe("observability helpers", () => {
  afterEach(() => {
    resetMetrics();
    vi.restoreAllMocks();
  });

  it("uses inbound x-request-id when present", () => {
    const headers = new Headers({ "x-request-id": "abc-123" });
    expect(createRequestId(headers)).toBe("abc-123");
  });

  it("generates a request id when header is missing", () => {
    expect(createRequestId()).toBeTruthy();
  });

  it("maps known validation errors to stable codes", () => {
    expect(getErrorCode("messages must be a non-empty array.")).toBe("VALIDATION_ERROR");
    expect(getErrorCode("No user message found.")).toBe("VALIDATION_ERROR");
    expect(getErrorCode("provider timeout")).toBe("PROVIDER_ERROR");
    expect(getErrorCode("unknown problem")).toBe("INTERNAL_ERROR");
  });

  it("writes structured logs to correct stream", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logEvent("info", "request.start", { route: "/api/chat", requestId: "r1" });
    logEvent("error", "request.error", { route: "/api/chat", requestId: "r1" });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("emits route metric event and reports externalized snapshot mode", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    recordRouteMetric("/api/chat", 10, false);

    const snapshot = getMetricsSnapshot();
    expect(infoSpy).toHaveBeenCalled();
    expect(snapshot.mode).toBe("externalized");
  });
});
