import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  loadOperatorFunnelRecommendationsMock,
  loadOperatorLeadQueueMock,
  loadOperatorRecentConversationsMock,
  loadOperatorRoutingReviewMock,
  findProfileByIdMock,
  getOverviewMock,
  getTimeseriesMock,
  getPipelineMock,
  getRecentActivityMock,
  getNotificationFeedMock,
  getAdminOverviewMock,
  getAdminLeaderboardMock,
  getAdminPipelineMock,
  getAdminExceptionsMock,
} = vi.hoisted(() => ({
  loadOperatorFunnelRecommendationsMock: vi.fn(),
  loadOperatorLeadQueueMock: vi.fn(),
  loadOperatorRecentConversationsMock: vi.fn(),
  loadOperatorRoutingReviewMock: vi.fn(),
  findProfileByIdMock: vi.fn(),
  getOverviewMock: vi.fn(),
  getTimeseriesMock: vi.fn(),
  getPipelineMock: vi.fn(),
  getRecentActivityMock: vi.fn(),
  getNotificationFeedMock: vi.fn(),
  getAdminOverviewMock: vi.fn(),
  getAdminLeaderboardMock: vi.fn(),
  getAdminPipelineMock: vi.fn(),
  getAdminExceptionsMock: vi.fn(),
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getUserDataMapper: () => ({
    findProfileById: findProfileByIdMock,
  }),
}));

vi.mock("@/lib/operator/operator-signal-loaders", () => ({
  loadOperatorFunnelRecommendations: loadOperatorFunnelRecommendationsMock,
  loadOperatorLeadQueue: loadOperatorLeadQueueMock,
  loadOperatorRecentConversations: loadOperatorRecentConversationsMock,
  loadOperatorRoutingReview: loadOperatorRoutingReviewMock,
}));

vi.mock("@/lib/referrals/referral-analytics", () => ({
  createReferralAnalyticsService: () => ({
    getOverview: getOverviewMock,
    getTimeseries: getTimeseriesMock,
    getPipeline: getPipelineMock,
    getRecentActivity: getRecentActivityMock,
    getNotificationFeed: getNotificationFeedMock,
  }),
}));

vi.mock("@/lib/referrals/admin-referral-analytics", () => ({
  ADMIN_REFERRAL_EXCEPTION_KINDS: [
    "invalid_referral_source",
    "missing_referral_join",
    "disabled_referral_code",
    "credit_review_backlog",
  ],
  createAdminReferralAnalyticsService: () => ({
    getOverview: getAdminOverviewMock,
    getLeaderboard: getAdminLeaderboardMock,
    getPipeline: getAdminPipelineMock,
    getExceptions: getAdminExceptionsMock,
  }),
}));

import { resolveGraphDataSource } from "./graph-data-sources";

describe("resolveGraphDataSource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findProfileByIdMock.mockResolvedValue({ affiliateEnabled: false });
  });

  it("maps analytics funnel summary data into graph rows", async () => {
    loadOperatorFunnelRecommendationsMock.mockResolvedValue({
      data: {
        summary: {
          recommendationCount: 4,
          anonymousDropOffCount: 2,
          uncertainConversationCount: 3,
          newLeadCount: 1,
        },
      },
    });

    const result = await resolveGraphDataSource(
      { sourceType: "analytics_funnel" },
      { role: "ADMIN", userId: "usr_admin" },
    );

    expect(result.source.label).toBe("Analytics funnel");
    expect(result.rows).toContainEqual({ metric: "recommendationCount", label: "Recommendations", value: 4 });
  });

  it("maps recent conversations into activity rows", async () => {
    loadOperatorRecentConversationsMock.mockResolvedValue({
      data: {
        conversations: [
          { id: "conv_1", title: "Discovery", messageCount: 12, updatedAt: "2026-03-20T10:00:00.000Z" },
        ],
      },
    });

    const result = await resolveGraphDataSource(
      { sourceType: "conversation_activity" },
      { role: "STAFF", userId: "usr_staff" },
    );

    expect(result.source.label).toBe("Conversation activity");
    expect(result.rows).toEqual([
      {
        conversationId: "conv_1",
        title: "Discovery",
        messageCount: 12,
        updatedAt: "2026-03-20T10:00:00.000Z",
      },
    ]);
  });

  it("resolves affiliate overview rows for affiliate-enabled viewers", async () => {
    findProfileByIdMock.mockResolvedValue({ affiliateEnabled: true });
    getOverviewMock.mockResolvedValue({
      introductions: 4,
      startedChats: 3,
      registered: 2,
      qualifiedOpportunities: 1,
      creditStatusLabel: "1 pending review",
      creditStatusCounts: { tracked: 1, pending_review: 1, approved: 0, paid: 0, void: 0 },
      narrative: "A referred opportunity is waiting for review.",
    });

    const result = await resolveGraphDataSource(
      { sourceType: "affiliate_my_overview" },
      { role: "AUTHENTICATED", userId: "usr_affiliate" },
    );

    expect(result.source.label).toBe("My affiliate overview");
    expect(result.rows).toContainEqual({ metric: "introductions", label: "Introductions", value: 4 });
  });

  it("denies affiliate datasets to non-affiliate viewers", async () => {
    await expect(resolveGraphDataSource(
      { sourceType: "affiliate_my_recent_activity" },
      { role: "AUTHENTICATED", userId: "usr_member" },
    )).rejects.toThrow('Analytics dataset "affiliate_my_recent_activity" is not available to the current viewer.');

    expect(getRecentActivityMock).not.toHaveBeenCalled();
  });

  it("resolves admin affiliate datasets for admins only", async () => {
    getAdminOverviewMock.mockResolvedValue({
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
      narrative: "Healthy program with a small exception backlog.",
    });

    const result = await resolveGraphDataSource(
      { sourceType: "admin_affiliate_overview" },
      { role: "ADMIN", userId: "usr_admin" },
    );

    expect(result.source.label).toBe("Admin affiliate overview");
    expect(result.rows).toContainEqual({ metric: "exceptions", label: "Exceptions", value: 2 });

    await expect(resolveGraphDataSource(
      { sourceType: "admin_affiliate_overview" },
      { role: "AUTHENTICATED", userId: "usr_member" },
    )).rejects.toThrow('Analytics dataset "admin_affiliate_overview" is not available to the current viewer.');
  });
});
