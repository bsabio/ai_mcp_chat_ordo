import type Database from "better-sqlite3";
import type { Referral } from "@/core/entities/Referral";

interface ReferralRow {
  id: string;
  referrer_user_id: string;
  conversation_id: string | null;
  referral_code: string;
  scanned_at: string | null;
  converted_at: string | null;
  outcome: string | null;
  created_at: string;
}

function mapRow(row: ReferralRow): Referral {
  return {
    id: row.id,
    referrerUserId: row.referrer_user_id,
    conversationId: row.conversation_id,
    referralCode: row.referral_code,
    scannedAt: row.scanned_at,
    convertedAt: row.converted_at,
    outcome: row.outcome,
    createdAt: row.created_at,
  };
}

export class ReferralDataMapper {
  constructor(private db: Database.Database) {}

  create(referral: Omit<Referral, "createdAt">): Referral {
    this.db
      .prepare(
        `INSERT INTO referrals (id, referrer_user_id, conversation_id, referral_code, scanned_at, converted_at, outcome)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        referral.id,
        referral.referrerUserId,
        referral.conversationId,
        referral.referralCode,
        referral.scannedAt,
        referral.convertedAt,
        referral.outcome,
      );

    const row = this.db
      .prepare(`SELECT * FROM referrals WHERE id = ?`)
      .get(referral.id) as ReferralRow;

    return mapRow(row);
  }

  findByCode(code: string): Referral | null {
    const row = this.db
      .prepare(`SELECT * FROM referrals WHERE referral_code = ? ORDER BY created_at DESC LIMIT 1`)
      .get(code) as ReferralRow | undefined;

    return row ? mapRow(row) : null;
  }

  findByReferrer(userId: string): Referral[] {
    const rows = this.db
      .prepare(`SELECT * FROM referrals WHERE referrer_user_id = ? ORDER BY created_at DESC`)
      .all(userId) as ReferralRow[];

    return rows.map(mapRow);
  }

  findByConversation(conversationId: string): Referral | null {
    const row = this.db
      .prepare(`SELECT * FROM referrals WHERE conversation_id = ? LIMIT 1`)
      .get(conversationId) as ReferralRow | undefined;

    return row ? mapRow(row) : null;
  }

  setConversation(id: string, conversationId: string): void {
    this.db
      .prepare(`UPDATE referrals SET conversation_id = ? WHERE id = ?`)
      .run(conversationId, id);
  }

  setConverted(id: string, outcome: string): void {
    this.db
      .prepare(`UPDATE referrals SET converted_at = datetime('now'), outcome = ? WHERE id = ?`)
      .run(outcome, id);
  }

  getReferrerUser(
    code: string,
  ): { id: string; name: string; email: string; credential: string | null } | null {
    const row = this.db
      .prepare(
        `SELECT u.id, u.name, u.email, u.credential
         FROM users u
         INNER JOIN referrals r ON r.referrer_user_id = u.id
         WHERE r.referral_code = ?
         LIMIT 1`,
      )
      .get(code) as { id: string; name: string; email: string; credential: string | null } | undefined;

    return row ?? null;
  }
}
