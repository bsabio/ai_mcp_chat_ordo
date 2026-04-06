import { beforeEach, describe, expect, it, vi } from "vitest";

const { searchAdminEntitiesMock, resolveCommandRoutesMock } = vi.hoisted(() => ({
  searchAdminEntitiesMock: vi.fn(),
  resolveCommandRoutesMock: vi.fn(),
}));

const { getCorpusSummariesMock, searchCorpusMock } = vi.hoisted(() => ({
  getCorpusSummariesMock: vi.fn(),
  searchCorpusMock: vi.fn(),
}));

vi.mock("@/lib/admin/search/admin-search", () => ({
  searchAdminEntities: searchAdminEntitiesMock,
}));

vi.mock("@/lib/shell/shell-navigation", () => ({
  resolveCommandRoutes: resolveCommandRoutesMock,
}));

vi.mock("@/lib/corpus-library", () => ({
  getCorpusSummaries: getCorpusSummariesMock,
  searchCorpus: searchCorpusMock,
}));

import { searchGlobalEntities } from "@/lib/search/global-search";

describe("searchGlobalEntities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveCommandRoutesMock.mockReturnValue([
      {
        id: "corpus",
        label: "Library",
        href: "/library",
        description: "Browse the library and structured reference material.",
      },
      {
        id: "journal",
        label: "Journal",
        href: "/journal",
        description: "Read published journal content.",
      },
    ]);
    searchAdminEntitiesMock.mockResolvedValue([
      {
        entityType: "user",
        id: "usr_1",
        title: "Keith Williams",
        subtitle: "User — keith@example.com",
        href: "/admin/users/usr_1",
        matchField: "email",
        updatedAt: "2026-03-30T00:00:00.000Z",
      },
    ]);
    getCorpusSummariesMock.mockResolvedValue([
      {
        id: "doc_1",
        title: "Library Search",
        slug: "library-search",
        audience: "public",
        sectionCount: 2,
        sections: ["Search Overview", "Advanced Search"],
        sectionSlugs: ["overview", "advanced-search"],
        number: "01",
        chapterCount: 2,
        chapters: ["Search Overview", "Advanced Search"],
        chapterSlugs: ["overview", "advanced-search"],
      },
    ]);
    searchCorpusMock.mockImplementation(async (query: string) => {
      if (query.toLowerCase().includes("lib")) {
        return [
      {
        document: "01. Library Search",
        documentId: "01",
        section: "Search Overview",
        sectionSlug: "overview",
        documentSlug: "library-search",
        matchContext: "search overview",
        relevance: "high",
        book: "01. Library Search",
        bookNumber: "01",
        chapter: "Search Overview",
        chapterSlug: "overview",
        bookSlug: "library-search",
        },
      ];
      }

      return [];
    });
  });

  it("returns matching shell routes for non-admin users", async () => {
    const results = await searchGlobalEntities("lib", {
      id: "usr_auth",
      roles: ["AUTHENTICATED"],
    });

    expect(results).toEqual([
      expect.objectContaining({
        kind: "route",
        title: "Library",
        href: "/library",
        source: "shell",
      }),
      expect.objectContaining({
        kind: "section",
        title: "Search Overview",
        href: "/library/library-search/overview",
        source: "corpus",
      }),
      expect.objectContaining({
        kind: "document",
        title: "Library Search",
        href: "/library/library-search",
        source: "corpus",
      }),
    ]);
    expect(searchAdminEntitiesMock).not.toHaveBeenCalled();
  });

  it("includes admin entity results for admin users only", async () => {
    const results = await searchGlobalEntities("keith", {
      id: "usr_admin",
      roles: ["ADMIN"],
    });

    expect(searchAdminEntitiesMock).toHaveBeenCalledWith("keith", { limit: 10 });
    expect(results).toEqual([
      expect.objectContaining({
        kind: "admin-entity",
        title: "Keith Williams",
        href: "/admin/users/usr_1",
        source: "admin",
      }),
    ]);
  });

  it("deduplicates identical hrefs across result sources", async () => {
    resolveCommandRoutesMock.mockReturnValue([
      {
        id: "admin-dashboard",
        label: "Admin",
        href: "/admin",
        description: "Open the admin dashboard overview.",
      },
    ]);
    searchAdminEntitiesMock.mockResolvedValue([
      {
        entityType: "user",
        id: "usr_1",
        title: "Admin",
        subtitle: "Synthetic collision",
        href: "/admin",
        matchField: "name",
        updatedAt: "2026-03-30T00:00:00.000Z",
      },
    ]);
    searchCorpusMock.mockResolvedValue([]);

    const results = await searchGlobalEntities("admin", {
      id: "usr_admin",
      roles: ["ADMIN"],
    });

    expect(results).toHaveLength(2);
    expect(new Set(results.map((result) => `${result.kind}:${result.href}`)).size).toBe(2);
  });
});