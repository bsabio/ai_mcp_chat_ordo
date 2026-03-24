import type {
  DealRecord,
  DealRecordSeed,
  DealRecordUpdate,
  DealStatus,
} from "../entities/deal-record";

export interface DealRecordRepository {
  create(seed: DealRecordSeed): Promise<DealRecord>;
  findById(id: string): Promise<DealRecord | null>;
  findByConversationId(conversationId: string): Promise<DealRecord | null>;
  findByConsultationRequestId(consultationRequestId: string): Promise<DealRecord | null>;
  findByLeadRecordId(leadRecordId: string): Promise<DealRecord | null>;
  listByStatus(status: DealStatus): Promise<DealRecord[]>;
  update(id: string, update: DealRecordUpdate): Promise<DealRecord | null>;
  updateStatus(
    id: string,
    status: DealStatus,
    metadata?: {
      founderNote?: string | null;
      customerResponseNote?: string | null;
    },
  ): Promise<DealRecord | null>;
}