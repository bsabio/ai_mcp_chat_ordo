import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getActiveReferralSnapshot } from "@/lib/referrals/referral-resolver";
import { getReferralLedgerService } from "@/lib/referrals/referral-ledger";
import {
  createReferralVisitCookieValue,
  getReferralVisitCookieOptions,
  LEGACY_REFERRAL_COOKIE_NAME,
  REFERRAL_VISIT_COOKIE_NAME,
  resolveValidatedReferralVisit,
} from "@/lib/referrals/referral-visit";

function invalidReferralCodeResponse() {
  return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
}

function referralCodeNotFoundResponse() {
  return NextResponse.json({ error: "Referral code not found" }, { status: 404 });
}

function toReferrerPayload(snapshot: ReturnType<typeof getActiveReferralSnapshot>) {
  if (!snapshot) {
    return null;
  }

  return {
    referrer: {
      name: snapshot.name,
      credential: snapshot.credential,
    },
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;

  if (!code || code.length > 30) {
    return invalidReferralCodeResponse();
  }

  const referral = getActiveReferralSnapshot(code);
  if (!referral) {
    return referralCodeNotFoundResponse();
  }

  return NextResponse.json(toReferrerPayload(referral));
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;

  if (!code || code.length > 30) {
    return invalidReferralCodeResponse();
  }

  const referral = getActiveReferralSnapshot(code);
  if (!referral) {
    return referralCodeNotFoundResponse();
  }

  const existingCookieValue = request.cookies.get(REFERRAL_VISIT_COOKIE_NAME)?.value;
  const existingVisit = resolveValidatedReferralVisit(existingCookieValue);
  const cookieValue = existingVisit?.code === referral.code
    ? existingCookieValue ?? createReferralVisitCookieValue(referral.code)
    : createReferralVisitCookieValue(referral.code);
  const validatedVisit = resolveValidatedReferralVisit(cookieValue);

  if (validatedVisit) {
    await getReferralLedgerService().recordValidatedVisit({ visit: validatedVisit });
  }

  const response = NextResponse.json(toReferrerPayload(referral));
  response.cookies.set(
    REFERRAL_VISIT_COOKIE_NAME,
    cookieValue,
    getReferralVisitCookieOptions(),
  );
  response.cookies.delete(LEGACY_REFERRAL_COOKIE_NAME);
  return response;
}
