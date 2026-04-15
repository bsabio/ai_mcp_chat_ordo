import type { User as SessionUser } from "@/core/entities/user";
export {
  loadConsultationRequestQueueBlock,
  loadLeadQueueBlock,
  loadTrainingPathQueueBlock,
} from "@/lib/admin/leads/admin-leads-attention";
export { loadOverdueFollowUpsBlock } from "@/lib/admin/pipeline/admin-pipeline-attention";

import {
  type OperatorBlockPayload,
  type DealQueueBlockData,
  type DealQueueRow,
} from "../operator-shared";
import {
  buildDealQueueData,
  mapDealQueueRow,
  requireAdminDb,
} from "../operator-loader-helpers";

export async function loadDealQueueBlock(
  user: Pick<SessionUser, "id" | "roles">,
): Promise<OperatorBlockPayload<DealQueueBlockData>> {
  const rows = requireAdminDb(user)
    .prepare(
      `SELECT
         dr.id,
         dr.conversation_id,
         dr.title,
         dr.lane,
         dr.organization_name,
         dr.status,
         dr.estimated_price,
         dr.next_action,
         dr.customer_response_note,
         dr.updated_at
       FROM deal_records dr
       WHERE dr.status IN ('draft', 'qualified', 'agreed', 'declined')
       ORDER BY CASE dr.status
         WHEN 'draft' THEN 0
         WHEN 'qualified' THEN 1
         WHEN 'agreed' THEN 2
         ELSE 3
       END, dr.updated_at DESC
       LIMIT 25`,
    )
    .all() as DealQueueRow[];

  const deals = rows.map(mapDealQueueRow);

  return {
    blockId: "deal_queue",
    state: deals.length > 0 ? "ready" : "empty",
    data: buildDealQueueData(deals),
  };
}