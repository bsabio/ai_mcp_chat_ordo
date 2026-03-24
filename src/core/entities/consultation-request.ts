import type { ConversationLane } from "./conversation-routing";

export type ConsultationRequestStatus = "pending" | "reviewed" | "scheduled" | "declined";

export interface ConsultationRequest {
  id: string;
  conversationId: string;
  userId: string;
  lane: ConversationLane;
  requestSummary: string;
  status: ConsultationRequestStatus;
  founderNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationRequestSeed {
  conversationId: string;
  userId: string;
  lane: ConversationLane;
  requestSummary: string;
}

export function isConsultationRequestStatus(
  value: string | null | undefined,
): value is ConsultationRequestStatus {
  return (
    value === "pending" ||
    value === "reviewed" ||
    value === "scheduled" ||
    value === "declined"
  );
}
