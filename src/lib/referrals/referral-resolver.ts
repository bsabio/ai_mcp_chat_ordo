import { getDb } from "@/lib/db";

export interface ReferralSnapshot {
  userId: string;
  code: string;
  name: string;
  credential: string | null;
}

function normalizeReferralCode(code: string): string | null {
  const normalized = code.trim();
  if (normalized.length === 0 || normalized.length > 30) {
    return null;
  }

  return normalized;
}

export function isValidReferralCodeFormat(code: string): boolean {
  return normalizeReferralCode(code) !== null;
}

export function getActiveReferralSnapshot(code: string): ReferralSnapshot | null {
  const normalizedCode = normalizeReferralCode(code);
  if (!normalizedCode) {
    return null;
  }

  // getDb() approved: referral default parameter + raw SQL — see data-access-canary.test.ts (Sprint 9)
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.referral_code, u.name, u.credential
       FROM users u
       WHERE u.referral_code = ? AND u.affiliate_enabled = 1`,
    )
    .get(normalizedCode) as
    | { id: string; referral_code: string; name: string; credential: string | null }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    userId: row.id,
    code: row.referral_code,
    name: row.name,
    credential: row.credential,
  };
}
