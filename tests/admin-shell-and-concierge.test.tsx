import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  usePathnameMock,
  requireAdminPageAccessMock,
  loadSystemHealthBlockMock,
  loadLeadQueueBlockMock,
  loadConsultationRequestQueueBlockMock,
  loadDealQueueBlockMock,
  loadTrainingPathQueueBlockMock,
  loadOverdueFollowUpsBlockMock,
  loadRoutingReviewBlockMock,
  loadFunnelRecommendationsBlockMock,
  loadAnonymousOpportunitiesBlockMock,
  loadRecurringPainThemesBlockMock,
  redirectMock,
  notFoundMock,
} = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  requireAdminPageAccessMock: vi.fn(),
  loadSystemHealthBlockMock: vi.fn(),
  loadLeadQueueBlockMock: vi.fn(),
  loadConsultationRequestQueueBlockMock: vi.fn(),
  loadDealQueueBlockMock: vi.fn(),
  loadTrainingPathQueueBlockMock: vi.fn(),
  loadOverdueFollowUpsBlockMock: vi.fn(),
  loadRoutingReviewBlockMock: vi.fn(),
  loadFunnelRecommendationsBlockMock: vi.fn(),
  loadAnonymousOpportunitiesBlockMock: vi.fn(),
  loadRecurringPainThemesBlockMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  notFoundMock: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  redirect: redirectMock,
  notFound: notFoundMock,
}));

vi.mock("@/lib/journal/admin-journal", () => ({
  requireAdminPageAccess: requireAdminPageAccessMock,
}));

vi.mock("@/lib/operator/loaders/admin-loaders", () => ({
  loadSystemHealthBlock: loadSystemHealthBlockMock,
  loadLeadQueueBlock: loadLeadQueueBlockMock,
  loadConsultationRequestQueueBlock: loadConsultationRequestQueueBlockMock,
  loadDealQueueBlock: loadDealQueueBlockMock,
  loadTrainingPathQueueBlock: loadTrainingPathQueueBlockMock,
  loadOverdueFollowUpsBlock: loadOverdueFollowUpsBlockMock,
  loadRoutingReviewBlock: loadRoutingReviewBlockMock,
}));

vi.mock("@/lib/operator/loaders/analytics-loaders", () => ({
  loadFunnelRecommendationsBlock: loadFunnelRecommendationsBlockMock,
  loadAnonymousOpportunitiesBlock: loadAnonymousOpportunitiesBlockMock,
  loadRecurringPainThemesBlock: loadRecurringPainThemesBlockMock,
}));

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import AdminLayout from "@/app/admin/layout";
import AdminDashboardPage from "@/app/admin/page";
import {
  getAdminDashboardPath,
  getAdminJournalPath,
  getAdminLeadsPath,
  getAdminSystemPath,
  getAdminUserDetailPath,
  getAdminUsersPath,
} from "@/lib/admin/admin-routes";
import { resolveAdminNavigationItems } from "@/lib/admin/admin-navigation";
import { resolveAccountMenuRoutes } from "@/lib/shell/shell-navigation";
import type { RoleName } from "@/core/entities/user";

describe("admin shell and concierge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathnameMock.mockReturnValue("/admin");
    requireAdminPageAccessMock.mockResolvedValue({ id: "admin_1", roles: ["ADMIN"] });
    loadSystemHealthBlockMock.mockResolvedValue({
      blockId: "system_health",
      state: "ready",
      data: {
        summary: {
          overallStatus: "ok",
          readinessStatus: "ok",
          livenessStatus: "ok",
          environmentStatus: "ok",
        },
        warnings: [],
      },
    });
    loadLeadQueueBlockMock.mockResolvedValue({
      blockId: "lead_queue",
      state: "empty",
      data: {
        summary: {
          submittedLeadCount: 0,
          newLeadCount: 0,
          contactedLeadCount: 0,
          qualifiedLeadCount: 0,
          deferredLeadCount: 0,
        },
      },
    });
    loadConsultationRequestQueueBlockMock.mockResolvedValue({ blockId: "consultation_requests", state: "empty", data: { summary: { pendingCount: 0 } } });
    loadDealQueueBlockMock.mockResolvedValue({ blockId: "deal_queue", state: "empty", data: { summary: { draftCount: 0, qualifiedCount: 0, agreedCount: 0, declinedCount: 0 }, deals: [], emptyReason: null } });
    loadTrainingPathQueueBlockMock.mockResolvedValue({ blockId: "training_path_queue", state: "empty", data: { summary: { draftCount: 0, recommendedCount: 0, followUpNowCount: 0 } } });
    loadOverdueFollowUpsBlockMock.mockResolvedValue({ blockId: "overdue_follow_ups", state: "empty", data: { summary: { overdueLeadCount: 0, overdueDealCount: 0, totalOverdueCount: 0 } } });
    loadRoutingReviewBlockMock.mockResolvedValue({ blockId: "routing_review", state: "empty", data: { summary: { uncertainCount: 0 } } });
    loadFunnelRecommendationsBlockMock.mockResolvedValue({ blockId: "funnel_recommendations", state: "empty", data: { recommendations: [] } });
    loadAnonymousOpportunitiesBlockMock.mockResolvedValue({ blockId: "anonymous_opportunities", state: "empty", data: { opportunities: [] } });
    loadRecurringPainThemesBlockMock.mockResolvedValue({ blockId: "recurring_pain_themes", state: "empty", data: { themes: [] } });
  });

  it("renders all expected sidebar links", () => {
    render(<AdminSidebar />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("href", "/admin/users");
    expect(screen.getByRole("link", { name: "System" })).toHaveAttribute("href", "/admin/system");
    expect(screen.getByRole("link", { name: "Journal" })).toHaveAttribute("href", "/admin/journal");
    expect(screen.getByRole("link", { name: "Leads" })).toHaveAttribute("href", "/admin/leads");
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("data-admin-nav-status", "live");
  });

  it("renders the admin drawer with full navigation items on open", () => {
    render(<AdminDrawer />);

    const trigger = screen.getByRole("button", { name: "Open admin menu" });
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Admin navigation" });
    expect(dialog).toBeInTheDocument();

    const navItems = resolveAdminNavigationItems();
    for (const item of navItems) {
      expect(screen.getByRole("link", { name: new RegExp(item.label) })).toBeInTheDocument();
    }
  });

  it("derives desktop and drawer navigation from the same route model", () => {
    render(
      <>
        <AdminSidebar />
        <AdminDrawer />
      </>,
    );

    // Open the drawer
    fireEvent.click(screen.getByRole("button", { name: "Open admin menu" }));

    const expectedRoutes = resolveAdminNavigationItems().map((route) => route.href);
    const sidebarRoutes = screen
      .getByLabelText("Admin")
      .querySelectorAll("a");
    const drawerRoutes = screen
      .getByLabelText("Admin navigation")
      .querySelectorAll("a");

    expect(Array.from(sidebarRoutes, (route) => route.getAttribute("href"))).toEqual(expectedRoutes);
    expect(Array.from(drawerRoutes, (route) => route.getAttribute("href"))).toEqual(expectedRoutes);
  });

  it("returns the expected admin route helpers", () => {
    expect(getAdminDashboardPath()).toBe("/admin");
    expect(getAdminUsersPath()).toBe("/admin/users");
    expect(getAdminUserDetailPath("usr_1")).toBe("/admin/users/usr_1");
    expect(getAdminSystemPath()).toBe("/admin/system");
    expect(getAdminLeadsPath()).toBe("/admin/leads");
    expect(getAdminJournalPath()).toBe("/admin/journal");
  });

  it("enforces RBAC in the shared admin layout", async () => {
    const view = await AdminLayout({ children: <div>Admin child</div> });
    render(view);

    expect(requireAdminPageAccessMock).toHaveBeenCalled();
    expect(screen.getByText("Admin child").closest('[data-admin-scroll-region="true"]')).not.toBeNull();
    expect(screen.getByText("Admin child")).toBeInTheDocument();
  });

  it("renders the dashboard shell with helpful empty states", async () => {
    render(await AdminDashboardPage());

    expect(loadSystemHealthBlockMock).toHaveBeenCalled();
    expect(loadLeadQueueBlockMock).toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Admin dashboard" })).toBeInTheDocument();
    expect(screen.getByText("All clear.")).toBeInTheDocument();
    expect(screen.getByText("No leads yet.")).toBeInTheDocument();
  });

  it("exposes admin-dashboard in the admin account menu route set", () => {
    const adminUser = { id: "admin_1", email: "admin@example.com", name: "Admin", roles: ["ADMIN"] as RoleName[] };

    expect(resolveAccountMenuRoutes(adminUser).map((route) => route.id)).toEqual([
      "admin-dashboard",
      "jobs",
      "journal-admin",
      "profile",
    ]);
  });
});