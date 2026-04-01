import { describe, expect, it, vi } from "vitest";

import {
  createGetAdminAffiliateSummaryTool,
  createGetMyAffiliateSummaryTool,
  createListAdminReferralExceptionsTool,
  createListMyReferralActivityTool,
} from "@/core/use-cases/tools/affiliate-analytics.tool";
import type { UserProfileViewModel } from "@/lib/profile/types";

function makeProfile(overrides: Partial<UserProfileViewModel> = {}): UserProfileViewModel {
  return {
    id: "usr_1",
    name: "Morgan Lee",
    email: "morgan@example.com",
    credential: "Enterprise AI practitioner",
    pushNotificationsEnabled: true,
    affiliateEnabled: true,
    referralCode: "mentor-42",
    referralUrl: "https://studioordo.com/r/mentor-42",
    qrCodeUrl: "/api/qr/mentor-42",
    roles: ["APPRENTICE"],
    ...overrides,
  };
}

describe("affiliate analytics tools", () => {
  it("returns affiliate summary data for enabled accounts", async () => {
    const profileService = { getProfile: vi.fn().mockResolvedValue(makeProfile()) };
    const analyticsService = {
      getOverview: vi.fn().mockResolvedValue({
        introductions: 5,
        startedChats: 3,
        registered: 2,
        qualifiedOpportunities: 1,
        creditStatusLabel: "1 pending review | 1 tracked",
        creditStatusCounts: { tracked: 1, pending_review: 1, approved: 0, paid: 0, void: 0 },
        narrative: "A referred opportunity is waiting for review.",
      }),
      getTimeseries: vi.fn(),
      getPipeline: vi.fn().mockResolvedValue({
        stages: [{ stage: "introductions", label: "Introductions", count: 5, conversionRate: 100 }],
        outcomes: [{ outcome: "lead_submitted", label: "Lead submitted", count: 1 }],
      }),
      getRecentActivity: vi.fn(),
      getNotificationFeed: vi.fn(),
    };
    const tool = createGetMyAffiliateSummaryTool(profileService, analyticsService);

    const result = await tool.command.execute({}, { role: "APPRENTICE", userId: "usr_1" });

    expect(profileService.getProfile).toHaveBeenCalledWith("usr_1");
    expect(result).toMatchObject({
      action: "get_my_affiliate_summary",
      summary: expect.objectContaining({ introductions: 5, qualified_opportunities: 1 }),
      pipeline: expect.objectContaining({
        stages: [{ stage: "introductions", label: "Introductions", count: 5, conversionRate: 100 }],
      }),
    });
  });

  it("returns recent referral activity for enabled accounts", async () => {
    const profileService = { getProfile: vi.fn().mockResolvedValue(makeProfile()) };
    const analyticsService = {
      getOverview: vi.fn(),
      getTimeseries: vi.fn(),
      getPipeline: vi.fn(),
      getRecentActivity: vi.fn().mockResolvedValue([
        {
          id: "refevt_1",
          referralId: "ref_1",
          referralCode: "mentor-42",
          milestone: "registered",
          title: "Registered account",
          description: "A referred visitor completed registration.",
          occurredAt: "2026-04-01T10:00:00.000Z",
          href: "/referrals",
        },
      ]),
      getNotificationFeed: vi.fn(),
    };
    const tool = createListMyReferralActivityTool(profileService, analyticsService);

    const result = await tool.command.execute({ limit: 5 }, { role: "AUTHENTICATED", userId: "usr_1" });

    expect(analyticsService.getRecentActivity).toHaveBeenCalledWith("usr_1", 5);
    expect(result).toMatchObject({
      action: "list_my_referral_activity",
      activities: [
        expect.objectContaining({
          referral_id: "ref_1",
          milestone: "registered",
        }),
      ],
    });
  });

  it("returns a truthful affiliate-disabled result", async () => {
    const profileService = {
      getProfile: vi.fn().mockResolvedValue(makeProfile({ affiliateEnabled: false, referralCode: null, referralUrl: null, qrCodeUrl: null })),
    };
    const analyticsService = {
      getOverview: vi.fn(),
      getTimeseries: vi.fn(),
      getPipeline: vi.fn(),
      getRecentActivity: vi.fn(),
      getNotificationFeed: vi.fn(),
    };
    const tool = createGetMyAffiliateSummaryTool(profileService, analyticsService);

    const result = await tool.command.execute({}, { role: "AUTHENTICATED", userId: "usr_1" });

    expect(result).toMatchObject({
      action: "get_my_affiliate_summary",
      affiliate_enabled: false,
      error: "Referral self-service is not enabled for this account yet.",
    });
    expect(analyticsService.getOverview).not.toHaveBeenCalled();
  });

  it("rejects anonymous access", async () => {
    const profileService = { getProfile: vi.fn() };
    const analyticsService = {
      getOverview: vi.fn(),
      getTimeseries: vi.fn(),
      getPipeline: vi.fn(),
      getRecentActivity: vi.fn(),
      getNotificationFeed: vi.fn(),
    };
    const tool = createListMyReferralActivityTool(profileService, analyticsService);

    const result = await tool.command.execute({}, { role: "ANONYMOUS", userId: "anon_1" });

    expect(result).toMatchObject({ error: expect.stringContaining("Authentication required") });
    expect(profileService.getProfile).not.toHaveBeenCalled();
  });

  it("returns the admin affiliate summary for admins", async () => {
    const analyticsService = {
      getOverview: vi.fn().mockResolvedValue({
        affiliatesEnabled: 4,
        activeAffiliates: 3,
        introductions: 8,
        startedChats: 6,
        registered: 5,
        qualifiedOpportunities: 3,
        creditPendingReview: 1,
        approvedCredits: 2,
        paidCredits: 1,
        exceptions: 2,
        narrative: "Three affiliates are active and two exceptions need review.",
      }),
      getLeaderboard: vi.fn().mockResolvedValue({
        total: 1,
        items: [
          {
            userId: "usr_affiliate",
            name: "Ada Lovelace",
            email: "ada@example.com",
            credential: "Founder",
            referralCode: "mentor-42",
            introductions: 4,
            startedChats: 3,
            registered: 2,
            qualifiedOpportunities: 2,
            pendingReview: 1,
            approved: 1,
            paid: 0,
            detailHref: "/admin/users/usr_affiliate",
          },
        ],
      }),
      getPipeline: vi.fn().mockResolvedValue({
        stages: [{ stage: "introductions", label: "Introductions", count: 8, conversionRate: 100 }],
        outcomes: [{ outcome: "lead_submitted", label: "Lead submitted", count: 3 }],
      }),
      getExceptions: vi.fn(),
      getNotificationFeed: vi.fn(),
      getPayoutExportRows: vi.fn(),
    };
    const tool = createGetAdminAffiliateSummaryTool(analyticsService);

    const result = await tool.command.execute({}, { role: "ADMIN", userId: "usr_admin" });

    expect(result).toMatchObject({
      action: "get_admin_affiliate_summary",
      overview: expect.objectContaining({ affiliates_enabled: 4, exceptions: 2 }),
      leaderboard: [expect.objectContaining({ user_id: "usr_affiliate", qualified_opportunities: 2 })],
    });
    expect(analyticsService.getOverview).toHaveBeenCalledTimes(1);
    expect(analyticsService.getLeaderboard).toHaveBeenCalledWith({ limit: 5 });
    expect(analyticsService.getPipeline).toHaveBeenCalledTimes(1);
  });

  it("returns admin referral exceptions for admins", async () => {
    const analyticsService = {
      getOverview: vi.fn(),
      getLeaderboard: vi.fn(),
      getPipeline: vi.fn(),
      getExceptions: vi.fn().mockResolvedValue({
        total: 1,
        counts: {
          invalid_referral_source: 0,
          missing_referral_join: 0,
          disabled_referral_code: 0,
          credit_review_backlog: 1,
        },
        items: [
          {
            id: "credit_review_backlog:ref_1",
            kind: "credit_review_backlog",
            title: "Credit pending review",
            description: "Referral mentor-42 is pending review.",
            occurredAt: "2026-04-10T10:00:00.000Z",
            href: "/admin/users/usr_affiliate",
            referralId: "ref_1",
            referralCode: "mentor-42",
            conversationId: "conv_1",
            userId: "usr_affiliate",
            creditStatus: "pending_review",
          },
        ],
      }),
      getNotificationFeed: vi.fn(),
      getPayoutExportRows: vi.fn(),
    };
    const tool = createListAdminReferralExceptionsTool(analyticsService);

    const result = await tool.command.execute(
      { kind: "credit_review_backlog", limit: 5 },
      { role: "ADMIN", userId: "usr_admin" },
    );

    expect(analyticsService.getExceptions).toHaveBeenCalledWith({ kind: "credit_review_backlog", limit: 5 });
    expect(result).toMatchObject({
      action: "list_admin_referral_exceptions",
      filters: { kind: "credit_review_backlog" },
      exceptions: [
        expect.objectContaining({
          id: "credit_review_backlog:ref_1",
          credit_status: "pending_review",
        }),
      ],
    });
  });

  it("rejects non-admin access to admin affiliate tools", async () => {
    const analyticsService = {
      getOverview: vi.fn(),
      getLeaderboard: vi.fn(),
      getPipeline: vi.fn(),
      getExceptions: vi.fn(),
      getNotificationFeed: vi.fn(),
      getPayoutExportRows: vi.fn(),
    };

    const summaryTool = createGetAdminAffiliateSummaryTool(analyticsService);
    const exceptionsTool = createListAdminReferralExceptionsTool(analyticsService);

    await expect(summaryTool.command.execute({}, { role: "AUTHENTICATED", userId: "usr_1" })).resolves.toMatchObject({
      error: expect.stringContaining("Administrator access is required"),
    });
    await expect(exceptionsTool.command.execute({}, { role: "STAFF", userId: "usr_staff" })).resolves.toMatchObject({
      error: expect.stringContaining("Administrator access is required"),
    });
  });
});