import type Database from "better-sqlite3";

import type {
  ConsultationRequest,
  ConsultationRequestSeed,
  ConsultationRequestStatus,
} from "@/core/entities/consultation-request";
import { isConversationLane } from "@/core/entities/conversation-routing";
import type { ConsultationRequestRepository } from "@/core/use-cases/ConsultationRequestRepository";

interface ConsultationRequestRow {
  id: string;
  conversation_id: string;
  user_id: string;
  lane: string;
  request_summary: string;
  status: string;
  founder_note: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: ConsultationRequestRow): ConsultationRequest {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    userId: row.user_id,
    lane: isConversationLane(row.lane) ? row.lane : "uncertain",
    requestSummary: row.request_summary,
    status: row.status as ConsultationRequestStatus,
    founderNote: row.founder_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ConsultationRequestDataMapper implements ConsultationRequestRepository {
  constructor(private readonly db: Database.Database) {}

  async create(seed: ConsultationRequestSeed): Promise<ConsultationRequest> {
    const id = `cr_${crypto.randomUUID()}`;
    this.db
      .prepare(
        `INSERT INTO consultation_requests (id, conversation_id, user_id, lane, request_summary)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(id, seed.conversationId, seed.userId, seed.lane, seed.requestSummary);

    const row = this.db
      .prepare(`SELECT * FROM consultation_requests WHERE id = ?`)
      .get(id) as ConsultationRequestRow;

    return mapRow(row);
  }

  async findById(id: string): Promise<ConsultationRequest | null> {
    const row = this.db
      .prepare(`SELECT * FROM consultation_requests WHERE id = ?`)
      .get(id) as ConsultationRequestRow | undefined;

    return row ? mapRow(row) : null;
  }

  async findByConversationId(conversationId: string): Promise<ConsultationRequest | null> {
    const row = this.db
      .prepare(`SELECT * FROM consultation_requests WHERE conversation_id = ?`)
      .get(conversationId) as ConsultationRequestRow | undefined;

    return row ? mapRow(row) : null;
  }

  async listByStatus(status: ConsultationRequestStatus): Promise<ConsultationRequest[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM consultation_requests WHERE status = ? ORDER BY created_at DESC`,
      )
      .all(status) as ConsultationRequestRow[];

    return rows.map(mapRow);
  }

  async updateStatus(
    id: string,
    status: ConsultationRequestStatus,
    metadata?: { founderNote?: string | null },
  ): Promise<ConsultationRequest | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const founderNote =
      metadata && "founderNote" in metadata
        ? metadata.founderNote ?? null
        : existing.founderNote;

    this.db
      .prepare(
        `UPDATE consultation_requests
         SET status = ?,
             founder_note = ?,
             updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(status, founderNote, id);

    return this.findById(id);
  }
}
