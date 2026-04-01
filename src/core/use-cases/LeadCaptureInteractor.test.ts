import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Conversation } from "@/core/entities/conversation";
import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";
import type { LeadCaptureSubmission, LeadRecord } from "@/core/entities/lead-record";
import type { ConversationEventRecorder } from "./ConversationEventRecorder";
import { LeadCaptureInteractor } from "./LeadCaptureInteractor";
import type { LeadRecordRepository } from "./LeadRecordRepository";
import type { ConversationRepository } from "./ConversationRepository";
import type { ReferralLifecycleRecorder } from "./ReferralLifecycleRecorder";

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: "conv_1",
    userId: "usr_1",
    title: "Current conversation",
    status: "active",
    createdAt: "2026-04-01T08:00:00.000Z",
    updatedAt: "2026-04-01T08:30:00.000Z",
    convertedFrom: null,
    messageCount: 3,
    firstMessageAt: null,
    lastToolUsed: null,
    sessionSource: "authenticated",
    promptVersion: null,
    routingSnapshot: createConversationRoutingSnapshot({ lane: "organization", confidence: 0.8 }),
    referralSource: null,
    ...overrides,
  };
}

function makeLeadRecord(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "lead_1",
    conversationId: "conv_1",
    lane: "organization",
    name: "Morgan Lee",
    email: "morgan@example.com",
    organization: "Northwind Labs",
    roleOrTitle: "COO",
    trainingGoal: null,
    authorityLevel: null,
    urgency: null,
    budgetSignal: null,
    technicalEnvironment: null,
    trainingFit: null,
    problemSummary: "Need help with approvals.",
    recommendedNextAction: "Schedule a scoping call.",
    captureStatus: "submitted",
    triageState: "new",
    founderNote: null,
    lastContactedAt: null,
    createdAt: "2026-04-01T09:00:00.000Z",
    updatedAt: "2026-04-01T09:05:00.000Z",
    submittedAt: "2026-04-01T09:05:00.000Z",
    triagedAt: null,
    ...overrides,
  };
}

describe("LeadCaptureInteractor", () => {
  let leadRecordRepo: LeadRecordRepository;
  let conversationRepo: Pick<ConversationRepository, "findById">;
  let eventRecorder: ConversationEventRecorder;
  let referralRecorder: ReferralLifecycleRecorder;
  let interactor: LeadCaptureInteractor;

  beforeEach(() => {
    leadRecordRepo = {
      findById: vi.fn(),
      findByConversationId: vi.fn(),
      upsertTriggered: vi.fn(),
      submitCapture: vi.fn(async (_submission: LeadCaptureSubmission) => makeLeadRecord()),
      updateStatus: vi.fn(),
      updateTriageState: vi.fn(),
      updateQualification: vi.fn(),
    };

    conversationRepo = {
      findById: vi.fn(async () => makeConversation()),
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

    interactor = new LeadCaptureInteractor(
      leadRecordRepo,
      conversationRepo as ConversationRepository,
      eventRecorder,
      referralRecorder,
    );
  });

  it("records a canonical referral lead milestone when capture is submitted", async () => {
    await interactor.submitCapture("usr_1", {
      conversationId: "conv_1",
      lane: "organization",
      name: "Morgan Lee",
      email: "morgan@example.com",
      organization: "Northwind Labs",
      roleOrTitle: "COO",
      trainingGoal: null,
      problemSummary: "Need help with approvals.",
      recommendedNextAction: "Schedule a scoping call.",
    });

    expect(referralRecorder.recordLeadSubmitted).toHaveBeenCalledWith({
      conversationId: "conv_1",
      leadRecordId: "lead_1",
      captureStatus: "submitted",
      triageState: "new",
      lane: "organization",
    });
  });
});