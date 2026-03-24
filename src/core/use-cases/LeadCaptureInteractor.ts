import type { ConversationRepository } from "./ConversationRepository";
import type { ConversationEventRecorder } from "./ConversationEventRecorder";
import type {
  LeadCaptureSubmission,
  LeadRecord,
  LeadRecordSeed,
} from "../entities/lead-record";
import type { LeadRecordRepository } from "./LeadRecordRepository";

export class LeadCaptureInteractor {
  constructor(
    private readonly leadRecordRepo: LeadRecordRepository,
    private readonly conversationRepo: ConversationRepository,
    private readonly eventRecorder?: ConversationEventRecorder,
  ) {}

  async markCaptureTriggered(
    conversationId: string,
    userId: string,
    seed: Omit<LeadRecordSeed, "conversationId">,
  ): Promise<LeadRecord> {
    await this.assertConversationOwnership(conversationId, userId);

    const leadRecord = await this.leadRecordRepo.upsertTriggered({
      conversationId,
      ...seed,
    });

    await this.eventRecorder?.record(conversationId, "contact_capture_triggered", {
      lane: leadRecord.lane,
      recommended_next_action: leadRecord.recommendedNextAction,
    });

    return leadRecord;
  }

  async submitCapture(
    userId: string,
    submission: LeadCaptureSubmission,
  ): Promise<LeadRecord> {
    await this.assertConversationOwnership(submission.conversationId, userId);

    const leadRecord = await this.leadRecordRepo.submitCapture(submission);

    await this.eventRecorder?.record(submission.conversationId, "contact_capture_completed", {
      lane: leadRecord.lane,
      email: leadRecord.email,
      organization: leadRecord.organization,
      role_or_title: leadRecord.roleOrTitle,
    });

    return leadRecord;
  }

  async dismissCapture(conversationId: string, userId: string): Promise<LeadRecord | null> {
    await this.assertConversationOwnership(conversationId, userId);

    const updated = await this.leadRecordRepo.updateStatus(conversationId, "dismissed");

    await this.eventRecorder?.record(conversationId, "contact_capture_dismissed", {});

    return updated;
  }

  private async assertConversationOwnership(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.conversationRepo.findById(conversationId);

    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }
  }
}