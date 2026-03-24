import type { Conversation, ConversationSummary } from "@/core/entities/conversation";
import { type DealStatus } from "@/core/entities/deal-record";
import type { LeadCaptureStatus, LeadTriageState } from "@/core/entities/lead-record";
import type {
  TrainingPathRecommendation,
  TrainingPathStatus,
} from "@/core/entities/training-path-record";

import type { OperatorSignalId } from "./operator-signal-types";

export interface OperatorBlockPayload<TData> {
  blockId: OperatorSignalId;
  state: "ready" | "empty";
  data: TData;
}

export interface ConversationWorkspaceBlockData {
  conversation: Conversation | null;
  resumeHref: string;
}

export interface RecentConversationLink extends ConversationSummary {
  href: string;
}

export interface RecentConversationsBlockData {
  conversations: RecentConversationLink[];
}

export interface CustomerWorkflowContinuityItem {
  kind: "deal" | "training_path";
  id: string;
  title: string;
  summary: string;
  status: DealStatus | TrainingPathStatus;
  nextAction: string;
  group: "now" | "next";
  href: string;
  detailHref: string;
}

export interface CustomerWorkflowContinuityBlockData {
  summary: {
    nowCount: number;
    nextCount: number;
    approvedDealCount: number;
    approvedTrainingPathCount: number;
  };
  items: CustomerWorkflowContinuityItem[];
  emptyReason: string | null;
}

export interface RoutingReviewSummary {
  recentlyChangedCount: number;
  uncertainCount: number;
  followUpReadyCount: number;
}

export interface RoutingReviewRecentChange {
  conversationId: string;
  href: string;
  title: string;
  userId: string;
  fromLane: string;
  toLane: string;
  laneConfidence: number | null;
  recommendedNextStep: string | null;
  changedAt: string;
}

export interface RoutingReviewConversation {
  conversationId: string;
  href: string;
  title: string;
  userId: string;
  status: string;
  lane: string;
  laneConfidence: number | null;
  recommendedNextStep: string | null;
  detectedNeedSummary: string | null;
  laneLastAnalyzedAt: string | null;
  updatedAt: string;
}

export interface RoutingReviewBlockData {
  summary: RoutingReviewSummary;
  recentlyChanged: RoutingReviewRecentChange[];
  uncertainConversations: RoutingReviewConversation[];
  followUpReady: RoutingReviewConversation[];
}

export interface LeadQueueBlockData {
  summary: {
    submittedLeadCount: number;
    newLeadCount: number;
    contactedLeadCount: number;
    qualifiedLeadCount: number;
    deferredLeadCount: number;
  };
  leads: LeadQueueLead[];
  emptyReason: string | null;
}

export interface SystemHealthBlockData {
  summary: {
    overallStatus: "ok" | "degraded";
    readinessStatus: "ok" | "error";
    livenessStatus: "ok" | "error";
    environmentStatus: "ok" | "error";
  };
  release: {
    appName: string;
    version: string;
    gitSha: string | null;
    gitBranch: string | null;
    builtAt: string | null;
    nodeVersion: string | null;
  };
  metrics: {
    mode: string;
    details: string;
  };
  warnings: string[];
  generatedAt: string;
}

export interface AnonymousOpportunity {
  conversationId: string;
  href: string;
  title: string;
  lane: string;
  laneConfidence: number;
  messageCount: number;
  detectedNeedSummary: string | null;
  recommendedNextStep: string | null;
  updatedAt: string;
  sessionSource: string;
  opportunityScore: number;
  likelyFrictionReason: string | null;
}

export interface AnonymousOpportunitiesBlockData {
  summary: {
    opportunityCount: number;
    organizationCount: number;
    individualCount: number;
    developmentCount: number;
  };
  opportunities: AnonymousOpportunity[];
  emptyReason: string | null;
}

export interface RecurringPainTheme {
  id: string;
  label: string;
  occurrenceCount: number;
  latestSeenAt: string;
  exampleSummary: string;
  sampleConversations: Array<{
    conversationId: string;
    href: string;
    title: string;
  }>;
}

export interface RecurringPainThemesBlockData {
  summary: {
    analyzedSummaryCount: number;
    recurringThemeCount: number;
  };
  themes: RecurringPainTheme[];
  emptyReason: string | null;
}

export interface FunnelRecommendation {
  id: string;
  severity: "high" | "medium" | "watch";
  title: string;
  rationale: string;
  suggestedAction: string;
}

export interface FunnelRecommendationsBlockData {
  summary: {
    recommendationCount: number;
    anonymousDropOffCount: number;
    uncertainConversationCount: number;
    newLeadCount: number;
  };
  recommendations: FunnelRecommendation[];
  emptyReason: string | null;
}

export interface LeadQueueLead {
  id: string;
  conversationId: string;
  href: string;
  conversationTitle: string;
  lane: string;
  name: string;
  email: string;
  organization: string | null;
  roleOrTitle: string | null;
  trainingGoal: string | null;
  problemSummary: string | null;
  recommendedNextAction: string | null;
  submittedAt: string | null;
  conversationUpdatedAt: string;
  laneConfidence: number | null;
  priorityScore: number;
  priorityLabel: "hot" | "warm" | "watch";
  triageState: LeadTriageState;
  founderNote: string | null;
  lastContactedAt: string | null;
  triagedAt: string | null;
}

export interface ConsultationRequestQueueItem {
  id: string;
  conversationId: string;
  href: string;
  conversationTitle: string;
  lane: string;
  status: "pending" | "reviewed" | "scheduled" | "declined";
  requestSummary: string;
  founderNote: string | null;
  messageCount: number;
  createdAt: string;
}

export interface ConsultationRequestQueueBlockData {
  summary: {
    pendingCount: number;
    reviewedCount: number;
  };
  requests: ConsultationRequestQueueItem[];
  emptyReason: string | null;
}

export interface DealQueueItem {
  id: string;
  conversationId: string;
  href: string;
  title: string;
  lane: "organization" | "development";
  organizationName: string | null;
  status: "draft" | "qualified" | "estimate_ready" | "agreed" | "declined" | "on_hold";
  estimatedPrice: number | null;
  nextAction: string | null;
  customerResponseNote: string | null;
  updatedAt: string;
}

export interface DealQueueBlockData {
  summary: {
    draftCount: number;
    qualifiedCount: number;
    agreedCount: number;
    declinedCount: number;
  };
  deals: DealQueueItem[];
  emptyReason: string | null;
}

export interface TrainingPathQueueItem {
  id: string;
  conversationId: string;
  href: string;
  currentRoleOrBackground: string | null;
  primaryGoal: string | null;
  technicalDepth: string | null;
  recommendedPath: "operator_intensive" | "operator_lab" | "mentorship_sprint" | "apprenticeship_screening" | "continue_conversation";
  apprenticeshipInterest: "yes" | "maybe" | "no" | "unknown" | null;
  status: "draft" | "recommended" | "screening_requested" | "deferred" | "closed";
  nextAction: string | null;
  updatedAt: string;
}

export interface TrainingPathQueueBlockData {
  summary: {
    draftCount: number;
    recommendedCount: number;
    apprenticeshipCandidateCount: number;
    followUpNowCount: number;
  };
  trainingPaths: TrainingPathQueueItem[];
  emptyReason: string | null;
}

export interface RoutingReviewAnalyticsResult {
  summary: {
    recently_changed_count: number;
    uncertain_count: number;
    follow_up_ready_count: number;
  };
  recently_changed: Array<{
    conversation_id: string;
    title: string;
    user_id: string;
    from_lane: string;
    to_lane: string;
    lane_confidence: number | null;
    recommended_next_step: string | null;
    changed_at: string;
  }>;
  uncertain_conversations: Array<{
    conversation_id: string;
    title: string;
    user_id: string;
    status: string;
    lane: string;
    lane_confidence: number | null;
    recommended_next_step: string | null;
    detected_need_summary: string | null;
    lane_last_analyzed_at: string | null;
    updated_at: string;
  }>;
  follow_up_ready: Array<{
    conversation_id: string;
    title: string;
    user_id: string;
    status: string;
    lane: string;
    lane_confidence: number | null;
    recommended_next_step: string | null;
    detected_need_summary: string | null;
    lane_last_analyzed_at: string | null;
    updated_at: string;
  }>;
}

export interface LeadQueueSummaryRow {
  submitted_lead_count: number;
  new_lead_count: number;
  contacted_lead_count: number;
  qualified_lead_count: number;
  deferred_lead_count: number;
}

export interface LeadQueueRow {
  id: string;
  conversation_id: string;
  conversation_title: string;
  lane: string;
  name: string;
  email: string;
  organization: string | null;
  role_or_title: string | null;
  training_goal: string | null;
  problem_summary: string | null;
  recommended_next_action: string | null;
  capture_status: LeadCaptureStatus;
  triage_state: LeadTriageState;
  founder_note: string | null;
  last_contacted_at: string | null;
  submitted_at: string | null;
  updated_at: string;
  lane_confidence: number | null;
  triaged_at: string | null;
}

export interface AnonymousOpportunityRow {
  id: string;
  title: string;
  lane: string;
  lane_confidence: number | null;
  message_count: number;
  detected_need_summary: string | null;
  recommended_next_step: string | null;
  updated_at: string;
  session_source: string;
}

export interface ThemeSummaryRow {
  conversation_id: string;
  conversation_title: string;
  updated_at: string;
  summary_text: string;
}

export interface OverviewAnalyticsResult {
  uncertain_conversations: number;
}

export interface FunnelAnalyticsResult {
  stages: Array<{
    name: string;
    count: number;
    drop_off_rate: number;
  }>;
}

export interface DropOffAnalyticsResult {
  anonymous: Array<{
    conversation_id: string;
    title: string;
    inactive_hours: number;
    last_message_preview: string;
    tools_before_drop_off: string[];
  }>;
}

export interface ConsultationRequestQueueRow {
  id: string;
  conversation_id: string;
  conversation_title: string;
  lane: string;
  status: "pending" | "reviewed" | "scheduled" | "declined";
  request_summary: string;
  founder_note: string | null;
  message_count: number;
  created_at: string;
}

export interface DealQueueRow {
  id: string;
  conversation_id: string;
  title: string;
  lane: "organization" | "development";
  organization_name: string | null;
  status: "draft" | "qualified" | "estimate_ready" | "agreed" | "declined" | "on_hold";
  estimated_price: number | null;
  next_action: string | null;
  customer_response_note: string | null;
  updated_at: string;
}

export interface CustomerContinuityDealRow {
  id: string;
  conversation_id: string;
  title: string;
  problem_summary: string;
  organization_name: string | null;
  status: DealStatus;
  next_action: string | null;
}

export interface TrainingPathQueueRow {
  id: string;
  conversation_id: string;
  current_role_or_background: string | null;
  primary_goal: string | null;
  technical_depth: string | null;
  recommended_path: "operator_intensive" | "operator_lab" | "mentorship_sprint" | "apprenticeship_screening" | "continue_conversation";
  apprenticeship_interest: "yes" | "maybe" | "no" | "unknown" | null;
  status: "draft" | "recommended" | "screening_requested" | "deferred" | "closed";
  next_action: string | null;
  updated_at: string;
}

export interface CustomerContinuityTrainingPathRow {
  id: string;
  conversation_id: string;
  current_role_or_background: string | null;
  primary_goal: string | null;
  recommended_path: TrainingPathRecommendation;
  customer_summary: string | null;
  status: TrainingPathStatus;
  next_action: string | null;
}