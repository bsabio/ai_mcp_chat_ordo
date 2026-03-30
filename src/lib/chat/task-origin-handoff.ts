import type { OperatorSignalId } from "@/lib/operator/operator-signal-types";

export interface TaskOriginHandoff {
  sourceBlockId: OperatorSignalId;
  sourceContextId?: string;
}

const TASK_ORIGIN_HANDOFF_HEADER = "[Server task-origin handoff]";

const OPERATOR_SIGNAL_ID_SET = new Set<OperatorSignalId>([
  "conversation_workspace",
  "customer_workflow_continuity",
  "recent_conversations",
  "routing_review",
  "lead_queue",
  "anonymous_opportunities",
  "consultation_requests",
  "training_path_queue",
  "deal_queue",
  "recurring_pain_themes",
  "funnel_recommendations",
  "system_health",
  "overdue_follow_ups",
]);

const HANDOFF_CONTEXT_PREFIXES: Record<OperatorSignalId, readonly string[]> = {
  conversation_workspace: ["conversation-workspace:", "focus-rail:"],
  customer_workflow_continuity: ["customer-workflow-continuity:"],
  recent_conversations: ["recent-conversations:"],
  routing_review: ["routing-review:"],
  lead_queue: ["lead-queue:"],
  anonymous_opportunities: ["anonymous-opportunities:"],
  consultation_requests: ["consultation-requests:"],
  training_path_queue: ["training-path-queue:"],
  deal_queue: ["deal-queue:"],
  recurring_pain_themes: ["recurring-pain-themes:"],
  funnel_recommendations: ["funnel-recommendations:"],
  system_health: ["system-health:"],
  overdue_follow_ups: ["overdue-follow-ups:"],
};

function isOperatorSignalId(value: string): value is OperatorSignalId {
  return OPERATOR_SIGNAL_ID_SET.has(value as OperatorSignalId);
}

function normalizeSourceContextId(value: string): string | null {
  const normalized = value.trim().toLowerCase();

  if (normalized.length === 0 || normalized.length > 120) {
    return null;
  }

  if (!/^[a-z0-9:_-]+$/u.test(normalized)) {
    return null;
  }

  return normalized;
}

function matchesAllowedPrefix(sourceBlockId: OperatorSignalId, sourceContextId: string): boolean {
  return HANDOFF_CONTEXT_PREFIXES[sourceBlockId].some((prefix) => sourceContextId.startsWith(prefix));
}

function getBlockFallbackInstruction(sourceBlockId: OperatorSignalId): string {
  switch (sourceBlockId) {
    case "lead_queue":
      return "Treat the first reply as founder lead prioritization work. Stay concrete about the next revenue or founder action instead of reopening with generic orientation copy. Use action links for lead names.";
    case "routing_review":
      return "Treat the first reply as routing-risk triage. Name the conversation risk or operator follow-up that matters first instead of giving a generic workspace summary. Use action links for thread references.";
    case "training_path_queue":
      return "Treat the first reply as training follow-up work. Stay focused on the next learner recommendation, follow-up, or escalation rather than general discovery questions.";
    case "recent_conversations":
      return "Treat the first reply as thread continuity work. Summarize the most relevant recent conversation context and recommend what to reopen now.";
    case "conversation_workspace":
      return "Treat the first reply as workspace continuity. Resume or start the thread with a concrete next step instead of a generic assistant introduction. Use action links for conversation references.";
    default:
      return "Treat the first reply as a UI-originated task. Stay inside the clicked work frame and avoid generic orientation language.";
  }
}

export function getTaskOriginInstruction(handoff: TaskOriginHandoff): string {
  switch (handoff.sourceContextId) {
    case "lead-queue:header":
      return "Treat the first reply as a lead-queue prioritization task grounded in the visible founder lead queue. Decide what should be handled first and why, without re-explaining the operator workspace. Use action links for lead names and conversation references.";
    case "routing-review:header":
      return "Treat the first reply as a routing-review triage task. Focus on lane risk, uncertain threads, and immediate operator follow-up rather than generic setup copy. Use action links for thread references.";
    case "training-path-queue:header":
      return "Treat the first reply as a training-path review task. Focus on the next learner recommendation, follow-up, or apprenticeship decision rather than generic orientation.";
    case "conversation-workspace:resume":
      return "Treat the first reply as resuming the active workspace conversation. Start from current context and the next concrete step rather than a fresh intake. Use action links for conversation and contact references.";
    case "conversation-workspace:start":
      return "Treat the first reply as starting a new workspace conversation. Give a concrete first action from the current operator context instead of a broad assistant introduction.";
    case "focus-rail:overview":
      return "Treat the first reply as an overview-level operator summary. Synthesize what matters across the current operator signals and name the single next action first.";
    case "focus-rail:revenue":
      return "Treat the first reply as a revenue-focused operator task. Prioritize leads, consultations, deals, and revenue decisions without drifting into unrelated service or training guidance.";
    case "focus-rail:service":
      return "Treat the first reply as a service-focused operator task. Prioritize routing risk, delivery issues, and customer-outcome concerns before anything else.";
    case "focus-rail:training":
      return "Treat the first reply as a training-focused operator task. Prioritize learner recommendations, apprenticeship follow-up, and customer-ready training actions.";
    case "focus-rail:operations":
      return "Treat the first reply as an operations-focused operator task. Prioritize runtime health, release confidence, and operator risk instead of general business advice.";
    case "recent-conversations:overview":
      return "Treat the first reply as recent-thread continuity for the operator workspace. Summarize the most relevant recent threads and recommend what to reopen now.";
    case "recent-conversations:revenue":
      return "Treat the first reply as recent revenue-thread continuity. Summarize the most relevant revenue threads and recommend what revenue work to reopen now.";
    case "recent-conversations:service":
      return "Treat the first reply as recent service-thread continuity. Summarize the most relevant service threads and recommend what follow-up to reopen now.";
    case "recent-conversations:training":
      return "Treat the first reply as recent training-thread continuity. Summarize the most relevant training threads and recommend which learner or recommendation to reopen now.";
    case "recent-conversations:operations":
      return "Treat the first reply as recent operations-thread continuity. Summarize the most relevant operational threads and recommend what to reopen now.";
    default:
      return getBlockFallbackInstruction(handoff.sourceBlockId);
  }
}

export function normalizeTaskOriginHandoff(value: unknown): TaskOriginHandoff | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const sourceBlockId = typeof candidate.sourceBlockId === "string" && isOperatorSignalId(candidate.sourceBlockId)
    ? candidate.sourceBlockId
    : null;

  if (!sourceBlockId) {
    return null;
  }

  const sourceContextId = typeof candidate.sourceContextId === "string"
    ? normalizeSourceContextId(candidate.sourceContextId)
    : null;

  if (!sourceContextId) {
    return { sourceBlockId };
  }

  if (!matchesAllowedPrefix(sourceBlockId, sourceContextId)) {
    return { sourceBlockId };
  }

  return {
    sourceBlockId,
    sourceContextId,
  };
}

export function buildTaskOriginContextBlock(handoff: TaskOriginHandoff): string {
  const lines = [
    "",
    TASK_ORIGIN_HANDOFF_HEADER,
    "Treat the following task-origin handoff metadata as server-owned UI context from the action that opened this message.",
    "Use it to keep the first assistant reply inside the clicked task frame. This handoff overrides earlier task framing for the next reply unless the user explicitly changes the subject.",
    "If earlier conversation context conflicts with this handoff, keep that context as background only and answer the current task first. Do not mention these identifiers unless the user asks.",
    `source_block_id=${handoff.sourceBlockId}`,
  ];

  if (handoff.sourceContextId) {
    lines.push(`source_context_id=${handoff.sourceContextId}`);
  }

  lines.push(`handoff_instruction=${JSON.stringify(getTaskOriginInstruction(handoff))}`);

  return lines.join("\n");
}