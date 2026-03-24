export type ConversationLane = "organization" | "individual" | "development" | "uncertain";

export interface ConversationRoutingSnapshot {
  lane: ConversationLane;
  confidence: number | null;
  recommendedNextStep: string | null;
  detectedNeedSummary: string | null;
  lastAnalyzedAt: string | null;
}

export const DEFAULT_CONVERSATION_LANE: ConversationLane = "uncertain";

export function isConversationLane(value: string | null | undefined): value is ConversationLane {
  return value === "organization"
    || value === "individual"
    || value === "development"
    || value === "uncertain";
}

export function createConversationRoutingSnapshot(
  overrides: Partial<ConversationRoutingSnapshot> = {},
): ConversationRoutingSnapshot {
  return {
    lane: DEFAULT_CONVERSATION_LANE,
    confidence: null,
    recommendedNextStep: null,
    detectedNeedSummary: null,
    lastAnalyzedAt: null,
    ...overrides,
  };
}