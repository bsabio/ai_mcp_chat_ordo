import { beforeEach, describe, expect, it, vi } from "vitest";

import { createConversationRoutingSnapshot } from "../entities/conversation-routing";
import type { ConsultationRequest } from "../entities/consultation-request";
import type { Conversation } from "../entities/conversation";
import type { DealRecord } from "../entities/deal-record";
import type { LeadRecord } from "../entities/lead-record";
import { CreateDealFromWorkflowInteractor, DealAlreadyExistsError, DealCreationEligibilityError, WorkflowSourceNotFoundError } from "./CreateDealFromWorkflowInteractor";
import type { ConsultationRequestRepository } from "./ConsultationRequestRepository";
import type { ConversationRepository } from "./ConversationRepository";
import type { DealRecordRepository } from "./DealRecordRepository";
import type { LeadRecordRepository } from "./LeadRecordRepository";
import type { ConversationEventRecorder } from "./ConversationEventRecorder";
import type { ReferralLifecycleRecorder } from "./ReferralLifecycleRecorder";

function makeDeal(overrides: Partial<DealRecord> = {}): DealRecord {
  return {
    id: "deal_1",
    conversationId: "conv_1",
    consultationRequestId: "cr_1",
    leadRecordId: null,
    userId: "usr_1",
    lane: "organization",
    title: "Workflow redesign advisory",
    organizationName: "Northwind Labs",
    problemSummary: "Need help redesigning approvals.",
    proposedScope: "",
    recommendedServiceType: "advisory",
    estimatedHours: null,
    estimatedTrainingDays: null,
    estimatedPrice: null,
    status: "draft",
    nextAction: "Review the request and prepare the founder follow-up plan.",
    assumptions: null,
    openQuestions: null,
    founderNote: null,
    customerResponseNote: null,
    createdAt: "2026-03-19T10:00:00.000Z",
    updatedAt: "2026-03-19T10:00:00.000Z",
    ...overrides,
  };
}

function makeConsultationRequest(
  overrides: Partial<ConsultationRequest> = {},
): ConsultationRequest {
  return {
    id: "cr_1",
    conversationId: "conv_1",
    userId: "usr_1",
    lane: "organization",
    requestSummary: "Workflow redesign advisory",
    status: "reviewed",
    founderNote: "Strong fit.",
    createdAt: "2026-03-19T09:00:00.000Z",
    updatedAt: "2026-03-19T09:00:00.000Z",
    ...overrides,
  };
}

function makeLeadRecord(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "lead_1",
    conversationId: "conv_1",
    lane: "development",
    name: "Alex Rivera",
    email: "alex@example.com",
    organization: "Northwind Labs",
    roleOrTitle: "COO",
    trainingGoal: null,
    authorityLevel: "decision_maker",
    urgency: "this_quarter",
    budgetSignal: "likely",
    technicalEnvironment: "Legacy approval workflow in Airtable",
    trainingFit: null,
    problemSummary: "Need a delivery partner to automate approvals.",
    recommendedNextAction: "Prepare a technical scoping call.",
    captureStatus: "submitted",
    triageState: "qualified",
    founderNote: "Confirmed implementation budget range.",
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
    routingSnapshot: createConversationRoutingSnapshot({ lane: "development", confidence: 0.82 }),
    referralSource: null,
    ...overrides,
  };
}

describe("CreateDealFromWorkflowInteractor", () => {
  let dealRecordRepo: DealRecordRepository;
  let consultationRequestRepo: ConsultationRequestRepository;
  let leadRecordRepo: LeadRecordRepository;
  let conversationRepo: ConversationRepository;
  let eventRecorder: ConversationEventRecorder;
  let referralRecorder: ReferralLifecycleRecorder;
  let interactor: CreateDealFromWorkflowInteractor;

  beforeEach(() => {
    dealRecordRepo = {
      create: vi.fn(async (seed) => makeDeal(seed)),
      findById: vi.fn(),
      findByConversationId: vi.fn(),
      findByConsultationRequestId: vi.fn(async () => null),
      findByLeadRecordId: vi.fn(async () => null),
      listByStatus: vi.fn(),
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

    interactor = new CreateDealFromWorkflowInteractor(
      dealRecordRepo,
      consultationRequestRepo,
      leadRecordRepo,
      conversationRepo,
      eventRecorder,
      referralRecorder,
    );
  });

  it("creates a draft deal from a reviewed consultation request", async () => {
    const deal = await interactor.createFromConsultationRequest("admin_1", "cr_1");

    expect(dealRecordRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      consultationRequestId: "cr_1",
      lane: "organization",
      recommendedServiceType: "advisory",
      status: "draft",
      founderNote: "Strong fit.",
    }));
    expect(eventRecorder.record).toHaveBeenCalledWith("conv_1", "deal_created", expect.objectContaining({
      adminUserId: "admin_1",
      sourceType: "consultation_request",
      sourceId: "cr_1",
    }));
    expect(referralRecorder.recordDealCreated).toHaveBeenCalledWith({
      conversationId: "conv_1",
      dealId: "deal_1",
      lane: "organization",
      sourceType: "consultation_request",
      sourceId: "cr_1",
    });
    expect(deal.consultationRequestId).toBe("cr_1");
  });

  it("creates a draft deal from a qualified lead", async () => {
    const deal = await interactor.createFromQualifiedLead("admin_1", "lead_1");

    expect(dealRecordRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      leadRecordId: "lead_1",
      userId: "usr_1",
      lane: "development",
      recommendedServiceType: "delivery",
      nextAction: "Prepare a technical scoping call.",
    }));
    expect(eventRecorder.record).toHaveBeenCalledWith("conv_1", "deal_created", expect.objectContaining({
      sourceType: "lead_record",
      sourceId: "lead_1",
    }));
    expect(referralRecorder.recordDealCreated).toHaveBeenCalledWith({
      conversationId: "conv_1",
      dealId: "deal_1",
      lane: "development",
      sourceType: "lead_record",
      sourceId: "lead_1",
    });
    expect(deal.leadRecordId).toBe("lead_1");
  });

  it("rejects missing workflow sources", async () => {
    vi.mocked(consultationRequestRepo.findById).mockResolvedValueOnce(null);

    await expect(interactor.createFromConsultationRequest("admin_1", "missing")).rejects.toBeInstanceOf(
      WorkflowSourceNotFoundError,
    );
  });

  it("rejects non-qualified leads", async () => {
    vi.mocked(leadRecordRepo.findById).mockResolvedValueOnce(makeLeadRecord({ triageState: "contacted" }));

    await expect(interactor.createFromQualifiedLead("admin_1", "lead_1")).rejects.toBeInstanceOf(
      DealCreationEligibilityError,
    );
  });

  it("rejects duplicate conversions", async () => {
    vi.mocked(dealRecordRepo.findByConsultationRequestId).mockResolvedValueOnce(makeDeal());

    await expect(interactor.createFromConsultationRequest("admin_1", "cr_1")).rejects.toBeInstanceOf(
      DealAlreadyExistsError,
    );
  });

  it("rejects individual-lane consultation requests", async () => {
    vi.mocked(consultationRequestRepo.findById).mockResolvedValueOnce(
      makeConsultationRequest({
        id: "cr_2",
        conversationId: "conv_2",
        userId: "usr_2",
        lane: "individual",
        requestSummary: "Need personal training.",
        founderNote: null,
      }),
    );

    await expect(interactor.createFromConsultationRequest("admin_1", "cr_2")).rejects.toBeInstanceOf(
      DealCreationEligibilityError,
    );
  });

  it("rejects qualified leads when the source conversation is missing", async () => {
    vi.mocked(conversationRepo.findById).mockResolvedValueOnce(null);

    await expect(interactor.createFromQualifiedLead("admin_1", "lead_1")).rejects.toBeInstanceOf(
      WorkflowSourceNotFoundError,
    );
  });
});