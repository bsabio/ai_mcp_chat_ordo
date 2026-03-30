import { beforeEach, describe, expect, it, vi } from "vitest";

const { searchAdminEntitiesMock, resolveCommandRoutesMock } = vi.hoisted(() => ({
  searchAdminEntitiesMock: vi.fn(),
  resolveCommandRoutesMock: vi.fn(),
}));

vi.mock("@/lib/admin/search/admin-search", () => ({
  searchAdminEntities: searchAdminEntitiesMock,
}));

vi.mock("@/lib/shell/shell-navigation", () => ({
  resolveCommandRoutes: resolveCommandRoutesMock,
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
        id: "blog",
        label: "Blog",
        href: "/blog",
        description: "Read published journal and blog content.",
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

    const results = await searchGlobalEntities("admin", {
      id: "usr_admin",
      roles: ["ADMIN"],
    });

    expect(results).toHaveLength(2);
    expect(new Set(results.map((result) => `${result.kind}:${result.href}`)).size).toBe(2);
  });
});