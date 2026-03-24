import type { User as SessionUser } from "@/core/entities/user";

import {
  type AnonymousOpportunitiesBlockData,
  type AnonymousOpportunityRow,
  type OperatorBlockPayload,
} from "../operator-shared";
import {
  buildAnonymousOpportunitiesData,
  mapAnonymousOpportunityRow,
  requireAdminDb,
} from "../operator-loader-helpers";

export async function loadAnonymousOpportunitiesBlock(
  user: Pick<SessionUser, "id" | "roles">,
): Promise<OperatorBlockPayload<AnonymousOpportunitiesBlockData>> {
  const candidates = requireAdminDb(user)
    .prepare(
      `SELECT
         id,
         title,
         lane,
         lane_confidence,
         message_count,
         detected_need_summary,
         recommended_next_step,
         updated_at,
         session_source
       FROM conversations
       WHERE user_id LIKE 'anon_%'
         AND converted_from IS NULL
         AND lane IN ('organization', 'individual', 'development')
         AND COALESCE(lane_confidence, 0) >= 0.7
         AND message_count >= 3
       ORDER BY updated_at DESC
       LIMIT 25`,
    )
    .all() as AnonymousOpportunityRow[];

  const opportunities = candidates
    .map(mapAnonymousOpportunityRow)
    .sort((left, right) => {
      if (right.opportunityScore !== left.opportunityScore) {
        return right.opportunityScore - left.opportunityScore;
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    })
    .slice(0, 5);

  return {
    blockId: "anonymous_opportunities",
    state: opportunities.length > 0 ? "ready" : "empty",
    data: buildAnonymousOpportunitiesData(opportunities),
  };
}