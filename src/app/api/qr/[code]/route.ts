import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { getDb } from "@/lib/db";
import { createRateLimiter } from "@/lib/rate-limit";
import { buildPublicReferralUrl } from "@/lib/referrals/referral-origin";

const limiter = createRateLimiter(60_000, 60);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!limiter(ip)) {
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { code } = await context.params;

  if (!code || code.length > 30) {
    return Response.json({ error: "Invalid referral code" }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare(
      `SELECT referral_code FROM users WHERE referral_code = ? AND affiliate_enabled = 1`,
    )
    .get(code) as { referral_code: string } | undefined;

  if (!row) {
    return Response.json({ error: "Referral code not found" }, { status: 404 });
  }

  const url = buildPublicReferralUrl(code);
  const buffer = await QRCode.toBuffer(url, { type: "png", width: 300 });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
