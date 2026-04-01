import type Database from "better-sqlite3";
import type {
  CreditStatus,
  Referral,
  ReferralStatus,
  TrustedReferralContext,
} from "@/core/entities/Referral";

interface ReferralRow {
  id: string;
  referrer_user_id: string;
  referred_user_id: string | null;
  conversation_id: string | null;
  referral_code: string;
  visit_id: string | null;
  status: string;
  credit_status: string;
  scanned_at: string | null;
  converted_at: string | null;
  last_validated_at: string | null;
  last_event_at: string | null;
  outcome: string | null;
  metadata_json: string;
  created_at: string;
}

const REFERRAL_STATUSES: ReferralStatus[] = [
  "visited",
  "engaged",
  "registered",
  "lead",
  "consultation",
  "deal",
  "training",
  "credited",
  "void",
];
const CREDIT_STATUSES: CreditStatus[] = ["tracked", "pending_review", "approved", "paid", "void"];

function isReferralStatus(value: string): value is ReferralStatus {
  return REFERRAL_STATUSES.includes(value as ReferralStatus);
}

function isCreditStatus(value: string): value is CreditStatus {
  return CREDIT_STATUSES.includes(value as CreditStatus);
}

function normalizeMetadataJson(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : "{}";
}

function mapRow(row: ReferralRow): Referral {
  return {
    id: row.id,
    referrerUserId: row.referrer_user_id,
    referredUserId: row.referred_user_id,
    conversationId: row.conversation_id,
    referralCode: row.referral_code,
    visitId: row.visit_id,
    status: isReferralStatus(row.status) ? row.status : "visited",
    creditStatus: isCreditStatus(row.credit_status) ? row.credit_status : "tracked",
    scannedAt: row.scanned_at,
    convertedAt: row.converted_at,
    lastValidatedAt: row.last_validated_at,
    lastEventAt: row.last_event_at,
    outcome: row.outcome,
    metadataJson: row.metadata_json || "{}",
    createdAt: row.created_at,
  };
}

export class ReferralDataMapper {
  constructor(private db: Database.Database) {}

  create(referral: Omit<Referral, "createdAt">): Referral {
    const status = referral.status ?? "visited";
    const creditStatus = referral.creditStatus ?? "tracked";
    const metadataJson = normalizeMetadataJson(referral.metadataJson);

    this.db
      .prepare(
        `INSERT INTO referrals (
           id,
           referrer_user_id,
           referred_user_id,
           conversation_id,
           referral_code,
           visit_id,
           status,
           credit_status,
           scanned_at,
           converted_at,
           last_validated_at,
           last_event_at,
           outcome,
           metadata_json
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        referral.id,
        referral.referrerUserId,
        referral.referredUserId,
        referral.conversationId,
        referral.referralCode,
        referral.visitId,
        status,
        creditStatus,
        referral.scannedAt,
        referral.convertedAt,
        referral.lastValidatedAt,
        referral.lastEventAt,
        referral.outcome,
        metadataJson,
      );

    const row = this.db
      .prepare(`SELECT * FROM referrals WHERE id = ?`)
      .get(referral.id) as ReferralRow;

    return mapRow(row);
  }

  findById(id: string): Referral | null {
    const row = this.db
      .prepare(`SELECT * FROM referrals WHERE id = ? LIMIT 1`)
      .get(id) as ReferralRow | undefined;

    return row ? mapRow(row) : null;
  }

  findByVisitId(visitId: string): Referral | null {
    const row = this.db
      .prepare(`SELECT * FROM referrals WHERE visit_id = ? LIMIT 1`)
      .get(visitId) as ReferralRow | undefined;

    return row ? mapRow(row) : null;
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
    const joined = this.db
      .prepare(
        `SELECT r.*
         FROM conversations c
         INNER JOIN referrals r ON r.id = c.referral_id
         WHERE c.id = ?
         LIMIT 1`,
      )
      .get(conversationId) as ReferralRow | undefined;

    if (joined) {
      return mapRow(joined);
    }

    const fallback = this.db
      .prepare(`SELECT * FROM referrals WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1`)
      .get(conversationId) as ReferralRow | undefined;

    return fallback ? mapRow(fallback) : null;
  }

  setConversation(id: string, conversationId: string): void {
    this.linkConversation(id, conversationId);
  }

  linkConversation(id: string, conversationId: string): void {
    this.db
      .prepare(
        `UPDATE referrals
         SET conversation_id = COALESCE(conversation_id, ?)
         WHERE id = ?`,
      )
      .run(conversationId, id);
  }

  linkReferredUser(id: string, userId: string): void {
    this.db
      .prepare(
        `UPDATE referrals
         SET referred_user_id = COALESCE(referred_user_id, ?)
         WHERE id = ?`,
      )
      .run(userId, id);
  }

  update(id: string, patch: Partial<Omit<Referral, "id" | "createdAt">>): Referral {
    const current = this.findById(id);
    if (!current) {
      throw new Error(`Referral not found: ${id}`);
    }

    const next: Referral = {
      ...current,
      ...patch,
      status: patch.status ?? current.status,
      creditStatus: patch.creditStatus ?? current.creditStatus,
      metadataJson: normalizeMetadataJson(patch.metadataJson ?? current.metadataJson),
    };

    this.db
      .prepare(
        `UPDATE referrals
         SET referrer_user_id = ?,
             referred_user_id = ?,
             conversation_id = ?,
             referral_code = ?,
             visit_id = ?,
             status = ?,
             credit_status = ?,
             scanned_at = ?,
             converted_at = ?,
             last_validated_at = ?,
             last_event_at = ?,
             outcome = ?,
             metadata_json = ?
         WHERE id = ?`,
      )
      .run(
        next.referrerUserId,
        next.referredUserId,
        next.conversationId,
        next.referralCode,
        next.visitId,
        next.status,
        next.creditStatus,
        next.scannedAt,
        next.convertedAt,
        next.lastValidatedAt,
        next.lastEventAt,
        next.outcome,
        next.metadataJson,
        id,
      );

    return this.findById(id) as Referral;
  }

  setConverted(id: string, outcome: string): void {
    const now = new Date().toISOString();
    this.update(id, {
      convertedAt: now,
      lastEventAt: now,
      outcome,
    });
  }

  getTrustedContextByConversation(conversationId: string): TrustedReferralContext | null {
    const joined = this.db
      .prepare(
        `SELECT
           r.id AS referral_id,
           r.referral_code,
           r.referrer_user_id,
           r.referred_user_id,
           r.conversation_id,
           r.status,
           r.credit_status,
           u.name AS referrer_name,
           u.credential AS referrer_credential
         FROM conversations c
         INNER JOIN referrals r ON r.id = c.referral_id
         INNER JOIN users u ON u.id = r.referrer_user_id
         WHERE c.id = ?
         LIMIT 1`,
      )
      .get(conversationId) as {
      referral_id: string;
      referral_code: string;
      referrer_user_id: string;
      referred_user_id: string | null;
      conversation_id: string | null;
      status: string;
      credit_status: string;
      referrer_name: string;
      referrer_credential: string | null;
    } | undefined;

    const row = joined ?? this.db
      .prepare(
        `SELECT
           r.id AS referral_id,
           r.referral_code,
           r.referrer_user_id,
           r.referred_user_id,
           r.conversation_id,
           r.status,
           r.credit_status,
           u.name AS referrer_name,
           u.credential AS referrer_credential
         FROM referrals r
         INNER JOIN users u ON u.id = r.referrer_user_id
         WHERE r.conversation_id = ?
         ORDER BY r.created_at DESC
         LIMIT 1`,
      )
      .get(conversationId) as typeof joined;

    if (!row) {
      return null;
    }

    return {
      referralId: row.referral_id,
      referralCode: row.referral_code,
      referrerUserId: row.referrer_user_id,
      referrerName: row.referrer_name,
      referrerCredential: row.referrer_credential,
      referredUserId: row.referred_user_id,
      conversationId: row.conversation_id,
      status: isReferralStatus(row.status) ? row.status : "visited",
      creditStatus: isCreditStatus(row.credit_status) ? row.credit_status : "tracked",
    };
  }

  getReferrerUser(
    code: string,
  ): { id: string; name: string; email: string; credential: string | null } | null {
    const row = this.db
      .prepare(
        `SELECT u.id, u.name, u.email, u.credential
         FROM users u
         WHERE u.referral_code = ? AND u.affiliate_enabled = 1
         LIMIT 1`,
      )
      .get(code) as { id: string; name: string; email: string; credential: string | null } | undefined;

    return row ?? null;
  }
}
