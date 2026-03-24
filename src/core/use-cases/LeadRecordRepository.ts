import type {
  LeadCaptureStatus,
  LeadCaptureSubmission,
  LeadQualificationUpdate,
  LeadRecord,
  LeadRecordSeed,
  LeadTriageState,
} from "../entities/lead-record";

export interface LeadRecordRepository {
  findById(id: string): Promise<LeadRecord | null>;
  findByConversationId(conversationId: string): Promise<LeadRecord | null>;
  upsertTriggered(seed: LeadRecordSeed): Promise<LeadRecord>;
  submitCapture(submission: LeadCaptureSubmission): Promise<LeadRecord>;
  updateStatus(conversationId: string, status: LeadCaptureStatus): Promise<LeadRecord | null>;
  updateTriageState(
    id: string,
    triageState: LeadTriageState,
    metadata?: {
      founderNote?: string | null;
      lastContactedAt?: string | null;
    },
  ): Promise<LeadRecord | null>;
  updateQualification(
    id: string,
    qualification: LeadQualificationUpdate,
  ): Promise<LeadRecord | null>;
}