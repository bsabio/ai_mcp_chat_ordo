import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, searchGlobalEntitiesMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  searchGlobalEntitiesMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/search/global-search", async () => {
  const actual = await vi.importActual<typeof import("@/lib/search/global-search")>("@/lib/search/global-search");
  return {
    ...actual,
    searchGlobalEntities: searchGlobalEntitiesMock,
  };
});

import { searchAction } from "@/lib/search/global-search-actions";

describe("global search action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue({
      id: "usr_auth",
      email: "user@example.com",
      name: "User",
      roles: ["AUTHENTICATED"],
    });
    searchGlobalEntitiesMock.mockResolvedValue([
      {
        kind: "route",
        id: "corpus",
        title: "Library",
        subtitle: "Browse the library",
        href: "/library",
        audience: "route",
        source: "shell",
      },
    ]);
  });

  it("returns early for short queries", async () => {
    const formData = new FormData();
    formData.set("query", "a");

    await expect(searchAction(formData)).resolves.toEqual([]);
    expect(getSessionUserMock).toHaveBeenCalled();
    expect(searchGlobalEntitiesMock).not.toHaveBeenCalled();
  });

  it("passes the resolved user context into searchGlobalEntities", async () => {
    const formData = new FormData();
    formData.set("query", "library");

    await expect(searchAction(formData)).resolves.toEqual([
      expect.objectContaining({ href: "/library" }),
    ]);

    expect(searchGlobalEntitiesMock).toHaveBeenCalledWith("library", {
      id: "usr_auth",
      roles: ["AUTHENTICATED"],
    });
  });
});