import type { ConversationLane } from "./conversation-routing";

export type DealLane = Extract<ConversationLane, "organization" | "development">;
export type DealStatus = "draft" | "qualified" | "estimate_ready" | "agreed" | "declined" | "on_hold";

export interface DealRecord {
  id: string;
  conversationId: string;
  consultationRequestId: string | null;
  leadRecordId: string | null;
  userId: string;
  lane: DealLane;
  title: string;
  organizationName: string | null;
  problemSummary: string;
  proposedScope: string;
  recommendedServiceType: string;
  estimatedHours: number | null;
  estimatedTrainingDays: number | null;
  estimatedPrice: number | null;
  status: DealStatus;
  nextAction: string | null;
  assumptions: string | null;
  openQuestions: string | null;
  founderNote: string | null;
  customerResponseNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DealRecordSeed {
  conversationId: string;
  consultationRequestId: string | null;
  leadRecordId: string | null;
  userId: string;
  lane: DealLane;
  title: string;
  organizationName: string | null;
  problemSummary: string;
  proposedScope: string;
  recommendedServiceType: string;
  estimatedHours: number | null;
  estimatedTrainingDays: number | null;
  estimatedPrice: number | null;
  status?: DealStatus;
  nextAction: string | null;
  assumptions: string | null;
  openQuestions: string | null;
  founderNote: string | null;
  customerResponseNote: string | null;
}

export interface DealRecordUpdate {
  title?: string;
  organizationName?: string | null;
  problemSummary?: string;
  proposedScope?: string;
  recommendedServiceType?: string;
  estimatedHours?: number | null;
  estimatedTrainingDays?: number | null;
  estimatedPrice?: number | null;
  nextAction?: string | null;
  assumptions?: string | null;
  openQuestions?: string | null;
  founderNote?: string | null;
  customerResponseNote?: string | null;
}

export function isDealLane(value: string | null | undefined): value is DealLane {
  return value === "organization" || value === "development";
}

export function isDealStatus(value: string | null | undefined): value is DealStatus {
  return value === "draft"
    || value === "qualified"
    || value === "estimate_ready"
    || value === "agreed"
    || value === "declined"
    || value === "on_hold";
}

export function isDealCustomerVisibleStatus(
  value: DealStatus | string | null | undefined,
): value is Extract<DealStatus, "estimate_ready" | "agreed" | "declined"> {
  return value === "estimate_ready" || value === "agreed" || value === "declined";
}