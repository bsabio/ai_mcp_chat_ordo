import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import type { GraphRow } from "@/core/entities/rich-content";
import {
  loadOperatorFunnelRecommendations,
  loadOperatorLeadQueue,
  loadOperatorRecentConversations,
  loadOperatorRoutingReview,
} from "@/lib/operator/operator-signal-loaders";

export type GraphSourceType =
  | "analytics_funnel"
  | "lead_queue"
  | "routing_review"
  | "conversation_activity";

export type GraphDataSourceInput = {
  sourceType: GraphSourceType;
  params?: Record<string, string | number | boolean>;
};

export type ResolvedGraphDataSource = {
  rows: GraphRow[];
  source: {
    sourceType: GraphSourceType;
    label: string;
    rowCount: number;
  };
};

function toLoaderUser(context: ToolExecutionContext) {
  return {
    id: context.userId,
    roles: [context.role],
  };
}

function toSummaryRows(summary: Record<string, unknown>, labelMap?: Record<string, string>): GraphRow[] {
  return Object.entries(summary).map(([metric, value]) => ({
    metric,
    label: labelMap?.[metric] ?? metric.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " "),
    value: typeof value === "number" ? value : Number(value ?? 0),
  }));
}

export async function resolveGraphDataSource(
  input: GraphDataSourceInput,
  context: ToolExecutionContext,
): Promise<ResolvedGraphDataSource> {
  switch (input.sourceType) {
    case "analytics_funnel": {
      const payload = await loadOperatorFunnelRecommendations(toLoaderUser(context));
      const rows = toSummaryRows(payload.data.summary as Record<string, unknown>, {
        recommendationCount: "Recommendations",
        anonymousDropOffCount: "Anonymous drop-off",
        uncertainConversationCount: "Uncertain conversations",
        newLeadCount: "New leads",
      });

      return {
        rows,
        source: {
          sourceType: input.sourceType,
          label: "Analytics funnel",
          rowCount: rows.length,
        },
      };
    }
    case "lead_queue": {
      const payload = await loadOperatorLeadQueue(toLoaderUser(context));
      const rows = [
        {
          stage: "Submitted",
          count: payload.data.summary.submittedLeadCount,
        },
        {
          stage: "New",
          count: payload.data.summary.newLeadCount,
        },
        {
          stage: "Contacted",
          count: payload.data.summary.contactedLeadCount,
        },
        {
          stage: "Qualified",
          count: payload.data.summary.qualifiedLeadCount,
        },
        {
          stage: "Deferred",
          count: payload.data.summary.deferredLeadCount,
        },
      ];

      return {
        rows,
        source: {
          sourceType: input.sourceType,
          label: "Lead queue summary",
          rowCount: rows.length,
        },
      };
    }
    case "routing_review": {
      const payload = await loadOperatorRoutingReview(toLoaderUser(context));
      const rows = [
        {
          bucket: "Recently changed",
          count: payload.data.summary.recentlyChangedCount,
        },
        {
          bucket: "Uncertain",
          count: payload.data.summary.uncertainCount,
        },
        {
          bucket: "Follow-up ready",
          count: payload.data.summary.followUpReadyCount,
        },
      ];

      return {
        rows,
        source: {
          sourceType: input.sourceType,
          label: "Routing review summary",
          rowCount: rows.length,
        },
      };
    }
    case "conversation_activity": {
      const payload = await loadOperatorRecentConversations(toLoaderUser(context));
      const rows = payload.data.conversations.map((conversation) => ({
        conversationId: conversation.id,
        title: conversation.title,
        messageCount: conversation.messageCount,
        updatedAt: conversation.updatedAt,
      }));

      return {
        rows,
        source: {
          sourceType: input.sourceType,
          label: "Conversation activity",
          rowCount: rows.length,
        },
      };
    }
  }
}