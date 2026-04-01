import type { GraphRow } from "@/core/entities/rich-content";
import type { RoleName } from "@/core/entities/user";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import {
  loadOperatorFunnelRecommendations,
  loadOperatorLeadQueue,
  loadOperatorRecentConversations,
  loadOperatorRoutingReview,
} from "@/lib/operator/operator-signal-loaders";
import {
  ADMIN_REFERRAL_EXCEPTION_KINDS,
  createAdminReferralAnalyticsService,
  type AdminAffiliateOverviewData,
  type AdminReferralAnalyticsService,
} from "@/lib/referrals/admin-referral-analytics";
import type { AffiliateOverviewData, AffiliatePipelineData, ReferralAnalyticsService } from "@/lib/referrals/referral-analytics";
import { createReferralAnalyticsService } from "@/lib/referrals/referral-analytics";
import {
  resolveAnalyticsViewerContext,
  type AnalyticsViewerContext,
} from "@/lib/analytics/analytics-viewer-context";

export type AnalyticsAudience = "signed_in_self" | "affiliate_self" | "admin_global";
export type AnalyticsChannel = "tool" | "graph" | "both";

export type AnalyticsDatasetSourceType =
  | "analytics_funnel"
  | "lead_queue"
  | "routing_review"
  | "conversation_activity"
  | "affiliate_my_overview"
  | "affiliate_my_timeseries"
  | "affiliate_my_pipeline"
  | "affiliate_my_recent_activity"
  | "admin_affiliate_overview"
  | "admin_affiliate_leaderboard"
  | "admin_affiliate_pipeline"
  | "admin_referral_exceptions";

export const ANALYTICS_DATASET_SOURCE_TYPES: readonly AnalyticsDatasetSourceType[] = [
  "analytics_funnel",
  "lead_queue",
  "routing_review",
  "conversation_activity",
  "affiliate_my_overview",
  "affiliate_my_timeseries",
  "affiliate_my_pipeline",
  "affiliate_my_recent_activity",
  "admin_affiliate_overview",
  "admin_affiliate_leaderboard",
  "admin_affiliate_pipeline",
  "admin_referral_exceptions",
] as const;

export const ANALYTICS_GRAPH_SOURCE_TYPES: readonly AnalyticsDatasetSourceType[] = [
  "analytics_funnel",
  "lead_queue",
  "routing_review",
  "conversation_activity",
  "affiliate_my_overview",
  "affiliate_my_timeseries",
  "affiliate_my_pipeline",
  "affiliate_my_recent_activity",
  "admin_affiliate_overview",
  "admin_affiliate_leaderboard",
  "admin_affiliate_pipeline",
  "admin_referral_exceptions",
] as const;

export interface AnalyticsDatasetResult {
  rows: GraphRow[];
  summary?: Record<string, unknown>;
  source: {
    sourceType: AnalyticsDatasetSourceType;
    label: string;
    rowCount: number;
    scope: "self" | "global";
    audience: AnalyticsAudience;
    provenance: string[];
  };
}

type AnalyticsDatasetDefinition = {
  sourceType: AnalyticsDatasetSourceType;
  label: string;
  audience: AnalyticsAudience;
  channels: readonly AnalyticsChannel[];
  resolve: (
    params: Record<string, unknown>,
    viewer: AnalyticsViewerContext,
    deps: AnalyticsDatasetDeps,
  ) => Promise<AnalyticsDatasetResult>;
};

type AnalyticsDatasetDeps = {
  getReferralAnalyticsService: () => ReferralAnalyticsService;
  getAdminReferralAnalyticsService: () => AdminReferralAnalyticsService;
  viewerContextResolver: (context?: ToolExecutionContext) => Promise<AnalyticsViewerContext>;
  operatorLoaders: {
    loadOperatorFunnelRecommendations: typeof loadOperatorFunnelRecommendations;
    loadOperatorLeadQueue: typeof loadOperatorLeadQueue;
    loadOperatorRecentConversations: typeof loadOperatorRecentConversations;
    loadOperatorRoutingReview: typeof loadOperatorRoutingReview;
  };
};

function toLoaderUser(viewer: AnalyticsViewerContext) {
  return {
    id: viewer.userId,
    roles: [viewer.role],
  };
}

function toSummaryRows(summary: Record<string, unknown>, labelMap?: Record<string, string>): GraphRow[] {
  return Object.entries(summary).map(([metric, value]) => ({
    metric,
    label: labelMap?.[metric] ?? metric.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " "),
    value: typeof value === "number" ? value : Number(value ?? 0),
  }));
}

function canResolveAudience(audience: AnalyticsAudience, viewer: AnalyticsViewerContext): boolean {
  switch (audience) {
    case "signed_in_self":
      return viewer.role !== "ANONYMOUS";
    case "affiliate_self":
      return viewer.role !== "ANONYMOUS" && viewer.affiliateEnabled;
    case "admin_global":
      return viewer.role === "ADMIN";
  }
}

function supportsChannel(channels: readonly AnalyticsChannel[], channel: "tool" | "graph"): boolean {
  return channels.includes(channel) || channels.includes("both");
}

function overviewToRows(summary: AffiliateOverviewData): GraphRow[] {
  return [
    { metric: "introductions", label: "Introductions", value: summary.introductions },
    { metric: "started_chats", label: "Started chats", value: summary.startedChats },
    { metric: "registered", label: "Registered", value: summary.registered },
    { metric: "qualified_opportunities", label: "Qualified opportunities", value: summary.qualifiedOpportunities },
    { metric: "tracked_credit", label: "Tracked credit", value: summary.creditStatusCounts.tracked },
    { metric: "pending_review", label: "Pending review", value: summary.creditStatusCounts.pending_review },
    { metric: "approved", label: "Approved", value: summary.creditStatusCounts.approved },
    { metric: "paid", label: "Paid", value: summary.creditStatusCounts.paid },
    { metric: "void", label: "Void", value: summary.creditStatusCounts.void },
  ];
}

function pipelineToRows(summary: AffiliatePipelineData): GraphRow[] {
  return summary.stages.map((stage) => ({
    stage: stage.stage,
    label: stage.label,
    count: stage.count,
    conversionRate: stage.conversionRate,
  }));
}

function adminOverviewToRows(summary: AdminAffiliateOverviewData): GraphRow[] {
  return [
    { metric: "affiliates_enabled", label: "Enabled affiliates", value: summary.affiliatesEnabled },
    { metric: "active_affiliates", label: "Active affiliates", value: summary.activeAffiliates },
    { metric: "introductions", label: "Introductions", value: summary.introductions },
    { metric: "started_chats", label: "Started chats", value: summary.startedChats },
    { metric: "registered", label: "Registered", value: summary.registered },
    { metric: "qualified_opportunities", label: "Qualified opportunities", value: summary.qualifiedOpportunities },
    { metric: "credit_pending_review", label: "Pending review", value: summary.creditPendingReview },
    { metric: "approved_credits", label: "Approved credits", value: summary.approvedCredits },
    { metric: "paid_credits", label: "Paid credits", value: summary.paidCredits },
    { metric: "exceptions", label: "Exceptions", value: summary.exceptions },
  ];
}

function adminOverviewToSummary(summary: AdminAffiliateOverviewData): Record<string, unknown> {
  return {
    affiliatesEnabled: summary.affiliatesEnabled,
    activeAffiliates: summary.activeAffiliates,
    introductions: summary.introductions,
    startedChats: summary.startedChats,
    registered: summary.registered,
    qualifiedOpportunities: summary.qualifiedOpportunities,
    creditPendingReview: summary.creditPendingReview,
    approvedCredits: summary.approvedCredits,
    paidCredits: summary.paidCredits,
    exceptions: summary.exceptions,
    narrative: summary.narrative,
  };
}

function createDatasetDefinitions(): Record<AnalyticsDatasetSourceType, AnalyticsDatasetDefinition> {
  return {
    analytics_funnel: {
      sourceType: "analytics_funnel",
      label: "Analytics funnel",
      audience: "admin_global",
      channels: ["graph"],
      async resolve(_params, viewer, deps) {
        const payload = await deps.operatorLoaders.loadOperatorFunnelRecommendations(toLoaderUser(viewer));
        const rows = toSummaryRows(payload.data.summary as Record<string, unknown>, {
          recommendationCount: "Recommendations",
          anonymousDropOffCount: "Anonymous drop-off",
          uncertainConversationCount: "Uncertain conversations",
          newLeadCount: "New leads",
        });

        return {
          rows,
          source: {
            sourceType: "analytics_funnel",
            label: "Analytics funnel",
            rowCount: rows.length,
            scope: "global",
            audience: "admin_global",
            provenance: ["operator_signal_loaders.loadOperatorFunnelRecommendations"],
          },
        };
      },
    },
    lead_queue: {
      sourceType: "lead_queue",
      label: "Lead queue summary",
      audience: "admin_global",
      channels: ["graph"],
      async resolve(_params, viewer, deps) {
        const payload = await deps.operatorLoaders.loadOperatorLeadQueue(toLoaderUser(viewer));
        const rows = [
          { stage: "Submitted", count: payload.data.summary.submittedLeadCount },
          { stage: "New", count: payload.data.summary.newLeadCount },
          { stage: "Contacted", count: payload.data.summary.contactedLeadCount },
          { stage: "Qualified", count: payload.data.summary.qualifiedLeadCount },
          { stage: "Deferred", count: payload.data.summary.deferredLeadCount },
        ];

        return {
          rows,
          source: {
            sourceType: "lead_queue",
            label: "Lead queue summary",
            rowCount: rows.length,
            scope: "global",
            audience: "admin_global",
            provenance: ["operator_signal_loaders.loadOperatorLeadQueue"],
          },
        };
      },
    },
    routing_review: {
      sourceType: "routing_review",
      label: "Routing review summary",
      audience: "admin_global",
      channels: ["graph"],
      async resolve(_params, viewer, deps) {
        const payload = await deps.operatorLoaders.loadOperatorRoutingReview(toLoaderUser(viewer));
        const rows = [
          { bucket: "Recently changed", count: payload.data.summary.recentlyChangedCount },
          { bucket: "Uncertain", count: payload.data.summary.uncertainCount },
          { bucket: "Follow-up ready", count: payload.data.summary.followUpReadyCount },
        ];

        return {
          rows,
          source: {
            sourceType: "routing_review",
            label: "Routing review summary",
            rowCount: rows.length,
            scope: "global",
            audience: "admin_global",
            provenance: ["operator_signal_loaders.loadOperatorRoutingReview"],
          },
        };
      },
    },
    conversation_activity: {
      sourceType: "conversation_activity",
      label: "Conversation activity",
      audience: "signed_in_self",
      channels: ["graph"],
      async resolve(_params, viewer, deps) {
        const payload = await deps.operatorLoaders.loadOperatorRecentConversations(toLoaderUser(viewer));
        const rows = payload.data.conversations.map((conversation) => ({
          conversationId: conversation.id,
          title: conversation.title,
          messageCount: conversation.messageCount,
          updatedAt: conversation.updatedAt,
        }));

        return {
          rows,
          source: {
            sourceType: "conversation_activity",
            label: "Conversation activity",
            rowCount: rows.length,
            scope: "self",
            audience: "signed_in_self",
            provenance: ["operator_signal_loaders.loadOperatorRecentConversations"],
          },
        };
      },
    },
    affiliate_my_overview: {
      sourceType: "affiliate_my_overview",
      label: "My affiliate overview",
      audience: "affiliate_self",
      channels: ["both"],
      async resolve(_params, viewer, deps) {
        const summary = await deps.getReferralAnalyticsService().getOverview(viewer.userId);
        const rows = overviewToRows(summary);

        return {
          rows,
          summary: {
            introductions: summary.introductions,
            startedChats: summary.startedChats,
            registered: summary.registered,
            qualifiedOpportunities: summary.qualifiedOpportunities,
            creditStatusLabel: summary.creditStatusLabel,
            creditStatusCounts: summary.creditStatusCounts,
            narrative: summary.narrative,
          },
          source: {
            sourceType: "affiliate_my_overview",
            label: "My affiliate overview",
            rowCount: rows.length,
            scope: "self",
            audience: "affiliate_self",
            provenance: ["referral_analytics.getOverview"],
          },
        };
      },
    },
    affiliate_my_timeseries: {
      sourceType: "affiliate_my_timeseries",
      label: "My referral timeseries",
      audience: "affiliate_self",
      channels: ["graph"],
      async resolve(_params, viewer, deps) {
        const rows = (await deps.getReferralAnalyticsService().getTimeseries(viewer.userId)).map((point) => ({
          date: point.date,
          introductions: point.introductions,
          startedChats: point.startedChats,
          registered: point.registered,
          qualifiedOpportunities: point.qualifiedOpportunities,
        }));

        return {
          rows,
          source: {
            sourceType: "affiliate_my_timeseries",
            label: "My referral timeseries",
            rowCount: rows.length,
            scope: "self",
            audience: "affiliate_self",
            provenance: ["referral_analytics.getTimeseries"],
          },
        };
      },
    },
    affiliate_my_pipeline: {
      sourceType: "affiliate_my_pipeline",
      label: "My referral pipeline",
      audience: "affiliate_self",
      channels: ["both"],
      async resolve(_params, viewer, deps) {
        const summary = await deps.getReferralAnalyticsService().getPipeline(viewer.userId);
        const rows = pipelineToRows(summary);

        return {
          rows,
          summary: {
            outcomes: summary.outcomes,
          },
          source: {
            sourceType: "affiliate_my_pipeline",
            label: "My referral pipeline",
            rowCount: rows.length,
            scope: "self",
            audience: "affiliate_self",
            provenance: ["referral_analytics.getPipeline"],
          },
        };
      },
    },
    affiliate_my_recent_activity: {
      sourceType: "affiliate_my_recent_activity",
      label: "My recent referral activity",
      audience: "affiliate_self",
      channels: ["both"],
      async resolve(params, viewer, deps) {
        const limit = typeof params.limit === "number" && Number.isFinite(params.limit)
          ? Math.max(1, Math.min(50, Math.floor(params.limit)))
          : 12;
        const rows = (await deps.getReferralAnalyticsService().getRecentActivity(viewer.userId, limit)).map((item) => ({
          id: item.id,
          referralId: item.referralId,
          referralCode: item.referralCode,
          milestone: item.milestone,
          title: item.title,
          description: item.description,
          occurredAt: item.occurredAt,
          href: item.href,
        }));

        return {
          rows,
          source: {
            sourceType: "affiliate_my_recent_activity",
            label: "My recent referral activity",
            rowCount: rows.length,
            scope: "self",
            audience: "affiliate_self",
            provenance: ["referral_analytics.getRecentActivity"],
          },
        };
      },
    },
    admin_affiliate_overview: {
      sourceType: "admin_affiliate_overview",
      label: "Admin affiliate overview",
      audience: "admin_global",
      channels: ["both"],
      async resolve(_params, _viewer, deps) {
        const summary = await deps.getAdminReferralAnalyticsService().getOverview();
        const rows = adminOverviewToRows(summary);

        return {
          rows,
          summary: adminOverviewToSummary(summary),
          source: {
            sourceType: "admin_affiliate_overview",
            label: "Admin affiliate overview",
            rowCount: rows.length,
            scope: "global",
            audience: "admin_global",
            provenance: ["admin_referral_analytics.getOverview"],
          },
        };
      },
    },
    admin_affiliate_leaderboard: {
      sourceType: "admin_affiliate_leaderboard",
      label: "Admin affiliate leaderboard",
      audience: "admin_global",
      channels: ["both"],
      async resolve(params, _viewer, deps) {
        const limit = typeof params.limit === "number" && Number.isFinite(params.limit)
          ? Math.max(1, Math.min(50, Math.floor(params.limit)))
          : 10;
        const leaderboard = await deps.getAdminReferralAnalyticsService().getLeaderboard({ limit });
        const rows = leaderboard.items.map((entry) => ({
          userId: entry.userId,
          name: entry.name,
          referralCode: entry.referralCode,
          introductions: entry.introductions,
          startedChats: entry.startedChats,
          registered: entry.registered,
          qualifiedOpportunities: entry.qualifiedOpportunities,
          pendingReview: entry.pendingReview,
          approved: entry.approved,
          paid: entry.paid,
          detailHref: entry.detailHref,
        }));

        return {
          rows,
          summary: { total: leaderboard.total },
          source: {
            sourceType: "admin_affiliate_leaderboard",
            label: "Admin affiliate leaderboard",
            rowCount: rows.length,
            scope: "global",
            audience: "admin_global",
            provenance: ["admin_referral_analytics.getLeaderboard"],
          },
        };
      },
    },
    admin_affiliate_pipeline: {
      sourceType: "admin_affiliate_pipeline",
      label: "Admin affiliate pipeline",
      audience: "admin_global",
      channels: ["graph"],
      async resolve(_params, _viewer, deps) {
        const summary = await deps.getAdminReferralAnalyticsService().getPipeline();
        const rows = pipelineToRows(summary);

        return {
          rows,
          summary: {
            outcomes: summary.outcomes,
          },
          source: {
            sourceType: "admin_affiliate_pipeline",
            label: "Admin affiliate pipeline",
            rowCount: rows.length,
            scope: "global",
            audience: "admin_global",
            provenance: ["admin_referral_analytics.getPipeline"],
          },
        };
      },
    },
    admin_referral_exceptions: {
      sourceType: "admin_referral_exceptions",
      label: "Admin referral exceptions",
      audience: "admin_global",
      channels: ["both"],
      async resolve(params, _viewer, deps) {
        const limit = typeof params.limit === "number" && Number.isFinite(params.limit)
          ? Math.max(1, Math.min(50, Math.floor(params.limit)))
          : 20;
        const kind = typeof params.kind === "string" && ADMIN_REFERRAL_EXCEPTION_KINDS.includes(params.kind as typeof ADMIN_REFERRAL_EXCEPTION_KINDS[number])
          ? params.kind as typeof ADMIN_REFERRAL_EXCEPTION_KINDS[number]
          : "all";
        const exceptions = await deps.getAdminReferralAnalyticsService().getExceptions({ kind, limit });
        const rows = exceptions.items.map((item) => ({
          id: item.id,
          kind: item.kind,
          title: item.title,
          description: item.description,
          occurredAt: item.occurredAt,
          href: item.href,
          referralId: item.referralId,
          referralCode: item.referralCode,
          conversationId: item.conversationId,
          userId: item.userId,
          creditStatus: item.creditStatus,
        }));

        return {
          rows,
          summary: {
            total: exceptions.total,
            counts: exceptions.counts,
          },
          source: {
            sourceType: "admin_referral_exceptions",
            label: "Admin referral exceptions",
            rowCount: rows.length,
            scope: "global",
            audience: "admin_global",
            provenance: ["admin_referral_analytics.getExceptions"],
          },
        };
      },
    },
  };
}

const DEFAULT_DATASET_DEPS: AnalyticsDatasetDeps = {
  getReferralAnalyticsService: () => createReferralAnalyticsService(),
  getAdminReferralAnalyticsService: () => createAdminReferralAnalyticsService(),
  viewerContextResolver: resolveAnalyticsViewerContext,
  operatorLoaders: {
    loadOperatorFunnelRecommendations,
    loadOperatorLeadQueue,
    loadOperatorRecentConversations,
    loadOperatorRoutingReview,
  },
};

const DATASET_DEFINITIONS = createDatasetDefinitions();

export function listRegisteredAnalyticsSourceTypes(channel?: "tool" | "graph"): AnalyticsDatasetSourceType[] {
  return ANALYTICS_DATASET_SOURCE_TYPES.filter((sourceType) => {
    if (!channel) {
      return true;
    }

    return supportsChannel(DATASET_DEFINITIONS[sourceType].channels, channel);
  });
}

export async function resolveAnalyticsDataset(
  input: {
    sourceType: AnalyticsDatasetSourceType;
    params?: Record<string, string | number | boolean>;
  },
  context: ToolExecutionContext | undefined,
  channel: "tool" | "graph",
  deps: AnalyticsDatasetDeps = DEFAULT_DATASET_DEPS,
): Promise<AnalyticsDatasetResult> {
  const definition = DATASET_DEFINITIONS[input.sourceType];
  if (!definition) {
    throw new Error(`Unknown analytics dataset sourceType: ${input.sourceType}`);
  }

  if (!supportsChannel(definition.channels, channel)) {
    throw new Error(`Analytics dataset "${input.sourceType}" is not available for ${channel} resolution.`);
  }

  const viewer = await deps.viewerContextResolver(context);
  if (!canResolveAudience(definition.audience, viewer)) {
    throw new Error(`Analytics dataset "${input.sourceType}" is not available to the current viewer.`);
  }

  return definition.resolve(input.params ?? {}, viewer, deps);
}

export async function canResolveAnalyticsDataset(
  sourceType: AnalyticsDatasetSourceType,
  context: ToolExecutionContext | undefined,
  channel: "tool" | "graph",
  deps: AnalyticsDatasetDeps = DEFAULT_DATASET_DEPS,
): Promise<boolean> {
  const definition = DATASET_DEFINITIONS[sourceType];
  if (!definition || !supportsChannel(definition.channels, channel)) {
    return false;
  }

  const viewer = await deps.viewerContextResolver(context);
  return canResolveAudience(definition.audience, viewer);
}

export function pickPrimaryRole(roles: RoleName[]): RoleName {
  if (roles.includes("ADMIN")) {
    return "ADMIN";
  }
  if (roles.includes("STAFF")) {
    return "STAFF";
  }
  if (roles.includes("APPRENTICE")) {
    return "APPRENTICE";
  }
  if (roles.includes("AUTHENTICATED")) {
    return "AUTHENTICATED";
  }
  return "ANONYMOUS";
}