import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RoleName, User as SessionUser } from "@/core/entities/user";

const { getSessionUserMock, notFoundMock, redirectMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("notFound");
  }),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}));

import {
  canAccessAdminPage,
  canAccessJournalWorkspace,
  requireAdminPageAccess,
  requireJournalWorkspaceAccess,
} from "@/lib/journal/admin-journal";

function createUser(roles: RoleName[]): SessionUser {
  return {
    id: "usr_test",
    email: "editorial@example.com",
    name: "Editorial User",
    roles,
  };
}

describe("journal workspace access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows staff and admin through the shared journal role check", () => {
    expect(canAccessJournalWorkspace(["STAFF"])).toBe(true);
    expect(canAccessJournalWorkspace(["ADMIN"])).toBe(true);
    expect(canAccessJournalWorkspace(["APPRENTICE", "STAFF"])).toBe(true);
    expect(canAccessAdminPage(["STAFF"])).toBe(false);
    expect(canAccessAdminPage(["ADMIN"])).toBe(true);
  });

  it("redirects anonymous users to login", async () => {
    getSessionUserMock.mockResolvedValue(createUser(["ANONYMOUS"]));

    await expect(requireJournalWorkspaceAccess()).rejects.toThrow("redirect:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("fails closed for signed-in roles outside the journal workspace", async () => {
    getSessionUserMock.mockResolvedValue(createUser(["AUTHENTICATED"]));

    await expect(requireJournalWorkspaceAccess()).rejects.toThrow("notFound");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("returns the session user for staff and admin", async () => {
    const staffUser = createUser(["STAFF"]);
    const adminUser = createUser(["ADMIN"]);

    getSessionUserMock.mockResolvedValueOnce(staffUser);
    await expect(requireJournalWorkspaceAccess()).resolves.toEqual(staffUser);

    getSessionUserMock.mockResolvedValueOnce(adminUser);
    await expect(requireJournalWorkspaceAccess()).resolves.toEqual(adminUser);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("redirects anonymous users away from admin-only pages", async () => {
    getSessionUserMock.mockResolvedValue(createUser(["ANONYMOUS"]));

    await expect(requireAdminPageAccess()).rejects.toThrow("redirect:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("fails closed for non-admin signed-in users on admin-only pages", async () => {
    getSessionUserMock.mockResolvedValue(createUser(["STAFF"]));

    await expect(requireAdminPageAccess()).rejects.toThrow("notFound");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("returns the session user for admin-only pages", async () => {
    const adminUser = createUser(["ADMIN"]);
    getSessionUserMock.mockResolvedValue(adminUser);

    await expect(requireAdminPageAccess()).resolves.toEqual(adminUser);
    expect(redirectMock).not.toHaveBeenCalled();
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});