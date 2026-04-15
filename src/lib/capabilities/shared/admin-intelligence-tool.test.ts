import { describe, expect, it, vi } from "vitest";

import {
  adminPrioritizeLeads,
  adminPrioritizeOffer,
  adminTriageRoutingRisk,
  getAdminIntelligenceToolSchemas,
  type AdminIntelligenceToolDeps,
} from "./admin-intelligence-tool";

function createDeps(): AdminIntelligenceToolDeps {
  return {
    loadLeadQueue: vi.fn(async () => ({
      blockId: "lead_queue",
      state: "ready",
      generatedAt: "2026-04-13T00:00:00.000Z",
      data: {
        summary: { submittedLeadCount: 1, newLeadCount: 1 },
        emptyReason: null,
        leads: [
          {
            id: "lead_1",
            conversationId: "conv_1",
            href: "/admin/leads/lead_1",
            name: "Alex",
            organization: "Ordo Labs",
            conversationTitle: "Alex lead",
            priorityScore: 91,
            priorityLabel: "critical",
            recommendedNextAction: "Call today",
            founderNote: "High-intent buyer",
            problemSummary: "Needs executive advisory",
            lane: "organization",
            laneConfidence: 0.93,
            triageState: "new",
          },
        ],
      },
    })) as unknown as AdminIntelligenceToolDeps["loadLeadQueue"],
    loadFunnelRecommendations: vi.fn(async () => ({
      blockId: "funnel_recommendations",
      state: "ready",
      generatedAt: "2026-04-13T00:00:00.000Z",
      data: {
        summary: {
          recommendationCount: 1,
          anonymousDropOffCount: 2,
          uncertainConversationCount: 1,
          newLeadCount: 1,
        },
        recommendations: [
          {
            title: "Founder strategy call",
            rationale: "Highest conversion likelihood.",
            suggestedAction: "Offer a 30 minute strategy call.",
          },
        ],
      },
    })) as unknown as AdminIntelligenceToolDeps["loadFunnelRecommendations"],
    loadAnonymousOpportunities: vi.fn(async () => ({
      blockId: "anonymous_opportunities",
      state: "ready",
      generatedAt: "2026-04-13T00:00:00.000Z",
      data: {
        summary: {
          opportunityCount: 0,
          organizationCount: 0,
          individualCount: 0,
          developmentCount: 0,
        },
        opportunities: [],
      },
    })) as unknown as AdminIntelligenceToolDeps["loadAnonymousOpportunities"],
    loadRoutingReview: vi.fn(async () => ({
      blockId: "routing_review",
      state: "ready",
      generatedAt: "2026-04-13T00:00:00.000Z",
      data: {
        summary: { uncertainCount: 1, followUpReadyCount: 0, recentlyChangedCount: 0 },
        uncertainConversations: [
          {
            conversationId: "conv_2",
            href: "/admin/conversations/conv_2",
            title: "Routing review",
            lane: "organization",
            laneConfidence: 0.42,
            recommendedNextStep: "Confirm fit with founder.",
          },
        ],
        followUpReady: [],
        recentlyChanged: [],
      },
    })) as unknown as AdminIntelligenceToolDeps["loadRoutingReview"],
  };
}

describe("admin-intelligence-tool", () => {
  it("exports schemas for the admin intelligence tools", () => {
    expect(getAdminIntelligenceToolSchemas().map((tool) => tool.name)).toEqual([
      "admin_search",
      "admin_prioritize_leads",
      "admin_prioritize_offer",
      "admin_triage_routing_risk",
    ]);
  });

  it("executes lead prioritization with bridged admin context", async () => {
    const result = await adminPrioritizeLeads(createDeps(), {
      max_results: 1,
      __executionContext: { userId: "admin-1", role: "ADMIN" },
    });

    expect(result).toMatchObject({
      topLead: { leadId: "lead_1" },
    });
  });

  it("executes offer prioritization with bridged admin context", async () => {
    const result = await adminPrioritizeOffer(createDeps(), {
      __executionContext: { userId: "admin-1", role: "ADMIN" },
    });

    expect(result).toMatchObject({
      bestOffer: { title: "Founder strategy call" },
    });
  });

  it("executes routing risk triage with bridged admin context", async () => {
    const result = await adminTriageRoutingRisk(createDeps(), {
      max_results: 1,
      __executionContext: { userId: "admin-1", role: "ADMIN" },
    });

    expect(result).toMatchObject({
      immediateRisks: [
        expect.objectContaining({ conversationId: "conv_2" }),
      ],
    });
  });
});
