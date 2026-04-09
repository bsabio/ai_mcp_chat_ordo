import type { ConsultationRequestStatus } from "../entities/consultation-request";
import type { ConsultationRequestRepository } from "./ConsultationRequestRepository";
import type { ConversationEventRecorder } from "./ConversationEventRecorder";
import { NotFoundError, ValidationError } from "../common/errors";

const LEGAL_TRANSITIONS: Record<ConsultationRequestStatus, ConsultationRequestStatus[]> = {
  pending: ["reviewed", "declined"],
  reviewed: ["scheduled", "declined"],
  scheduled: ["reviewed"],
  declined: [],
};

export class TriageConsultationRequestInteractor {
  constructor(
    private readonly consultationRequestRepo: ConsultationRequestRepository,
    private readonly eventRecorder?: ConversationEventRecorder,
  ) {}

  async triage(
    adminUserId: string,
    consultationRequestId: string,
    newStatus: ConsultationRequestStatus,
    founderNote?: string | null,
  ) {
    const existing = await this.consultationRequestRepo.findById(consultationRequestId);

    if (!existing) {
      throw new ConsultationRequestNotFoundError("Consultation request not found.");
    }

    if (!LEGAL_TRANSITIONS[existing.status].includes(newStatus)) {
      throw new ConsultationRequestTransitionError(
        `Illegal consultation request transition: ${existing.status} -> ${newStatus}.`,
      );
    }

    const updated = await this.consultationRequestRepo.updateStatus(consultationRequestId, newStatus, {
      founderNote,
    });

    if (!updated) {
      throw new ConsultationRequestNotFoundError("Consultation request not found.");
    }

    await this.eventRecorder?.record(existing.conversationId, "consultation_status_changed", {
      adminUserId,
      consultationRequestId,
      fromStatus: existing.status,
      toStatus: newStatus,
      founderNote: founderNote ?? null,
    });

    return updated;
  }
}

export class ConsultationRequestNotFoundError extends NotFoundError {}

export class ConsultationRequestTransitionError extends ValidationError {}
