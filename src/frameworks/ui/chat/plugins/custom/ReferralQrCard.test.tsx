// @vitest-environment jsdom

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReferralQrCard } from "./ReferralQrCard";
import type { ToolPluginProps } from "../../registry/types";

function createPart(overrides: Partial<NonNullable<ToolPluginProps["part"]>> = {}) {
  return {
    type: "job_status" as const,
    jobId: "job_referral_1",
    toolName: "get_my_referral_qr",
    label: "Get My Referral Qr",
    status: "succeeded" as const,
    ...overrides,
  };
}

describe("ReferralQrCard", () => {
  it("renders a successful referral QR payload behind the shared shell", () => {
    render(
      <ReferralQrCard
        part={createPart()}
        toolCall={{
          name: "get_my_referral_qr",
          args: {},
          result: {
            action: "get_my_referral_qr",
            message: "Returned the share link and QR code URL for this account's referral code.",
            referral_code: "ORDO-42",
            referral_url: "/r/ORDO-42",
            qr_code_url: "/api/qr/ORDO-42",
            manage_route: "/referrals",
          },
        }}
        isStreaming={false}
      />,
    );

    expect(screen.getByRole("region", { name: "Get My Referral Qr result" })).toHaveAttribute(
      "data-capability-card",
      "true",
    );
    expect(screen.getByRole("heading", { name: "ORDO-42" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "QR code for ORDO-42" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open referral link" })).toHaveAttribute("href", "/r/ORDO-42");
    expect(screen.getByRole("link", { name: "Open QR image" })).toHaveAttribute("href", "/api/qr/ORDO-42");
    expect(screen.getByRole("link", { name: "Open referrals" })).toHaveAttribute("href", "/referrals");
  });
});