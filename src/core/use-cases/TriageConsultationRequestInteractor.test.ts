import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ConsultationRequest } from "@/core/entities/consultation-request";
import type { ConsultationRequestRepository } from "./ConsultationRequestRepository";
import type { ConversationEventRecorder } from "./ConversationEventRecorder";
import {
  ConsultationRequestNotFoundError,
  ConsultationRequestTransitionError,
  TriageConsultationRequestInteractor,
} from "./TriageConsultationRequestInteractor";

function makeRequest(overrides: Partial<ConsultationRequest> = {}): ConsultationRequest {
  return {
    id: "cr_1",
    conversationId: "conv_1",
    userId: "usr_1",
    lane: "organization",
    requestSummary: "Need help scoping workflow redesign.",
    status: "pending",
    founderNote: null,
    createdAt: "2026-03-19T08:00:00.000Z",
    updatedAt: "2026-03-19T08:00:00.000Z",
    ...overrides,
  };
}

describe("TriageConsultationRequestInteractor", () => {
  let consultationRepo: ConsultationRequestRepository;
  let eventRecorder: ConversationEventRecorder;
  let interactor: TriageConsultationRequestInteractor;

  beforeEach(() => {
    consultationRepo = {
      create: vi.fn(async () => makeRequest()),
      findById: vi.fn(async () => makeRequest()),
      findByConversationId: vi.fn(async () => null),
      listByStatus: vi.fn(async () => []),
      updateStatus: vi.fn(async (_id, status, metadata) => makeRequest({
        status,
        founderNote: metadata?.founderNote ?? null,
      })),
    };

    eventRecorder = {
      record: vi.fn(async () => {}),
    } as unknown as ConversationEventRecorder;

    interactor = new TriageConsultationRequestInteractor(consultationRepo, eventRecorder);
  });

  it("transitions pending to reviewed and records an event", async () => {
    const updated = await interactor.triage("admin_1", "cr_1", "reviewed", "Strong fit.");

    expect(updated.status).toBe("reviewed");
    expect(updated.founderNote).toBe("Strong fit.");
    expect(consultationRepo.updateStatus).toHaveBeenCalledWith("cr_1", "reviewed", {
      founderNote: "Strong fit.",
    });
    expect(eventRecorder.record).toHaveBeenCalledWith(
      "conv_1",
      "consultation_status_changed",
      expect.objectContaining({
        adminUserId: "admin_1",
        fromStatus: "pending",
        toStatus: "reviewed",
      }),
    );
  });

  it("transitions reviewed to scheduled", async () => {
    vi.mocked(consultationRepo.findById).mockResolvedValueOnce(
      makeRequest({ status: "reviewed" }),
    );

    const updated = await interactor.triage("admin_1", "cr_1", "scheduled");

    expect(updated.status).toBe("scheduled");
  });

  it("rejects illegal transitions", async () => {
    await expect(
      interactor.triage("admin_1", "cr_1", "scheduled"),
    ).rejects.toThrow(ConsultationRequestTransitionError);
  });

  it("rejects missing consultation requests", async () => {
    vi.mocked(consultationRepo.findById).mockResolvedValueOnce(null);

    await expect(
      interactor.triage("admin_1", "cr_missing", "reviewed"),
    ).rejects.toThrow(ConsultationRequestNotFoundError);
  });

  it("allows scheduled to reviewed reversal", async () => {
    vi.mocked(consultationRepo.findById).mockResolvedValueOnce(
      makeRequest({ status: "scheduled" }),
    );

    const updated = await interactor.triage("admin_1", "cr_1", "reviewed", null);

    expect(updated.status).toBe("reviewed");
  });
});