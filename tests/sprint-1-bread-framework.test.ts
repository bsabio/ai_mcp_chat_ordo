import { describe, expect, it, vi, beforeEach } from "vitest";

// ── D1.1: Shared form parsers ──────────────────────────────────────────

describe("admin-form-parsers", () => {
  let readRequiredText: typeof import("@/lib/admin/shared/admin-form-parsers").readRequiredText;
  let readOptionalText: typeof import("@/lib/admin/shared/admin-form-parsers").readOptionalText;
  let readRequiredEnum: typeof import("@/lib/admin/shared/admin-form-parsers").readRequiredEnum;
  let readOptionalEnum: typeof import("@/lib/admin/shared/admin-form-parsers").readOptionalEnum;

  beforeEach(async () => {
    ({ readRequiredText, readOptionalText, readRequiredEnum, readOptionalEnum } =
      await import("@/lib/admin/shared/admin-form-parsers"));
  });

  it("readRequiredText returns trimmed value", () => {
    const fd = new FormData();
    fd.set("title", "  Hello  ");
    expect(readRequiredText(fd, "title")).toBe("Hello");
  });

  it("readRequiredText throws for missing field", () => {
    const fd = new FormData();
    expect(() => readRequiredText(fd, "title")).toThrow("Missing required field: title");
  });

  it("readOptionalText returns null for empty value", () => {
    const fd = new FormData();
    fd.set("subtitle", "");
    expect(readOptionalText(fd, "subtitle")).toBeNull();
  });

  it("readRequiredEnum validates against allowed values", () => {
    const fd = new FormData();
    fd.set("status", "active");
    expect(readRequiredEnum(fd, "status", ["active", "inactive"] as const)).toBe("active");
  });

  it("readRequiredEnum rejects invalid values", () => {
    const fd = new FormData();
    fd.set("status", "bogus");
    expect(() => readRequiredEnum(fd, "status", ["active", "inactive"] as const)).toThrow("Invalid value");
  });

  it("readOptionalEnum returns null when absent", () => {
    const fd = new FormData();
    expect(readOptionalEnum(fd, "status", ["active"] as const)).toBeNull();
  });
});

// ── D1.2: Shared workflow transitions ──────────────────────────────────

describe("admin-workflow", () => {
  let getWorkflowActions: typeof import("@/lib/admin/shared/admin-workflow").getWorkflowActions;

  beforeEach(async () => {
    ({ getWorkflowActions } = await import("@/lib/admin/shared/admin-workflow"));
  });

  const config = {
    transitions: {
      draft: ["published", "archived"] as const,
      published: ["archived"] as const,
      archived: [] as readonly string[],
    } as Record<string, readonly string[]>,
    labels: {
      "draft→published": { label: "Publish", description: "Make live" },
      "draft→archived": { label: "Archive", description: "Shelve it" },
      "published→archived": { label: "Archive", description: "Retire" },
    },
  };

  it("returns actions for a valid status", () => {
    const actions = getWorkflowActions("draft", config);
    expect(actions).toHaveLength(2);
    expect(actions[0]).toEqual({ nextStatus: "published", label: "Publish", description: "Make live" });
  });

  it("returns empty array for terminal status", () => {
    expect(getWorkflowActions("archived", config)).toEqual([]);
  });

  it("falls back to default label when key missing", () => {
    const sparse = { transitions: { open: ["closed"] as const } as Record<string, readonly string[]>, labels: {} };
    const actions = getWorkflowActions("open", sparse);
    expect(actions[0].label).toBe("closed");
  });
});

// ── D1.3: Shared route helpers ─────────────────────────────────────────

describe("admin-route-helpers", () => {
  let createAdminEntityRoutes: typeof import("@/lib/admin/shared/admin-route-helpers").createAdminEntityRoutes;

  beforeEach(async () => {
    ({ createAdminEntityRoutes } = await import("@/lib/admin/shared/admin-route-helpers"));
  });

  it("creates list and detail routes", () => {
    const routes = createAdminEntityRoutes("/admin/users");
    expect(routes.list()).toBe("/admin/users");
    expect(routes.detail("usr_1")).toBe("/admin/users/usr_1");
    expect(routes.preview).toBeUndefined();
  });

  it("includes preview when option is set", () => {
    const routes = createAdminEntityRoutes("/admin/journal", { preview: true });
    expect(routes.preview!("my-post")).toBe("/admin/journal/preview/my-post");
  });
});

// ── D1.5: Shared list loader ───────────────────────────────────────────

describe("admin-list-helpers", () => {
  let loadAdminList: typeof import("@/lib/admin/shared/admin-list-helpers").loadAdminList;

  beforeEach(async () => {
    ({ loadAdminList } = await import("@/lib/admin/shared/admin-list-helpers"));
  });

  it("runs parallel queries and maps to view model", async () => {
    const config = {
      parseFilters: (sp: Record<string, string | string[] | undefined>) => ({ q: sp.q ?? "" }),
      countAll: vi.fn().mockResolvedValue(2),
      countByStatus: vi.fn().mockResolvedValue({ active: 1, archived: 1 }),
      listFiltered: vi.fn().mockResolvedValue([{ id: "a" }, { id: "b" }]),
      toViewModel: (row: { id: string }) => ({ ...row, mapped: true }),
    };

    const result = await loadAdminList(config, { q: "test" });

    expect(result.total).toBe(2);
    expect(result.counts).toEqual({ active: 1, archived: 1 });
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({ id: "a", mapped: true });
  });

  it("calls all queries in parallel", async () => {
    const order: string[] = [];
    const config = {
      parseFilters: () => ({}),
      countAll: vi.fn(async () => { order.push("countAll"); return 0; }),
      countByStatus: vi.fn(async () => { order.push("countByStatus"); return {}; }),
      listFiltered: vi.fn(async () => { order.push("listFiltered"); return []; }),
      toViewModel: (r: unknown) => r,
    };

    await loadAdminList(config, {});
    expect(config.countAll).toHaveBeenCalled();
    expect(config.countByStatus).toHaveBeenCalled();
    expect(config.listFiltered).toHaveBeenCalled();
  });

  it("returns empty items when list is empty", async () => {
    const config = {
      parseFilters: () => ({}),
      countAll: vi.fn().mockResolvedValue(0),
      countByStatus: vi.fn().mockResolvedValue({}),
      listFiltered: vi.fn().mockResolvedValue([]),
      toViewModel: (r: unknown) => r,
    };

    const result = await loadAdminList(config, {});
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });
});

// ── D1.11: Navigation tools ────────────────────────────────────────────

describe("get-current-page tool", () => {
  it("returns route info for a known pathname", async () => {
    const { getCurrentPageTool } = await import("@/core/use-cases/tools/get-current-page.tool");
    const result = await getCurrentPageTool.command.execute({}, {
      role: "ADMIN",
      userId: "u1",
      currentPathname: "/admin",
    });
    expect(result.label).toBe("Admin");
  });

  it("returns page snapshot details when trusted page context is provided", async () => {
    const { getCurrentPageTool } = await import("@/core/use-cases/tools/get-current-page.tool");
    const result = await getCurrentPageTool.command.execute({}, {
      role: "ANONYMOUS",
      userId: "anon",
      currentPathname: "/register",
      currentPageSnapshot: {
        pathname: "/register",
        title: "Register | Studio Ordo",
        mainHeading: "Create Account",
        sectionHeadings: ["Password"],
        selectedText: null,
        contentExcerpt: "Save conversations and unlock richer tools.",
      },
    });

    expect(result.label).toBe("Register");
    expect(result.mainHeading).toBe("Create Account");
    expect(result.contentExcerpt).toContain("Save conversations");
  });

  it("returns nulls for an unknown pathname", async () => {
    const { getCurrentPageTool } = await import("@/core/use-cases/tools/get-current-page.tool");
    const result = await getCurrentPageTool.command.execute({ pathname: "/unknown" });
    expect(result.label).toBeNull();
    expect(result.description).toBeNull();
  });
});

describe("list-available-pages tool", () => {
  it("returns all internal routes for ALL role", async () => {
    const { listAvailablePagesTool } = await import("@/core/use-cases/tools/list-available-pages.tool");
    const result = await listAvailablePagesTool.command.execute({}, { role: "ADMIN", userId: "u1" });
    expect(result.routes.length).toBeGreaterThan(0);
    expect(result.routes.every((r) => !("id" in r) && Boolean(r.label) && Boolean(r.href))).toBe(true);
  });

  it("filters routes by role visibility", async () => {
    const { listAvailablePagesTool } = await import("@/core/use-cases/tools/list-available-pages.tool");
    const adminResult = await listAvailablePagesTool.command.execute({}, { role: "ADMIN", userId: "u1" });
    const anonResult = await listAvailablePagesTool.command.execute({}, { role: "ANONYMOUS", userId: "anon" });
    // Admin should see more routes (admin-specific routes)
    expect(adminResult.routes.length).toBeGreaterThanOrEqual(anonResult.routes.length);
  });
});

describe("navigate-to-page tool", () => {
  it("returns validated route with navigation action", async () => {
    const { navigateToPageTool } = await import("@/core/use-cases/tools/navigate-to-page.tool");
    const result = await navigateToPageTool.command.execute({ path: "/admin/users" });
    expect(result.label).toBe("Users");
    expect(result.__actions__).toEqual([{ type: "navigate", path: "/admin/users" }]);
  });

  it("throws for unknown path", async () => {
    const { navigateToPageTool } = await import("@/core/use-cases/tools/navigate-to-page.tool");
    await expect(navigateToPageTool.command.execute({ path: "/totally/fake" })).rejects.toThrow("Unknown page");
  });
});

// ── D1.12: Page context injection ──────────────────────────────────────

describe("page context injection", () => {
  vi.mock("@/lib/db", () => ({
    getDb: vi.fn(() => ({})),
  }));

  vi.mock("@/adapters/SystemPromptDataMapper", () => {
    return {
      SystemPromptDataMapper: class {
        getActive() { return Promise.resolve(null); }
      },
    };
  });

  vi.mock("@/core/use-cases/DefaultingSystemPromptRepository", () => {
    return {
      DefaultingSystemPromptRepository: class {
        getActive() { return Promise.resolve({ content: "base prompt" }); }
      },
    };
  });

  vi.mock("@/adapters/ConfigIdentitySource", () => {
    return {
      ConfigIdentitySource: class {
        getIdentity() { return "test identity"; }
      },
    };
  });

  it("includes page context for known pathname", async () => {
    const { buildSystemPrompt } = await import("@/lib/chat/policy");
    const prompt = await buildSystemPrompt("ADMIN", {
      currentPathname: "/admin/users",
      currentPageSnapshot: {
        pathname: "/admin/users",
        title: "Users | Studio Ordo",
        mainHeading: "Users",
        sectionHeadings: ["Account context"],
        selectedText: null,
        contentExcerpt: "Review people, roles, and account context.",
      },
    });
    expect(prompt).toContain("[Authoritative current page snapshot]");
    expect(prompt).toContain("pathname=/admin/users");
    expect(prompt).toContain("visible_content_excerpt");
  });

  it("includes safe fallback for unknown pathname", async () => {
    const { buildSystemPrompt } = await import("@/lib/chat/policy");
    const prompt = await buildSystemPrompt("ADMIN", { currentPathname: "/some/unknown/path" });
    expect(prompt).toContain("pathname=/some/unknown/path");
    expect(prompt).not.toContain("route_description=");
  });

  it("sanitizes malicious pathname characters", async () => {
    const { buildSystemPrompt } = await import("@/lib/chat/policy");
    const prompt = await buildSystemPrompt("ADMIN", { currentPathname: "/admin/<script>alert(1)</script>" });
    expect(prompt).not.toContain("<script>");
  });
});

// ── D1.10: Admin navigation config ─────────────────────────────────────

describe("admin navigation config", () => {
  it("has exactly 9 navigation items", async () => {
    const { resolveAdminNavigationItems } = await import("@/lib/admin/admin-navigation");
    const items = resolveAdminNavigationItems();
    expect(items).toHaveLength(9);
  });

  it("includes all expected route IDs", async () => {
    const { resolveAdminNavigationItems } = await import("@/lib/admin/admin-navigation");
    const ids = resolveAdminNavigationItems().map((i) => i.id);
    expect(ids).toContain("admin-dashboard");
    expect(ids).toContain("admin-users");
    expect(ids).toContain("admin-leads");
    expect(ids).toContain("admin-affiliates");
    expect(ids).toContain("journal-admin");
    expect(ids).toContain("admin-prompts");
    expect(ids).toContain("admin-conversations");
    expect(ids).toContain("admin-jobs");
    expect(ids).toContain("admin-system");
  });
});

// ── D1.10: Shell routes ─────────────────────────────────────────────────

describe("shell route registration", () => {
  it("new admin routes are registered in SHELL_ROUTES", async () => {
    const { SHELL_ROUTE_BY_ID } = await import("@/lib/shell/shell-navigation");
    expect(SHELL_ROUTE_BY_ID.get("admin-affiliates")).toBeDefined();
    expect(SHELL_ROUTE_BY_ID.get("admin-prompts")).toBeDefined();
    expect(SHELL_ROUTE_BY_ID.get("admin-conversations")).toBeDefined();
    expect(SHELL_ROUTE_BY_ID.get("admin-jobs")).toBeDefined();
  });

  it("getShellRouteById resolves new admin routes without error", async () => {
    const { getShellRouteById } = await import("@/lib/shell/shell-navigation");
    expect(() => getShellRouteById("admin-affiliates")).not.toThrow();
    expect(() => getShellRouteById("admin-prompts")).not.toThrow();
    expect(() => getShellRouteById("admin-conversations")).not.toThrow();
    expect(() => getShellRouteById("admin-jobs")).not.toThrow();
  });
});
