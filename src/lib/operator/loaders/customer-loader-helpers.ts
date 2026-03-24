import type { Conversation, ConversationSummary, Message } from "@/core/entities/conversation";

import type {
  ConversationWorkspaceBlockData,
  CustomerWorkflowContinuityBlockData,
  CustomerWorkflowContinuityItem,
  RecentConversationsBlockData,
} from "../operator-shared";
import { mapRecentConversationLink } from "../operator-loader-helpers";

export function buildConversationWorkspaceData(
  active: { conversation: Conversation; messages: Message[] } | null,
): ConversationWorkspaceBlockData {
  return {
    conversation: active?.conversation ?? null,
    resumeHref: "/",
  };
}

export function buildRecentConversationsData(
  conversations: ConversationSummary[],
): RecentConversationsBlockData {
  return {
    conversations: conversations.map(mapRecentConversationLink),
  };
}

export function buildCustomerWorkflowContinuityData(
  items: CustomerWorkflowContinuityItem[],
): CustomerWorkflowContinuityBlockData {
  return {
    summary: {
      nowCount: items.filter((item) => item.group === "now").length,
      nextCount: items.filter((item) => item.group === "next").length,
      approvedDealCount: items.filter((item) => item.kind === "deal").length,
      approvedTrainingPathCount: items.filter((item) => item.kind === "training_path").length,
    },
    items,
    emptyReason:
      items.length === 0
        ? "Founder-reviewed next steps will appear here once a deal or training recommendation is ready for you."
        : null,
  };
}