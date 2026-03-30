import { describe, expect, it } from "vitest";

import {
  SHELL_FOOTER_GROUPS,
  SHELL_ROUTES,
  resolveAccountMenuRoutes,
  resolveFooterGroups,
  resolveFooterGroupRoutes,
  resolvePrimaryNavRoutes,
  resolveShellHomeHref,
} from "@/lib/shell/shell-navigation";
import type { User } from "@/core/entities/user";

const allowedInternalRoutes = new Set([
  "/",
  "/profile",
  "/login",
  "/register",
  "/library",
  "/blog",
  "/jobs",
  "/admin/journal",
  "/books",
  "/book/[chapter]",
]);

const anonymousUser: User = {
  id: "usr_anon",
  email: "anon@example.com",
  name: "Anonymous User",
  roles: ["ANONYMOUS"],
};

const authenticatedUser: User = {
  id: "usr_auth",
  email: "user@example.com",
  name: "Authenticated User",
  roles: ["AUTHENTICATED"],
};

describe("shell navigation model", () => {
  it("keeps anonymous primary nav routes inside the verified route surface", () => {
    const invalidRoutes = resolvePrimaryNavRoutes(anonymousUser).filter(
      (item) => item.kind === "internal" && !allowedInternalRoutes.has(item.href),
    );

    expect(invalidRoutes).toEqual([]);
    expect(resolvePrimaryNavRoutes(anonymousUser).map((route) => route.id)).toEqual([]);
    expect(resolvePrimaryNavRoutes(authenticatedUser).map((route) => route.id)).toEqual([]);
  });

  it("keeps footer group routes inside the verified route surface for each audience", () => {
    const invalidRoutes = SHELL_FOOTER_GROUPS.flatMap((group) =>
      [anonymousUser, authenticatedUser].flatMap((user) =>
        resolveFooterGroupRoutes(group, user).filter(
        (item) => item.kind === "internal" && !allowedInternalRoutes.has(item.href),
        ),
      ),
    );

    expect(invalidRoutes).toEqual([]);
    expect(resolveFooterGroups(anonymousUser).map((group) => group.id)).toEqual([
      "information",
      "access",
    ]);
    expect(resolveFooterGroups(authenticatedUser).map((group) => group.id)).toEqual([
      "information",
      "workspace",
    ]);
    expect(resolveAccountMenuRoutes(authenticatedUser).map((route) => route.id)).toEqual([
      "jobs",
      "profile",
    ]);
    expect(resolveShellHomeHref()).toBe("/");
  });

  it("marks legacy compatibility routes without exposing them in primary navigation", () => {
    const legacyRoutes = SHELL_ROUTES.filter((route) => route.isLegacy);

    expect(legacyRoutes.map((route) => route.id)).toEqual([
      "legacy-books-index",
      "legacy-book-chapter",
    ]);
    expect(resolvePrimaryNavRoutes(authenticatedUser).some((route) => route.isLegacy)).toBe(false);
  });
});