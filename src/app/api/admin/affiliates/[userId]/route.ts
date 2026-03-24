import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { generateReferralCode } from "@/lib/referral/generate-code";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const user = await getSessionUser();

  if (!user.roles.includes("ADMIN")) {
    return Response.json(
      { error: "Affiliate management is restricted to administrators." },
      { status: 403 },
    );
  }

  const { userId } = await context.params;

  if (!userId) {
    return Response.json({ error: "userId is required." }, { status: 400 });
  }

  const db = getDb();

  const existing = db
    .prepare(`SELECT id, affiliate_enabled, referral_code, credential FROM users WHERE id = ?`)
    .get(userId) as
    | { id: string; affiliate_enabled: number; referral_code: string | null; credential: string | null }
    | undefined;

  if (!existing) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    affiliate_enabled?: boolean;
    credential?: string;
  } | null;

  if (!body || typeof body.affiliate_enabled !== "boolean") {
    return Response.json(
      { error: "affiliate_enabled (boolean) is required." },
      { status: 400 },
    );
  }

  const affiliateEnabled = body.affiliate_enabled ? 1 : 0;
  let referralCode = existing.referral_code;

  // Generate code on enable if none exists
  if (body.affiliate_enabled && !referralCode) {
    referralCode = generateReferralCode();
  }

  const credential =
    body.credential !== undefined ? body.credential : existing.credential;

  db.prepare(
    `UPDATE users SET affiliate_enabled = ?, referral_code = ?, credential = ? WHERE id = ?`,
  ).run(affiliateEnabled, referralCode, credential, userId);

  return Response.json({
    userId,
    affiliate_enabled: body.affiliate_enabled,
    referral_code: referralCode,
    credential,
  });
}
