import { describe, expect, it, vi } from "vitest";

import { createAdminTriageRoutingRiskTool } from "./admin-triage-routing-risk.tool";

describe("createAdminTriageRoutingRiskTool", () => {
  it("returns immediate routing risks and recent changes", async () => {
    const tool = createAdminTriageRoutingRiskTool(
      vi.fn().mockResolvedValue({
        data: {
          summary: {
            recentlyChangedCount: 1,
            uncertainCount: 1,
            followUpReadyCount: 1,
          },
          recentlyChanged: [
            {
              conversationId: "conv_changed",
              href: "/?conversationId=conv_changed",
              title: "Routing updated",
              userId: "usr_auth",
              fromLane: "uncertain",
              toLane: "organization",
              laneConfidence: 0.84,
              recommendedNextStep: "Offer discovery call",
              changedAt: "2026-03-18T10:00:00.000Z",
            },
          ],
          uncertainConversations: [
            {
              conversationId: "conv_uncertain",
              href: "/?conversationId=conv_uncertain",
              title: "Unclear routing",
              userId: "usr_auth",
              lane: "uncertain",
              laneConfidence: 0.52,
              recommendedNextStep: "Review the thread and confirm the lane.",
              updatedAt: "2026-03-18T10:00:00.000Z",
            },
          ],
          followUpReady: [
            {
              conversationId: "conv_followup",
              href: "/?conversationId=conv_followup",
              title: "Follow-up due",
              userId: "usr_auth",
              lane: "organization",
              laneConfidence: 0.87,
              recommendedNextStep: "Send the founder follow-up.",
              updatedAt: "2026-03-18T11:00:00.000Z",
            },
          ],
        },
      }),
    );

    const result = await tool.command.execute(
      { max_results: 2 },
      { role: "ADMIN", userId: "usr_admin" },
    );

    expect(result).toMatchObject({
      summary: expect.stringContaining("uncertain"),
      immediateRisks: [
        expect.objectContaining({
          riskType: "uncertain",
          conversationId: "conv_uncertain",
        }),
        expect.objectContaining({
          riskType: "follow_up_ready",
          conversationId: "conv_followup",
        }),
      ],
      recentChanges: [
        expect.objectContaining({
          conversationId: "conv_changed",
          fromLane: "uncertain",
          toLane: "organization",
        }),
      ],
    });
  });

  it("returns stable guidance when there is no routing risk", async () => {
    const tool = createAdminTriageRoutingRiskTool(
      vi.fn().mockResolvedValue({
        data: {
          summary: {
            recentlyChangedCount: 0,
            uncertainCount: 0,
            followUpReadyCount: 0,
          },
          recentlyChanged: [],
          uncertainConversations: [],
          followUpReady: [],
        },
      }),
    );

    const result = await tool.command.execute(
      {},
      { role: "ADMIN", userId: "usr_admin" },
    );

    expect(result).toEqual({
      summary: "Routing is stable right now. No immediate customer-outcome risk is waiting for intervention.",
      immediateRisks: [],
      recentChanges: [],
      totals: {
        recentlyChangedCount: 0,
        uncertainCount: 0,
        followUpReadyCount: 0,
      },
    });
  });
});