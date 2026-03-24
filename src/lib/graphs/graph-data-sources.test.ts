import { describe, expect, it, vi } from "vitest";

const {
  loadOperatorFunnelRecommendationsMock,
  loadOperatorLeadQueueMock,
  loadOperatorRecentConversationsMock,
  loadOperatorRoutingReviewMock,
} = vi.hoisted(() => ({
  loadOperatorFunnelRecommendationsMock: vi.fn(),
  loadOperatorLeadQueueMock: vi.fn(),
  loadOperatorRecentConversationsMock: vi.fn(),
  loadOperatorRoutingReviewMock: vi.fn(),
}));

vi.mock("@/lib/operator/operator-signal-loaders", () => ({
  loadOperatorFunnelRecommendations: loadOperatorFunnelRecommendationsMock,
  loadOperatorLeadQueue: loadOperatorLeadQueueMock,
  loadOperatorRecentConversations: loadOperatorRecentConversationsMock,
  loadOperatorRoutingReview: loadOperatorRoutingReviewMock,
}));

import { resolveGraphDataSource } from "./graph-data-sources";

describe("resolveGraphDataSource", () => {
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
});
