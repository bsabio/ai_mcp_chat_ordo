import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const referralState = vi.hoisted(() => ({
  row: {
    referral_code: "mentor-42",
    name: "Ada Lovelace",
    credential: "Founder",
  } as { referral_code: string; name: string; credential: string | null } | undefined,
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    prepare: () => ({
      get: () => referralState.row,
    }),
  }),
}));

import { GET } from "@/app/api/referral/visit/route";
import { createReferralVisitCookieValue, REFERRAL_VISIT_COOKIE_NAME } from "@/lib/referrals/referral-visit";

function makeRequest(cookieValue?: string) {
  const headers = new Headers();
  if (cookieValue) {
    headers.set("cookie", `${REFERRAL_VISIT_COOKIE_NAME}=${cookieValue}`);
  }
  return new NextRequest("http://localhost:3000/api/referral/visit", { headers });
}

describe("/api/referral/visit", () => {
  beforeEach(() => {
    vi.stubEnv("REFERRAL_COOKIE_SECRET", "referral-test-secret");
    referralState.row = {
      referral_code: "mentor-42",
      name: "Ada Lovelace",
      credential: "Founder",
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the validated referral visit context", async () => {
    const cookieValue = createReferralVisitCookieValue("mentor-42");
    const response = await GET(makeRequest(cookieValue));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      referrer: {
        name: "Ada Lovelace",
        credential: "Founder",
      },
    });
  });

  it("returns 404 when no valid referral visit exists", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(404);
  });
});
