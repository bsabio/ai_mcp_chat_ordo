import { describe, expect, it, vi } from "vitest";

import { createAdminPrioritizeLeadsTool } from "./admin-prioritize-leads.tool";

describe("createAdminPrioritizeLeadsTool", () => {
  it("returns ranked leads with a top recommendation", async () => {
    const tool = createAdminPrioritizeLeadsTool(
      vi.fn().mockResolvedValue({
        data: {
          summary: {
            submittedLeadCount: 2,
            newLeadCount: 1,
            contactedLeadCount: 1,
            qualifiedLeadCount: 0,
            deferredLeadCount: 0,
          },
          leads: [
            {
              id: "lead_1",
              conversationId: "conv_1",
              href: "/?conversationId=conv_1",
              conversationTitle: "Proposal advisory",
              lane: "organization",
              name: "Alex Rivera",
              email: "alex@example.com",
              organization: "Northwind Labs",
              roleOrTitle: "COO",
              trainingGoal: null,
              problemSummary: "Proposal turnaround is too slow.",
              recommendedNextAction: "Offer a founder intake call.",
              submittedAt: "2026-03-18T10:30:00.000Z",
              conversationUpdatedAt: "2026-03-18T10:35:00.000Z",
              laneConfidence: 0.92,
              priorityScore: 92,
              priorityLabel: "hot",
              triageState: "new",
              founderNote: "Confirm procurement timing.",
              lastContactedAt: null,
              triagedAt: null,
            },
            {
              id: "lead_2",
              conversationId: "conv_2",
              href: "/?conversationId=conv_2",
              conversationTitle: "Ops redesign",
              lane: "individual",
              name: "Morgan Lee",
              email: "morgan@example.com",
              organization: null,
              roleOrTitle: null,
              trainingGoal: null,
              problemSummary: "Needs clearer operating cadence.",
              recommendedNextAction: "Send a follow-up summary.",
              submittedAt: "2026-03-18T09:30:00.000Z",
              conversationUpdatedAt: "2026-03-18T09:35:00.000Z",
              laneConfidence: 0.76,
              priorityScore: 78,
              priorityLabel: "warm",
              triageState: "contacted",
              founderNote: null,
              lastContactedAt: "2026-03-18T11:15:00.000Z",
              triagedAt: null,
            },
          ],
          emptyReason: null,
        },
      }),
    );

    const result = await tool.command.execute(
      { max_results: 1 },
      { role: "ADMIN", userId: "usr_admin" },
    );

    expect(result).toMatchObject({
      summary: expect.stringContaining("Alex Rivera"),
      topLead: expect.objectContaining({
        leadId: "lead_1",
        priorityScore: 92,
      }),
    });
    expect(result.leads).toHaveLength(1);
  });

  it("returns empty guidance when no leads are waiting", async () => {
    const tool = createAdminPrioritizeLeadsTool(
      vi.fn().mockResolvedValue({
        data: {
          summary: {
            submittedLeadCount: 0,
            newLeadCount: 0,
            contactedLeadCount: 0,
            qualifiedLeadCount: 0,
            deferredLeadCount: 0,
          },
          leads: [],
          emptyReason: "No submitted leads need founder attention right now.",
        },
      }),
    );

    const result = await tool.command.execute(
      {},
      { role: "ADMIN", userId: "usr_admin" },
    );

    expect(result).toEqual({
      summary: "No submitted leads need founder attention right now.",
      leads: [],
      totals: {
        submittedLeadCount: 0,
        newLeadCount: 0,
        contactedLeadCount: 0,
        qualifiedLeadCount: 0,
        deferredLeadCount: 0,
      },
    });
  });
});