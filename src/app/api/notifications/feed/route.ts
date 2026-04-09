import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { createProfileService } from "@/lib/profile/profile-service";
import { createAdminReferralAnalyticsService } from "@/lib/referrals/admin-referral-analytics";
import { createReferralAnalyticsService } from "@/lib/referrals/referral-analytics";

function unauthorized() {
  return NextResponse.json({ error: "Authentication required", errorCode: "AUTH_ERROR" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json(
    {
      error: "Referral self-service is not enabled for this account yet.",
      errorCode: "FORBIDDEN",
      code: "AFFILIATE_ACCESS_DISABLED",
    },
    { status: 403 },
  );
}

export async function GET() {
  const user = await getSessionUser();
  if (user.roles.includes("ANONYMOUS")) {
    return unauthorized();
  }

  if (user.roles.includes("ADMIN")) {
    const notifications = await createAdminReferralAnalyticsService().getNotificationFeed(20);
    return NextResponse.json({ notifications });
  }

  const profile = await createProfileService().getProfile(user.id);
  if (!profile.affiliateEnabled) {
    return forbidden();
  }

  const notifications = await createReferralAnalyticsService().getNotificationFeed(user.id, 20);
  return NextResponse.json({ notifications });
}