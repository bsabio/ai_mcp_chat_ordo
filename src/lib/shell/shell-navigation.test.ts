import { describe, expect, it } from "vitest";

import { resolveAccountMenuRoutes } from "@/lib/shell/shell-navigation";

describe("shell account menu routes", () => {
  it("includes Jobs for signed-in users", () => {
    const routes = resolveAccountMenuRoutes({ roles: ["AUTHENTICATED"] });

    expect(routes.map((route) => route.id)).toEqual(["jobs", "profile"]);
  });

  it("hides account routes for anonymous users", () => {
    const routes = resolveAccountMenuRoutes({ roles: ["ANONYMOUS"] });

    expect(routes).toEqual([]);
  });
});