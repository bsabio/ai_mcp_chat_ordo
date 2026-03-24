import type { ConversationLane } from "./conversation-routing";

export type TrainingPathLane = Extract<ConversationLane, "individual">;
export type ApprenticeshipInterest = "yes" | "maybe" | "no" | "unknown";
export type TrainingPathRecommendation =
  | "operator_intensive"
  | "operator_lab"
  | "mentorship_sprint"
  | "apprenticeship_screening"
  | "continue_conversation";
export type TrainingPathStatus = "draft" | "recommended" | "screening_requested" | "deferred" | "closed";

export interface TrainingPathRecord {
  id: string;
  conversationId: string;
  leadRecordId: string | null;
  consultationRequestId: string | null;
  userId: string;
  lane: TrainingPathLane;
  currentRoleOrBackground: string | null;
  technicalDepth: string | null;
  primaryGoal: string | null;
  preferredFormat: string | null;
  apprenticeshipInterest: ApprenticeshipInterest | null;
  recommendedPath: TrainingPathRecommendation;
  fitRationale: string | null;
  customerSummary: string | null;
  status: TrainingPathStatus;
  nextAction: string | null;
  founderNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingPathRecordSeed {
  conversationId: string;
  leadRecordId: string | null;
  consultationRequestId: string | null;
  userId: string;
  lane?: TrainingPathLane;
  currentRoleOrBackground: string | null;
  technicalDepth: string | null;
  primaryGoal: string | null;
  preferredFormat: string | null;
  apprenticeshipInterest: ApprenticeshipInterest | null;
  recommendedPath?: TrainingPathRecommendation;
  fitRationale: string | null;
  customerSummary: string | null;
  status?: TrainingPathStatus;
  nextAction: string | null;
  founderNote: string | null;
}

export interface TrainingPathRecordUpdate {
  currentRoleOrBackground?: string | null;
  technicalDepth?: string | null;
  primaryGoal?: string | null;
  preferredFormat?: string | null;
  apprenticeshipInterest?: ApprenticeshipInterest | null;
  recommendedPath?: TrainingPathRecommendation;
  fitRationale?: string | null;
  customerSummary?: string | null;
  nextAction?: string | null;
  founderNote?: string | null;
}

export function isTrainingPathLane(value: string | null | undefined): value is TrainingPathLane {
  return value === "individual";
}

export function isApprenticeshipInterest(value: string | null | undefined): value is ApprenticeshipInterest {
  return value === "yes" || value === "maybe" || value === "no" || value === "unknown";
}

export function isTrainingPathRecommendation(
  value: string | null | undefined,
): value is TrainingPathRecommendation {
  return value === "operator_intensive"
    || value === "operator_lab"
    || value === "mentorship_sprint"
    || value === "apprenticeship_screening"
    || value === "continue_conversation";
}

export function isTrainingPathStatus(value: string | null | undefined): value is TrainingPathStatus {
  return value === "draft"
    || value === "recommended"
    || value === "screening_requested"
    || value === "deferred"
    || value === "closed";
}

export function isTrainingPathCustomerVisibleStatus(
  value: TrainingPathStatus | string | null | undefined,
): value is Exclude<TrainingPathStatus, "draft"> {
  return value === "recommended"
    || value === "screening_requested"
    || value === "deferred"
    || value === "closed";
}