import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionUserMock,
  getNotificationFeedMock,
  getAdminNotificationFeedMock,
  getProfileMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  getNotificationFeedMock: vi.fn(),
  getAdminNotificationFeedMock: vi.fn(),
  getProfileMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/referrals/referral-analytics", () => ({
  createReferralAnalyticsService: () => ({
    getNotificationFeed: getNotificationFeedMock,
  }),
}));

vi.mock("@/lib/referrals/admin-referral-analytics", () => ({
  createAdminReferralAnalyticsService: () => ({
    getNotificationFeed: getAdminNotificationFeedMock,
  }),
}));

vi.mock("@/lib/profile/profile-service", () => ({
  createProfileService: () => ({
    getProfile: getProfileMock,
  }),
}));

import { GET } from "@/app/api/notifications/feed/route";

describe("/api/notifications/feed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for anonymous users", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "anon_1",
      email: "anon@example.com",
      name: "Anon",
      roles: ["ANONYMOUS"],
    });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getNotificationFeedMock).not.toHaveBeenCalled();
  });

  it("returns 403 when referral self-service is disabled", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "usr_disabled",
      email: "disabled@example.com",
      name: "Disabled",
      roles: ["AUTHENTICATED"],
    });
    getProfileMock.mockResolvedValue({ affiliateEnabled: false });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ code: "AFFILIATE_ACCESS_DISABLED" });
    expect(getNotificationFeedMock).not.toHaveBeenCalled();
  });

  it("returns referral milestone notifications for signed-in users", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "usr_1",
      email: "morgan@example.com",
      name: "Morgan",
      roles: ["AUTHENTICATED"],
    });
    getProfileMock.mockResolvedValue({ affiliateEnabled: true });
    getNotificationFeedMock.mockResolvedValue([
      {
        id: "notif_1",
        title: "Registered account",
        body: "A referred visitor completed registration.",
        href: "/referrals",
        scope: "user",
        unread: true,
        createdAt: "2026-04-01T10:00:00.000Z",
      },
    ]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getNotificationFeedMock).toHaveBeenCalledWith("usr_1", 20);
    expect(payload.notifications).toEqual([
      expect.objectContaining({
        id: "notif_1",
        title: "Registered account",
      }),
    ]);
  });

  it("returns admin exception notifications for administrators", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "usr_admin",
      email: "admin@example.com",
      name: "Admin",
      roles: ["ADMIN"],
    });
    getAdminNotificationFeedMock.mockResolvedValue([
      {
        id: "notif_credit_review_backlog:ref_1",
        title: "Credit pending review",
        body: "Referral mentor-42 is waiting for review.",
        href: "/admin/users/usr_affiliate",
        scope: "admin",
        unread: true,
        createdAt: "2026-04-10T10:00:00.000Z",
      },
    ]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getAdminNotificationFeedMock).toHaveBeenCalledWith(20);
    expect(getProfileMock).not.toHaveBeenCalled();
    expect(getNotificationFeedMock).not.toHaveBeenCalled();
    expect(payload.notifications).toEqual([
      expect.objectContaining({
        id: "notif_credit_review_backlog:ref_1",
        scope: "admin",
      }),
    ]);
  });
});