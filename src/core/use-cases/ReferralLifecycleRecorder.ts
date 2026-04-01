import type { CreditStatus, ReferralStatus } from "@/core/entities/Referral";

export interface ReferralLifecycleRecorder {
  recordLeadSubmitted(input: {
    conversationId: string;
    leadRecordId: string;
    captureStatus: string;
    triageState: string;
    lane: string;
  }): Promise<void>;
  recordConsultationRequested(input: {
    conversationId: string;
    consultationRequestId: string;
    lane: string;
  }): Promise<void>;
  recordDealCreated(input: {
    conversationId: string;
    dealId: string;
    lane: string;
    sourceType: string;
    sourceId: string;
  }): Promise<void>;
  recordTrainingPathCreated(input: {
    conversationId: string;
    trainingPathId: string;
    recommendedPath: string;
    sourceType: string;
    sourceId: string;
  }): Promise<void>;
  recordCreditStateChanged(input: {
    referralId: string;
    actorUserId: string;
    creditStatus: CreditStatus;
    reason: string;
    referralStatus?: ReferralStatus;
    idempotencyKey?: string;
  }): Promise<void>;
}