import type Database from "better-sqlite3";
import type { Conversation, ConversationSummary } from "@/core/entities/conversation";
import {
  createConversationRoutingSnapshot,
  isConversationLane,
} from "@/core/entities/conversation-routing";
import type { ConversationRepository } from "@/core/use-cases/ConversationRepository";

export class ConversationDataMapper implements ConversationRepository {
  constructor(private db: Database.Database) {}

  async create(conv: {
    id: string;
    userId: string;
    title: string;
    status?: "active" | "archived";
    sessionSource?: string;
    referralSource?: string;
  }): Promise<Conversation> {
    const status = conv.status ?? "active";
    const sessionSource = conv.sessionSource ?? "unknown";
    const referralSource = conv.referralSource ?? null;
    this.db
      .prepare(
        `INSERT INTO conversations (id, user_id, title, status, session_source, referral_source) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(conv.id, conv.userId, conv.title, status, sessionSource, referralSource);

    const row = this.db
      .prepare(`SELECT * FROM conversations WHERE id = ?`)
      .get(conv.id) as ConversationRow;

    return mapRow(row);
  }

  async listByUser(userId: string): Promise<ConversationSummary[]> {
    const rows = this.db
      .prepare(
        `SELECT c.id, c.title, c.updated_at, c.message_count
         FROM conversations c
         WHERE c.user_id = ?
         ORDER BY c.updated_at DESC`,
      )
      .all(userId) as Array<{
      id: string;
      title: string;
      updated_at: string;
      message_count: number;
    }>;

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      updatedAt: r.updated_at,
      messageCount: r.message_count,
    }));
  }

  async findById(id: string): Promise<Conversation | null> {
    const row = this.db
      .prepare(`SELECT * FROM conversations WHERE id = ?`)
      .get(id) as ConversationRow | undefined;

    return row ? mapRow(row) : null;
  }

  async findActiveByUser(userId: string): Promise<Conversation | null> {
    const row = this.db
      .prepare(
        `SELECT * FROM conversations WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT 1`,
      )
      .get(userId) as ConversationRow | undefined;

    return row ? mapRow(row) : null;
  }

  async archiveByUser(userId: string): Promise<void> {
    this.db
      .prepare(
        `UPDATE conversations SET status = 'archived' WHERE user_id = ? AND status = 'active'`,
      )
      .run(userId);
  }

  async delete(id: string): Promise<void> {
    this.db.prepare(`DELETE FROM conversations WHERE id = ?`).run(id);
  }

  async updateTitle(id: string, title: string): Promise<void> {
    this.db
      .prepare(`UPDATE conversations SET title = ? WHERE id = ?`)
      .run(title, id);
  }

  async touch(id: string): Promise<void> {
    this.db
      .prepare(`UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`)
      .run(id);
  }

  async incrementMessageCount(id: string): Promise<void> {
    this.db
      .prepare(`UPDATE conversations SET message_count = message_count + 1 WHERE id = ?`)
      .run(id);
  }

  async setFirstMessageAt(id: string, timestamp: string): Promise<void> {
    this.db
      .prepare(`UPDATE conversations SET first_message_at = ? WHERE id = ? AND first_message_at IS NULL`)
      .run(timestamp, id);
  }

  async recordMessageAppended(id: string, timestamp: string): Promise<void> {
    this.db
      .prepare(
        `UPDATE conversations
         SET message_count = message_count + 1,
             first_message_at = COALESCE(first_message_at, ?),
             updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(timestamp, id);
  }

  async recordUserMessageAppendedWithEvent(
    id: string,
    timestamp: string,
    metadata: { role: "user"; token_estimate: number },
  ): Promise<void> {
    const recordAppend = this.db.transaction((conversationId: string, createdAt: string, eventMetadata: string) => {
      this.db
        .prepare(
          `UPDATE conversations
           SET message_count = message_count + 1,
               first_message_at = COALESCE(first_message_at, ?),
               updated_at = datetime('now')
           WHERE id = ?`,
        )
        .run(createdAt, conversationId);

      this.db
        .prepare(
          `INSERT INTO conversation_events (id, conversation_id, event_type, metadata)
           VALUES (?, ?, 'message_sent', ?)`,
        )
        .run(crypto.randomUUID().replace(/-/g, ""), conversationId, eventMetadata);
    });

    recordAppend(id, timestamp, JSON.stringify(metadata));
  }

  async setLastToolUsed(id: string, toolName: string): Promise<void> {
    this.db
      .prepare(`UPDATE conversations SET last_tool_used = ? WHERE id = ?`)
      .run(toolName, id);
  }

  async setConvertedFrom(id: string, anonUserId: string): Promise<void> {
    this.db
      .prepare(`UPDATE conversations SET converted_from = ? WHERE id = ?`)
      .run(anonUserId, id);
  }

  async setReferralSource(id: string, referralSource: string): Promise<void> {
    this.db
      .prepare(`UPDATE conversations SET referral_source = ? WHERE id = ?`)
      .run(referralSource, id);
  }

  async updateRoutingSnapshot(
    id: string,
    snapshot: Parameters<ConversationRepository["updateRoutingSnapshot"]>[1],
  ): Promise<void> {
    this.db
      .prepare(
        `UPDATE conversations
         SET lane = ?,
             lane_confidence = ?,
             recommended_next_step = ?,
             detected_need_summary = ?,
             lane_last_analyzed_at = ?
         WHERE id = ?`,
      )
      .run(
        snapshot.lane,
        snapshot.confidence,
        snapshot.recommendedNextStep,
        snapshot.detectedNeedSummary,
        snapshot.lastAnalyzedAt,
        id,
      );
  }

  // ── Admin methods (D4.7) ───────────────────────────────────────────

  async listForAdmin(filters: {
    status?: string;
    lane?: string;
    sessionSource?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Conversation[]> {
    const clauses: string[] = ["1=1"];
    const params: unknown[] = [];

    if (filters.status) {
      clauses.push("c.status = ?");
      params.push(filters.status);
    }
    if (filters.lane) {
      clauses.push("c.lane = ?");
      params.push(filters.lane);
    }
    if (filters.sessionSource) {
      clauses.push("c.session_source = ?");
      params.push(filters.sessionSource);
    }

    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;
    params.push(limit, offset);

    const rows = this.db
      .prepare(
        `SELECT * FROM conversations c
         WHERE ${clauses.join(" AND ")}
         ORDER BY c.updated_at DESC
         LIMIT ? OFFSET ?`,
      )
      .all(...params) as ConversationRow[];

    return rows.map(mapRow);
  }

  async countForAdmin(filters: {
    status?: string;
    lane?: string;
    sessionSource?: string;
  } = {}): Promise<number> {
    const clauses: string[] = ["1=1"];
    const params: unknown[] = [];

    if (filters.status) {
      clauses.push("status = ?");
      params.push(filters.status);
    }
    if (filters.lane) {
      clauses.push("lane = ?");
      params.push(filters.lane);
    }
    if (filters.sessionSource) {
      clauses.push("session_source = ?");
      params.push(filters.sessionSource);
    }

    const row = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM conversations WHERE ${clauses.join(" AND ")}`,
      )
      .get(...params) as { count: number };

    return row.count;
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = this.db
      .prepare(`SELECT status, COUNT(*) as count FROM conversations GROUP BY status`)
      .all() as Array<{ status: string; count: number }>;

    const result: Record<string, number> = {};
    for (const r of rows) result[r.status] = r.count;
    return result;
  }

  async countByLane(): Promise<Record<string, number>> {
    const rows = this.db
      .prepare(`SELECT lane, COUNT(*) as count FROM conversations GROUP BY lane`)
      .all() as Array<{ lane: string; count: number }>;

    const result: Record<string, number> = {};
    for (const r of rows) result[r.lane] = r.count;
    return result;
  }

  async setConversationMode(id: string, mode: "ai" | "human"): Promise<void> {
    this.db
      .prepare(`UPDATE conversations SET conversation_mode = ? WHERE id = ?`)
      .run(mode, id);
  }

  async archiveById(id: string): Promise<void> {
    this.db
      .prepare(`UPDATE conversations SET status = 'archived' WHERE id = ?`)
      .run(id);
  }

  async transferOwnership(fromUserId: string, toUserId: string): Promise<string[]> {
    const rows = this.db
      .prepare(`SELECT id FROM conversations WHERE user_id = ?`)
      .all(fromUserId) as Array<{ id: string }>;

    if (rows.length > 0) {
      this.db
        .prepare(
          `UPDATE conversations SET user_id = ?, converted_from = ? WHERE user_id = ?`,
        )
        .run(toUserId, fromUserId, fromUserId);
    }

    return rows.map((r) => r.id);
  }
}

type ConversationRow = {
  id: string;
  user_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  converted_from: string | null;
  message_count: number;
  first_message_at: string | null;
  last_tool_used: string | null;
  session_source: string;
  prompt_version: number | null;
  lane: string;
  lane_confidence: number | null;
  recommended_next_step: string | null;
  detected_need_summary: string | null;
  lane_last_analyzed_at: string | null;
  referral_source: string | null;
};

function mapRow(row: ConversationRow): Conversation {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    status: row.status as "active" | "archived",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    convertedFrom: row.converted_from,
    messageCount: row.message_count,
    firstMessageAt: row.first_message_at,
    lastToolUsed: row.last_tool_used,
    sessionSource: row.session_source,
    promptVersion: row.prompt_version,
    routingSnapshot: createConversationRoutingSnapshot({
      lane: isConversationLane(row.lane) ? row.lane : "uncertain",
      confidence: row.lane_confidence,
      recommendedNextStep: row.recommended_next_step,
      detectedNeedSummary: row.detected_need_summary,
      lastAnalyzedAt: row.lane_last_analyzed_at,
    }),
    referralSource: row.referral_source,
  };
}
