import type Database from "better-sqlite3";

import {
  isApprenticeshipInterest,
  isTrainingPathLane,
  isTrainingPathRecommendation,
  isTrainingPathStatus,
  type TrainingPathRecommendation,
  type TrainingPathRecord,
  type TrainingPathRecordSeed,
  type TrainingPathRecordUpdate,
  type TrainingPathStatus,
} from "@/core/entities/training-path-record";
import type { TrainingPathRecordRepository } from "@/core/use-cases/TrainingPathRecordRepository";

interface TrainingPathRecordRow {
  id: string;
  conversation_id: string;
  lead_record_id: string | null;
  consultation_request_id: string | null;
  user_id: string;
  lane: string;
  current_role_or_background: string | null;
  technical_depth: string | null;
  primary_goal: string | null;
  preferred_format: string | null;
  apprenticeship_interest: string | null;
  recommended_path: string;
  fit_rationale: string | null;
  customer_summary: string | null;
  status: string;
  next_action: string | null;
  founder_note: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: TrainingPathRecordRow): TrainingPathRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    leadRecordId: row.lead_record_id,
    consultationRequestId: row.consultation_request_id,
    userId: row.user_id,
    lane: isTrainingPathLane(row.lane) ? row.lane : "individual",
    currentRoleOrBackground: row.current_role_or_background,
    technicalDepth: row.technical_depth,
    primaryGoal: row.primary_goal,
    preferredFormat: row.preferred_format,
    apprenticeshipInterest: isApprenticeshipInterest(row.apprenticeship_interest)
      ? row.apprenticeship_interest
      : null,
    recommendedPath: isTrainingPathRecommendation(row.recommended_path)
      ? row.recommended_path
      : "continue_conversation",
    fitRationale: row.fit_rationale,
    customerSummary: row.customer_summary,
    status: isTrainingPathStatus(row.status) ? row.status : "draft",
    nextAction: row.next_action,
    founderNote: row.founder_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class TrainingPathRecordDataMapper implements TrainingPathRecordRepository {
  constructor(private readonly db: Database.Database) {}

  async create(seed: TrainingPathRecordSeed): Promise<TrainingPathRecord> {
    const id = `training_${crypto.randomUUID()}`;

    this.db
      .prepare(
        `INSERT INTO training_path_records (
          id, conversation_id, lead_record_id, consultation_request_id, user_id, lane,
          current_role_or_background, technical_depth, primary_goal, preferred_format,
          apprenticeship_interest, recommended_path, fit_rationale, customer_summary,
          status, next_action, founder_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        seed.conversationId,
        seed.leadRecordId,
        seed.consultationRequestId,
        seed.userId,
        seed.lane ?? "individual",
        seed.currentRoleOrBackground,
        seed.technicalDepth,
        seed.primaryGoal,
        seed.preferredFormat,
        seed.apprenticeshipInterest,
        seed.recommendedPath ?? "continue_conversation",
        seed.fitRationale,
        seed.customerSummary,
        seed.status ?? "draft",
        seed.nextAction,
        seed.founderNote,
      );

    const row = this.db.prepare(`SELECT * FROM training_path_records WHERE id = ?`).get(id) as TrainingPathRecordRow;
    return mapRow(row);
  }

  async findById(id: string): Promise<TrainingPathRecord | null> {
    const row = this.db.prepare(`SELECT * FROM training_path_records WHERE id = ?`).get(id) as TrainingPathRecordRow | undefined;
    return row ? mapRow(row) : null;
  }

  async findByConversationId(conversationId: string): Promise<TrainingPathRecord | null> {
    const row = this.db.prepare(`SELECT * FROM training_path_records WHERE conversation_id = ?`).get(conversationId) as TrainingPathRecordRow | undefined;
    return row ? mapRow(row) : null;
  }

  async findByLeadRecordId(leadRecordId: string): Promise<TrainingPathRecord | null> {
    const row = this.db.prepare(`SELECT * FROM training_path_records WHERE lead_record_id = ?`).get(leadRecordId) as TrainingPathRecordRow | undefined;
    return row ? mapRow(row) : null;
  }

  async findByConsultationRequestId(consultationRequestId: string): Promise<TrainingPathRecord | null> {
    const row = this.db.prepare(`SELECT * FROM training_path_records WHERE consultation_request_id = ?`).get(consultationRequestId) as TrainingPathRecordRow | undefined;
    return row ? mapRow(row) : null;
  }

  async listByStatus(status: TrainingPathStatus): Promise<TrainingPathRecord[]> {
    const rows = this.db
      .prepare(`SELECT * FROM training_path_records WHERE status = ? ORDER BY created_at DESC`)
      .all(status) as TrainingPathRecordRow[];
    return rows.map(mapRow);
  }

  async listByRecommendedPath(recommendedPath: TrainingPathRecommendation): Promise<TrainingPathRecord[]> {
    const rows = this.db
      .prepare(`SELECT * FROM training_path_records WHERE recommended_path = ? ORDER BY created_at DESC`)
      .all(recommendedPath) as TrainingPathRecordRow[];
    return rows.map(mapRow);
  }

  async update(id: string, update: TrainingPathRecordUpdate): Promise<TrainingPathRecord | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    this.db
      .prepare(
        `UPDATE training_path_records
         SET current_role_or_background = ?,
             technical_depth = ?,
             primary_goal = ?,
             preferred_format = ?,
             apprenticeship_interest = ?,
             recommended_path = ?,
             fit_rationale = ?,
             customer_summary = ?,
             next_action = ?,
             founder_note = ?,
             updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(
        Object.prototype.hasOwnProperty.call(update, "currentRoleOrBackground")
          ? update.currentRoleOrBackground ?? null
          : existing.currentRoleOrBackground,
        Object.prototype.hasOwnProperty.call(update, "technicalDepth")
          ? update.technicalDepth ?? null
          : existing.technicalDepth,
        Object.prototype.hasOwnProperty.call(update, "primaryGoal")
          ? update.primaryGoal ?? null
          : existing.primaryGoal,
        Object.prototype.hasOwnProperty.call(update, "preferredFormat")
          ? update.preferredFormat ?? null
          : existing.preferredFormat,
        Object.prototype.hasOwnProperty.call(update, "apprenticeshipInterest")
          ? update.apprenticeshipInterest ?? null
          : existing.apprenticeshipInterest,
        update.recommendedPath ?? existing.recommendedPath,
        Object.prototype.hasOwnProperty.call(update, "fitRationale")
          ? update.fitRationale ?? null
          : existing.fitRationale,
        Object.prototype.hasOwnProperty.call(update, "customerSummary")
          ? update.customerSummary ?? null
          : existing.customerSummary,
        Object.prototype.hasOwnProperty.call(update, "nextAction")
          ? update.nextAction ?? null
          : existing.nextAction,
        Object.prototype.hasOwnProperty.call(update, "founderNote")
          ? update.founderNote ?? null
          : existing.founderNote,
        id,
      );

    return this.findById(id);
  }

  async updateStatus(
    id: string,
    status: TrainingPathStatus,
    metadata?: { founderNote?: string | null },
  ): Promise<TrainingPathRecord | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const founderNote = metadata && "founderNote" in metadata
      ? metadata.founderNote ?? null
      : existing.founderNote;

    this.db
      .prepare(
        `UPDATE training_path_records
         SET status = ?,
             founder_note = ?,
             updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(status, founderNote, id);

    return this.findById(id);
  }
}