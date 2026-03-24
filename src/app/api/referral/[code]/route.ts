import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;

  if (!code || code.length > 30) {
    return Response.json({ error: "Invalid referral code" }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.name, u.credential
       FROM users u
       WHERE u.referral_code = ? AND u.affiliate_enabled = 1`,
    )
    .get(code) as { name: string; credential: string | null } | undefined;

  if (!row) {
    return Response.json({ error: "Referral code not found" }, { status: 404 });
  }

  return Response.json({
    referrer: {
      name: row.name,
      credential: row.credential,
    },
  });
}
