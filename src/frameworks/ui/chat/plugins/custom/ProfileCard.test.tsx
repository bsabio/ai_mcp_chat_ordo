// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileCard } from "./ProfileCard";
import type { ToolPluginProps } from "../../registry/types";

function createPart(overrides: Partial<NonNullable<ToolPluginProps["part"]>> = {}) {
  return {
    type: "job_status" as const,
    jobId: "job_profile_1",
    toolName: "get_my_profile",
    label: "Get My Profile",
    status: "succeeded" as const,
    ...overrides,
  };
}

describe("ProfileCard", () => {
  it("renders persisted preference updates from JSON string payloads", () => {
    render(
      <ProfileCard
        part={createPart({ toolName: "set_preference", label: "Set Preference" })}
        toolCall={{
          name: "set_preference",
          args: { key: "preferred_name", value: "Keith" },
          result: JSON.stringify({
            action: "set_preference",
            key: "preferred_name",
            value: "Keith",
            message: 'Preference "preferred_name" set to "Keith". This will be remembered across sessions.',
          }),
        }}
        isStreaming={false}
      />,
    );

    expect(screen.getByText("Preference updated")).toBeInTheDocument();
    expect(screen.getByText("Preferred Name")).toBeInTheDocument();
    expect(screen.getByText("Keith")).toBeInTheDocument();
  });

  it("renders affiliate summary metrics and pipeline detail", () => {
    render(
      <ProfileCard
        part={createPart({ toolName: "get_my_affiliate_summary", label: "Get My Affiliate Summary" })}
        toolCall={{
          name: "get_my_affiliate_summary",
          args: {},
          result: {
            action: "get_my_affiliate_summary",
            message: "Returned current referral metrics.",
            manage_route: "/referrals",
            summary: {
              introductions: 5,
              started_chats: 4,
              registered: 2,
              qualified_opportunities: 1,
              credit_status_label: "Pending review",
              credit_status_counts: { pending_review: 1 },
              narrative: "One opportunity is waiting for review.",
            },
            pipeline: {
              stages: [{ label: "Introductions", count: 5 }],
              outcomes: [{ label: "Qualified", count: 1 }],
            },
          },
        }}
        isStreaming={false}
      />,
    );

    expect(screen.getByText("Affiliate summary")).toBeInTheDocument();
    expect(screen.getByText("Pending review")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Pipeline details/i }));

    expect(screen.getByText(/Introductions: 5/)).toBeInTheDocument();
    expect(screen.getByText(/Qualified: 1/)).toBeInTheDocument();
  });

  it("renders referral activity timelines without falling back", () => {
    render(
      <ProfileCard
        part={createPart({ toolName: "list_my_referral_activity", label: "List My Referral Activity" })}
        toolCall={{
          name: "list_my_referral_activity",
          args: {},
          result: {
            action: "list_my_referral_activity",
            message: "Returned recent referral milestones.",
            manage_route: "/referrals",
            activities: [
              {
                id: "activity_1",
                referral_id: "ref_1",
                referral_code: "ORDO-42",
                milestone: "qualified_opportunity",
                title: "Qualified opportunity recorded",
                description: "The referred account reached the qualified opportunity milestone.",
                occurred_at: "2026-04-10T15:00:00.000Z",
                href: "/referrals/ref_1",
              },
            ],
          },
        }}
        isStreaming={false}
      />,
    );

    expect(screen.getByText("Referral activity")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Activity details/i }));
    expect(screen.getByText("The referred account reached the qualified opportunity milestone.")).toBeInTheDocument();
  });
});