import type {
  ConsultationRequest,
  ConsultationRequestSeed,
  ConsultationRequestStatus,
} from "../entities/consultation-request";

export interface ConsultationRequestRepository {
  create(seed: ConsultationRequestSeed): Promise<ConsultationRequest>;
  findById(id: string): Promise<ConsultationRequest | null>;
  findByConversationId(conversationId: string): Promise<ConsultationRequest | null>;
  listByStatus(status: ConsultationRequestStatus): Promise<ConsultationRequest[]>;
  updateStatus(
    id: string,
    status: ConsultationRequestStatus,
    metadata?: { founderNote?: string | null },
  ): Promise<ConsultationRequest | null>;
}
