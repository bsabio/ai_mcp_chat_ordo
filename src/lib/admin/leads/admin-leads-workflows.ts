import type { WorkflowConfig } from "@/lib/admin/shared/admin-workflow";
import type { LeadTriageState } from "@/core/entities/lead-record";
import type { ConsultationRequestStatus } from "@/core/entities/consultation-request";
import type { DealStatus } from "@/core/entities/deal-record";
import type { TrainingPathStatus } from "@/core/entities/training-path-record";

export const LEAD_TRIAGE_WORKFLOW: WorkflowConfig<LeadTriageState> = {
  transitions: {
    new: ["contacted", "qualified", "deferred"],
    contacted: ["qualified", "deferred"],
    qualified: ["contacted", "deferred"],
    deferred: ["new", "contacted"],
  },
  labels: {
    "new→contacted": { label: "Mark Contacted", description: "Record initial outreach to this lead." },
    "new→qualified": { label: "Qualify", description: "Mark this lead as qualified for next steps." },
    "new→deferred": { label: "Defer", description: "Defer this lead for later review." },
    "contacted→qualified": { label: "Qualify", description: "Promote to qualified after contact." },
    "contacted→deferred": { label: "Defer", description: "Defer this lead for later follow-up." },
    "qualified→contacted": { label: "Re-contact", description: "Move back to contacted for follow-up." },
    "qualified→deferred": { label: "Defer", description: "Defer this qualified lead." },
    "deferred→new": { label: "Reopen", description: "Reopen this deferred lead as new." },
    "deferred→contacted": { label: "Contact", description: "Begin outreach on deferred lead." },
  },
};

export const CONSULTATION_WORKFLOW: WorkflowConfig<ConsultationRequestStatus> = {
  transitions: {
    pending: ["reviewed", "scheduled", "declined"],
    reviewed: ["scheduled", "declined"],
    scheduled: ["declined"],
    declined: ["pending"],
  },
  labels: {
    "pending→reviewed": { label: "Mark Reviewed", description: "Mark request as reviewed." },
    "pending→scheduled": { label: "Schedule", description: "Schedule the consultation." },
    "pending→declined": { label: "Decline", description: "Decline this consultation request." },
    "reviewed→scheduled": { label: "Schedule", description: "Schedule the consultation." },
    "reviewed→declined": { label: "Decline", description: "Decline after review." },
    "scheduled→declined": { label: "Cancel", description: "Cancel the scheduled consultation." },
    "declined→pending": { label: "Reopen", description: "Reopen this declined request." },
  },
};

export const DEAL_WORKFLOW: WorkflowConfig<DealStatus> = {
  transitions: {
    draft: ["qualified", "on_hold", "declined"],
    qualified: ["estimate_ready", "on_hold", "declined"],
    estimate_ready: ["agreed", "on_hold", "declined"],
    agreed: ["on_hold"],
    declined: ["draft"],
    on_hold: ["draft", "qualified"],
  },
  labels: {
    "draft→qualified": { label: "Qualify", description: "Qualify this deal for estimation." },
    "draft→on_hold": { label: "Hold", description: "Put this deal on hold." },
    "draft→declined": { label: "Decline", description: "Decline this deal." },
    "qualified→estimate_ready": { label: "Estimate Ready", description: "Mark estimate as ready for review." },
    "qualified→on_hold": { label: "Hold", description: "Put this deal on hold." },
    "qualified→declined": { label: "Decline", description: "Decline this deal." },
    "estimate_ready→agreed": { label: "Mark Agreed", description: "Customer accepted the estimate." },
    "estimate_ready→on_hold": { label: "Hold", description: "Put this deal on hold." },
    "estimate_ready→declined": { label: "Decline", description: "Decline this deal." },
    "agreed→on_hold": { label: "Hold", description: "Put the agreed deal on hold." },
    "declined→draft": { label: "Reopen", description: "Reopen as a draft deal." },
    "on_hold→draft": { label: "Reopen Draft", description: "Reopen as draft." },
    "on_hold→qualified": { label: "Re-qualify", description: "Move back to qualified." },
  },
};

export const TRAINING_WORKFLOW: WorkflowConfig<TrainingPathStatus> = {
  transitions: {
    draft: ["recommended", "deferred"],
    recommended: ["screening_requested", "deferred", "closed"],
    screening_requested: ["closed", "deferred"],
    deferred: ["draft", "recommended"],
    closed: [],
  },
  labels: {
    "draft→recommended": { label: "Recommend", description: "Mark path as recommended." },
    "draft→deferred": { label: "Defer", description: "Defer this training path." },
    "recommended→screening_requested": { label: "Request Screening", description: "Request apprenticeship screening." },
    "recommended→deferred": { label: "Defer", description: "Defer this path." },
    "recommended→closed": { label: "Close", description: "Close this training path." },
    "screening_requested→closed": { label: "Close", description: "Close after screening." },
    "screening_requested→deferred": { label: "Defer", description: "Defer after screening request." },
    "deferred→draft": { label: "Reopen Draft", description: "Reopen as draft." },
    "deferred→recommended": { label: "Recommend", description: "Re-recommend this path." },
  },
};
