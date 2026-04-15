import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSessionUser, createStaffSessionUser, createRouteRequest } from "../../../../../tests/helpers/workflow-route-fixture";

const { getSessionUserMock, conversationAnalyticsMock, getDbMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  conversationAnalyticsMock: vi.fn(),
  getDbMock: vi.fn(() => ({ mocked: true })),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/db", () => ({
  getDb: getDbMock,
}));

vi.mock("@/lib/capabilities/shared/analytics-tool", () => ({
  conversationAnalytics: conversationAnalyticsMock,
}));

import { GET } from "./route";

function makeRequest(path: string) {
  return createRouteRequest(path, "GET");
}

describe("GET /api/admin/routing-review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue(
      createAdminSessionUser({ id: "usr_admin", email: "admin@example.com", name: "System Admin" }),
    );
    conversationAnalyticsMock.mockResolvedValue({
      metric: "routing_review",
      summary: {
        recently_changed_count: 1,
        uncertain_count: 2,
        follow_up_ready_count: 1,
      },
      recently_changed: [],
      uncertain_conversations: [],
      follow_up_ready: [],
    });
  });

  it("returns the routing review queue for admins", async () => {
    const response = await GET(makeRequest("/api/admin/routing-review?timeRange=all&limit=12"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getDbMock).toHaveBeenCalled();
    expect(conversationAnalyticsMock).toHaveBeenCalledWith(
      { db: { mocked: true } },
      { metric: "routing_review", time_range: "all", limit: 12 },
    );
    expect(payload.metric).toBe("routing_review");
  });

  it("rejects non-admin callers", async () => {
    getSessionUserMock.mockResolvedValueOnce(
      createStaffSessionUser({ id: "usr_staff", email: "staff@example.com", name: "Staff User" }),
    );

    const response = await GET(makeRequest("/api/admin/routing-review"));

    expect(response.status).toBe(403);
    expect(conversationAnalyticsMock).not.toHaveBeenCalled();
  });

  it("rejects invalid time ranges", async () => {
    const response = await GET(makeRequest("/api/admin/routing-review?timeRange=90d"));

    expect(response.status).toBe(400);
    expect(conversationAnalyticsMock).not.toHaveBeenCalled();
  });

  it("rejects non-positive limits", async () => {
    const response = await GET(makeRequest("/api/admin/routing-review?limit=0"));

    expect(response.status).toBe(400);
    expect(conversationAnalyticsMock).not.toHaveBeenCalled();
  });

  it("uses the default time range when one is not provided", async () => {
    const response = await GET(makeRequest("/api/admin/routing-review"));

    expect(response.status).toBe(200);
    expect(conversationAnalyticsMock).toHaveBeenCalledWith(
      { db: { mocked: true } },
      { metric: "routing_review", time_range: "30d", limit: undefined },
    );
  });
});