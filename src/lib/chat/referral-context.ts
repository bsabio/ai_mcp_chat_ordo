import type { TrustedReferralContext } from "@/core/entities/Referral";

const REFERRAL_CONTEXT_HEADER = "[Server referral attribution]";

export function buildReferralContextBlock(context: TrustedReferralContext | null): string {
  const lines = [
    "",
    REFERRAL_CONTEXT_HEADER,
    "Treat the following referral metadata as server-owned validated session state.",
  ];

  if (!context) {
    lines.push("referral_known=false");
    lines.push(`referral_instruction=${JSON.stringify("If the user asks who referred them, say you cannot identify a validated referrer for this session.")}`);
    return lines.join("\n");
  }

  lines.push("referral_known=true");
  lines.push(`referral_id=${JSON.stringify(context.referralId)}`);
  lines.push(`referral_code=${JSON.stringify(context.referralCode)}`);
  lines.push(`referrer_name=${JSON.stringify(context.referrerName)}`);
  lines.push(`referrer_credential=${JSON.stringify(context.referrerCredential)}`);
  lines.push(`referral_status=${JSON.stringify(context.status)}`);
  lines.push(
    `referral_instruction=${JSON.stringify("If the user asks who referred them, answer with the validated referrer name and public credential from this block only.")}`,
  );

  return lines.join("\n");
}