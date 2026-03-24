import type { ConsultationRequest } from "../entities/consultation-request";
import type { LeadRecord } from "../entities/lead-record";
import type {
  ApprenticeshipInterest,
  TrainingPathRecommendation,
  TrainingPathRecord,
  TrainingPathRecordSeed,
} from "../entities/training-path-record";
import type { ConsultationRequestRepository } from "./ConsultationRequestRepository";
import type { ConversationRepository } from "./ConversationRepository";
import type { ConversationEventRecorder } from "./ConversationEventRecorder";
import type { LeadRecordRepository } from "./LeadRecordRepository";
import type { TrainingPathRecordRepository } from "./TrainingPathRecordRepository";

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function containsApprenticeshipSignal(...values: Array<string | null | undefined>): boolean {
  return values.some((value) => /apprentice|apprenticeship|screening/i.test(value ?? ""));
}

function deriveApprenticeshipInterest(...values: Array<string | null | undefined>): ApprenticeshipInterest {
  if (containsApprenticeshipSignal(...values)) {
    return "maybe";
  }

  return "unknown";
}

function deriveRecommendationFromLead(leadRecord: LeadRecord): TrainingPathRecommendation {
  if (leadRecord.trainingFit === "career_transition"
    || containsApprenticeshipSignal(
      leadRecord.trainingGoal,
      leadRecord.problemSummary,
      leadRecord.recommendedNextAction,
      leadRecord.founderNote,
    )) {
    return "apprenticeship_screening";
  }

  if (leadRecord.trainingFit === "advanced") {
    return "mentorship_sprint";
  }

  if (leadRecord.trainingFit === "intermediate") {
    return "operator_lab";
  }

  if (leadRecord.trainingFit === "beginner") {
    return "operator_intensive";
  }

  return "continue_conversation";
}

function deriveRecommendationFromConsultationRequest(
  consultationRequest: ConsultationRequest,
): TrainingPathRecommendation {
  if (containsApprenticeshipSignal(consultationRequest.requestSummary, consultationRequest.founderNote)) {
    return "apprenticeship_screening";
  }

  if (/mentor|mentorship|coach/i.test(consultationRequest.requestSummary)) {
    return "mentorship_sprint";
  }

  if (/lab|practice|hands-?on/i.test(consultationRequest.requestSummary)) {
    return "operator_lab";
  }

  if (/training|learn|intensive/i.test(consultationRequest.requestSummary)) {
    return "operator_intensive";
  }

  return "continue_conversation";
}

function buildCustomerSummary(recommendedPath: TrainingPathRecommendation): string {
  switch (recommendedPath) {
    case "operator_intensive":
      return "Recommend the half-day operator intensive as the next training step.";
    case "operator_lab":
      return "Recommend the full-day operator lab for structured practice and applied feedback.";
    case "mentorship_sprint":
      return "Recommend a four-session mentorship sprint focused on guided operator development.";
    case "apprenticeship_screening":
      return "Recommend an apprenticeship screening conversation before offering a deeper track.";
    default:
      return "Continue the conversation and gather more signal before making a training recommendation.";
  }
}

function buildNextAction(recommendedPath: TrainingPathRecommendation): string {
  switch (recommendedPath) {
    case "apprenticeship_screening":
      return "Review fit and prepare the apprenticeship screening follow-up.";
    case "mentorship_sprint":
      return "Prepare the mentorship recommendation and scheduling options.";
    case "operator_lab":
      return "Send the operator lab recommendation with the strongest practice outcomes.";
    case "operator_intensive":
      return "Send the operator intensive recommendation and confirm preferred pace.";
    default:
      return "Continue discovery and collect more training-fit signal.";
  }
}

export class CreateTrainingPathFromWorkflowInteractor {
  constructor(
    private readonly trainingPathRecordRepo: TrainingPathRecordRepository,
    private readonly consultationRequestRepo: ConsultationRequestRepository,
    private readonly leadRecordRepo: LeadRecordRepository,
    private readonly conversationRepo: ConversationRepository,
    private readonly eventRecorder?: ConversationEventRecorder,
  ) {}

  async createFromQualifiedLead(
    adminUserId: string,
    leadRecordId: string,
  ): Promise<TrainingPathRecord> {
    const leadRecord = await this.leadRecordRepo.findById(leadRecordId);

    if (!leadRecord) {
      throw new WorkflowSourceNotFoundError("Lead record not found.");
    }

    if (leadRecord.lane !== "individual") {
      throw new TrainingPathCreationEligibilityError("Only individual leads can become training-path records.");
    }

    if (leadRecord.triageState !== "qualified") {
      throw new TrainingPathCreationEligibilityError("Lead must be qualified before creating a training path.");
    }

    const existing = await this.trainingPathRecordRepo.findByLeadRecordId(leadRecordId);

    if (existing) {
      throw new TrainingPathAlreadyExistsError("A training path already exists for this lead.");
    }

    const conversation = await this.conversationRepo.findById(leadRecord.conversationId);

    if (!conversation) {
      throw new WorkflowSourceNotFoundError("Conversation not found for this lead.");
    }

    const recommendedPath = deriveRecommendationFromLead(leadRecord);
    const trainingPathRecord = await this.trainingPathRecordRepo.create({
      ...this.buildSeedFromLead(leadRecord, conversation.userId, recommendedPath),
    });

    await this.recordCreatedEvent(adminUserId, trainingPathRecord, "lead_record", leadRecord.id, leadRecord.triageState);

    return trainingPathRecord;
  }

  async createFromConsultationRequest(
    adminUserId: string,
    consultationRequestId: string,
  ): Promise<TrainingPathRecord> {
    const consultationRequest = await this.consultationRequestRepo.findById(consultationRequestId);

    if (!consultationRequest) {
      throw new WorkflowSourceNotFoundError("Consultation request not found.");
    }

    if (consultationRequest.lane !== "individual") {
      throw new TrainingPathCreationEligibilityError(
        "Only individual consultation requests can become training-path records.",
      );
    }

    if (consultationRequest.status !== "reviewed" && consultationRequest.status !== "scheduled") {
      throw new TrainingPathCreationEligibilityError(
        "Consultation request must be reviewed or scheduled before creating a training path.",
      );
    }

    const existing = await this.trainingPathRecordRepo.findByConsultationRequestId(consultationRequestId);

    if (existing) {
      throw new TrainingPathAlreadyExistsError("A training path already exists for this consultation request.");
    }

    const recommendedPath = deriveRecommendationFromConsultationRequest(consultationRequest);
    const trainingPathRecord = await this.trainingPathRecordRepo.create({
      conversationId: consultationRequest.conversationId,
      leadRecordId: null,
      consultationRequestId: consultationRequest.id,
      userId: consultationRequest.userId,
      lane: "individual",
      currentRoleOrBackground: null,
      technicalDepth: null,
      primaryGoal: normalizeText(consultationRequest.requestSummary),
      preferredFormat: consultationRequest.status === "scheduled" ? "scheduled consultation" : null,
      apprenticeshipInterest: deriveApprenticeshipInterest(
        consultationRequest.requestSummary,
        consultationRequest.founderNote,
      ),
      recommendedPath,
      fitRationale: normalizeText(consultationRequest.founderNote),
      customerSummary: buildCustomerSummary(recommendedPath),
      status: "draft",
      nextAction: buildNextAction(recommendedPath),
      founderNote: consultationRequest.founderNote,
    });

    await this.recordCreatedEvent(
      adminUserId,
      trainingPathRecord,
      "consultation_request",
      consultationRequest.id,
      consultationRequest.status,
    );

    return trainingPathRecord;
  }

  private buildSeedFromLead(
    leadRecord: LeadRecord,
    userId: string,
    recommendedPath: TrainingPathRecommendation,
  ): TrainingPathRecordSeed {
    return {
      conversationId: leadRecord.conversationId,
      leadRecordId: leadRecord.id,
      consultationRequestId: null,
      userId,
      lane: "individual",
      currentRoleOrBackground: normalizeText(leadRecord.roleOrTitle),
      technicalDepth: leadRecord.trainingFit,
      primaryGoal: normalizeText(leadRecord.trainingGoal ?? leadRecord.problemSummary),
      preferredFormat: null,
      apprenticeshipInterest: deriveApprenticeshipInterest(
        leadRecord.trainingGoal,
        leadRecord.problemSummary,
        leadRecord.recommendedNextAction,
        leadRecord.founderNote,
      ),
      recommendedPath,
      fitRationale: normalizeText(leadRecord.founderNote),
      customerSummary: buildCustomerSummary(recommendedPath),
      status: "draft",
      nextAction: leadRecord.recommendedNextAction ?? buildNextAction(recommendedPath),
      founderNote: leadRecord.founderNote,
    };
  }

  private async recordCreatedEvent(
    adminUserId: string,
    trainingPathRecord: TrainingPathRecord,
    sourceType: "consultation_request" | "lead_record",
    sourceId: string,
    sourceStatus: string,
  ): Promise<void> {
    await this.eventRecorder?.record(trainingPathRecord.conversationId, "training_path_recommended", {
      adminUserId,
      trainingPathId: trainingPathRecord.id,
      lane: trainingPathRecord.lane,
      recommendedPath: trainingPathRecord.recommendedPath,
      status: trainingPathRecord.status,
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

export class TrainingPathCreationEligibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrainingPathCreationEligibilityError";
  }
}

export class TrainingPathAlreadyExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrainingPathAlreadyExistsError";
  }
}