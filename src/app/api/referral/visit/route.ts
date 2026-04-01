import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  LEGACY_REFERRAL_COOKIE_NAME,
  REFERRAL_VISIT_COOKIE_NAME,
  resolveValidatedReferralVisit,
} from "@/lib/referrals/referral-visit";

export async function GET(request: NextRequest) {
  const visit = resolveValidatedReferralVisit(
    request.cookies.get(REFERRAL_VISIT_COOKIE_NAME)?.value,
  );

  if (!visit) {
    const response = NextResponse.json({ error: "Referral visit not found." }, { status: 404 });
    if (request.cookies.get(REFERRAL_VISIT_COOKIE_NAME)?.value) {
      response.cookies.delete(REFERRAL_VISIT_COOKIE_NAME);
    }
    if (request.cookies.get(LEGACY_REFERRAL_COOKIE_NAME)?.value) {
      response.cookies.delete(LEGACY_REFERRAL_COOKIE_NAME);
    }
    return response;
  }

  const response = NextResponse.json({
    referrer: {
      name: visit.referrer.name,
      credential: visit.referrer.credential,
    },
  });
  if (request.cookies.get(LEGACY_REFERRAL_COOKIE_NAME)?.value) {
    response.cookies.delete(LEGACY_REFERRAL_COOKIE_NAME);
  }
  return response;
}
