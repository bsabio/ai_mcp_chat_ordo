import type { User as SessionUser } from "@/core/entities/user";
import { getDb } from "@/lib/db";
import { conversationAnalytics } from "@/lib/capabilities/shared/analytics-tool";

import {
  assertAdminUser,
  buildConversationHref,
  mapRoutingReviewConversation,
  type OperatorBlockPayload,
  type RoutingReviewAnalyticsResult,
  type RoutingReviewBlockData,
} from "../operator-shared";

export async function loadRoutingReviewBlock(
  user: Pick<SessionUser, "id" | "roles">,
): Promise<OperatorBlockPayload<RoutingReviewBlockData>> {
  assertAdminUser(user);

  const review = (await conversationAnalytics(
    // getDb() approved: operator raw SQL helpers — see data-access-canary.test.ts (Sprint 9)
    { db: getDb() },
    { metric: "routing_review", time_range: "30d", limit: 5 },
  )) as RoutingReviewAnalyticsResult;

  const data: RoutingReviewBlockData = {
    summary: {
      recentlyChangedCount: review.summary.recently_changed_count,
      uncertainCount: review.summary.uncertain_count,
      followUpReadyCount: review.summary.follow_up_ready_count,
    },
    recentlyChanged: review.recently_changed.map((conversation) => ({
      conversationId: conversation.conversation_id,
      href: buildConversationHref(conversation.conversation_id),
      title: conversation.title,
      userId: conversation.user_id,
      fromLane: conversation.from_lane,
      toLane: conversation.to_lane,
      laneConfidence: conversation.lane_confidence,
      recommendedNextStep: conversation.recommended_next_step,
      changedAt: conversation.changed_at,
    })),
    uncertainConversations: review.uncertain_conversations.map(mapRoutingReviewConversation),
    followUpReady: review.follow_up_ready.map(mapRoutingReviewConversation),
  };

  const hasReviewItems =
    data.recentlyChanged.length > 0
    || data.uncertainConversations.length > 0
    || data.followUpReady.length > 0;

  return {
    blockId: "routing_review",
    state: hasReviewItems ? "ready" : "empty",
    data,
  };
}