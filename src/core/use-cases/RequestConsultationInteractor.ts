import type { ConsultationRequest } from "../entities/consultation-request";
import type { ConsultationRequestRepository } from "./ConsultationRequestRepository";
import type { ConversationRepository } from "./ConversationRepository";
import type { ConversationEventRecorder } from "./ConversationEventRecorder";
import type { ReferralLifecycleRecorder } from "./ReferralLifecycleRecorder";

export class RequestConsultationInteractor {
  constructor(
    private readonly consultationRequestRepo: ConsultationRequestRepository,
    private readonly conversationRepo: ConversationRepository,
    private readonly eventRecorder?: ConversationEventRecorder,
    private readonly referralRecorder?: ReferralLifecycleRecorder,
  ) {}

  async requestConsultation(
    userId: string,
    conversationId: string,
    requestSummary: string,
  ): Promise<ConsultationRequest> {
    const conversation = await this.conversationRepo.findById(conversationId);

    if (!conversation || conversation.userId !== userId) {
      throw new ConsultationRequestError("Conversation not found or not owned by user.");
    }

    const existing = await this.consultationRequestRepo.findByConversationId(conversationId);

    if (existing) {
      throw new DuplicateConsultationRequestError(
        "A consultation request already exists for this conversation.",
      );
    }

    const lane = conversation.routingSnapshot.lane;
    const request = await this.consultationRequestRepo.create({
      conversationId,
      userId,
      lane,
      requestSummary,
    });

    await this.eventRecorder?.record(conversationId, "consultation_requested", {
      consultationRequestId: request.id,
      lane,
    });
    await this.referralRecorder?.recordConsultationRequested({
      conversationId,
      consultationRequestId: request.id,
      lane,
    });

    return request;
  }
}

export class ConsultationRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConsultationRequestError";
  }
}

export class DuplicateConsultationRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateConsultationRequestError";
  }
}
