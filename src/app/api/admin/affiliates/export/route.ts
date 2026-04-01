import type { NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { createAdminReferralAnalyticsService } from "@/lib/referrals/admin-referral-analytics";

const CSV_HEADERS = [
  "referral_id",
  "referral_code",
  "referrer_user_id",
  "referrer_name",
  "referrer_email",
  "referrer_credential",
  "referred_user_id",
  "conversation_id",
  "referral_status",
  "credit_status",
  "outcome",
  "last_event_at",
  "created_at",
] as const;

function toCsvCell(value: string | null): string {
  const normalized = value ?? "";
  return `"${normalized.replaceAll('"', '""')}"`;
}

export async function GET(_request: NextRequest) {
  const user = await getSessionUser();

  if (!user.roles.includes("ADMIN")) {
    return Response.json(
      { error: "Affiliate payout export is restricted to administrators." },
      { status: 403 },
    );
  }

  const rows = await createAdminReferralAnalyticsService().getPayoutExportRows();
  const csv = [
    CSV_HEADERS.join(","),
    ...rows.map((row) => [
      row.referralId,
      row.referralCode,
      row.referrerUserId,
      row.referrerName,
      row.referrerEmail,
      row.referrerCredential,
      row.referredUserId,
      row.conversationId,
      row.referralStatus,
      row.creditStatus,
      row.outcome,
      row.lastEventAt,
      row.createdAt,
    ].map((value) => toCsvCell(value ?? null)).join(",")),
  ].join("\n");

  return new Response(`${csv}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="affiliate-payout-review.csv"',
      "Cache-Control": "no-store",
    },
  });
}