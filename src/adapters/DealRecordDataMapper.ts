import type Database from "better-sqlite3";

import {
  isDealLane,
  isDealStatus,
  type DealRecord,
  type DealRecordSeed,
  type DealRecordUpdate,
  type DealStatus,
} from "@/core/entities/deal-record";
import type { DealRecordRepository } from "@/core/use-cases/DealRecordRepository";

interface DealRecordRow {
  id: string;
  conversation_id: string;
  consultation_request_id: string | null;
  lead_record_id: string | null;
  user_id: string;
  lane: string;
  title: string;
  organization_name: string | null;
  problem_summary: string;
  proposed_scope: string;
  recommended_service_type: string;
  estimated_hours: number | null;
  estimated_training_days: number | null;
  estimated_price: number | null;
  status: string;
  next_action: string | null;
  assumptions: string | null;
  open_questions: string | null;
  founder_note: string | null;
  customer_response_note: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: DealRecordRow): DealRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    consultationRequestId: row.consultation_request_id,
    leadRecordId: row.lead_record_id,
    userId: row.user_id,
    lane: isDealLane(row.lane) ? row.lane : "organization",
    title: row.title,
    organizationName: row.organization_name,
    problemSummary: row.problem_summary,
    proposedScope: row.proposed_scope,
    recommendedServiceType: row.recommended_service_type,
    estimatedHours: row.estimated_hours,
    estimatedTrainingDays: row.estimated_training_days,
    estimatedPrice: row.estimated_price,
    status: isDealStatus(row.status) ? row.status : "draft",
    nextAction: row.next_action,
    assumptions: row.assumptions,
    openQuestions: row.open_questions,
    founderNote: row.founder_note,
    customerResponseNote: row.customer_response_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class DealRecordDataMapper implements DealRecordRepository {
  constructor(private readonly db: Database.Database) {}

  async create(seed: DealRecordSeed): Promise<DealRecord> {
    const id = `deal_${crypto.randomUUID()}`;
    this.db
      .prepare(
        `INSERT INTO deal_records (
          id, conversation_id, consultation_request_id, lead_record_id, user_id, lane,
          title, organization_name, problem_summary, proposed_scope, recommended_service_type,
          estimated_hours, estimated_training_days, estimated_price, status, next_action,
          assumptions, open_questions, founder_note, customer_response_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        seed.conversationId,
        seed.consultationRequestId,
        seed.leadRecordId,
        seed.userId,
        seed.lane,
        seed.title,
        seed.organizationName,
        seed.problemSummary,
        seed.proposedScope,
        seed.recommendedServiceType,
        seed.estimatedHours,
        seed.estimatedTrainingDays,
        seed.estimatedPrice,
        seed.status ?? "draft",
        seed.nextAction,
        seed.assumptions,
        seed.openQuestions,
        seed.founderNote,
        seed.customerResponseNote,
      );

    const row = this.db.prepare(`SELECT * FROM deal_records WHERE id = ?`).get(id) as DealRecordRow;
    return mapRow(row);
  }

  async findById(id: string): Promise<DealRecord | null> {
    const row = this.db.prepare(`SELECT * FROM deal_records WHERE id = ?`).get(id) as DealRecordRow | undefined;
    return row ? mapRow(row) : null;
  }

  async findByConversationId(conversationId: string): Promise<DealRecord | null> {
    const row = this.db.prepare(`SELECT * FROM deal_records WHERE conversation_id = ?`).get(conversationId) as DealRecordRow | undefined;
    return row ? mapRow(row) : null;
  }

  async findByConsultationRequestId(consultationRequestId: string): Promise<DealRecord | null> {
    const row = this.db.prepare(`SELECT * FROM deal_records WHERE consultation_request_id = ?`).get(consultationRequestId) as DealRecordRow | undefined;
    return row ? mapRow(row) : null;
  }

  async findByLeadRecordId(leadRecordId: string): Promise<DealRecord | null> {
    const row = this.db.prepare(`SELECT * FROM deal_records WHERE lead_record_id = ?`).get(leadRecordId) as DealRecordRow | undefined;
    return row ? mapRow(row) : null;
  }

  async listByStatus(status: DealStatus): Promise<DealRecord[]> {
    const rows = this.db.prepare(`SELECT * FROM deal_records WHERE status = ? ORDER BY created_at DESC`).all(status) as DealRecordRow[];
    return rows.map(mapRow);
  }

  async update(id: string, update: DealRecordUpdate): Promise<DealRecord | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    this.db
      .prepare(
        `UPDATE deal_records
         SET title = ?,
             organization_name = ?,
             problem_summary = ?,
             proposed_scope = ?,
             recommended_service_type = ?,
             estimated_hours = ?,
             estimated_training_days = ?,
             estimated_price = ?,
             next_action = ?,
             assumptions = ?,
             open_questions = ?,
             founder_note = ?,
             customer_response_note = ?,
             updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(
        update.title ?? existing.title,
        Object.prototype.hasOwnProperty.call(update, "organizationName") ? update.organizationName ?? null : existing.organizationName,
        update.problemSummary ?? existing.problemSummary,
        update.proposedScope ?? existing.proposedScope,
        update.recommendedServiceType ?? existing.recommendedServiceType,
        Object.prototype.hasOwnProperty.call(update, "estimatedHours") ? update.estimatedHours ?? null : existing.estimatedHours,
        Object.prototype.hasOwnProperty.call(update, "estimatedTrainingDays") ? update.estimatedTrainingDays ?? null : existing.estimatedTrainingDays,
        Object.prototype.hasOwnProperty.call(update, "estimatedPrice") ? update.estimatedPrice ?? null : existing.estimatedPrice,
        Object.prototype.hasOwnProperty.call(update, "nextAction") ? update.nextAction ?? null : existing.nextAction,
        Object.prototype.hasOwnProperty.call(update, "assumptions") ? update.assumptions ?? null : existing.assumptions,
        Object.prototype.hasOwnProperty.call(update, "openQuestions") ? update.openQuestions ?? null : existing.openQuestions,
        Object.prototype.hasOwnProperty.call(update, "founderNote") ? update.founderNote ?? null : existing.founderNote,
        Object.prototype.hasOwnProperty.call(update, "customerResponseNote") ? update.customerResponseNote ?? null : existing.customerResponseNote,
        id,
      );

    return this.findById(id);
  }

  async updateStatus(
    id: string,
    status: DealStatus,
    metadata?: { founderNote?: string | null; customerResponseNote?: string | null },
  ): Promise<DealRecord | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const founderNote = metadata && "founderNote" in metadata
      ? metadata.founderNote ?? null
      : existing.founderNote;
    const customerResponseNote = metadata && "customerResponseNote" in metadata
      ? metadata.customerResponseNote ?? null
      : existing.customerResponseNote;

    this.db
      .prepare(
        `UPDATE deal_records
         SET status = ?,
             founder_note = ?,
             customer_response_note = ?,
             updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(status, founderNote, customerResponseNote, id);

    return this.findById(id);
  }

  // ── Admin query methods ─────────────────────────────────────────────

  async listForAdmin(filters: { status?: string; limit?: number; offset?: number }): Promise<DealAdminRow[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filters.status) {
      clauses.push("status = ?");
      params.push(filters.status);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;

    const rows = this.db
      .prepare(
        `SELECT id, title, organization_name, recommended_service_type, estimated_price, status, follow_up_at, created_at
         FROM deal_records ${where}
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset) as Array<{
        id: string; title: string; organization_name: string | null;
        recommended_service_type: string; estimated_price: number | null;
        status: string; follow_up_at: string | null; created_at: string;
      }>;

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      organizationName: r.organization_name,
      recommendedServiceType: r.recommended_service_type,
      estimatedPrice: r.estimated_price,
      status: r.status,
      followUpAt: r.follow_up_at,
      createdAt: r.created_at,
    }));
  }

  async countForAdmin(filters: { status?: string }): Promise<number> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filters.status) {
      clauses.push("status = ?");
      params.push(filters.status);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const row = this.db
      .prepare(`SELECT COUNT(*) AS cnt FROM deal_records ${where}`)
      .get(...params) as { cnt: number };

    return row.cnt;
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = this.db
      .prepare(`SELECT status, COUNT(*) AS cnt FROM deal_records GROUP BY status`)
      .all() as Array<{ status: string; cnt: number }>;

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.status] = row.cnt;
    }
    return counts;
  }

  async listOverdueFollowUps(): Promise<DealAdminRow[]> {
    const rows = this.db
      .prepare(
        `SELECT id, title, organization_name, recommended_service_type, estimated_price, status, follow_up_at, created_at
         FROM deal_records
         WHERE follow_up_at IS NOT NULL AND follow_up_at < datetime('now')
         ORDER BY follow_up_at ASC`,
      )
      .all() as Array<{
        id: string; title: string; organization_name: string | null;
        recommended_service_type: string; estimated_price: number | null;
        status: string; follow_up_at: string | null; created_at: string;
      }>;

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      organizationName: r.organization_name,
      recommendedServiceType: r.recommended_service_type,
      estimatedPrice: r.estimated_price,
      status: r.status,
      followUpAt: r.follow_up_at,
      createdAt: r.created_at,
    }));
  }

  async updateFollowUp(id: string, followUpAt: string | null): Promise<void> {
    this.db
      .prepare(`UPDATE deal_records SET follow_up_at = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(followUpAt, id);
  }
}

export interface DealAdminRow {
  id: string;
  title: string;
  organizationName: string | null;
  recommendedServiceType: string;
  estimatedPrice: number | null;
  status: string;
  followUpAt: string | null;
  createdAt: string;
}