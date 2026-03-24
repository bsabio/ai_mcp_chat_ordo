import { describe, expect, it, vi } from "vitest";

import { createAdminPrioritizeOfferTool } from "./admin-prioritize-offer.tool";

describe("createAdminPrioritizeOfferTool", () => {
  it("returns the top funnel recommendation when available", async () => {
    const tool = createAdminPrioritizeOfferTool(
      vi.fn().mockResolvedValue({
        data: {
          summary: {
            recommendationCount: 1,
            anonymousDropOffCount: 2,
            uncertainConversationCount: 1,
            newLeadCount: 1,
          },
          recommendations: [
            {
              id: "anonymous-conversion-gap",
              severity: "high",
              title: "High-intent anonymous conversations are not converting",
              rationale: "4 anonymous conversations reached 5+ messages but only 1 converted.",
              suggestedAction: "Tighten the contact capture ask earlier.",
            },
          ],
          emptyReason: null,
        },
      }),
      vi.fn().mockResolvedValue({
        data: {
          summary: { opportunityCount: 0, organizationCount: 0, individualCount: 0, developmentCount: 0 },
          opportunities: [],
          emptyReason: null,
        },
      }),
      vi.fn().mockResolvedValue({
        data: {
          summary: { submittedLeadCount: 0, newLeadCount: 0, contactedLeadCount: 0, qualifiedLeadCount: 0, deferredLeadCount: 0 },
          leads: [],
          emptyReason: null,
        },
      }),
    );

    const result = await tool.command.execute({}, { role: "ADMIN", userId: "usr_admin" });

    expect(result).toMatchObject({
      summary: expect.stringContaining("Push this message first"),
      bestOffer: expect.objectContaining({
        title: "High-intent anonymous conversations are not converting",
        nextStep: "Tighten the contact capture ask earlier.",
      }),
    });
  });

  it("falls back to stable guidance when no signal stands out", async () => {
    const tool = createAdminPrioritizeOfferTool(
      vi.fn().mockResolvedValue({
        data: {
          summary: { recommendationCount: 0, anonymousDropOffCount: 0, uncertainConversationCount: 0, newLeadCount: 0 },
          recommendations: [],
          emptyReason: null,
        },
      }),
      vi.fn().mockResolvedValue({
        data: {
          summary: { opportunityCount: 0, organizationCount: 0, individualCount: 0, developmentCount: 0 },
          opportunities: [],
          emptyReason: null,
        },
      }),
      vi.fn().mockResolvedValue({
        data: {
          summary: { submittedLeadCount: 0, newLeadCount: 0, contactedLeadCount: 0, qualifiedLeadCount: 0, deferredLeadCount: 0 },
          leads: [],
          emptyReason: null,
        },
      }),
    );

    const result = await tool.command.execute({}, { role: "ADMIN", userId: "usr_admin" });

    expect(result).toEqual({
      summary: "No urgent offer shift stands out from the current operator signals.",
      bestOffer: null,
    });
  });

  it("uses development-specific offer framing for development demand", async () => {
    const tool = createAdminPrioritizeOfferTool(
      vi.fn().mockResolvedValue({
        data: {
          summary: {
            recommendationCount: 0,
            anonymousDropOffCount: 0,
            uncertainConversationCount: 0,
            newLeadCount: 0,
          },
          recommendations: [],
          emptyReason: null,
        },
      }),
      vi.fn().mockResolvedValue({
        data: {
          summary: { opportunityCount: 1, organizationCount: 0, individualCount: 0, developmentCount: 1 },
          opportunities: [
            {
              conversationId: "conv_dev_1",
              href: "/?conversationId=conv_dev_1",
              title: "Automation build request",
              lane: "development",
              laneConfidence: 0.84,
              messageCount: 6,
              detectedNeedSummary: "Wants Studio Ordo to implement an internal automation workflow.",
              recommendedNextStep: "Offer a technical scoping call.",
              updatedAt: "2026-03-19T09:00:00.000Z",
              sessionSource: "anonymous_cookie",
              opportunityScore: 85,
            },
          ],
          emptyReason: null,
        },
      }),
      vi.fn().mockResolvedValue({
        data: {
          summary: { submittedLeadCount: 0, newLeadCount: 0, contactedLeadCount: 0, qualifiedLeadCount: 0, deferredLeadCount: 0 },
          leads: [],
          emptyReason: null,
        },
      }),
    );

    const result = await tool.command.execute({}, { role: "ADMIN", userId: "usr_admin" });

    expect(result).toMatchObject({
      summary: expect.stringContaining("development demand"),
      bestOffer: expect.objectContaining({
        title: "Technical scoping call",
        evidence: expect.objectContaining({ developmentCount: 1 }),
      }),
    });
  });
});