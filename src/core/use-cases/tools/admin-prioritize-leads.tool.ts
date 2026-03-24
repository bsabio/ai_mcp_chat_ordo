import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolCommand } from "@/core/tool-registry/ToolCommand";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import type {
  OperatorLeadQueueData,
  OperatorLeadQueueEntry,
  OperatorSignalPayload,
} from "@/lib/operator/operator-signal-loaders";

interface AdminPrioritizeLeadsInput {
  max_results?: number;
}

type LeadQueueLoader = (user: { id: string; roles: ["ADMIN"] }) => Promise<OperatorSignalPayload<OperatorLeadQueueData>>;

class AdminPrioritizeLeadsCommand implements ToolCommand<AdminPrioritizeLeadsInput, Record<string, unknown>> {
  constructor(private readonly loadQueue: LeadQueueLoader) {}

  async execute(
    input: AdminPrioritizeLeadsInput,
    context?: ToolExecutionContext,
  ): Promise<Record<string, unknown>> {
    const userId = context?.userId;

    if (!userId) {
      return {
        summary: "Unable to prioritize leads without admin user context.",
        leads: [],
      };
    }

    const payload = await this.loadQueue({ id: userId, roles: ["ADMIN"] });
    const maxResults = Math.min(Math.max(input.max_results ?? 3, 1), 5);
    const rankedLeads = payload.data.leads.slice(0, maxResults).map((lead, index) => ({
      rank: index + 1,
      leadId: lead.id,
      conversationId: lead.conversationId,
      href: lead.href,
      name: lead.name,
      organization: lead.organization,
      conversationTitle: lead.conversationTitle,
      priorityScore: lead.priorityScore,
      priorityLabel: lead.priorityLabel,
      whyNow: buildLeadWhyNow(lead),
      nextStep: lead.recommendedNextAction ?? "Review the conversation and decide the founder follow-up.",
      founderNote: lead.founderNote,
    }));

    if (rankedLeads.length === 0) {
      return {
        summary: payload.data.emptyReason ?? "No submitted leads need founder attention right now.",
        leads: [],
        totals: payload.data.summary,
      };
    }

    const topLead = rankedLeads[0];

    return {
      summary: `${payload.data.summary.submittedLeadCount} submitted leads are waiting. Start with ${topLead.name ?? topLead.organization ?? topLead.conversationTitle}.`,
      topLead,
      leads: rankedLeads,
      totals: payload.data.summary,
    };
  }
}

function buildLeadWhyNow(lead: OperatorLeadQueueEntry): string {
  const reasons = [
    `${lead.priorityLabel} priority (${lead.priorityScore})`,
    `lane ${lead.lane}`,
  ];

  if (typeof lead.laneConfidence === "number") {
    reasons.push(`${Math.round(lead.laneConfidence * 100)}% routing confidence`);
  }

  if (lead.triageState === "new") {
    reasons.push("has not received first founder response");
  } else {
    reasons.push(`triage state ${lead.triageState}`);
  }

  if (lead.founderNote) {
    reasons.push(`founder note: ${lead.founderNote}`);
  } else if (lead.problemSummary) {
    reasons.push(`problem: ${lead.problemSummary}`);
  }

  return reasons.join("; ");
}

export function createAdminPrioritizeLeadsTool(
  loadQueue: LeadQueueLoader,
): ToolDescriptor<AdminPrioritizeLeadsInput, Record<string, unknown>> {
  return {
    name: "admin_prioritize_leads",
    schema: {
      description:
        "Rank submitted leads that need founder attention and return the next revenue action. Admin only.",
      input_schema: {
        type: "object",
        properties: {
          max_results: {
            type: "number",
            description: "Optional number of ranked leads to return (1-5, default 3).",
          },
        },
      },
    },
    command: new AdminPrioritizeLeadsCommand(loadQueue),
    roles: ["ADMIN"],
    category: "system",
  };
}