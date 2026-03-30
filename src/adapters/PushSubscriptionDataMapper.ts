import type Database from "better-sqlite3";
import type {
  PushSubscriptionRecord,
  PushSubscriptionSeed,
} from "@/core/entities/push-subscription";
import type { PushSubscriptionRepository } from "@/core/use-cases/PushSubscriptionRepository";

type PushSubscriptionRow = {
  endpoint: string;
  user_id: string;
  expiration_time: number | null;
  p256dh_key: string;
  auth_key: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
  last_notified_at: string | null;
};

function mapRow(row: PushSubscriptionRow): PushSubscriptionRecord {
  return {
    endpoint: row.endpoint,
    userId: row.user_id,
    expirationTime: row.expiration_time,
    p256dhKey: row.p256dh_key,
    authKey: row.auth_key,
    userAgent: row.user_agent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastNotifiedAt: row.last_notified_at,
  };
}

export class PushSubscriptionDataMapper implements PushSubscriptionRepository {
  constructor(private readonly db: Database.Database) {}

  async upsert(seed: PushSubscriptionSeed): Promise<PushSubscriptionRecord> {
    const now = new Date().toISOString();
    this.db.prepare(
      `INSERT INTO push_subscriptions (
        endpoint,
        user_id,
        expiration_time,
        p256dh_key,
        auth_key,
        user_agent,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        user_id = excluded.user_id,
        expiration_time = excluded.expiration_time,
        p256dh_key = excluded.p256dh_key,
        auth_key = excluded.auth_key,
        user_agent = excluded.user_agent,
        updated_at = excluded.updated_at`,
    ).run(
      seed.subscription.endpoint,
      seed.userId,
      seed.subscription.expirationTime,
      seed.subscription.keys.p256dh,
      seed.subscription.keys.auth,
      seed.userAgent ?? null,
      now,
      now,
    );

    const row = this.db.prepare(
      `SELECT * FROM push_subscriptions WHERE endpoint = ?`,
    ).get(seed.subscription.endpoint) as PushSubscriptionRow;

    return mapRow(row);
  }

  async listByUser(userId: string): Promise<PushSubscriptionRecord[]> {
    const rows = this.db.prepare(
      `SELECT * FROM push_subscriptions WHERE user_id = ? ORDER BY updated_at DESC`,
    ).all(userId) as PushSubscriptionRow[];

    return rows.map(mapRow);
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    this.db.prepare(
      `DELETE FROM push_subscriptions WHERE endpoint = ?`,
    ).run(endpoint);
  }

  async markNotified(endpoint: string, notifiedAt: string): Promise<void> {
    this.db.prepare(
      `UPDATE push_subscriptions SET last_notified_at = ?, updated_at = ? WHERE endpoint = ?`,
    ).run(notifiedAt, notifiedAt, endpoint);
  }
}