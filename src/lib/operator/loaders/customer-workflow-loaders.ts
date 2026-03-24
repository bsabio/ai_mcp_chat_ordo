import { isDealCustomerVisibleStatus } from "@/core/entities/deal-record";
import { isTrainingPathCustomerVisibleStatus } from "@/core/entities/training-path-record";
import type { User as SessionUser } from "@/core/entities/user";

import {
  assertSignedInUser,
  type CustomerContinuityDealRow,
  type CustomerContinuityTrainingPathRow,
  type CustomerWorkflowContinuityBlockData,
  type OperatorBlockPayload,
} from "../operator-shared";
import {
  mapCustomerContinuityDealRow,
  mapCustomerContinuityTrainingPathRow,
  requireSignedInDb,
  sortCustomerWorkflowContinuityItems,
} from "../operator-loader-helpers";
import { buildCustomerWorkflowContinuityData } from "./customer-loader-helpers";

export async function loadCustomerWorkflowContinuityBlock(
  user: Pick<SessionUser, "id" | "roles">,
): Promise<OperatorBlockPayload<CustomerWorkflowContinuityBlockData>> {
  assertSignedInUser(user);

  const db = requireSignedInDb(user);
  const dealRows = db
    .prepare(
      `SELECT
         dr.id,
         dr.conversation_id,
         dr.title,
         dr.problem_summary,
         dr.organization_name,
         dr.status,
         dr.next_action
       FROM deal_records dr
       WHERE dr.user_id = ?
       ORDER BY dr.updated_at DESC`,
    )
    .all(user.id) as CustomerContinuityDealRow[];

  const trainingPathRows = db
    .prepare(
      `SELECT
         tpr.id,
         tpr.conversation_id,
         tpr.current_role_or_background,
         tpr.primary_goal,
         tpr.recommended_path,
         tpr.customer_summary,
         tpr.status,
         tpr.next_action
       FROM training_path_records tpr
       WHERE tpr.user_id = ?
       ORDER BY tpr.updated_at DESC`,
    )
    .all(user.id) as CustomerContinuityTrainingPathRow[];

  const items = sortCustomerWorkflowContinuityItems([
    ...dealRows
      .filter((row) => isDealCustomerVisibleStatus(row.status))
      .map(mapCustomerContinuityDealRow),
    ...trainingPathRows
      .filter((row) => isTrainingPathCustomerVisibleStatus(row.status))
      .map(mapCustomerContinuityTrainingPathRow),
  ]);

  return {
    blockId: "customer_workflow_continuity",
    state: items.length > 0 ? "ready" : "empty",
    data: buildCustomerWorkflowContinuityData(items),
  };
}