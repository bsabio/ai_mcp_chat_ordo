import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionUserMock,
  executeAdminWebSearchMock,
  logFailureMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  executeAdminWebSearchMock: vi.fn(),
  logFailureMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/core/use-cases/tools/admin-web-search.tool", async () => {
  const actual = await vi.importActual<typeof import("@/core/use-cases/tools/admin-web-search.tool")>(
    "@/core/use-cases/tools/admin-web-search.tool",
  );

  return {
    ...actual,
    executeAdminWebSearch: executeAdminWebSearchMock,
  };
});

vi.mock("@/lib/observability/logger", () => ({
  logFailure: logFailureMock,
}));

import { POST } from "@/app/api/web-search/route";
import {
  createAdminSessionUser,
  createAuthenticatedSessionUser,
  createRouteRequest,
} from "../../../../tests/helpers/workflow-route-fixture";

describe("POST /api/web-search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a structured 403 payload for non-admin users", async () => {
    getSessionUserMock.mockResolvedValue(createAuthenticatedSessionUser());

    const response = await POST(
      createRouteRequest("/api/web-search", "POST", {
        query: "ordo site architecture",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toEqual({
      action: "admin_web_search",
      query: "ordo site architecture",
      allowed_domains: undefined,
      model: "gpt-5",
      error: "Web search is restricted to administrators.",
      code: 403,
    });
    expect(executeAdminWebSearchMock).not.toHaveBeenCalled();
  });

  it("returns a structured 400 payload when the query is missing", async () => {
    getSessionUserMock.mockResolvedValue(createAdminSessionUser());

    const response = await POST(
      createRouteRequest("/api/web-search", "POST", {
        allowed_domains: ["example.com"],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      action: "admin_web_search",
      query: "",
      allowed_domains: ["example.com"],
      model: "gpt-5",
      error: "query is required and must be non-empty",
      code: undefined,
    });
    expect(executeAdminWebSearchMock).not.toHaveBeenCalled();
  });

  it("returns the structured admin web-search payload for valid admin requests", async () => {
    getSessionUserMock.mockResolvedValue(createAdminSessionUser());
    executeAdminWebSearchMock.mockResolvedValue({
      action: "admin_web_search",
      query: "ordo site architecture",
      allowed_domains: ["example.com"],
      answer: "A sourced answer.",
      citations: [],
      sources: ["https://example.com/architecture"],
      model: "gpt-5",
    });

    const response = await POST(
      createRouteRequest("/api/web-search", "POST", {
        query: "ordo site architecture",
        allowed_domains: ["example.com", 42, ""],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      action: "admin_web_search",
      query: "ordo site architecture",
      allowed_domains: ["example.com"],
      answer: "A sourced answer.",
      citations: [],
      sources: ["https://example.com/architecture"],
      model: "gpt-5",
    });
    expect(executeAdminWebSearchMock).toHaveBeenCalledWith({
      query: "ordo site architecture",
      allowed_domains: ["example.com"],
      model: undefined,
    });
  });

  it("returns a structured 500 payload when the route throws unexpectedly", async () => {
    getSessionUserMock.mockResolvedValue(createAdminSessionUser());
    executeAdminWebSearchMock.mockRejectedValue(new Error("boom"));

    const response = await POST(
      createRouteRequest("/api/web-search", "POST", {
        query: "ordo site architecture",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      action: "admin_web_search",
      query: "ordo site architecture",
      allowed_domains: undefined,
      model: "gpt-5",
      error: "Internal server error during web search.",
      code: 500,
    });
    expect(logFailureMock).toHaveBeenCalledWith(
      "WEB_SEARCH_ERROR",
      "Web search route error",
      undefined,
      expect.any(Error),
    );
  });
});