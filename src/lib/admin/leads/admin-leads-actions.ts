import { revalidatePath } from "next/cache";

import { readRequiredText, readOptionalText } from "@/lib/admin/shared/admin-form-parsers";
import { withAdminAction } from "@/lib/admin/shared/admin-action-helpers";
import {
  getLeadRecordDataMapper,
  getConsultationRequestDataMapper,
  getDealRecordDataMapper,
  getTrainingPathRecordDataMapper,
} from "@/adapters/RepositoryFactory";
import type { LeadTriageState } from "@/core/entities/lead-record";
import type { ConsultationRequestStatus } from "@/core/entities/consultation-request";
import type { DealStatus } from "@/core/entities/deal-record";
import type { TrainingPathStatus } from "@/core/entities/training-path-record";

// ── Triage state values ────────────────────────────────────────────────

const VALID_TRIAGE_STATES = new Set<string>(["new", "contacted", "qualified", "deferred"]);
const VALID_CONSULTATION_STATUSES = new Set<string>(["pending", "reviewed", "scheduled", "declined"]);
const VALID_DEAL_STATUSES = new Set<string>(["draft", "qualified", "estimate_ready", "agreed", "declined", "on_hold"]);
const VALID_TRAINING_STATUSES = new Set<string>(["draft", "recommended", "screening_requested", "deferred", "closed"]);

// ── Form parsers ───────────────────────────────────────────────────────

export function parseTriageForm(formData: FormData): { triageState: string; founderNote?: string } {
  const triageState = readOptionalText(formData, "triageState")
    ?? readRequiredText(formData, "nextStatus");
  if (!VALID_TRIAGE_STATES.has(triageState)) {
    throw new Error(`Invalid triage state: ${triageState}`);
  }
  const founderNote = readOptionalText(formData, "founderNote") ?? undefined;
  return { triageState, founderNote };
}

export function parseConsultationStatusForm(formData: FormData): { status: string } {
  const status = readOptionalText(formData, "status")
    ?? readRequiredText(formData, "nextStatus");
  if (!VALID_CONSULTATION_STATUSES.has(status)) {
    throw new Error(`Invalid consultation status: ${status}`);
  }
  return { status };
}

export function parseDealStatusForm(formData: FormData): { status: string; founderNote?: string } {
  const status = readOptionalText(formData, "status")
    ?? readRequiredText(formData, "nextStatus");
  if (!VALID_DEAL_STATUSES.has(status)) {
    throw new Error(`Invalid deal status: ${status}`);
  }
  const founderNote = readOptionalText(formData, "founderNote") ?? undefined;
  return { status, founderNote };
}

export function parseTrainingStatusForm(formData: FormData): { status: string } {
  const status = readOptionalText(formData, "status")
    ?? readRequiredText(formData, "nextStatus");
  if (!VALID_TRAINING_STATUSES.has(status)) {
    throw new Error(`Invalid training status: ${status}`);
  }
  return { status };
}

export function parseFollowUpForm(formData: FormData): { followUpAt: string | null } {
  const raw = readOptionalText(formData, "followUpAt");
  return { followUpAt: raw };
}

export function parseBulkTriageForm(formData: FormData): { ids: string[]; triageState: string } {
  const idsRaw = readRequiredText(formData, "ids");
  const ids = idsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) {
    throw new Error("No lead IDs provided");
  }
  const triageState = readOptionalText(formData, "triageState")
    ?? readRequiredText(formData, "bulkAction");
  if (!VALID_TRIAGE_STATES.has(triageState)) {
    throw new Error(`Invalid triage state: ${triageState}`);
  }
  return { ids, triageState };
}

// ── Server actions ─────────────────────────────────────────────────────

export const updateTriageStateAction = withAdminAction(async (_admin, formData) => {
  const id = readRequiredText(formData, "id");
  const { triageState, founderNote } = parseTriageForm(formData);
  const mapper = getLeadRecordDataMapper();
  await mapper.updateTriageState(id, triageState as LeadTriageState, { founderNote });
  revalidatePath("/admin/leads");
});

export const updateConsultationStatusAction = withAdminAction(async (_admin, formData) => {
  const id = readRequiredText(formData, "id");
  const { status } = parseConsultationStatusForm(formData);
  const mapper = getConsultationRequestDataMapper();
  await mapper.updateStatus(id, status as ConsultationRequestStatus);
  revalidatePath("/admin/leads");
});

export const updateDealStatusAction = withAdminAction(async (_admin, formData) => {
  const id = readRequiredText(formData, "id");
  const { status, founderNote } = parseDealStatusForm(formData);
  const mapper = getDealRecordDataMapper();
  await mapper.updateStatus(id, status as DealStatus, { founderNote });
  revalidatePath("/admin/leads");
});

export const updateTrainingStatusAction = withAdminAction(async (_admin, formData) => {
  const id = readRequiredText(formData, "id");
  const { status } = parseTrainingStatusForm(formData);
  const mapper = getTrainingPathRecordDataMapper();
  await mapper.updateStatus(id, status as TrainingPathStatus);
  revalidatePath("/admin/leads");
});

export const updateFollowUpAction = withAdminAction(async (_admin, formData) => {
  const id = readRequiredText(formData, "id");
  const entityType = readRequiredText(formData, "entityType");
  const { followUpAt } = parseFollowUpForm(formData);

  if (entityType === "lead") {
    const mapper = getLeadRecordDataMapper();
    await mapper.updateFollowUp(id, followUpAt);
  } else if (entityType === "deal") {
    const mapper = getDealRecordDataMapper();
    await mapper.updateFollowUp(id, followUpAt);
  } else {
    throw new Error(`Unsupported entity type for follow-up: ${entityType}`);
  }
  revalidatePath("/admin/leads");
});

export const bulkTriageAction = withAdminAction(async (_admin, formData) => {
  const { ids, triageState } = parseBulkTriageForm(formData);
  const mapper = getLeadRecordDataMapper();
  for (const id of ids) {
    await mapper.updateTriageState(id, triageState as LeadTriageState);
  }
  revalidatePath("/admin/leads");
});

export const updateFounderNoteAction = withAdminAction(async (_admin, formData) => {
  const id = readRequiredText(formData, "id");
  const entityType = readRequiredText(formData, "entityType");
  const founderNote = readOptionalText(formData, "founderNote") ?? "";
  const currentStatus = readRequiredText(formData, "currentStatus");

  switch (entityType) {
    case "lead": {
      const mapper = getLeadRecordDataMapper();
      await mapper.updateTriageState(id, currentStatus as LeadTriageState, { founderNote });
      break;
    }
    case "consultation": {
      const mapper = getConsultationRequestDataMapper();
      await mapper.updateStatus(id, currentStatus as ConsultationRequestStatus, { founderNote });
      break;
    }
    case "deal": {
      const mapper = getDealRecordDataMapper();
      await mapper.updateStatus(id, currentStatus as DealStatus, { founderNote });
      break;
    }
    case "training": {
      const mapper = getTrainingPathRecordDataMapper();
      await mapper.updateStatus(id, currentStatus as TrainingPathStatus, { founderNote });
      break;
    }
    default:
      throw new Error(`Unsupported entity type for founder note: ${entityType}`);
  }
  revalidatePath("/admin/leads");
});

// ── Status option arrays for UI selects ────────────────────────────────

export const LEAD_TRIAGE_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "deferred", label: "Deferred" },
];

export const CONSULTATION_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "scheduled", label: "Scheduled" },
  { value: "declined", label: "Declined" },
];

export const DEAL_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "qualified", label: "Qualified" },
  { value: "estimate_ready", label: "Estimate Ready" },
  { value: "agreed", label: "Agreed" },
  { value: "declined", label: "Declined" },
  { value: "on_hold", label: "On Hold" },
];

export const TRAINING_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "recommended", label: "Recommended" },
  { value: "screening_requested", label: "Screening Requested" },
  { value: "deferred", label: "Deferred" },
  { value: "closed", label: "Closed" },
];
