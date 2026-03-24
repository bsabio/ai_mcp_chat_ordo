import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolCommand } from "@/core/tool-registry/ToolCommand";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import type {
  OperatorSignalPayload,
  OperatorRoutingReviewData,
} from "@/lib/operator/operator-signal-loaders";

interface AdminTriageRoutingRiskInput {
  max_results?: number;
}

type RoutingReviewLoader = (user: { id: string; roles: ["ADMIN"] }) => Promise<OperatorSignalPayload<OperatorRoutingReviewData>>;

class AdminTriageRoutingRiskCommand implements ToolCommand<AdminTriageRoutingRiskInput, Record<string, unknown>> {
  constructor(private readonly loadRoutingReview: RoutingReviewLoader) {}

  async execute(
    input: AdminTriageRoutingRiskInput,
    context?: ToolExecutionContext,
  ): Promise<Record<string, unknown>> {
    const userId = context?.userId;

    if (!userId) {
      return {
        summary: "Unable to triage routing risk without admin user context.",
        immediateRisks: [],
      };
    }

    const payload = await this.loadRoutingReview({ id: userId, roles: ["ADMIN"] });
    const maxResults = Math.min(Math.max(input.max_results ?? 3, 1), 5);

    const immediateRisks = [
      ...payload.data.uncertainConversations.map((conversation) => ({
        riskType: "uncertain" as const,
        conversationId: conversation.conversationId,
        href: conversation.href,
        title: conversation.title,
        whyNow: buildRiskWhyNow("uncertain", conversation.lane, conversation.laneConfidence),
        nextStep: conversation.recommendedNextStep ?? "Review the thread and confirm the correct service lane.",
      })),
      ...payload.data.followUpReady.map((conversation) => ({
        riskType: "follow_up_ready" as const,
        conversationId: conversation.conversationId,
        href: conversation.href,
        title: conversation.title,
        whyNow: buildRiskWhyNow("follow_up_ready", conversation.lane, conversation.laneConfidence),
        nextStep: conversation.recommendedNextStep ?? "Send the pending follow-up before the customer stalls.",
      })),
    ].slice(0, maxResults);

    const recentChanges = payload.data.recentlyChanged.slice(0, maxResults).map((conversation) => ({
      conversationId: conversation.conversationId,
      href: conversation.href,
      title: conversation.title,
      fromLane: conversation.fromLane,
      toLane: conversation.toLane,
      whyNow: `recently rerouted from ${conversation.fromLane} to ${conversation.toLane}`,
      nextStep: conversation.recommendedNextStep ?? "Confirm the updated routing still matches customer need.",
    }));

    if (immediateRisks.length === 0 && recentChanges.length === 0) {
      return {
        summary: "Routing is stable right now. No immediate customer-outcome risk is waiting for intervention.",
        immediateRisks: [],
        recentChanges: [],
        totals: payload.data.summary,
      };
    }

    return {
      summary: `${payload.data.summary.uncertainCount} uncertain and ${payload.data.summary.followUpReadyCount} follow-up-ready conversations need review. Handle the uncertain threads first, then send the queued follow-ups.`,
      immediateRisks,
      recentChanges,
      totals: payload.data.summary,
    };
  }
}

function buildRiskWhyNow(riskType: "uncertain" | "follow_up_ready", lane: string, confidence: number | null): string {
  const parts = [riskType === "uncertain" ? "lane confidence is too weak" : "follow-up timing is due", `lane ${lane}`];

  if (typeof confidence === "number") {
    parts.push(`${Math.round(confidence * 100)}% confidence`);
  }

  return parts.join("; ");
}

export function createAdminTriageRoutingRiskTool(
  loadRoutingReview: RoutingReviewLoader,
): ToolDescriptor<AdminTriageRoutingRiskInput, Record<string, unknown>> {
  return {
    name: "admin_triage_routing_risk",
    schema: {
      description:
        "Identify the conversations most likely to hurt customer outcome because of routing uncertainty or overdue follow-up. Admin only.",
      input_schema: {
        type: "object",
        properties: {
          max_results: {
            type: "number",
            description: "Optional number of risks to return (1-5, default 3).",
          },
        },
      },
    },
    command: new AdminTriageRoutingRiskCommand(loadRoutingReview),
    roles: ["ADMIN"],
    category: "system",
  };
}