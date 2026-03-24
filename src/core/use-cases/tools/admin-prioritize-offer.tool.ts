import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolCommand } from "@/core/tool-registry/ToolCommand";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import type {
  OperatorAnonymousOpportunitiesData,
  OperatorFunnelRecommendationsData,
  OperatorLeadQueueData,
  OperatorSignalPayload,
} from "@/lib/operator/operator-signal-loaders";

interface AdminPrioritizeOfferInput {
  max_results?: number;
}

type AdminUser = { id: string; roles: ["ADMIN"] };
type FunnelLoader = (user: AdminUser) => Promise<OperatorSignalPayload<OperatorFunnelRecommendationsData>>;
type OpportunityLoader = (user: AdminUser) => Promise<OperatorSignalPayload<OperatorAnonymousOpportunitiesData>>;
type LeadLoader = (user: AdminUser) => Promise<OperatorSignalPayload<OperatorLeadQueueData>>;

class AdminPrioritizeOfferCommand implements ToolCommand<AdminPrioritizeOfferInput, Record<string, unknown>> {
  constructor(
    private readonly loadFunnelRecommendations: FunnelLoader,
    private readonly loadAnonymousOpportunities: OpportunityLoader,
    private readonly loadLeadQueue: LeadLoader,
  ) {}

  async execute(
    _input: AdminPrioritizeOfferInput,
    context?: ToolExecutionContext,
  ): Promise<Record<string, unknown>> {
    const userId = context?.userId;

    if (!userId) {
      return {
        summary: "Unable to prioritize an offer without admin user context.",
      };
    }

    const adminUser: AdminUser = { id: userId, roles: ["ADMIN"] };
    const [funnelPayload, anonymousPayload, leadPayload] = await Promise.all([
      this.loadFunnelRecommendations(adminUser),
      this.loadAnonymousOpportunities(adminUser),
      this.loadLeadQueue(adminUser),
    ]);

    const recommendation = funnelPayload.data.recommendations[0];
    if (recommendation) {
      return {
        summary: `Push this message first: ${recommendation.title}.`,
        bestOffer: {
          title: recommendation.title,
          whyNow: recommendation.rationale,
          nextStep: recommendation.suggestedAction,
          evidence: {
            recommendationCount: funnelPayload.data.summary.recommendationCount,
            anonymousDropOffCount: funnelPayload.data.summary.anonymousDropOffCount,
            uncertainConversationCount: funnelPayload.data.summary.uncertainConversationCount,
            newLeadCount: funnelPayload.data.summary.newLeadCount,
          },
        },
      };
    }

    const opportunity = anonymousPayload.data.opportunities[0];
    if (opportunity) {
      return {
        summary: `Lead with an offer for ${opportunity.lane} demand before this anonymous opportunity goes cold.`,
        bestOffer: {
          title: opportunity.lane === "organization"
            ? "Founder intake call"
            : opportunity.lane === "development"
              ? "Technical scoping call"
              : "Targeted advisory follow-up",
          whyNow: `${opportunity.title} carries an opportunity score of ${opportunity.opportunityScore} after ${opportunity.messageCount} messages.`,
          nextStep: opportunity.recommendedNextStep ?? "Offer a concrete next step before the anonymous session drops off.",
          evidence: {
            opportunityCount: anonymousPayload.data.summary.opportunityCount,
            organizationCount: anonymousPayload.data.summary.organizationCount,
            individualCount: anonymousPayload.data.summary.individualCount,
            developmentCount: anonymousPayload.data.summary.developmentCount,
          },
        },
      };
    }

    const lead = leadPayload.data.leads[0];
    if (lead) {
      return {
        summary: "Use direct founder follow-up as the offer because there is already captured demand waiting in the queue.",
        bestOffer: {
          title: `Direct founder follow-up for ${lead.organization ?? lead.name}`,
          whyNow: `${lead.priorityLabel} priority (${lead.priorityScore}) and ${lead.triageState} triage state indicate revenue is already in hand.`,
          nextStep: lead.recommendedNextAction ?? "Respond to the lead with a concrete founder next step.",
          evidence: {
            submittedLeadCount: leadPayload.data.summary.submittedLeadCount,
            newLeadCount: leadPayload.data.summary.newLeadCount,
          },
        },
      };
    }

    return {
      summary: "No urgent offer shift stands out from the current operator signals.",
      bestOffer: null,
    };
  }
}

export function createAdminPrioritizeOfferTool(
  loadFunnelRecommendations: FunnelLoader,
  loadAnonymousOpportunities: OpportunityLoader,
  loadLeadQueue: LeadLoader,
): ToolDescriptor<AdminPrioritizeOfferInput, Record<string, unknown>> {
  return {
    name: "admin_prioritize_offer",
    schema: {
      description:
        "Choose the single offer or message that should be pushed first based on current funnel, anonymous-demand, and lead-queue signals. Admin only.",
      input_schema: {
        type: "object",
        properties: {
          max_results: {
            type: "number",
            description: "Reserved for future use. Present for schema stability.",
          },
        },
      },
    },
    command: new AdminPrioritizeOfferCommand(
      loadFunnelRecommendations,
      loadAnonymousOpportunities,
      loadLeadQueue,
    ),
    roles: ["ADMIN"],
    category: "system",
  };
}