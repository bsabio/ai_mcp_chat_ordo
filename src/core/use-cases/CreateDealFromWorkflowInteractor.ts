import type { DealLane, DealRecord, DealRecordSeed } from "../entities/deal-record";
import type { LeadRecord } from "../entities/lead-record";
import { isDealLane } from "../entities/deal-record";
import type { ConsultationRequestRepository } from "./ConsultationRequestRepository";
import type { ConversationRepository } from "./ConversationRepository";
import type { DealRecordRepository } from "./DealRecordRepository";
import type { LeadRecordRepository } from "./LeadRecordRepository";
import type { ConversationEventRecorder } from "./ConversationEventRecorder";

function deriveLaneServiceType(lane: DealLane): string {
  return lane === "development" ? "delivery" : "advisory";
}

function buildDealTitle(source: string | null | undefined, fallback: string): string {
  const normalized = source?.trim() ?? "";

  if (!normalized) {
    return fallback;
  }

  return normalized.length <= 72 ? normalized : `${normalized.slice(0, 69).trimEnd()}...`;
}

function normalizeSummary(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim() ?? "";
  return normalized || fallback;
}

export class CreateDealFromWorkflowInteractor {
  constructor(
    private readonly dealRecordRepo: DealRecordRepository,
    private readonly consultationRequestRepo: ConsultationRequestRepository,
    private readonly leadRecordRepo: LeadRecordRepository,
    private readonly conversationRepo: ConversationRepository,
    private readonly eventRecorder?: ConversationEventRecorder,
  ) {}

  async createFromConsultationRequest(
    adminUserId: string,
    consultationRequestId: string,
  ): Promise<DealRecord> {
    const consultationRequest = await this.consultationRequestRepo.findById(consultationRequestId);

    if (!consultationRequest) {
      throw new WorkflowSourceNotFoundError("Consultation request not found.");
    }

    if (!isDealLane(consultationRequest.lane)) {
      throw new DealCreationEligibilityError("Only organization and development consultation requests can become deals.");
    }

    if (consultationRequest.status !== "reviewed" && consultationRequest.status !== "scheduled") {
      throw new DealCreationEligibilityError("Consultation request must be reviewed or scheduled before creating a deal.");
    }

    const existing = await this.dealRecordRepo.findByConsultationRequestId(consultationRequestId);

    if (existing) {
      throw new DealAlreadyExistsError("A deal already exists for this consultation request.");
    }

    const dealRecord = await this.dealRecordRepo.create({
      conversationId: consultationRequest.conversationId,
      consultationRequestId: consultationRequest.id,
      leadRecordId: null,
      userId: consultationRequest.userId,
      lane: consultationRequest.lane,
      title: buildDealTitle(
        consultationRequest.requestSummary,
        consultationRequest.lane === "development" ? "Development deal" : "Organization deal",
      ),
      organizationName: null,
      problemSummary: normalizeSummary(
        consultationRequest.requestSummary,
        "Founder review required before scoping.",
      ),
      proposedScope: "",
      recommendedServiceType: deriveLaneServiceType(consultationRequest.lane),
      estimatedHours: null,
      estimatedTrainingDays: null,
      estimatedPrice: null,
      status: "draft",
      nextAction: consultationRequest.status === "scheduled"
        ? "Prepare the consultation agenda and confirm scope after the scheduled call."
        : "Review the request and prepare the founder follow-up plan.",
      assumptions: null,
      openQuestions: null,
      founderNote: consultationRequest.founderNote,
      customerResponseNote: null,
    });

    await this.recordCreatedEvent(adminUserId, dealRecord, "consultation_request", consultationRequest.id, consultationRequest.status);

    return dealRecord;
  }

  async createFromQualifiedLead(
    adminUserId: string,
    leadRecordId: string,
  ): Promise<DealRecord> {
    const leadRecord = await this.leadRecordRepo.findById(leadRecordId);

    if (!leadRecord) {
      throw new WorkflowSourceNotFoundError("Lead record not found.");
    }

    const lane = leadRecord.lane;

    if (!isDealLane(lane)) {
      throw new DealCreationEligibilityError("Only organization and development leads can become deals.");
    }

    if (leadRecord.triageState !== "qualified") {
      throw new DealCreationEligibilityError("Lead must be qualified before creating a deal.");
    }

    const existing = await this.dealRecordRepo.findByLeadRecordId(leadRecordId);

    if (existing) {
      throw new DealAlreadyExistsError("A deal already exists for this lead.");
    }

    const conversation = await this.conversationRepo.findById(leadRecord.conversationId);

    if (!conversation) {
      throw new WorkflowSourceNotFoundError("Conversation not found for this lead.");
    }

    const dealRecord = await this.dealRecordRepo.create({
      ...this.buildSeedFromLead(leadRecord, lane),
      userId: conversation.userId,
    });

    await this.recordCreatedEvent(adminUserId, dealRecord, "lead_record", leadRecord.id, leadRecord.triageState);

    return dealRecord;
  }

  private buildSeedFromLead(
    leadRecord: LeadRecord,
    lane: DealLane,
  ): Omit<DealRecordSeed, "userId"> {
    return {
      conversationId: leadRecord.conversationId,
      consultationRequestId: null,
      leadRecordId: leadRecord.id,
      lane,
      title: buildDealTitle(
        leadRecord.organization
          ? `${leadRecord.organization} ${lane === "development" ? "build engagement" : "advisory engagement"}`
          : leadRecord.problemSummary,
        lane === "development" ? "Development deal" : "Organization deal",
      ),
      organizationName: leadRecord.organization,
      problemSummary: normalizeSummary(
        leadRecord.problemSummary,
        leadRecord.trainingGoal ?? "Qualified lead requires founder scoping.",
      ),
      proposedScope: "",
      recommendedServiceType: deriveLaneServiceType(lane),
      estimatedHours: null,
      estimatedTrainingDays: null,
      estimatedPrice: null,
      status: "draft",
      nextAction: leadRecord.recommendedNextAction ?? "Prepare the first scoped founder follow-up.",
      assumptions: null,
      openQuestions: this.buildLeadOpenQuestions(leadRecord),
      founderNote: leadRecord.founderNote,
      customerResponseNote: null,
    };
  }

  private buildLeadOpenQuestions(leadRecord: LeadRecord): string | null {
    const openQuestions: string[] = [];

    if (leadRecord.budgetSignal && leadRecord.budgetSignal !== "confirmed") {
      openQuestions.push(`Budget signal: ${leadRecord.budgetSignal}.`);
    }

    if (leadRecord.urgency && leadRecord.urgency !== "immediate") {
      openQuestions.push(`Timing: ${leadRecord.urgency}.`);
    }

    if (leadRecord.technicalEnvironment) {
      openQuestions.push(`Environment: ${leadRecord.technicalEnvironment}.`);
    }

    return openQuestions.length > 0 ? openQuestions.join(" ") : null;
  }

  private async recordCreatedEvent(
    adminUserId: string,
    dealRecord: DealRecord,
    sourceType: "consultation_request" | "lead_record",
    sourceId: string,
    sourceStatus: string,
  ): Promise<void> {
    await this.eventRecorder?.record(dealRecord.conversationId, "deal_created", {
      adminUserId,
      dealId: dealRecord.id,
      lane: dealRecord.lane,
      status: dealRecord.status,
      sourceType,
      sourceId,
      sourceStatus,
    });
  }
}

export class WorkflowSourceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowSourceNotFoundError";
  }
}

export class DealCreationEligibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DealCreationEligibilityError";
  }
}

export class DealAlreadyExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DealAlreadyExistsError";
  }
}