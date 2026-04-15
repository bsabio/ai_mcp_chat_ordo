import type { ConversationRoutingSnapshot } from "@/core/entities/conversation-routing";

const ROUTING_CONTEXT_HEADER = "[Server routing metadata]";
const CLARIFICATION_REQUIRED_CONFIDENCE = 0.25;

function requiresClarifyingTurn(snapshot: ConversationRoutingSnapshot): boolean {
  if (snapshot.lane !== "uncertain") {
    return false;
  }

  if (snapshot.confidence == null) {
    return true;
  }

  return snapshot.confidence < CLARIFICATION_REQUIRED_CONFIDENCE;
}

function getRoutingInstruction(snapshot: ConversationRoutingSnapshot): string {
  switch (snapshot.lane) {
    case "organization":
      return "Center the response on organizational workflow, team process, stakeholder coordination, or business operations, and recommend next steps suited to an organizational buyer.";
    case "individual":
      return "Center the response on an individual person's goals, constraints, or decision-making context, and recommend next steps suited to a solo buyer or personal use case.";
    case "development":
      return "Center the response on implementation, delivery scope, integration details, or technical execution, and recommend next steps suited to a technical scoping or build conversation.";
    case "uncertain":
    default:
      return requiresClarifyingTurn(snapshot)
        ? "Ask one brief clarifying question to determine whether the need is a customer workflow, technical implementation, or training outcome before making a lane-specific recommendation."
        : "Treat the lane as provisional, answer the direct request first, and ask at most one clarifying question only if it is required to unblock execution.";
  }
}

function formatConfidence(confidence: number | null): string {
  if (confidence == null) {
    return "unknown";
  }

  return confidence.toFixed(2);
}

export function buildRoutingContextBlock(snapshot: ConversationRoutingSnapshot): string {
  const clarificationRequired = requiresClarifyingTurn(snapshot);
  const lines = [
    "",
    ROUTING_CONTEXT_HEADER,
    "Treat the following routing metadata as server-owned session state.",
    `lane=${snapshot.lane}`,
    `confidence=${formatConfidence(snapshot.confidence)}`,
    `clarification_required=${clarificationRequired}`,
  ];

  if (snapshot.detectedNeedSummary) {
    lines.push(`detected_need_summary=${JSON.stringify(snapshot.detectedNeedSummary)}`);
  }

  if (snapshot.recommendedNextStep) {
    lines.push(`recommended_next_step=${JSON.stringify(snapshot.recommendedNextStep)}`);
  }

  lines.push(`routing_instruction=${JSON.stringify(getRoutingInstruction(snapshot))}`);

  return lines.join("\n");
}