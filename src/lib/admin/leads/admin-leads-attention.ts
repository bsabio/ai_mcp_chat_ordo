import type { User as SessionUser } from "@/core/entities/user";
import {
  getLeadQueueSummary,
  mapLeadQueueRow,
  type ConsultationRequestQueueBlockData,
  type ConsultationRequestQueueRow,
  type OperatorBlockPayload,
  type LeadQueueBlockData,
  type LeadQueueRow,
  type TrainingPathQueueBlockData,
  type TrainingPathQueueRow,
} from "@/lib/operator/operator-shared";
import {
  buildConsultationRequestQueueData,
  buildLeadQueueData,
  buildTrainingPathQueueData,
  mapConsultationRequestQueueRow,
  mapTrainingPathQueueRow,
  requireAdminDb,
} from "@/lib/operator/operator-loader-helpers";

export async function loadLeadQueueBlock(
  user: Pick<SessionUser, "id" | "roles">,
): Promise<OperatorBlockPayload<LeadQueueBlockData>> {
  const db = requireAdminDb(user);
  const summary = getLeadQueueSummary(db);

  const leads = db
    .prepare(
      `SELECT
         lr.id,
         lr.conversation_id,
         c.title AS conversation_title,
         lr.lane,
         lr.name,
         lr.email,
         lr.organization,
         lr.role_or_title,
         lr.training_goal,
         COALESCE(lr.problem_summary, c.detected_need_summary) AS problem_summary,
         COALESCE(lr.recommended_next_action, c.recommended_next_step) AS recommended_next_action,
         lr.capture_status,
         lr.triage_state,
         lr.founder_note,
         lr.last_contacted_at,
         lr.submitted_at,
         c.updated_at,
         c.lane_confidence,
         lr.triaged_at
       FROM lead_records lr
       INNER JOIN conversations c ON c.id = lr.conversation_id
       WHERE lr.capture_status = 'submitted'
       ORDER BY
         CASE lr.triage_state
           WHEN 'new' THEN 0
           WHEN 'contacted' THEN 1
           WHEN 'qualified' THEN 2
           WHEN 'deferred' THEN 3
           ELSE 4
         END ASC,
         COALESCE(c.lane_confidence, 0) DESC,
         COALESCE(lr.submitted_at, lr.updated_at) DESC
       LIMIT 5`,
    )
    .all() as LeadQueueRow[];

  const mappedLeads = leads.map(mapLeadQueueRow);

  return {
    blockId: "lead_queue",
    state: mappedLeads.length > 0 ? "ready" : "empty",
    data: buildLeadQueueData(summary, mappedLeads),
  };
}

export async function loadConsultationRequestQueueBlock(
  user: Pick<SessionUser, "id" | "roles">,
): Promise<OperatorBlockPayload<ConsultationRequestQueueBlockData>> {
  const rows = requireAdminDb(user)
    .prepare(
      `SELECT
         cr.id,
         cr.conversation_id,
         COALESCE(c.title, '') AS conversation_title,
         cr.lane,
         cr.status,
         cr.request_summary,
         cr.founder_note,
         COALESCE(c.message_count, 0) AS message_count,
         cr.created_at
       FROM consultation_requests cr
       LEFT JOIN conversations c ON c.id = cr.conversation_id
       WHERE cr.status IN ('pending', 'reviewed')
       ORDER BY CASE cr.status WHEN 'pending' THEN 0 ELSE 1 END, cr.created_at DESC
       LIMIT 25`,
    )
    .all() as ConsultationRequestQueueRow[];

  const requests = rows.map(mapConsultationRequestQueueRow);

  return {
    blockId: "consultation_requests",
    state: requests.length > 0 ? "ready" : "empty",
    data: buildConsultationRequestQueueData(requests),
  };
}

export async function loadTrainingPathQueueBlock(
  user: Pick<SessionUser, "id" | "roles">,
): Promise<OperatorBlockPayload<TrainingPathQueueBlockData>> {
  const rows = requireAdminDb(user)
    .prepare(
      `SELECT
         tpr.id,
         tpr.conversation_id,
         tpr.current_role_or_background,
         tpr.primary_goal,
         tpr.technical_depth,
         tpr.recommended_path,
         tpr.apprenticeship_interest,
         tpr.status,
         tpr.next_action,
         tpr.updated_at
       FROM training_path_records tpr
       WHERE tpr.status IN ('draft', 'recommended', 'screening_requested', 'deferred')
       ORDER BY CASE tpr.status
         WHEN 'draft' THEN 0
         WHEN 'screening_requested' THEN 1
         WHEN 'recommended' THEN 2
         ELSE 3
       END, tpr.updated_at DESC
       LIMIT 25`,
    )
    .all() as TrainingPathQueueRow[];

  const trainingPaths = rows.map(mapTrainingPathQueueRow);

  return {
    blockId: "training_path_queue",
    state: trainingPaths.length > 0 ? "ready" : "empty",
    data: buildTrainingPathQueueData(trainingPaths),
  };
}