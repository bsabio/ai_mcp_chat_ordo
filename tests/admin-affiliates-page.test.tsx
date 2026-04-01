import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminPageAccessMock,
  loadAdminAffiliatesWorkspaceMock,
} = vi.hoisted(() => ({
  requireAdminPageAccessMock: vi.fn(),
  loadAdminAffiliatesWorkspaceMock: vi.fn(),
}));

vi.mock("@/lib/journal/admin-journal", () => ({
  requireAdminPageAccess: requireAdminPageAccessMock,
}));

vi.mock("@/lib/admin/affiliates/admin-affiliates", () => ({
  loadAdminAffiliatesWorkspace: loadAdminAffiliatesWorkspaceMock,
}));

vi.mock("@/lib/admin/affiliates/admin-affiliates-actions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/affiliates/admin-affiliates-actions")>(
    "@/lib/admin/affiliates/admin-affiliates-actions",
  );

  return {
    ...actual,
    updateReferralCreditStateAction: vi.fn(),
  };
});

import AdminAffiliatesPage from "@/app/admin/affiliates/page";
import { parseReferralCreditStateForm } from "@/lib/admin/affiliates/admin-affiliates-actions";

function makeFormData(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("admin affiliates page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the exception workspace with manual review controls", async () => {
    loadAdminAffiliatesWorkspaceMock.mockResolvedValue({
      filters: { view: "exceptions", kind: "all" },
      overview: {
        affiliatesEnabled: 2,
        activeAffiliates: 2,
        introductions: 4,
        startedChats: 4,
        registered: 3,
        qualifiedOpportunities: 3,
        creditPendingReview: 1,
        approvedCredits: 1,
        paidCredits: 0,
        exceptions: 2,
        narrative: "Two exceptions need review.",
      },
      leaderboard: { total: 1, items: [] },
      pipeline: { stages: [], outcomes: [] },
      exceptions: {
        total: 2,
        counts: {
          invalid_referral_source: 0,
          missing_referral_join: 1,
          disabled_referral_code: 0,
          credit_review_backlog: 1,
        },
        items: [
          {
            id: "missing_referral_join:conv_1",
            kind: "missing_referral_join",
            title: "Missing referral join",
            description: "Conversation conv_1 still carries referral source mentor-42 without a canonical referral join.",
            occurredAt: "2026-04-10T09:00:00.000Z",
            href: "/admin/users/usr_affiliate",
            referralId: null,
            referralCode: "mentor-42",
            conversationId: "conv_1",
            userId: "usr_affiliate",
            creditStatus: null,
          },
          {
            id: "credit_review_backlog:ref_1",
            kind: "credit_review_backlog",
            title: "Credit pending review",
            description: "Referral mentor-42 is pending review and still needs an approval decision.",
            occurredAt: "2026-04-09T09:00:00.000Z",
            href: "/admin/users/usr_affiliate",
            referralId: "ref_1",
            referralCode: "mentor-42",
            conversationId: "conv_1",
            userId: "usr_affiliate",
            creditStatus: "pending_review",
          },
        ],
      },
    });

    render(await AdminAffiliatesPage({ searchParams: Promise.resolve({ view: "exceptions" }) }));

    expect(requireAdminPageAccessMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: "Affiliate program" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Missing referral join" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Credit pending review" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save review" })).toBeInTheDocument();
    const drillDownLinks = screen.getAllByRole("link", { name: "Open drill-down" });
    expect(drillDownLinks).toHaveLength(2);
    expect(drillDownLinks[0]).toHaveAttribute("href", "/admin/users/usr_affiliate");
  });
});

describe("admin affiliates action parser", () => {
  it("parses manual credit review submissions", () => {
    expect(parseReferralCreditStateForm(makeFormData({
      referralId: "ref_1",
      creditStatus: "approved",
      reason: "Validated with CRM notes.",
    }))).toEqual({
      referralId: "ref_1",
      creditStatus: "approved",
      reason: "Validated with CRM notes.",
    });
  });
});