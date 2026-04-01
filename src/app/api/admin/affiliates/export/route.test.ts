import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionUserMock,
  getPayoutExportRowsMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  getPayoutExportRowsMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/referrals/admin-referral-analytics", () => ({
  createAdminReferralAnalyticsService: () => ({
    getPayoutExportRows: getPayoutExportRowsMock,
  }),
}));

import { GET } from "@/app/api/admin/affiliates/export/route";

describe("/api/admin/affiliates/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin callers", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "usr_member",
      email: "member@example.com",
      name: "Member",
      roles: ["AUTHENTICATED"],
    });

    const response = await GET(new Request("https://studioordo.test/api/admin/affiliates/export") as never);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: expect.stringContaining("restricted to administrators") });
    expect(getPayoutExportRowsMock).not.toHaveBeenCalled();
  });

  it("returns a payout-ready csv for admins", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "usr_admin",
      email: "admin@example.com",
      name: "Admin",
      roles: ["ADMIN"],
    });
    getPayoutExportRowsMock.mockResolvedValue([
      {
        referralId: "ref_1",
        referralCode: "mentor-42",
        referrerUserId: "usr_affiliate",
        referrerName: "Ada Lovelace",
        referrerEmail: "ada@example.com",
        referrerCredential: "Founder",
        referredUserId: "usr_member",
        conversationId: "conv_1",
        referralStatus: "deal",
        creditStatus: "approved",
        outcome: "deal_created",
        lastEventAt: "2026-04-10T10:00:00.000Z",
        createdAt: "2026-04-01T10:00:00.000Z",
      },
    ]);

    const response = await GET(new Request("https://studioordo.test/api/admin/affiliates/export") as never);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain("affiliate-payout-review.csv");
    expect(body).toContain("referral_id,referral_code,referrer_user_id");
    expect(body).toContain('"ref_1","mentor-42","usr_affiliate"');
  });
});