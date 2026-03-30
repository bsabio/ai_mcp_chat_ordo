import type Database from "better-sqlite3";

import type {
  LeadCaptureStatus,
  LeadCaptureSubmission,
  LeadQualificationUpdate,
  LeadRecord,
  LeadRecordSeed,
  LeadTriageState,
} from "@/core/entities/lead-record";
import {
  isLeadAuthorityLevel,
  isLeadBudgetSignal,
  isLeadTrainingFit,
  isLeadUrgency,
} from "@/core/entities/lead-record";
import { isConversationLane } from "@/core/entities/conversation-routing";
import type { LeadRecordRepository } from "@/core/use-cases/LeadRecordRepository";

interface LeadRecordRow {
  id: string;
  conversation_id: string;
  lane: string;
  name: string | null;
  email: string | null;
  organization: string | null;
  role_or_title: string | null;
  training_goal: string | null;
  authority_level: string | null;
  urgency: string | null;
  budget_signal: string | null;
  technical_environment: string | null;
  training_fit: string | null;
  problem_summary: string | null;
  recommended_next_action: string | null;
  capture_status: string;
  triage_state: string;
  founder_note: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  triaged_at: string | null;
}

function mapRow(row: LeadRecordRow): LeadRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    lane: isConversationLane(row.lane) ? row.lane : "uncertain",
    name: row.name,
    email: row.email,
    organization: row.organization,
    roleOrTitle: row.role_or_title,
    trainingGoal: row.training_goal,
    authorityLevel: isLeadAuthorityLevel(row.authority_level) ? row.authority_level : null,
    urgency: isLeadUrgency(row.urgency) ? row.urgency : null,
    budgetSignal: isLeadBudgetSignal(row.budget_signal) ? row.budget_signal : null,
    technicalEnvironment: row.technical_environment,
    trainingFit: isLeadTrainingFit(row.training_fit) ? row.training_fit : null,
    problemSummary: row.problem_summary,
    recommendedNextAction: row.recommended_next_action,
    captureStatus: row.capture_status as LeadCaptureStatus,
    triageState: row.triage_state as LeadTriageState,
    founderNote: row.founder_note,
    lastContactedAt: row.last_contacted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submittedAt: row.submitted_at,
    triagedAt: row.triaged_at,
  };
}

export class LeadRecordDataMapper implements LeadRecordRepository {
  constructor(private readonly db: Database.Database) {}

  async findById(id: string): Promise<LeadRecord | null> {
    const row = this.db
      .prepare(`SELECT * FROM lead_records WHERE id = ?`)
      .get(id) as LeadRecordRow | undefined;

    return row ? mapRow(row) : null;
  }

  async findByConversationId(conversationId: string): Promise<LeadRecord | null> {
    const row = this.db
      .prepare(`SELECT * FROM lead_records WHERE conversation_id = ?`)
      .get(conversationId) as LeadRecordRow | undefined;

    return row ? mapRow(row) : null;
  }

  async upsertTriggered(seed: LeadRecordSeed): Promise<LeadRecord> {
    const existing = await this.findByConversationId(seed.conversationId);

    if (!existing) {
      const id = `lead_${crypto.randomUUID()}`;
      this.db
        .prepare(
          `INSERT INTO lead_records (
            id, conversation_id, lane, problem_summary, recommended_next_action, capture_status, triage_state,
            founder_note, last_contacted_at
          ) VALUES (?, ?, ?, ?, ?, 'triggered', 'new', NULL, NULL)`,
        )
        .run(
          id,
          seed.conversationId,
          seed.lane,
          seed.problemSummary,
          seed.recommendedNextAction,
        );

      const created = this.db
        .prepare(`SELECT * FROM lead_records WHERE id = ?`)
        .get(id) as LeadRecordRow;

      return mapRow(created);
    }

    this.db
      .prepare(
        `UPDATE lead_records
         SET lane = ?,
             problem_summary = ?,
             recommended_next_action = ?,
             capture_status = 'triggered',
             updated_at = datetime('now')
         WHERE conversation_id = ?`,
      )
      .run(
        seed.lane,
        seed.problemSummary,
        seed.recommendedNextAction,
        seed.conversationId,
      );

    const updated = this.db
      .prepare(`SELECT * FROM lead_records WHERE conversation_id = ?`)
      .get(seed.conversationId) as LeadRecordRow;

    return mapRow(updated);
  }

  async submitCapture(submission: LeadCaptureSubmission): Promise<LeadRecord> {
    const existing = await this.findByConversationId(submission.conversationId);

    if (!existing) {
      const id = `lead_${crypto.randomUUID()}`;
      this.db
        .prepare(
          `INSERT INTO lead_records (
            id, conversation_id, lane, name, email, organization, role_or_title,
            training_goal, problem_summary, recommended_next_action, capture_status, triage_state,
            founder_note, last_contacted_at, submitted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', 'new', NULL, NULL, datetime('now'))`,
        )
        .run(
          id,
          submission.conversationId,
          submission.lane,
          submission.name,
          submission.email,
          submission.organization,
          submission.roleOrTitle,
          submission.trainingGoal,
          submission.problemSummary,
          submission.recommendedNextAction,
        );

      const created = this.db
        .prepare(`SELECT * FROM lead_records WHERE id = ?`)
        .get(id) as LeadRecordRow;

      return mapRow(created);
    }

    this.db
      .prepare(
        `UPDATE lead_records
         SET lane = ?,
             name = ?,
             email = ?,
             organization = ?,
             role_or_title = ?,
             training_goal = ?,
             problem_summary = ?,
             recommended_next_action = ?,
             capture_status = 'submitted',
             triage_state = CASE WHEN capture_status = 'submitted' THEN triage_state ELSE 'new' END,
             founder_note = CASE WHEN capture_status = 'submitted' THEN founder_note ELSE NULL END,
             last_contacted_at = CASE WHEN capture_status = 'submitted' THEN last_contacted_at ELSE NULL END,
             submitted_at = datetime('now'),
             triaged_at = CASE WHEN capture_status = 'submitted' THEN triaged_at ELSE NULL END,
             updated_at = datetime('now')
         WHERE conversation_id = ?`,
      )
      .run(
        submission.lane,
        submission.name,
        submission.email,
        submission.organization,
        submission.roleOrTitle,
        submission.trainingGoal,
        submission.problemSummary,
        submission.recommendedNextAction,
        submission.conversationId,
      );

    const updated = this.db
      .prepare(`SELECT * FROM lead_records WHERE conversation_id = ?`)
      .get(submission.conversationId) as LeadRecordRow;

    return mapRow(updated);
  }

  async updateStatus(conversationId: string, status: LeadCaptureStatus): Promise<LeadRecord | null> {
    this.db
      .prepare(
        `UPDATE lead_records
         SET capture_status = ?,
             updated_at = datetime('now')
         WHERE conversation_id = ?`,
      )
      .run(status, conversationId);

    return this.findByConversationId(conversationId);
  }

  async updateTriageState(
    id: string,
    triageState: LeadTriageState,
    metadata?: {
      founderNote?: string | null;
      lastContactedAt?: string | null;
    },
  ): Promise<LeadRecord | null> {
    const existing = await this.findById(id);

    if (!existing) {
      return null;
    }

    const founderNote = metadata && "founderNote" in metadata
      ? metadata.founderNote ?? null
      : existing.founderNote;
    const lastContactedAt = metadata && "lastContactedAt" in metadata
      ? metadata.lastContactedAt ?? null
      : existing.lastContactedAt;

    this.db
      .prepare(
        `UPDATE lead_records
         SET triage_state = ?,
             founder_note = ?,
             last_contacted_at = ?,
             triaged_at = datetime('now'),
             updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(
        triageState,
        founderNote,
        lastContactedAt,
        id,
      );

    return this.findById(id);
  }

  async updateQualification(
    id: string,
    qualification: LeadQualificationUpdate,
  ): Promise<LeadRecord | null> {
    const existing = await this.findById(id);

    if (!existing) {
      return null;
    }

    const authorityLevel = Object.prototype.hasOwnProperty.call(qualification, "authorityLevel")
      ? qualification.authorityLevel ?? null
      : existing.authorityLevel;
    const urgency = Object.prototype.hasOwnProperty.call(qualification, "urgency")
      ? qualification.urgency ?? null
      : existing.urgency;
    const budgetSignal = Object.prototype.hasOwnProperty.call(qualification, "budgetSignal")
      ? qualification.budgetSignal ?? null
      : existing.budgetSignal;
    const technicalEnvironment = Object.prototype.hasOwnProperty.call(qualification, "technicalEnvironment")
      ? qualification.technicalEnvironment ?? null
      : existing.technicalEnvironment;
    const trainingFit = Object.prototype.hasOwnProperty.call(qualification, "trainingFit")
      ? qualification.trainingFit ?? null
      : existing.trainingFit;

    this.db
      .prepare(
        `UPDATE lead_records
         SET authority_level = ?,
             urgency = ?,
             budget_signal = ?,
             technical_environment = ?,
             training_fit = ?,
             updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(
        authorityLevel,
        urgency,
        budgetSignal,
        technicalEnvironment,
        trainingFit,
        id,
      );

    return this.findById(id);
  }

  // ── Admin query methods ─────────────────────────────────────────────

  async listForAdmin(filters: { triageState?: string; limit?: number; offset?: number }): Promise<LeadAdminRow[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filters.triageState) {
      clauses.push("triage_state = ?");
      params.push(filters.triageState);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;

    const rows = this.db
      .prepare(
        `SELECT id, conversation_id, lane, name, email, organization, triage_state, follow_up_at, created_at
         FROM lead_records ${where}
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset) as Array<{
        id: string; conversation_id: string; lane: string; name: string | null;
        email: string | null; organization: string | null; triage_state: string;
        follow_up_at: string | null; created_at: string;
      }>;

    return rows.map((r) => ({
      id: r.id,
      conversationId: r.conversation_id,
      lane: r.lane,
      name: r.name,
      email: r.email,
      organization: r.organization,
      triageState: r.triage_state,
      followUpAt: r.follow_up_at,
      createdAt: r.created_at,
    }));
  }

  async countForAdmin(filters: { triageState?: string }): Promise<number> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filters.triageState) {
      clauses.push("triage_state = ?");
      params.push(filters.triageState);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const row = this.db
      .prepare(`SELECT COUNT(*) AS cnt FROM lead_records ${where}`)
      .get(...params) as { cnt: number };

    return row.cnt;
  }

  async countByTriageState(): Promise<Record<string, number>> {
    const rows = this.db
      .prepare(`SELECT triage_state, COUNT(*) AS cnt FROM lead_records GROUP BY triage_state`)
      .all() as Array<{ triage_state: string; cnt: number }>;

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.triage_state] = row.cnt;
    }
    return counts;
  }

  async listOverdueFollowUps(): Promise<LeadAdminRow[]> {
    const rows = this.db
      .prepare(
        `SELECT id, conversation_id, lane, name, email, organization, triage_state, follow_up_at, created_at
         FROM lead_records
         WHERE follow_up_at IS NOT NULL AND follow_up_at < datetime('now')
         ORDER BY follow_up_at ASC`,
      )
      .all() as Array<{
        id: string; conversation_id: string; lane: string; name: string | null;
        email: string | null; organization: string | null; triage_state: string;
        follow_up_at: string | null; created_at: string;
      }>;

    return rows.map((r) => ({
      id: r.id,
      conversationId: r.conversation_id,
      lane: r.lane,
      name: r.name,
      email: r.email,
      organization: r.organization,
      triageState: r.triage_state,
      followUpAt: r.follow_up_at,
      createdAt: r.created_at,
    }));
  }

  async updateFollowUp(id: string, followUpAt: string | null): Promise<void> {
    this.db
      .prepare(`UPDATE lead_records SET follow_up_at = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(followUpAt, id);
  }
}

export interface LeadAdminRow {
  id: string;
  conversationId: string;
  lane: string;
  name: string | null;
  email: string | null;
  organization: string | null;
  triageState: string;
  followUpAt: string | null;
  createdAt: string;
}