import { beforeEach, describe, expect, it, vi } from "vitest";

import { createConversationRoutingSnapshot } from "../entities/conversation-routing";
import type { ConsultationRequest } from "../entities/consultation-request";
import type { Conversation } from "../entities/conversation";
import type { LeadRecord } from "../entities/lead-record";
import type { TrainingPathRecord } from "../entities/training-path-record";
import {
  CreateTrainingPathFromWorkflowInteractor,
  TrainingPathAlreadyExistsError,
  TrainingPathCreationEligibilityError,
  WorkflowSourceNotFoundError,
} from "./CreateTrainingPathFromWorkflowInteractor";
import type { ConsultationRequestRepository } from "./ConsultationRequestRepository";
import type { ConversationRepository } from "./ConversationRepository";
import type { ConversationEventRecorder } from "./ConversationEventRecorder";
import type { ReferralLifecycleRecorder } from "./ReferralLifecycleRecorder";
import type { LeadRecordRepository } from "./LeadRecordRepository";
import type { TrainingPathRecordRepository } from "./TrainingPathRecordRepository";

function makeTrainingPath(overrides: Partial<TrainingPathRecord> = {}): TrainingPathRecord {
  return {
    id: "training_1",
    conversationId: "conv_1",
    leadRecordId: "lead_1",
    consultationRequestId: null,
    userId: "usr_1",
    lane: "individual",
    currentRoleOrBackground: "Product designer",
    technicalDepth: "career_transition",
    primaryGoal: "Build operator discipline",
    preferredFormat: null,
    apprenticeshipInterest: "maybe",
    recommendedPath: "apprenticeship_screening",
    fitRationale: "Career transition and apprenticeship interest.",
    customerSummary: "Recommend an apprenticeship screening conversation before offering a deeper track.",
    status: "draft",
    nextAction: "Review fit and prepare the apprenticeship screening follow-up.",
    founderNote: null,
    createdAt: "2026-03-19T10:00:00.000Z",
    updatedAt: "2026-03-19T10:00:00.000Z",
    ...overrides,
  };
}

function makeConsultationRequest(overrides: Partial<ConsultationRequest> = {}): ConsultationRequest {
  return {
    id: "cr_1",
    conversationId: "conv_1",
    userId: "usr_1",
    lane: "individual",
    requestSummary: "Need mentorship and operator practice.",
    status: "reviewed",
    founderNote: "Strong fit for a mentorship sprint.",
    createdAt: "2026-03-19T09:00:00.000Z",
    updatedAt: "2026-03-19T09:00:00.000Z",
    ...overrides,
  };
}

function makeLeadRecord(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "lead_1",
    conversationId: "conv_1",
    lane: "individual",
    name: "Avery Stone",
    email: "avery@example.com",
    organization: null,
    roleOrTitle: "Product designer",
    trainingGoal: "Transition into AI operator work",
    authorityLevel: null,
    urgency: null,
    budgetSignal: null,
    technicalEnvironment: null,
    trainingFit: "career_transition",
    problemSummary: "Needs a serious training path into operator work.",
    recommendedNextAction: "Recommend an apprenticeship screening conversation.",
    captureStatus: "submitted",
    triageState: "qualified",
    founderNote: "Shows discipline and strong follow-through.",
    lastContactedAt: null,
    createdAt: "2026-03-19T09:00:00.000Z",
    updatedAt: "2026-03-19T09:00:00.000Z",
    submittedAt: "2026-03-19T08:30:00.000Z",
    triagedAt: "2026-03-19T09:00:00.000Z",
    ...overrides,
  };
}

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: "conv_1",
    userId: "usr_1",
    title: "Current conversation",
    status: "active",
    createdAt: "2026-03-19T08:00:00.000Z",
    updatedAt: "2026-03-19T09:00:00.000Z",
    convertedFrom: null,
    messageCount: 4,
    firstMessageAt: null,
    lastToolUsed: null,
    sessionSource: "authenticated",
    promptVersion: null,
    routingSnapshot: createConversationRoutingSnapshot({ lane: "individual", confidence: 0.82 }),
    referralSource: null,
    ...overrides,
  };
}

describe("CreateTrainingPathFromWorkflowInteractor", () => {
  let trainingPathRecordRepo: TrainingPathRecordRepository;
  let consultationRequestRepo: ConsultationRequestRepository;
  let leadRecordRepo: LeadRecordRepository;
  let conversationRepo: ConversationRepository;
  let eventRecorder: ConversationEventRecorder;
  let referralRecorder: ReferralLifecycleRecorder;
  let interactor: CreateTrainingPathFromWorkflowInteractor;

  beforeEach(() => {
    trainingPathRecordRepo = {
      create: vi.fn(async (seed) => makeTrainingPath(seed)),
      findById: vi.fn(),
      findByConversationId: vi.fn(),
      findByLeadRecordId: vi.fn(async () => null),
      findByConsultationRequestId: vi.fn(async () => null),
      listByStatus: vi.fn(),
      listByRecommendedPath: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
    };

    consultationRequestRepo = {
      create: vi.fn(),
      findById: vi.fn(async () => makeConsultationRequest()),
      findByConversationId: vi.fn(),
      listByStatus: vi.fn(),
      updateStatus: vi.fn(),
    };

    leadRecordRepo = {
      findById: vi.fn(async () => makeLeadRecord()),
      findByConversationId: vi.fn(),
      upsertTriggered: vi.fn(),
      submitCapture: vi.fn(),
      updateStatus: vi.fn(),
      updateTriageState: vi.fn(),
      updateQualification: vi.fn(),
    };

    conversationRepo = {
      create: vi.fn(),
      listByUser: vi.fn(),
      findById: vi.fn(async () => makeConversation()),
      findActiveByUser: vi.fn(),
      archiveByUser: vi.fn(),
      archiveById: vi.fn(),
      softDelete: vi.fn(),
      restoreDeleted: vi.fn(),
      purge: vi.fn(),
      delete: vi.fn(),
      updateTitle: vi.fn(),
      touch: vi.fn(),
      incrementMessageCount: vi.fn(),
      setFirstMessageAt: vi.fn(),
      recordMessageAppended: vi.fn(),
      setLastToolUsed: vi.fn(),
      setConvertedFrom: vi.fn(),
      setReferralSource: vi.fn(),
      updateRoutingSnapshot: vi.fn(),
      transferOwnership: vi.fn(),
    };

    eventRecorder = {
      record: vi.fn(async () => undefined),
    } as unknown as ConversationEventRecorder;

    referralRecorder = {
      recordLeadSubmitted: vi.fn(async () => undefined),
      recordConsultationRequested: vi.fn(async () => undefined),
      recordDealCreated: vi.fn(async () => undefined),
      recordTrainingPathCreated: vi.fn(async () => undefined),
      recordCreditStateChanged: vi.fn(async () => undefined),
    };

    interactor = new CreateTrainingPathFromWorkflowInteractor(
      trainingPathRecordRepo,
      consultationRequestRepo,
      leadRecordRepo,
      conversationRepo,
      eventRecorder,
      referralRecorder,
    );
  });

  it("creates a draft training-path record from a qualified lead", async () => {
    const trainingPath = await interactor.createFromQualifiedLead("admin_1", "lead_1");

    expect(trainingPathRecordRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      leadRecordId: "lead_1",
      userId: "usr_1",
      lane: "individual",
      recommendedPath: "apprenticeship_screening",
      nextAction: "Recommend an apprenticeship screening conversation.",
    }));
    expect(eventRecorder.record).toHaveBeenCalledWith("conv_1", "training_path_recommended", expect.objectContaining({
      adminUserId: "admin_1",
      sourceType: "lead_record",
      sourceId: "lead_1",
    }));
    expect(referralRecorder.recordTrainingPathCreated).toHaveBeenCalledWith({
      conversationId: "conv_1",
      trainingPathId: "training_1",
      recommendedPath: "apprenticeship_screening",
      sourceType: "lead_record",
      sourceId: "lead_1",
    });
    expect(trainingPath.leadRecordId).toBe("lead_1");
  });

  it("creates a draft training-path record from a reviewed consultation request", async () => {
    const trainingPath = await interactor.createFromConsultationRequest("admin_1", "cr_1");

    expect(trainingPathRecordRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      consultationRequestId: "cr_1",
      lane: "individual",
      recommendedPath: "mentorship_sprint",
      founderNote: "Strong fit for a mentorship sprint.",
    }));
    expect(eventRecorder.record).toHaveBeenCalledWith("conv_1", "training_path_recommended", expect.objectContaining({
      sourceType: "consultation_request",
      sourceId: "cr_1",
    }));
    expect(referralRecorder.recordTrainingPathCreated).toHaveBeenCalledWith({
      conversationId: "conv_1",
      trainingPathId: "training_1",
      recommendedPath: "mentorship_sprint",
      sourceType: "consultation_request",
      sourceId: "cr_1",
    });
    expect(trainingPath.consultationRequestId).toBe("cr_1");
  });

  it("rejects missing workflow sources", async () => {
    vi.mocked(leadRecordRepo.findById).mockResolvedValueOnce(null);

    await expect(interactor.createFromQualifiedLead("admin_1", "missing")).rejects.toBeInstanceOf(
      WorkflowSourceNotFoundError,
    );
  });

  it("rejects non-qualified leads", async () => {
    vi.mocked(leadRecordRepo.findById).mockResolvedValueOnce(makeLeadRecord({ triageState: "contacted" }));

    await expect(interactor.createFromQualifiedLead("admin_1", "lead_1")).rejects.toBeInstanceOf(
      TrainingPathCreationEligibilityError,
    );
  });

  it("rejects non-individual consultation requests", async () => {
    vi.mocked(consultationRequestRepo.findById).mockResolvedValueOnce(
      makeConsultationRequest({ lane: "organization", requestSummary: "Need team training." }),
    );

    await expect(interactor.createFromConsultationRequest("admin_1", "cr_1")).rejects.toBeInstanceOf(
      TrainingPathCreationEligibilityError,
    );
  });

  it("rejects duplicate conversions from leads", async () => {
    vi.mocked(trainingPathRecordRepo.findByLeadRecordId).mockResolvedValueOnce(makeTrainingPath());

    await expect(interactor.createFromQualifiedLead("admin_1", "lead_1")).rejects.toBeInstanceOf(
      TrainingPathAlreadyExistsError,
    );
  });

  it("rejects duplicate conversions from consultation requests", async () => {
    vi.mocked(trainingPathRecordRepo.findByConsultationRequestId).mockResolvedValueOnce(
      makeTrainingPath({ leadRecordId: null, consultationRequestId: "cr_1" }),
    );

    await expect(interactor.createFromConsultationRequest("admin_1", "cr_1")).rejects.toBeInstanceOf(
      TrainingPathAlreadyExistsError,
    );
  });

  it("rejects qualified leads when the source conversation is missing", async () => {
    vi.mocked(conversationRepo.findById).mockResolvedValueOnce(null);

    await expect(interactor.createFromQualifiedLead("admin_1", "lead_1")).rejects.toBeInstanceOf(
      WorkflowSourceNotFoundError,
    );
  });
});