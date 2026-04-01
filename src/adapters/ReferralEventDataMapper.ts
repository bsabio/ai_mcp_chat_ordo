import type Database from "better-sqlite3";

import type { ReferralEvent } from "@/core/entities/ReferralEvent";

type AppendedReferralEvent = ReferralEvent & {
  wasInserted: boolean;
};

interface ReferralEventRow {
  id: string;
  referral_id: string;
  conversation_id: string | null;
  event_type: string;
  idempotency_key: string;
  payload_json: string;
  created_at: string;
}

function mapRow(row: ReferralEventRow): ReferralEvent {
  return {
    id: row.id,
    referralId: row.referral_id,
    conversationId: row.conversation_id,
    eventType: row.event_type,
    idempotencyKey: row.idempotency_key,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

export class ReferralEventDataMapper {
  constructor(private db: Database.Database) {}

  append(event: {
    referralId: string;
    conversationId: string | null;
    eventType: string;
    idempotencyKey: string;
    payload: Record<string, unknown>;
  }): AppendedReferralEvent {
    const id = `refevt_${crypto.randomUUID()}`;

    const result = this.db
      .prepare(
        `INSERT OR IGNORE INTO referral_events (
           id,
           referral_id,
           conversation_id,
           event_type,
           idempotency_key,
           payload_json
         ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        event.referralId,
        event.conversationId,
        event.eventType,
        event.idempotencyKey,
        JSON.stringify(event.payload),
      );

    const row = this.db
      .prepare(
        `SELECT *
         FROM referral_events
         WHERE referral_id = ? AND idempotency_key = ?
         LIMIT 1`,
      )
      .get(event.referralId, event.idempotencyKey) as ReferralEventRow;

    return {
      ...mapRow(row),
      wasInserted: result.changes > 0,
    };
  }

  listByReferralId(referralId: string): ReferralEvent[] {
    const rows = this.db
      .prepare(
        `SELECT *
         FROM referral_events
         WHERE referral_id = ?
         ORDER BY created_at ASC`,
      )
      .all(referralId) as ReferralEventRow[];

    return rows.map(mapRow);
  }
}