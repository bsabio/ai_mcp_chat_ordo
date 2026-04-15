import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionUserMock,
  listForAdminMock,
  countForAdminMock,
  redirectMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  listForAdminMock: vi.fn(),
  countForAdminMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  notFoundMock: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  notFound: notFoundMock,
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getBlogPostRepository: () => ({
    listForAdmin: listForAdminMock,
    countForAdmin: countForAdminMock,
  }),
  getBlogPostRevisionRepository: () => ({
    listByPostId: vi.fn(),
  }),
  getBlogAssetRepository: () => ({
    listHeroCandidates: vi.fn(),
  }),
  getBlogPostArtifactRepository: () => ({
    listByPost: vi.fn(),
  }),
}));

import AdminJournalPage from "@/app/admin/journal/page";

describe("/admin/journal page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue({ id: "admin_1", email: "admin@example.com", name: "Admin", roles: ["ADMIN"] });
    countForAdminMock
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    listForAdminMock.mockResolvedValue([
      {
        id: "post_1",
        slug: "ops-ledger",
        title: "Ops Ledger",
        description: "Description",
        content: "## Body",
        standfirst: null,
        section: null,
        heroImageAssetId: null,
        status: "draft",
        publishedAt: null,
        createdAt: "2026-03-26T00:00:00.000Z",
        updatedAt: "2026-03-26T10:00:00.000Z",
        createdByUserId: "admin_1",
        publishedByUserId: null,
      },
      {
        id: "post_2",
        slug: "briefing-queue",
        title: "Briefing Queue",
        description: "Description",
        content: "## Body",
        standfirst: "Standfirst",
        section: "briefing",
        heroImageAssetId: null,
        status: "review",
        publishedAt: null,
        createdAt: "2026-03-26T00:00:00.000Z",
        updatedAt: "2026-03-26T10:10:00.000Z",
        createdByUserId: "admin_1",
        publishedByUserId: null,
      },
    ]);
  });

  it("redirects anonymous visitors to login", async () => {
    getSessionUserMock.mockResolvedValueOnce({ id: "anon_1", email: "anon@example.com", name: "Anon", roles: ["ANONYMOUS"] });

    await expect(AdminJournalPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("returns not found for non-admin visitors", async () => {
    getSessionUserMock.mockResolvedValueOnce({ id: "usr_1", email: "user@example.com", name: "User", roles: ["AUTHENTICATED"] });

    await expect(AdminJournalPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("notFound");
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("renders the admin ledger with counts and quick actions", async () => {
    render(await AdminJournalPage({ searchParams: Promise.resolve({ q: "ops", status: "all", section: "all" }) }));

    expect(screen.getByRole("heading", { name: "Journal workspace" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("ops")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getAllByText("Ops Ledger").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Legacy / unset").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Preview" })[0]).toHaveAttribute("href", "/admin/journal/preview/ops-ledger");
    expect(screen.getAllByRole("link", { name: "Manage" })[0]).toHaveAttribute("href", "/admin/journal/post_1");
    expect(listForAdminMock).toHaveBeenCalledWith({ search: "ops", limit: 50 });
  });

  it("shows a safe validation state for invalid filters", async () => {
    render(await AdminJournalPage({ searchParams: Promise.resolve({ status: "not-a-state", section: "essay" }) }));

    expect(screen.getByRole("alert")).toHaveTextContent("Invalid filters were supplied");
    expect(screen.getByText("No journal posts match the current filters.")).toBeInTheDocument();
    expect(listForAdminMock).not.toHaveBeenCalled();
    expect(countForAdminMock).not.toHaveBeenCalled();
  });

  it("renders an empty state when no posts match the filters", async () => {
    countForAdminMock
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    listForAdminMock.mockResolvedValueOnce([]);

    render(await AdminJournalPage({ searchParams: Promise.resolve({ q: "missing" }) }));

    expect(screen.getByText("No journal posts match the current filters.")).toBeInTheDocument();
  });
});