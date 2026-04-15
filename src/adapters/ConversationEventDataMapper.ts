import type Database from "better-sqlite3";
import type { ConversationEventRepository, ConversationEventData } from "@/core/use-cases/ConversationEventRecorder";

export class ConversationEventDataMapper implements ConversationEventRepository {
  constructor(private db: Database.Database) {}

  async record(event: {
    conversationId: string;
    eventType: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    const id = crypto.randomUUID().replace(/-/g, "");
    this.db
      .prepare(
        `INSERT INTO conversation_events (id, conversation_id, event_type, metadata)
         VALUES (?, ?, ?, ?)`,
      )
      .run(id, event.conversationId, event.eventType, JSON.stringify(event.metadata));
  }

  async listByConversation(conversationId: string): Promise<ConversationEventData[]> {
    const rows = this.db
      .prepare(
        `SELECT id, conversation_id as conversationId, event_type as eventType, metadata, created_at as createdAt
         FROM conversation_events
         WHERE conversation_id = ?
         ORDER BY created_at ASC`,
      )
      .all(conversationId) as Array<{
      id: string;
      conversationId: string;
      eventType: string;
      metadata: string;
      createdAt: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      conversationId: row.conversationId,
      eventType: row.eventType,
      metadata: JSON.parse(row.metadata),
      createdAt: row.createdAt,
    }));
  }
}
