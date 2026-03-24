import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ConsultationRequest, ConsultationRequestSeed } from "@/core/entities/consultation-request";
import type { Conversation } from "@/core/entities/conversation";
import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";
import type { ConsultationRequestRepository } from "./ConsultationRequestRepository";
import type { ConversationRepository } from "./ConversationRepository";
import type { ConversationEventRecorder } from "./ConversationEventRecorder";
import {
  RequestConsultationInteractor,
  ConsultationRequestError,
  DuplicateConsultationRequestError,
} from "./RequestConsultationInteractor";

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: "conv_1",
    userId: "usr_1",
    title: "Test conversation",
    status: "active",
    createdAt: "2026-03-18T08:00:00.000Z",
    updatedAt: "2026-03-18T09:00:00.000Z",
    convertedFrom: null,
    messageCount: 4,
    firstMessageAt: null,
    lastToolUsed: null,
    sessionSource: "authenticated",
    promptVersion: null,
    routingSnapshot: createConversationRoutingSnapshot({ lane: "organization", confidence: 0.85 }),
    referralSource: null,
    ...overrides,
  };
}

function makeRequest(overrides: Partial<ConsultationRequest> = {}): ConsultationRequest {
  return {
    id: "cr_abc123",
    conversationId: "conv_1",
    userId: "usr_1",
    lane: "organization",
    requestSummary: "Need help",
    status: "pending",
    founderNote: null,
    createdAt: "2026-03-18T10:00:00.000Z",
    updatedAt: "2026-03-18T10:00:00.000Z",
    ...overrides,
  };
}

describe("RequestConsultationInteractor", () => {
  let consultationRepo: ConsultationRequestRepository;
  let conversationRepo: Pick<ConversationRepository, "findById">;
  let eventRecorder: ConversationEventRecorder;
  let interactor: RequestConsultationInteractor;

  beforeEach(() => {
    consultationRepo = {
      create: vi.fn(async (seed: ConsultationRequestSeed) => makeRequest({ lane: seed.lane, requestSummary: seed.requestSummary })),
      findById: vi.fn(async () => null),
      findByConversationId: vi.fn(async () => null),
      listByStatus: vi.fn(async () => []),
      updateStatus: vi.fn(async () => null),
    };

    conversationRepo = {
      findById: vi.fn(async () => makeConversation()),
    };

    eventRecorder = {
      record: vi.fn(async () => {}),
    } as unknown as ConversationEventRecorder;

    interactor = new RequestConsultationInteractor(
      consultationRepo,
      conversationRepo as ConversationRepository,
      eventRecorder,
    );
  });

  it("creates a consultation request from a valid owned conversation", async () => {
    const result = await interactor.requestConsultation("usr_1", "conv_1", "Need help with workflow");

    expect(result.status).toBe("pending");
    expect(result.lane).toBe("organization");
    expect(consultationRepo.create).toHaveBeenCalledWith({
      conversationId: "conv_1",
      userId: "usr_1",
      lane: "organization",
      requestSummary: "Need help with workflow",
    });
    expect(eventRecorder.record).toHaveBeenCalledWith(
      "conv_1",
      "consultation_requested",
      expect.objectContaining({ lane: "organization" }),
    );
  });

  it("rejects if conversation does not belong to user", async () => {
    vi.mocked(conversationRepo.findById).mockResolvedValueOnce(
      makeConversation({ userId: "usr_other" }),
    );

    await expect(
      interactor.requestConsultation("usr_1", "conv_1", "Help"),
    ).rejects.toThrow(ConsultationRequestError);
  });

  it("rejects if conversation does not exist", async () => {
    vi.mocked(conversationRepo.findById).mockResolvedValueOnce(null);

    await expect(
      interactor.requestConsultation("usr_1", "conv_1", "Help"),
    ).rejects.toThrow(ConsultationRequestError);
  });

  it("rejects if a request already exists for this conversation", async () => {
    vi.mocked(consultationRepo.findByConversationId).mockResolvedValueOnce(
      makeRequest(),
    );

    await expect(
      interactor.requestConsultation("usr_1", "conv_1", "Help"),
    ).rejects.toThrow(DuplicateConsultationRequestError);
  });

  it("lane is pulled from the conversation routing snapshot", async () => {
    vi.mocked(conversationRepo.findById).mockResolvedValueOnce(
      makeConversation({
        routingSnapshot: createConversationRoutingSnapshot({ lane: "development", confidence: 0.9 }),
      }),
    );

    await interactor.requestConsultation("usr_1", "conv_1", "Dev help");

    expect(consultationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ lane: "development" }),
    );
  });
});
