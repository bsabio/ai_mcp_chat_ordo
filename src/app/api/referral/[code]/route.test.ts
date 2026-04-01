import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const referralState = vi.hoisted(() => ({
  row: {
    referral_code: "mentor-42",
    name: "Ada Lovelace",
    credential: "Founder",
  } as { referral_code: string; name: string; credential: string | null } | undefined,
  recordValidatedVisitMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    prepare: () => ({
      get: () => referralState.row,
    }),
  }),
}));

vi.mock("@/lib/referrals/referral-ledger", () => ({
  getReferralLedgerService: () => ({
    recordValidatedVisit: referralState.recordValidatedVisitMock,
  }),
}));

import { GET, POST } from "@/app/api/referral/[code]/route";
import { createRouteRequest } from "../../../../../tests/helpers/workflow-route-fixture";

function createCodeParams(code: string): { params: Promise<{ code: string }> } {
  return { params: Promise.resolve({ code }) };
}

describe("/api/referral/[code]", () => {
  beforeEach(() => {
    referralState.recordValidatedVisitMock.mockReset();
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

  it("returns the active referral snapshot", async () => {
    const response = await GET(
      createRouteRequest("/api/referral/mentor-42"),
      createCodeParams("mentor-42"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      referrer: {
        name: "Ada Lovelace",
        credential: "Founder",
      },
    });
  });

  it("returns 404 for inactive or unknown referral codes", async () => {
    referralState.row = undefined;

    const response = await GET(
      createRouteRequest("/api/referral/missing"),
      createCodeParams("missing"),
    );

    expect(response.status).toBe(404);
  });

  it("creates a signed referral visit cookie on POST", async () => {
    const response = await POST(
      createRouteRequest("/api/referral/mentor-42", "POST"),
      createCodeParams("mentor-42"),
    );
    const payload = await response.json();
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    expect(payload.referrer.name).toBe("Ada Lovelace");
    expect(setCookie).toContain("lms_referral_visit=");
    expect(referralState.recordValidatedVisitMock).toHaveBeenCalledTimes(1);
  });
});
