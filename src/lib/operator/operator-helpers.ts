import type Database from "better-sqlite3";

import type { User as SessionUser } from "@/core/entities/user";
import type { TrainingPathRecommendation } from "@/core/entities/training-path-record";

import type {
  AnonymousOpportunityRow,
  CustomerWorkflowContinuityItem,
  FunnelAnalyticsResult,
  LeadQueueLead,
  LeadQueueRow,
  LeadQueueSummaryRow,
  RoutingReviewAnalyticsResult,
  RoutingReviewConversation,
} from "./operator-contracts";

const THEME_PATTERNS = [
  {
    id: "workflow_bottlenecks",
    label: "Workflow bottlenecks",
    keywords: ["workflow", "process", "bottleneck", "handoff", "queue", "turnaround"],
  },
  {
    id: "proposal_and_sales_ops",
    label: "Proposal and sales operations",
    keywords: ["proposal", "quote", "pricing", "estimate", "sow", "statement of work"],
  },
  {
    id: "training_and_enablement",
    label: "Training and enablement gaps",
    keywords: ["training", "enablement", "operator", "apprentice", "upskill", "coaching"],
  },
  {
    id: "knowledge_and_retrieval",
    label: "Knowledge retrieval and documentation",
    keywords: ["knowledge", "retrieval", "documentation", "docs", "search", "wiki"],
  },
  {
    id: "measurement_and_visibility",
    label: "Measurement and visibility",
    keywords: ["dashboard", "analytics", "reporting", "metrics", "visibility", "measurement"],
  },
] as const;

export function buildConversationHref(conversationId: string): string {
  return `/?conversationId=${encodeURIComponent(conversationId)}`;
}

export function buildDealDetailHref(dealId: string): string {
  return `/api/deals/${encodeURIComponent(dealId)}`;
}

export function buildTrainingPathDetailHref(trainingPathId: string): string {
  return `/api/training-paths/${encodeURIComponent(trainingPathId)}`;
}

export function assertSignedInUser(user: Pick<SessionUser, "id" | "roles">): void {
  if (user.roles.includes("ANONYMOUS")) {
    throw new Error("Operator loaders require a signed-in user.");
  }
}

export function assertAdminUser(user: Pick<SessionUser, "id" | "roles">): void {
  assertSignedInUser(user);

  if (!user.roles.includes("ADMIN")) {
    throw new Error("Admin operator loaders require an administrator.");
  }
}

export function mapRoutingReviewConversation(
  conversation: RoutingReviewAnalyticsResult["uncertain_conversations"][number],
): RoutingReviewConversation {
  return {
    conversationId: conversation.conversation_id,
    href: buildConversationHref(conversation.conversation_id),
    title: conversation.title,
    userId: conversation.user_id,
    status: conversation.status,
    lane: conversation.lane,
    laneConfidence: conversation.lane_confidence,
    recommendedNextStep: conversation.recommended_next_step,
    detectedNeedSummary: conversation.detected_need_summary,
    laneLastAnalyzedAt: conversation.lane_last_analyzed_at,
    updatedAt: conversation.updated_at,
  };
}

export function getLeadQueueSummary(db: Database.Database): LeadQueueSummaryRow {
  return db
    .prepare(
      `SELECT
         COUNT(*) AS submitted_lead_count,
        COALESCE(SUM(CASE WHEN triage_state = 'new' THEN 1 ELSE 0 END), 0) AS new_lead_count,
        COALESCE(SUM(CASE WHEN triage_state = 'contacted' THEN 1 ELSE 0 END), 0) AS contacted_lead_count,
        COALESCE(SUM(CASE WHEN triage_state = 'qualified' THEN 1 ELSE 0 END), 0) AS qualified_lead_count,
        COALESCE(SUM(CASE WHEN triage_state = 'deferred' THEN 1 ELSE 0 END), 0) AS deferred_lead_count
       FROM lead_records
       WHERE capture_status = 'submitted'`,
    )
    .get() as LeadQueueSummaryRow;
}

export function calculateAnonymousOpportunityScore(row: AnonymousOpportunityRow): number {
  const confidence = Math.round(Math.min(Math.max(row.lane_confidence ?? 0, 0), 1) * 60);
  const messageBoost = Math.min(row.message_count, 12) * 3;
  const laneBoost = row.lane === "development" ? 8 : row.lane === "organization" ? 6 : 2;

  return Math.min(100, confidence + messageBoost + laneBoost);
}

export function inferFrictionReason(row: AnonymousOpportunityRow): string | null {
  if (row.lane === "uncertain") {
    return "Routing is still uncertain — the system cannot recommend a clear next step.";
  }

  const confidence = row.lane_confidence ?? 0;

  if (confidence < 0.8) {
    if (row.lane === "development") {
      return `Development lane confidence is only ${Math.round(confidence * 100)}% — routing may shift before scoping.`;
    }

    return `${row.lane.charAt(0).toUpperCase() + row.lane.slice(1)} lane confidence is only ${Math.round(confidence * 100)}% — routing may shift.`;
  }

  if (!row.recommended_next_step) {
    return "No recommended next step has been surfaced yet.";
  }

  if (!row.detected_need_summary) {
    return "No detected need summary is available — the conversation may lack depth.";
  }

  const updatedAt = new Date(row.updated_at);
  const hoursStale = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);

  if (hoursStale > 48) {
    return "Conversation has gone stale — last activity was over 48 hours ago.";
  }

  if (row.lane === "development" && row.message_count < 5) {
    return "Development conversations typically need more depth before scoping.";
  }

  return null;
}

function normalizeThemeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferTheme(value: string): { id: string; label: string } {
  const normalized = normalizeThemeKey(value);

  for (const pattern of THEME_PATTERNS) {
    if (pattern.keywords.some((keyword) => normalized.includes(keyword))) {
      return {
        id: pattern.id,
        label: pattern.label,
      };
    }
  }

  const label = value.length > 72 ? `${value.slice(0, 69).trimEnd()}...` : value;

  return {
    id: `summary:${normalized}`,
    label,
  };
}

export function getFunnelStageCount(result: FunnelAnalyticsResult, name: string): number {
  return result.stages.find((stage) => stage.name === name)?.count ?? 0;
}

function normalizeLeadConfidence(row: Pick<LeadQueueRow, "lane" | "lane_confidence">): number {
  if (typeof row.lane_confidence === "number") {
    return Math.min(Math.max(row.lane_confidence, 0), 1);
  }

  if (row.lane === "organization") {
    return 0.78;
  }

  if (row.lane === "individual") {
    return 0.7;
  }

  return 0.56;
}

function calculateLeadPriorityScore(row: LeadQueueRow): number {
  const confidenceScore = Math.round(normalizeLeadConfidence(row) * 70);
  const laneBoost = row.lane === "organization" ? 10 : row.lane === "development" ? 8 : row.lane === "individual" ? 6 : 0;
  const submittedAt = row.submitted_at ? new Date(row.submitted_at) : null;

  let recencyBoost = 0;

  if (submittedAt && !Number.isNaN(submittedAt.getTime())) {
    const ageHours = Math.max(0, (Date.now() - submittedAt.getTime()) / (1000 * 60 * 60));

    if (ageHours <= 24) {
      recencyBoost = 12;
    } else if (ageHours <= 72) {
      recencyBoost = 6;
    } else {
      recencyBoost = 2;
    }
  }

  return Math.min(100, 20 + confidenceScore + laneBoost + recencyBoost);
}

function getLeadPriorityLabel(score: number): LeadQueueLead["priorityLabel"] {
  if (score >= 85) {
    return "hot";
  }

  if (score >= 72) {
    return "warm";
  }

  return "watch";
}

export function mapLeadQueueRow(row: LeadQueueRow): LeadQueueLead {
  const priorityScore = calculateLeadPriorityScore(row);

  return {
    id: row.id,
    conversationId: row.conversation_id,
    href: buildConversationHref(row.conversation_id),
    conversationTitle: row.conversation_title,
    lane: row.lane,
    name: row.name,
    email: row.email,
    organization: row.organization,
    roleOrTitle: row.role_or_title,
    trainingGoal: row.training_goal,
    problemSummary: row.problem_summary,
    recommendedNextAction: row.recommended_next_action,
    submittedAt: row.submitted_at,
    conversationUpdatedAt: row.updated_at,
    laneConfidence: row.lane_confidence,
    priorityScore,
    priorityLabel: getLeadPriorityLabel(priorityScore),
    triageState: row.triage_state,
    founderNote: row.founder_note,
    lastContactedAt: row.last_contacted_at,
    triagedAt: row.triaged_at,
  };
}

export function getCustomerWorkflowGroup(
  kind: CustomerWorkflowContinuityItem["kind"],
  status: CustomerWorkflowContinuityItem["status"],
): CustomerWorkflowContinuityItem["group"] {
  if (kind === "deal") {
    return status === "estimate_ready" ? "now" : "next";
  }

  return status === "recommended" || status === "screening_requested" ? "now" : "next";
}

export function formatTrainingPathRecommendation(value: TrainingPathRecommendation): string {
  switch (value) {
    case "operator_intensive":
      return "Operator intensive";
    case "operator_lab":
      return "Operator lab";
    case "mentorship_sprint":
      return "Mentorship sprint";
    case "apprenticeship_screening":
      return "Apprenticeship screening";
    default:
      return "Continue conversation";
  }
}