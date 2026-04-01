import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pageState = vi.hoisted(() => ({
  referral: {
    code: "mentor-42",
    name: "Ada Lovelace",
    credential: "Founder",
  } as { code: string; name: string; credential: string | null } | null,
}));

vi.mock("@/lib/config/instance", () => ({
  getInstanceIdentity: () => ({
    name: "Studio Ordo",
  }),
}));

vi.mock("@/lib/referrals/referral-resolver", () => ({
  getActiveReferralSnapshot: () => pageState.referral,
}));

vi.mock("@/components/referral/ReferralVisitActivator", () => ({
  ReferralVisitActivator: ({ code }: { code: string }) => <div data-testid="referral-visit-activator">{code}</div>,
}));

import ReferralLandingPage from "@/app/r/[code]/page";

describe("/r/[code] page", () => {
  beforeEach(() => {
    pageState.referral = {
      code: "mentor-42",
      name: "Ada Lovelace",
      credential: "Founder",
    };
  });

  it("renders the branded referral landing page for an active code", async () => {
    render(await ReferralLandingPage({ params: Promise.resolve({ code: "mentor-42" }) }));

    expect(screen.getByText("Ada Lovelace invited you into Studio Ordo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start chat" })).toHaveAttribute("href", "/");
    expect(screen.getByTestId("referral-visit-activator")).toHaveTextContent("mentor-42");
  });

  it("renders the referral unavailable state for invalid codes", async () => {
    pageState.referral = null;

    render(await ReferralLandingPage({ params: Promise.resolve({ code: "missing" }) }));

    expect(screen.getByText("That referral link is not active")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start a normal chat" })).toHaveAttribute("href", "/");
  });
});
