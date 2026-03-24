import type {
  TrainingPathRecommendation,
  TrainingPathRecord,
  TrainingPathRecordSeed,
  TrainingPathRecordUpdate,
  TrainingPathStatus,
} from "../entities/training-path-record";

export interface TrainingPathRecordRepository {
  create(seed: TrainingPathRecordSeed): Promise<TrainingPathRecord>;
  findById(id: string): Promise<TrainingPathRecord | null>;
  findByConversationId(conversationId: string): Promise<TrainingPathRecord | null>;
  findByLeadRecordId(leadRecordId: string): Promise<TrainingPathRecord | null>;
  findByConsultationRequestId(consultationRequestId: string): Promise<TrainingPathRecord | null>;
  listByStatus(status: TrainingPathStatus): Promise<TrainingPathRecord[]>;
  listByRecommendedPath(recommendedPath: TrainingPathRecommendation): Promise<TrainingPathRecord[]>;
  update(id: string, update: TrainingPathRecordUpdate): Promise<TrainingPathRecord | null>;
  updateStatus(
    id: string,
    status: TrainingPathStatus,
    metadata?: {
      founderNote?: string | null;
    },
  ): Promise<TrainingPathRecord | null>;
}