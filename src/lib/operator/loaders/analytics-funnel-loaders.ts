import type { User as SessionUser } from "@/core/entities/user";
import { conversationAnalytics } from "@/lib/capabilities/shared/analytics-tool";

import {
  getFunnelStageCount,
  getLeadQueueSummary,
  type OperatorBlockPayload,
  type DropOffAnalyticsResult,
  type FunnelAnalyticsResult,
  type FunnelRecommendation,
  type FunnelRecommendationsBlockData,
  type OverviewAnalyticsResult,
} from "../operator-shared";
import {
  buildFunnelRecommendationsData,
  requireAdminDb,
} from "../operator-loader-helpers";

export async function loadFunnelRecommendationsBlock(
  user: Pick<SessionUser, "id" | "roles">,
): Promise<OperatorBlockPayload<FunnelRecommendationsBlockData>> {
  const db = requireAdminDb(user);
  const overview = (await conversationAnalytics(
    { db },
    { metric: "overview", time_range: "30d" },
  )) as OverviewAnalyticsResult;
  const funnel = (await conversationAnalytics(
    { db },
    { metric: "funnel", time_range: "30d" },
  )) as FunnelAnalyticsResult;
  const dropOff = (await conversationAnalytics(
    { db },
    { metric: "drop_off", time_range: "30d" },
  )) as DropOffAnalyticsResult;
  const leadSummary = getLeadQueueSummary(db);
  const stageFivePlus = getFunnelStageCount(funnel, "five_plus_messages");
  const stageRegistration = getFunnelStageCount(funnel, "registration");
  const recommendations: FunnelRecommendation[] = [];

  if (stageFivePlus > stageRegistration) {
    recommendations.push({
      id: "anonymous-conversion-gap",
      severity: stageFivePlus - stageRegistration >= 3 ? "high" : "medium",
      title: "High-intent anonymous conversations are not converting",
      rationale: `${stageFivePlus} anonymous conversations reached 5+ messages, but only ${stageRegistration} converted in the last 30 days.`,
      suggestedAction: "Tighten contact capture or registration prompts earlier in high-confidence anonymous conversations.",
    });
  }

  if (dropOff.anonymous.length > 0) {
    recommendations.push({
      id: "anonymous-dropoff-follow-up",
      severity: dropOff.anonymous.length >= 3 ? "high" : "watch",
      title: "Anonymous drop-off is leaving opportunities behind",
      rationale: `${dropOff.anonymous.length} anonymous conversations have crossed the inactivity threshold in the current analytics window.`,
      suggestedAction: "Review the strongest anonymous opportunities and tune the ask that should appear before they abandon the funnel.",
    });
  }

  if (overview.uncertain_conversations > 0) {
    recommendations.push({
      id: "routing-clarity",
      severity: overview.uncertain_conversations >= 3 ? "medium" : "watch",
      title: "Routing ambiguity is still consuming founder attention",
      rationale: `${overview.uncertain_conversations} conversations remain uncertain in the current analytics window.`,
      suggestedAction: "Review routing prompts and examples so fewer conversations fall into the uncertain lane.",
    });
  }

  if (leadSummary.new_lead_count > 0) {
    recommendations.push({
      id: "lead-backlog",
      severity: leadSummary.new_lead_count >= 3 ? "high" : "medium",
      title: "New leads are waiting for founder response",
      rationale: `${leadSummary.new_lead_count} submitted leads are still in the new triage state.`,
      suggestedAction: "Clear the new-lead backlog so hot organizational demand does not stall after contact capture.",
    });
  }

  return {
    blockId: "funnel_recommendations",
    state: recommendations.length > 0 ? "ready" : "empty",
    data: buildFunnelRecommendationsData(recommendations, {
      anonymousDropOffCount: dropOff.anonymous.length,
      uncertainConversationCount: overview.uncertain_conversations,
      newLeadCount: leadSummary.new_lead_count,
    }),
  };
}