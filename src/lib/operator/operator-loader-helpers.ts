import { getDb } from "@/lib/db";
import type { ConversationSummary } from "@/core/entities/conversation";
import type { User as SessionUser } from "@/core/entities/user";

import {
  assertSignedInUser,
  assertAdminUser,
  buildConversationHref,
  buildDealDetailHref,
  buildTrainingPathDetailHref,
  calculateAnonymousOpportunityScore,
  formatTrainingPathRecommendation,
  getCustomerWorkflowGroup,
  inferFrictionReason,
  inferTheme,
  type AnonymousOpportunitiesBlockData,
  type AnonymousOpportunity,
  type AnonymousOpportunityRow,
  type ConsultationRequestQueueBlockData,
  type ConsultationRequestQueueItem,
  type ConsultationRequestQueueRow,
  type CustomerContinuityDealRow,
  type CustomerContinuityTrainingPathRow,
  type CustomerWorkflowContinuityItem,
  type DealQueueBlockData,
  type DealQueueItem,
  type DealQueueRow,
  type FunnelRecommendation,
  type FunnelRecommendationsBlockData,
  type LeadQueueBlockData,
  type LeadQueueLead,
  type RecentConversationLink,
  type RecurringPainThemesBlockData,
  type RecurringPainTheme,
  type ThemeSummaryRow,
  type TrainingPathQueueBlockData,
  type TrainingPathQueueItem,
  type TrainingPathQueueRow,
} from "./operator-shared";

export function requireSignedInDb(user: Pick<SessionUser, "id" | "roles">) {
  assertSignedInUser(user);
  return getDb();
}

export function requireAdminDb(user: Pick<SessionUser, "id" | "roles">) {
  assertAdminUser(user);
  return getDb();
}

export function mapRecentConversationLink(conversation: RecentConversationLink): RecentConversationLink;
export function mapRecentConversationLink(conversation: ConversationSummary): RecentConversationLink;
export function mapRecentConversationLink(conversation: ConversationSummary): RecentConversationLink {
  return {
    ...conversation,
    href: buildConversationHref(conversation.id),
  };
}

export function mapCustomerContinuityDealRow(row: CustomerContinuityDealRow): CustomerWorkflowContinuityItem {
  return {
    kind: "deal",
    id: row.id,
    title: row.title,
    summary: row.problem_summary || row.organization_name || "Founder-approved deal follow-up is ready.",
    status: row.status,
    nextAction:
      row.next_action
      ?? (row.status === "estimate_ready"
        ? "Review the approved deal and respond when ready."
        : "Continue the approved deal follow-up in conversation."),
    group: getCustomerWorkflowGroup("deal", row.status),
    href: buildConversationHref(row.conversation_id),
    detailHref: buildDealDetailHref(row.id),
  };
}

export function mapCustomerContinuityTrainingPathRow(
  row: CustomerContinuityTrainingPathRow,
): CustomerWorkflowContinuityItem {
  const recommendationLabel = formatTrainingPathRecommendation(row.recommended_path);

  return {
    kind: "training_path",
    id: row.id,
    title: row.current_role_or_background || recommendationLabel,
    summary:
      row.customer_summary
      || row.primary_goal
      || `Founder approved ${recommendationLabel.toLowerCase()} as the next step.`,
    status: row.status,
    nextAction:
      row.next_action
      || "Review the approved recommendation and continue in conversation if you need clarification.",
    group: getCustomerWorkflowGroup("training_path", row.status),
    href: buildConversationHref(row.conversation_id),
    detailHref: buildTrainingPathDetailHref(row.id),
  };
}

export function sortCustomerWorkflowContinuityItems(
  items: CustomerWorkflowContinuityItem[],
): CustomerWorkflowContinuityItem[] {
  return [...items].sort((left, right) => {
    if (left.group !== right.group) {
      return left.group === "now" ? -1 : 1;
    }

    if (left.kind !== right.kind) {
      return left.kind === "deal" ? -1 : 1;
    }

    return left.title.localeCompare(right.title);
  });
}

export function mapConsultationRequestQueueRow(row: ConsultationRequestQueueRow): ConsultationRequestQueueItem {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    href: buildConversationHref(row.conversation_id),
    conversationTitle: row.conversation_title || "Untitled",
    lane: row.lane,
    status: row.status,
    requestSummary: row.request_summary,
    founderNote: row.founder_note,
    messageCount: row.message_count,
    createdAt: row.created_at,
  };
}

export function mapDealQueueRow(row: DealQueueRow): DealQueueItem {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    href: buildConversationHref(row.conversation_id),
    title: row.title,
    lane: row.lane,
    organizationName: row.organization_name,
    status: row.status,
    estimatedPrice: row.estimated_price,
    nextAction: row.next_action,
    customerResponseNote: row.customer_response_note,
    updatedAt: row.updated_at,
  };
}

export function mapTrainingPathQueueRow(row: TrainingPathQueueRow): TrainingPathQueueItem {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    href: buildConversationHref(row.conversation_id),
    currentRoleOrBackground: row.current_role_or_background,
    primaryGoal: row.primary_goal,
    technicalDepth: row.technical_depth,
    recommendedPath: row.recommended_path,
    apprenticeshipInterest: row.apprenticeship_interest,
    status: row.status,
    nextAction: row.next_action,
    updatedAt: row.updated_at,
  };
}

export function mapAnonymousOpportunityRow(row: AnonymousOpportunityRow): AnonymousOpportunity {
  return {
    conversationId: row.id,
    href: buildConversationHref(row.id),
    title: row.title || "Untitled",
    lane: row.lane,
    laneConfidence: Math.min(Math.max(row.lane_confidence ?? 0, 0), 1),
    messageCount: row.message_count,
    detectedNeedSummary: row.detected_need_summary,
    recommendedNextStep: row.recommended_next_step,
    updatedAt: row.updated_at,
    sessionSource: row.session_source,
    opportunityScore: calculateAnonymousOpportunityScore(row),
    likelyFrictionReason: inferFrictionReason(row),
  };
}

export function collectRecurringPainThemes(summaries: ThemeSummaryRow[]): RecurringPainTheme[] {
  const grouped = new Map<string, RecurringPainTheme>();

  for (const row of summaries) {
    const summaryText = row.summary_text.trim();

    if (!summaryText) {
      continue;
    }

    const theme = inferTheme(summaryText);
    const existing = grouped.get(theme.id);

    if (!existing) {
      grouped.set(theme.id, {
        id: theme.id,
        label: theme.label,
        occurrenceCount: 1,
        latestSeenAt: row.updated_at,
        exampleSummary: summaryText,
        sampleConversations: [
          {
            conversationId: row.conversation_id,
            href: buildConversationHref(row.conversation_id),
            title: row.conversation_title || "Untitled",
          },
        ],
      });
      continue;
    }

    existing.occurrenceCount += 1;
    if (row.updated_at > existing.latestSeenAt) {
      existing.latestSeenAt = row.updated_at;
      existing.exampleSummary = summaryText;
    }

    if (existing.sampleConversations.length < 3) {
      existing.sampleConversations.push({
        conversationId: row.conversation_id,
        href: buildConversationHref(row.conversation_id),
        title: row.conversation_title || "Untitled",
      });
    }
  }

  return [...grouped.values()]
    .filter((theme) => theme.occurrenceCount >= 2)
    .sort((left, right) => {
      if (right.occurrenceCount !== left.occurrenceCount) {
        return right.occurrenceCount - left.occurrenceCount;
      }

      return right.latestSeenAt.localeCompare(left.latestSeenAt);
    })
    .slice(0, 5);
}

export function buildLeadQueueData(
  summary: {
    submitted_lead_count: number;
    new_lead_count: number;
    contacted_lead_count: number;
    qualified_lead_count: number;
    deferred_lead_count: number;
  },
  leads: LeadQueueLead[],
): LeadQueueBlockData {
  return {
    summary: {
      submittedLeadCount: summary.submitted_lead_count,
      newLeadCount: summary.new_lead_count,
      contactedLeadCount: summary.contacted_lead_count,
      qualifiedLeadCount: summary.qualified_lead_count,
      deferredLeadCount: summary.deferred_lead_count,
    },
    leads,
    emptyReason:
      leads.length === 0
        ? "No submitted contact captures are waiting for founder follow-up right now."
        : null,
  };
}

export function buildConsultationRequestQueueData(
  requests: ConsultationRequestQueueItem[],
): ConsultationRequestQueueBlockData {
  return {
    summary: {
      pendingCount: requests.filter((request) => request.status === "pending").length,
      reviewedCount: requests.filter((request) => request.status === "reviewed").length,
    },
    requests,
    emptyReason:
      requests.length === 0
        ? "No pending or reviewed consultation requests are waiting for founder review."
        : null,
  };
}

export function buildDealQueueData(deals: DealQueueItem[]): DealQueueBlockData {
  return {
    summary: {
      draftCount: deals.filter((deal) => deal.status === "draft").length,
      qualifiedCount: deals.filter((deal) => deal.status === "qualified").length,
      agreedCount: deals.filter((deal) => deal.status === "agreed").length,
      declinedCount: deals.filter((deal) => deal.status === "declined").length,
    },
    deals,
    emptyReason: deals.length === 0 ? "No founder-managed deals are active right now." : null,
  };
}

export function buildTrainingPathQueueData(
  trainingPaths: TrainingPathQueueItem[],
): TrainingPathQueueBlockData {
  return {
    summary: {
      draftCount: trainingPaths.filter((item) => item.status === "draft").length,
      recommendedCount: trainingPaths.filter((item) => item.status === "recommended").length,
      apprenticeshipCandidateCount: trainingPaths.filter(
        (item) => item.recommendedPath === "apprenticeship_screening",
      ).length,
      followUpNowCount: trainingPaths.filter(
        (item) => item.status === "draft" || item.status === "screening_requested",
      ).length,
    },
    trainingPaths,
    emptyReason:
      trainingPaths.length === 0
        ? "No founder-managed training paths are active right now."
        : null,
  };
}

export function buildAnonymousOpportunitiesData(
  opportunities: AnonymousOpportunity[],
): AnonymousOpportunitiesBlockData {
  return {
    summary: {
      opportunityCount: opportunities.length,
      organizationCount: opportunities.filter((item) => item.lane === "organization").length,
      individualCount: opportunities.filter((item) => item.lane === "individual").length,
      developmentCount: opportunities.filter((item) => item.lane === "development").length,
    },
    opportunities,
    emptyReason:
      opportunities.length === 0
        ? "No high-intent anonymous conversations currently meet the founder review threshold."
        : null,
  };
}

export function buildRecurringPainThemesData(
  analyzedSummaryCount: number,
  themes: RecurringPainTheme[],
): RecurringPainThemesBlockData {
  return {
    summary: {
      analyzedSummaryCount,
      recurringThemeCount: themes.length,
    },
    themes,
    emptyReason:
      themes.length === 0
        ? "Recurring pain themes will appear once multiple conversations point to the same underlying need."
        : null,
  };
}

export function buildFunnelRecommendationsData(
  recommendations: FunnelRecommendation[],
  analyticsSummary: {
    anonymousDropOffCount: number;
    uncertainConversationCount: number;
    newLeadCount: number;
  },
): FunnelRecommendationsBlockData {
  return {
    summary: {
      recommendationCount: recommendations.length,
      anonymousDropOffCount: analyticsSummary.anonymousDropOffCount,
      uncertainConversationCount: analyticsSummary.uncertainConversationCount,
      newLeadCount: analyticsSummary.newLeadCount,
    },
    recommendations: recommendations.slice(0, 4),
    emptyReason:
      recommendations.length === 0
        ? "No urgent funnel adjustments stand out from the current admin signals."
        : null,
  };
}