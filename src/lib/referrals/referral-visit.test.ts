import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import {
  createReferralVisitCookieValue,
  resolveValidatedReferralVisit,
} from "@/lib/referrals/referral-visit";

describe("referral-visit", () => {
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

  it("creates a signed cookie value that resolves to an active referral visit", () => {
    const cookieValue = createReferralVisitCookieValue("mentor-42");
    const visit = resolveValidatedReferralVisit(cookieValue);

    expect(visit).toMatchObject({
      code: "mentor-42",
      referrer: {
        name: "Ada Lovelace",
        credential: "Founder",
      },
    });
    expect(visit?.visitId).toBeTruthy();
  });

  it("rejects tampered cookie values", () => {
    const cookieValue = createReferralVisitCookieValue("mentor-42");
    const tampered = `${cookieValue}tampered`;

    expect(resolveValidatedReferralVisit(tampered)).toBeNull();
  });

  it("rejects visits when the referral code is no longer active", () => {
    const cookieValue = createReferralVisitCookieValue("mentor-42");
    referralState.row = undefined;

    expect(resolveValidatedReferralVisit(cookieValue)).toBeNull();
  });
});
