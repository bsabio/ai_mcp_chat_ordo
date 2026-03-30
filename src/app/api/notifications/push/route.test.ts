import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, POST } from "@/app/api/notifications/push/route";
import {
  createAnonymousSessionUser,
  createAuthenticatedSessionUser,
  createRouteRequest,
} from "../../../../../tests/helpers/workflow-route-fixture";

const {
  getSessionUserMock,
  upsertMock,
  deleteByEndpointMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  upsertMock: vi.fn(),
  deleteByEndpointMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getPushSubscriptionRepository: () => ({
    upsert: upsertMock,
    deleteByEndpoint: deleteByEndpointMock,
  }),
}));

describe("/api/notifications/push", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for anonymous users", async () => {
    getSessionUserMock.mockResolvedValue(createAnonymousSessionUser());

    const response = await POST(
      createRouteRequest("/api/notifications/push", "POST", { subscription: {} }),
    );

    expect(response.status).toBe(401);
  });

  it("stores authenticated push subscriptions", async () => {
    getSessionUserMock.mockResolvedValue(createAuthenticatedSessionUser({ id: "usr_42" }));
    upsertMock.mockResolvedValue({ endpoint: "https://push.example/sub_1", userId: "usr_42" });

    const response = await POST(
      createRouteRequest("/api/notifications/push", "POST", {
        subscription: {
          endpoint: "https://push.example/sub_1",
          expirationTime: null,
          keys: {
            p256dh: "p256dh-key",
            auth: "auth-key",
          },
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledWith(expect.objectContaining({ userId: "usr_42" }));
    expect(payload.subscription.userId).toBe("usr_42");
  });

  it("removes subscriptions by endpoint", async () => {
    getSessionUserMock.mockResolvedValue(createAuthenticatedSessionUser({ id: "usr_42" }));

    const response = await DELETE(
      createRouteRequest("/api/notifications/push", "POST", {
        endpoint: "https://push.example/sub_1",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(deleteByEndpointMock).toHaveBeenCalledWith("https://push.example/sub_1");
    expect(payload.ok).toBe(true);
  });
});