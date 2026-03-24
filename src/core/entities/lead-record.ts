import type { ConversationLane } from "./conversation-routing";

export type LeadCaptureStatus = "not_started" | "triggered" | "submitted" | "dismissed";
export type LeadTriageState = "new" | "contacted" | "qualified" | "deferred";
export type LeadAuthorityLevel = "decision_maker" | "influencer" | "evaluator" | "unknown";
export type LeadUrgency = "immediate" | "this_quarter" | "exploring" | "unknown";
export type LeadBudgetSignal = "confirmed" | "likely" | "unclear" | "none";
export type LeadTrainingFit = "beginner" | "intermediate" | "advanced" | "career_transition" | "unknown";

export interface LeadRecord {
  id: string;
  conversationId: string;
  lane: ConversationLane;
  name: string | null;
  email: string | null;
  organization: string | null;
  roleOrTitle: string | null;
  trainingGoal: string | null;
  authorityLevel: LeadAuthorityLevel | null;
  urgency: LeadUrgency | null;
  budgetSignal: LeadBudgetSignal | null;
  technicalEnvironment: string | null;
  trainingFit: LeadTrainingFit | null;
  problemSummary: string | null;
  recommendedNextAction: string | null;
  captureStatus: LeadCaptureStatus;
  triageState: LeadTriageState;
  founderNote: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  triagedAt: string | null;
}

export interface LeadRecordSeed {
  conversationId: string;
  lane: ConversationLane;
  problemSummary: string | null;
  recommendedNextAction: string | null;
}

export interface LeadCaptureSubmission {
  conversationId: string;
  lane: ConversationLane;
  name: string;
  email: string;
  organization: string | null;
  roleOrTitle: string | null;
  trainingGoal: string | null;
  problemSummary: string | null;
  recommendedNextAction: string | null;
}

export interface LeadQualificationUpdate {
  authorityLevel?: LeadAuthorityLevel | null;
  urgency?: LeadUrgency | null;
  budgetSignal?: LeadBudgetSignal | null;
  technicalEnvironment?: string | null;
  trainingFit?: LeadTrainingFit | null;
}

export function isLeadAuthorityLevel(value: string | null | undefined): value is LeadAuthorityLevel {
  return value === "decision_maker"
    || value === "influencer"
    || value === "evaluator"
    || value === "unknown";
}

export function isLeadUrgency(value: string | null | undefined): value is LeadUrgency {
  return value === "immediate"
    || value === "this_quarter"
    || value === "exploring"
    || value === "unknown";
}

export function isLeadBudgetSignal(value: string | null | undefined): value is LeadBudgetSignal {
  return value === "confirmed"
    || value === "likely"
    || value === "unclear"
    || value === "none";
}

export function isLeadTrainingFit(value: string | null | undefined): value is LeadTrainingFit {
  return value === "beginner"
    || value === "intermediate"
    || value === "advanced"
    || value === "career_transition"
    || value === "unknown";
}