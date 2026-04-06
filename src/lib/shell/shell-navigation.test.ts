import { describe, expect, it } from "vitest";

import {
  resolveAccountMenuRoutes,
  resolvePrimaryNavRoutes,
  resolveRailMenuRoutes,
} from "@/lib/shell/shell-navigation";

describe("shell primary nav routes", () => {
  it("keeps the dedicated drawer browse routes available to anonymous users", () => {
    const routes = resolvePrimaryNavRoutes({ roles: ["ANONYMOUS"] });

    expect(routes.map((route) => route.id)).toEqual(["corpus", "journal"]);
  });
});

describe("shell account menu routes", () => {
  it("includes Jobs for signed-in users", () => {
    const routes = resolveAccountMenuRoutes({ roles: ["AUTHENTICATED"] });

    expect(routes.map((route) => route.id)).toEqual(["jobs", "profile"]);
  });

  it("includes Jobs for apprentices too", () => {
    const routes = resolveAccountMenuRoutes({ roles: ["APPRENTICE"] });

    expect(routes.map((route) => route.id)).toEqual(["jobs", "profile"]);
  });

  it("hides account routes for anonymous users", () => {
    const routes = resolveAccountMenuRoutes({ roles: ["ANONYMOUS"] });

    expect(routes).toEqual([]);
  });

  it("keeps shared browse routes available in the compact rail menu", () => {
    const routes = resolveRailMenuRoutes({ roles: ["ANONYMOUS"] });

    expect(routes.map((route) => route.id)).toEqual(["corpus", "journal"]);
  });
});