import type Database from "better-sqlite3";
import type { Message, NewMessage } from "@/core/entities/conversation";
import type { MessageRepository } from "@/core/use-cases/MessageRepository";
import type { MessagePart } from "@/core/entities/message-parts";

export class MessageDataMapper implements MessageRepository {
  constructor(private db: Database.Database) {}

  async create(msg: NewMessage & { tokenEstimate?: number; createdAt?: string }): Promise<Message> {
    const record = createMessageRecord(msg);

    this.db
      .prepare(
        `INSERT INTO messages (id, conversation_id, role, content, parts, created_at, token_estimate)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        msg.conversationId,
        msg.role,
        msg.content,
        record.partsJson,
        record.createdAt,
        record.tokenEstimate,
      );

    return {
      id: record.id,
      conversationId: msg.conversationId,
      role: msg.role,
      content: msg.content,
      parts: msg.parts,
      createdAt: record.createdAt,
      tokenEstimate: record.tokenEstimate,
    };
  }

  async findById(id: string): Promise<Message | null> {
    const row = this.db
      .prepare(
        `SELECT id, conversation_id, role, content, parts, created_at, token_estimate
         FROM messages
         WHERE id = ?`,
      )
      .get(id) as MessageRow | undefined;

    return row ? mapRow(row) : null;
  }

  async createWithinConversationLimit(
    msg: NewMessage & { tokenEstimate?: number; createdAt?: string },
    maxMessages: number,
  ): Promise<Message | null> {
    const record = createMessageRecord(msg);

    const result = this.db
      .prepare(
        `INSERT INTO messages (id, conversation_id, role, content, parts, created_at, token_estimate)
         SELECT ?, ?, ?, ?, ?, ?, ?
         WHERE (SELECT COUNT(*) FROM messages WHERE conversation_id = ?) < ?`,
      )
      .run(
        record.id,
        msg.conversationId,
        msg.role,
        msg.content,
        record.partsJson,
        record.createdAt,
        record.tokenEstimate,
        msg.conversationId,
        maxMessages,
      );

    if (result.changes === 0) {
      return null;
    }

    return {
      id: record.id,
      conversationId: msg.conversationId,
      role: msg.role,
      content: msg.content,
      parts: msg.parts,
      createdAt: record.createdAt,
      tokenEstimate: record.tokenEstimate,
    };
  }

  async listByConversation(conversationId: string): Promise<Message[]> {
    const rows = this.db
      .prepare(
        `SELECT id, conversation_id, role, content, parts, created_at, token_estimate
         FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at ASC`,
      )
      .all(conversationId) as MessageRow[];

    return rows.map(mapRow);
  }

  async listRecentByConversation(conversationId: string, limit: number): Promise<Message[]> {
    const rows = this.db
      .prepare(
        `SELECT id, conversation_id, role, content, parts, created_at, token_estimate
         FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .all(conversationId, limit) as MessageRow[];

    return rows.reverse().map(mapRow);
  }

  async countByConversation(conversationId: string): Promise<number> {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS count FROM messages WHERE conversation_id = ?`)
      .get(conversationId) as { count: number };

    return row.count;
  }

  async update(id: string, update: { content: string; parts: NewMessage["parts"] }): Promise<Message> {
    this.db
      .prepare(
        `UPDATE messages
         SET content = ?,
             parts = ?
         WHERE id = ?`,
      )
      .run(update.content, JSON.stringify(update.parts), id);

    const row = this.db
      .prepare(
        `SELECT id, conversation_id, role, content, parts, created_at, token_estimate
         FROM messages
         WHERE id = ?`,
      )
      .get(id) as MessageRow | undefined;

    if (!row) {
      throw new Error(`Message not found after update: ${id}`);
    }

    return mapRow(row);
  }
}

type MessageRow = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  parts: string;
  created_at: string;
  token_estimate: number;
};

function createMessageRecord(msg: NewMessage & { tokenEstimate?: number; createdAt?: string }): {
  id: string;
  createdAt: string;
  partsJson: string;
  tokenEstimate: number;
} {
  return {
    id: `msg_${crypto.randomUUID()}`,
    createdAt: msg.createdAt ?? new Date().toISOString(),
    partsJson: JSON.stringify(msg.parts),
    tokenEstimate: msg.tokenEstimate ?? Math.ceil(msg.content.length / 4),
  };
}

function mapRow(row: MessageRow): Message {
  let parts: MessagePart[];
  try {
    parts = JSON.parse(row.parts) as MessagePart[];
  } catch {
    parts = [];
  }

  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as "user" | "assistant" | "system",
    content: row.content,
    parts,
    createdAt: row.created_at,
    tokenEstimate: row.token_estimate ?? 0,
  };
}
