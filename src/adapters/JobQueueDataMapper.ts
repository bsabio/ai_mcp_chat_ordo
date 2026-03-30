import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type {
  JobClaimOptions,
  JobEvent,
  JobEventSeed,
  JobRequest,
  JobRequestSeed,
  JobStatus,
  JobStatusUpdate,
} from "@/core/entities/job";
import type { JobQueueRepository } from "@/core/use-cases/JobQueueRepository";

type JobRequestRow = {
  id: string;
  conversation_id: string;
  user_id: string | null;
  tool_name: string;
  status: JobRequest["status"];
  priority: number;
  dedupe_key: string | null;
  initiator_type: JobRequest["initiatorType"];
  request_payload_json: string;
  result_payload_json: string | null;
  error_message: string | null;
  progress_percent: number | null;
  progress_label: string | null;
  attempt_count: number;
  lease_expires_at: string | null;
  claimed_by: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

type JobEventRow = {
  id: string;
  job_id: string;
  conversation_id: string;
  sequence: number;
  event_type: JobEvent["eventType"];
  event_payload_json: string;
  created_at: string;
};

type UserScopedJobEventRow = JobEventRow & {
  user_sequence: number;
};

function mapJobRequest(row: JobRequestRow): JobRequest {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    userId: row.user_id,
    toolName: row.tool_name,
    status: row.status,
    priority: row.priority,
    dedupeKey: row.dedupe_key,
    initiatorType: row.initiator_type,
    requestPayload: JSON.parse(row.request_payload_json) as Record<string, unknown>,
    resultPayload: row.result_payload_json ? JSON.parse(row.result_payload_json) : null,
    errorMessage: row.error_message,
    progressPercent: row.progress_percent,
    progressLabel: row.progress_label,
    attemptCount: row.attempt_count,
    leaseExpiresAt: row.lease_expires_at,
    claimedBy: row.claimed_by,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

function mapJobEvent(row: JobEventRow): JobEvent {
  return {
    id: row.id,
    jobId: row.job_id,
    conversationId: row.conversation_id,
    sequence: row.sequence,
    eventType: row.event_type,
    payload: JSON.parse(row.event_payload_json) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

function mapUserScopedJobEvent(row: UserScopedJobEventRow): JobEvent {
  return {
    id: row.id,
    jobId: row.job_id,
    conversationId: row.conversation_id,
    sequence: row.user_sequence,
    eventType: row.event_type,
    payload: JSON.parse(row.event_payload_json) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

export class JobQueueDataMapper implements JobQueueRepository {
  constructor(private readonly db: Database.Database) {}

  async createJob(seed: JobRequestSeed): Promise<JobRequest> {
    const id = `job_${randomUUID()}`;
    const now = new Date().toISOString();
    const initiatorType = seed.initiatorType ?? (seed.userId ? "user" : "anonymous_session");

    this.db.prepare(
      `INSERT INTO job_requests (
        id, conversation_id, user_id, tool_name, status, priority, dedupe_key, initiator_type,
        request_payload_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      seed.conversationId,
      seed.userId ?? null,
      seed.toolName,
      seed.priority ?? 100,
      seed.dedupeKey ?? null,
      initiatorType,
      JSON.stringify(seed.requestPayload),
      now,
      now,
    );

    const row = this.db
      .prepare(`SELECT * FROM job_requests WHERE id = ?`)
      .get(id) as JobRequestRow;
    return mapJobRequest(row);
  }

  async findJobById(id: string): Promise<JobRequest | null> {
    const row = this.db
      .prepare(`SELECT * FROM job_requests WHERE id = ?`)
      .get(id) as JobRequestRow | undefined;
    return row ? mapJobRequest(row) : null;
  }

  async findLatestEventForJob(jobId: string): Promise<JobEvent | null> {
    const row = this.db.prepare(
      `SELECT * FROM job_events
       WHERE job_id = ?
       ORDER BY sequence DESC
       LIMIT 1`,
    ).get(jobId) as JobEventRow | undefined;

    return row ? mapJobEvent(row) : null;
  }

  async findActiveJobByDedupeKey(conversationId: string, dedupeKey: string): Promise<JobRequest | null> {
    const row = this.db.prepare(
      `SELECT * FROM job_requests
       WHERE conversation_id = ?
         AND dedupe_key = ?
         AND status IN ('queued', 'running')
       ORDER BY created_at DESC
       LIMIT 1`,
    ).get(conversationId, dedupeKey) as JobRequestRow | undefined;

    return row ? mapJobRequest(row) : null;
  }

  async listJobsByConversation(
    conversationId: string,
    options?: { statuses?: JobStatus[]; limit?: number },
  ): Promise<JobRequest[]> {
    const statuses = options?.statuses ?? [];
    const limit = options?.limit ?? 25;

    if (statuses.length > 0) {
      const placeholders = statuses.map(() => "?").join(", ");
      const rows = this.db.prepare(
        `SELECT * FROM job_requests
         WHERE conversation_id = ?
           AND status IN (${placeholders})
         ORDER BY updated_at DESC, created_at DESC
         LIMIT ?`,
      ).all(conversationId, ...statuses, limit) as JobRequestRow[];

      return rows.map(mapJobRequest);
    }

    const rows = this.db.prepare(
      `SELECT * FROM job_requests
       WHERE conversation_id = ?
       ORDER BY updated_at DESC, created_at DESC
       LIMIT ?`,
    ).all(conversationId, limit) as JobRequestRow[];

    return rows.map(mapJobRequest);
  }

  async listJobsByUser(
    userId: string,
    options?: { statuses?: JobStatus[]; limit?: number },
  ): Promise<JobRequest[]> {
    const statuses = options?.statuses ?? [];
    const limit = options?.limit ?? 25;

    if (statuses.length > 0) {
      const placeholders = statuses.map(() => "?").join(", ");
      const rows = this.db.prepare(
        `SELECT jr.* FROM job_requests jr
         INNER JOIN conversations c ON c.id = jr.conversation_id
         WHERE c.user_id = ?
           AND jr.status IN (${placeholders})
         ORDER BY jr.updated_at DESC, jr.created_at DESC
         LIMIT ?`,
      ).all(userId, ...statuses, limit) as JobRequestRow[];

      return rows.map(mapJobRequest);
    }

    const rows = this.db.prepare(
      `SELECT jr.* FROM job_requests jr
       INNER JOIN conversations c ON c.id = jr.conversation_id
       WHERE c.user_id = ?
       ORDER BY jr.updated_at DESC, jr.created_at DESC
       LIMIT ?`,
    ).all(userId, limit) as JobRequestRow[];

    return rows.map(mapJobRequest);
  }

  async appendEvent(seed: JobEventSeed): Promise<JobEvent> {
    const insertEvent = this.db.transaction((eventSeed: JobEventSeed) => {
      const id = `jobevt_${randomUUID()}`;
      const nextSequenceRow = this.db.prepare(
        `SELECT COALESCE(MAX(sequence), 0) + 1 AS next_sequence
         FROM job_events
         WHERE conversation_id = ?`,
      ).get(eventSeed.conversationId) as { next_sequence: number };
      const sequence = nextSequenceRow.next_sequence;
      const now = new Date().toISOString();

      this.db.prepare(
        `INSERT INTO job_events (id, job_id, conversation_id, sequence, event_type, event_payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        eventSeed.jobId,
        eventSeed.conversationId,
        sequence,
        eventSeed.eventType,
        JSON.stringify(eventSeed.payload ?? {}),
        now,
      );

      return this.db
        .prepare(`SELECT * FROM job_events WHERE id = ?`)
        .get(id) as JobEventRow;
    });

    return mapJobEvent(insertEvent(seed));
  }

  async requeueExpiredRunningJobs(now: string): Promise<number> {
    const result = this.db.prepare(
      `UPDATE job_requests
       SET status = 'queued',
           lease_expires_at = NULL,
           claimed_by = NULL,
           updated_at = ?
       WHERE status = 'running'
         AND lease_expires_at IS NOT NULL
         AND lease_expires_at <= ?`,
    ).run(now, now);

    return result.changes;
  }

  async listConversationEvents(
    conversationId: string,
    options?: { afterSequence?: number; limit?: number },
  ): Promise<JobEvent[]> {
    const afterSequence = options?.afterSequence ?? 0;
    const limit = options?.limit ?? 100;
    const rows = this.db.prepare(
      `SELECT * FROM job_events
       WHERE conversation_id = ?
         AND sequence > ?
       ORDER BY sequence ASC
       LIMIT ?`,
    ).all(conversationId, afterSequence, limit) as JobEventRow[];

    return rows.map(mapJobEvent);
  }

  async listUserEvents(
    userId: string,
    options?: { afterSequence?: number; limit?: number },
  ): Promise<JobEvent[]> {
    const afterSequence = options?.afterSequence ?? 0;
    const limit = options?.limit ?? 100;
    const rows = this.db.prepare(
      `SELECT je.id,
              je.job_id,
              je.conversation_id,
              je.sequence,
              je.event_type,
              je.event_payload_json,
              je.created_at,
              je.rowid AS user_sequence
       FROM job_events je
       INNER JOIN conversations c ON c.id = je.conversation_id
       WHERE c.user_id = ?
         AND je.rowid > ?
       ORDER BY je.rowid ASC
       LIMIT ?`,
    ).all(userId, afterSequence, limit) as UserScopedJobEventRow[];

    return rows.map(mapUserScopedJobEvent);
  }

  async listEventsForUserJob(
    userId: string,
    jobId: string,
    options?: { limit?: number },
  ): Promise<JobEvent[]> {
    const limit = options?.limit ?? 100;
    const rows = this.db.prepare(
      `SELECT *
       FROM (
         SELECT je.*
         FROM job_events je
         INNER JOIN conversations c ON c.id = je.conversation_id
         WHERE c.user_id = ?
           AND je.job_id = ?
         ORDER BY je.sequence DESC
         LIMIT ?
       ) recent_events
       ORDER BY sequence ASC`,
    ).all(userId, jobId, limit) as JobEventRow[];

    return rows.map(mapJobEvent);
  }

  async claimNextQueuedJob(options: JobClaimOptions): Promise<JobRequest | null> {
    const claim = this.db.transaction((claimOptions: JobClaimOptions) => {
      const now = claimOptions.now ?? new Date().toISOString();
      const candidate = this.db.prepare(
        `SELECT * FROM job_requests
         WHERE status = 'queued'
         ORDER BY priority ASC, created_at ASC
         LIMIT 1`,
      ).get() as JobRequestRow | undefined;

      if (!candidate) {
        return null;
      }

      const result = this.db.prepare(
        `UPDATE job_requests
         SET status = 'running',
             claimed_by = ?,
             lease_expires_at = ?,
             started_at = COALESCE(started_at, ?),
             attempt_count = attempt_count + 1,
             updated_at = ?
         WHERE id = ? AND status = 'queued'`,
      ).run(
        claimOptions.workerId,
        claimOptions.leaseExpiresAt,
        now,
        now,
        candidate.id,
      );

      if (result.changes === 0) {
        return null;
      }

      return this.db
        .prepare(`SELECT * FROM job_requests WHERE id = ?`)
        .get(candidate.id) as JobRequestRow;
    });

    const row = claim(options);
    return row ? mapJobRequest(row) : null;
  }

  async updateJobStatus(id: string, update: JobStatusUpdate): Promise<JobRequest> {
    const now = new Date().toISOString();
    const current = this.db
      .prepare(`SELECT * FROM job_requests WHERE id = ?`)
      .get(id) as JobRequestRow | undefined;

    if (!current) {
      throw new Error(`Deferred job not found: ${id}`);
    }

    this.db.prepare(
      `UPDATE job_requests
       SET status = ?,
           result_payload_json = ?,
           error_message = ?,
           progress_percent = ?,
           progress_label = ?,
           started_at = COALESCE(?, started_at),
           completed_at = ?,
           lease_expires_at = ?,
           claimed_by = ?,
           attempt_count = attempt_count + ?,
           updated_at = ?
       WHERE id = ?`,
    ).run(
      update.status,
        update.resultPayload === undefined ? current.result_payload_json : JSON.stringify(update.resultPayload),
        update.errorMessage === undefined ? current.error_message : update.errorMessage,
        update.progressPercent === undefined ? current.progress_percent : update.progressPercent,
        update.progressLabel === undefined ? current.progress_label : update.progressLabel,
        update.startedAt === undefined ? current.started_at : update.startedAt,
        update.completedAt === undefined ? current.completed_at : update.completedAt,
        update.leaseExpiresAt === undefined ? current.lease_expires_at : update.leaseExpiresAt,
        update.claimedBy === undefined ? current.claimed_by : update.claimedBy,
      update.incrementAttemptCount ? 1 : 0,
      now,
      id,
    );

    const row = this.db
      .prepare(`SELECT * FROM job_requests WHERE id = ?`)
      .get(id) as JobRequestRow | undefined;

    if (!row) {
      throw new Error(`Deferred job not found after update: ${id}`);
    }

    return mapJobRequest(row);
  }

  async cancelJob(id: string, now: string): Promise<JobRequest> {
    return this.updateJobStatus(id, {
      status: "canceled",
      completedAt: now,
      leaseExpiresAt: null,
      claimedBy: null,
    });
  }

  // ── Admin methods ──────────────────────────────────────────────────

  async listForAdmin(filters: {
    status?: JobStatus;
    toolName?: string;
    afterDate?: string;
    beforeDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<JobRequest[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.status) {
      conditions.push("jr.status = ?");
      params.push(filters.status);
    }
    if (filters.toolName) {
      conditions.push("jr.tool_name = ?");
      params.push(filters.toolName);
    }
    if (filters.afterDate) {
      conditions.push("jr.created_at >= ?");
      params.push(filters.afterDate);
    }
    if (filters.beforeDate) {
      conditions.push("jr.created_at <= ?");
      params.push(filters.beforeDate);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    const rows = this.db.prepare(
      `SELECT jr.* FROM job_requests jr ${where} ORDER BY jr.created_at DESC LIMIT ? OFFSET ?`,
    ).all(...params, limit, offset) as JobRequestRow[];

    return rows.map(mapJobRequest);
  }

  async countForAdmin(filters: {
    status?: JobStatus;
    toolName?: string;
    afterDate?: string;
    beforeDate?: string;
  }): Promise<number> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }
    if (filters.toolName) {
      conditions.push("tool_name = ?");
      params.push(filters.toolName);
    }
    if (filters.afterDate) {
      conditions.push("created_at >= ?");
      params.push(filters.afterDate);
    }
    if (filters.beforeDate) {
      conditions.push("created_at <= ?");
      params.push(filters.beforeDate);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const row = this.db.prepare(
      `SELECT COUNT(*) AS cnt FROM job_requests ${where}`,
    ).get(...params) as { cnt: number };

    return row.cnt;
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = this.db.prepare(
      `SELECT status, COUNT(*) AS cnt FROM job_requests GROUP BY status`,
    ).all() as Array<{ status: string; cnt: number }>;

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.status] = row.cnt;
    }
    return counts;
  }

  async countByToolName(): Promise<Record<string, number>> {
    const rows = this.db.prepare(
      `SELECT tool_name, COUNT(*) AS cnt FROM job_requests GROUP BY tool_name`,
    ).all() as Array<{ tool_name: string; cnt: number }>;

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.tool_name] = row.cnt;
    }
    return counts;
  }

  async listEventsForJob(jobId: string): Promise<JobEvent[]> {
    const rows = this.db.prepare(
      `SELECT * FROM job_events WHERE job_id = ? ORDER BY sequence ASC`,
    ).all(jobId) as JobEventRow[];
    return rows.map(mapJobEvent);
  }
}
