import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Top-level hoisted mocks ────────────────────────────────────────────

const mockUserDataMapper = vi.hoisted(() => ({
  listForAdmin: vi.fn(),
  countForAdmin: vi.fn(),
  countByRole: vi.fn(),
  findByIdForAdmin: vi.fn(),
}));

const { notFoundMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getUserDataMapper: () => mockUserDataMapper,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// ── D2.1: UserDataMapper admin queries ─────────────────────────────────

describe("UserDataMapper admin queries", () => {
  it("listForAdmin returns records with roles and conversation count", async () => {
    const { UserDataMapper } = await import("@/adapters/UserDataMapper");

    const mockDb = createMockDb([
      { id: "usr_1", email: "a@b.com", name: "Alice", referral_code: "REF1", created_at: "2024-01-01", conversation_count: 3 },
    ]);
    const mapper = new UserDataMapper(mockDb as never);
    const result = await mapper.listForAdmin({});

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("usr_1");
    expect(result[0].conversationCount).toBe(3);
    expect(result[0].roles).toEqual(["ADMIN"]);
  });

  it("countForAdmin returns total count", async () => {
    const { UserDataMapper } = await import("@/adapters/UserDataMapper");

    const mockDb = createMockDb([], { cnt: 5 });
    const mapper = new UserDataMapper(mockDb as never);
    const count = await mapper.countForAdmin({});
    expect(count).toBe(5);
  });

  it("countByRole returns role-based counts", async () => {
    const { UserDataMapper } = await import("@/adapters/UserDataMapper");

    const mockDb = createMockDbForRoles([
      { name: "ADMIN", cnt: 1 },
      { name: "AUTHENTICATED", cnt: 3 },
    ]);
    const mapper = new UserDataMapper(mockDb as never);
    const counts = await mapper.countByRole({});
    expect(counts["ADMIN"]).toBe(1);
    expect(counts["AUTHENTICATED"]).toBe(3);
  });

  it("findByIdForAdmin returns detail record with preferences and referrals", async () => {
    const { UserDataMapper } = await import("@/adapters/UserDataMapper");

    const mockDb = createMockDbForDetail();
    const mapper = new UserDataMapper(mockDb as never);
    const record = await mapper.findByIdForAdmin("usr_1");

    expect(record).not.toBeNull();
    expect(record!.id).toBe("usr_1");
    expect(record!.affiliateEnabled).toBe(true);
    expect(record!.preferences).toEqual([{ key: "theme", value: "dark" }]);
    expect(record!.referrals).toEqual([]);
    expect(record!.recentConversations).toEqual([]);
  });
});

// Mock helpers for UserDataMapper tests
function createMockDb(listRows: unknown[], countRow?: { cnt: number }) {
  return {
    prepare(sql: string) {
      // listForAdmin — has LIMIT (check before COUNT since list SQL also has COUNT subquery)
      if (sql.includes("LIMIT")) {
        return { all: () => listRows };
      }
      // countForAdmin
      if (sql.includes("COUNT(*)")) {
        return { get: () => countRow ?? { cnt: 0 } };
      }
      // getRoles
      if (sql.includes("SELECT r.name")) {
        return { all: () => [{ name: "ADMIN" }] };
      }
      return { all: () => [], get: () => undefined };
    },
  };
}

function createMockDbForRoles(roleRows: Array<{ name: string; cnt: number }>) {
  return {
    prepare(sql: string) {
      if (sql.includes("GROUP BY")) {
        return { all: () => roleRows };
      }
      return { all: () => [], get: () => undefined };
    },
  };
}

function createMockDbForDetail() {
  return {
    prepare(sql: string) {
      if (sql.includes("affiliate_enabled")) {
        return {
          get: () => ({
            id: "usr_1", email: "a@b.com", name: "Alice", referral_code: "REF1",
            created_at: "2024-01-01", credential: null, affiliate_enabled: 1,
            conversation_count: 2,
          }),
        };
      }
      if (sql.includes("user_preferences")) {
        return { all: () => [{ key: "theme", value: "dark" }] };
      }
      if (sql.includes("referrer_user_id")) {
        return { all: () => [] };
      }
      if (sql.includes("conversations")) {
        return { all: () => [] };
      }
      // getRoles
      if (sql.includes("SELECT r.name")) {
        return { all: () => [{ name: "ADMIN" }] };
      }
      return { all: () => [], get: () => undefined };
    },
  };
}

// ── D2.2: UserAdminInteractor ──────────────────────────────────────────

describe("UserAdminInteractor", () => {
  it("updateRole succeeds for valid role ID", async () => {
    const { UserAdminInteractor } = await import("@/core/use-cases/UserAdminInteractor");
    const mockMapper = {
      findById: vi.fn().mockResolvedValue({ id: "usr_1", email: "a@b.com", name: "Alice", roles: ["AUTHENTICATED"] }),
      updateRole: vi.fn().mockResolvedValue(undefined),
    };
    const interactor = new UserAdminInteractor(mockMapper as never);
    await interactor.updateRole("usr_1", "role_admin", "admin_1");
    expect(mockMapper.updateRole).toHaveBeenCalledWith("usr_1", "role_admin");
  });

  it("updateRole rejects invalid role ID", async () => {
    const { UserAdminInteractor } = await import("@/core/use-cases/UserAdminInteractor");
    const mockMapper = { findById: vi.fn(), updateRole: vi.fn() };
    const interactor = new UserAdminInteractor(mockMapper as never);
    await expect(interactor.updateRole("usr_1", "role_bogus", "admin_1")).rejects.toThrow("Invalid role ID");
  });

  it("toggleAffiliate calls mapper", async () => {
    const { UserAdminInteractor } = await import("@/core/use-cases/UserAdminInteractor");
    const mockMapper = {
      findById: vi.fn().mockResolvedValue({ id: "usr_1", email: "a@b.com", name: "Alice", roles: ["AUTHENTICATED"] }),
      toggleAffiliate: vi.fn().mockResolvedValue(undefined),
    };
    const interactor = new UserAdminInteractor(mockMapper as never);
    await interactor.toggleAffiliate("usr_1", true);
    expect(mockMapper.toggleAffiliate).toHaveBeenCalledWith("usr_1", true);
  });
});

// ── D2.3: Route helpers ────────────────────────────────────────────────

describe("admin-users-routes", () => {
  it("generates list and detail paths", async () => {
    const { getAdminUsersListPath, getAdminUsersDetailPath } = await import(
      "@/lib/admin/users/admin-users-routes"
    );
    expect(getAdminUsersListPath()).toBe("/admin/users");
    expect(getAdminUsersDetailPath("usr_1")).toBe("/admin/users/usr_1");
  });
});

// ── D2.4: User list loader ────────────────────────────────────────────

describe("user list loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserDataMapper.countForAdmin.mockResolvedValue(2);
    mockUserDataMapper.countByRole.mockResolvedValue({ ADMIN: 1, AUTHENTICATED: 1 });
    mockUserDataMapper.listForAdmin.mockResolvedValue([
      { id: "usr_1", email: "a@b.com", name: "Alice", roles: ["ADMIN"], referralCode: "REF1", createdAt: "2024-01-01", conversationCount: 5 },
      { id: "usr_2", email: "b@c.com", name: "Bob", roles: ["AUTHENTICATED"], referralCode: null, createdAt: "2024-02-01", conversationCount: 0 },
    ]);
  });

  it("parseAdminUserFilters extracts search and role", async () => {
    const { parseAdminUserFilters } = await import("@/lib/admin/users/admin-users");
    const filters = parseAdminUserFilters({ q: "alice", role: "admin" });
    expect(filters.search).toBe("alice");
    expect(filters.role).toBe("ADMIN");
  });

  it("parseAdminUserFilters defaults to all role", async () => {
    const { parseAdminUserFilters } = await import("@/lib/admin/users/admin-users");
    const filters = parseAdminUserFilters({});
    expect(filters.role).toBe("all");
    expect(filters.search).toBe("");
  });

  it("loadAdminUserList returns view model with counts and mapped entries", async () => {
    const { loadAdminUserList } = await import("@/lib/admin/users/admin-users");
    const result = await loadAdminUserList({ q: "test" });

    expect(result.total).toBe(2);
    expect(result.counts).toEqual({ ADMIN: 1, AUTHENTICATED: 1 });
    expect(result.users).toHaveLength(2);
    expect(result.users[0].roleLabel).toBe("Admin");
    expect(result.users[0].detailHref).toBe("/admin/users/usr_1");
    expect(result.users[1].roleLabel).toBe("User");
  });

  it("loadAdminUserList passes role filter through to mapper", async () => {
    const { loadAdminUserList } = await import("@/lib/admin/users/admin-users");
    await loadAdminUserList({ role: "STAFF" });

    expect(mockUserDataMapper.listForAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ role: "STAFF" }),
    );
  });
});

// ── D2.4: User detail loader ───────────────────────────────────────────

describe("user detail loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns detail view model for existing user", async () => {
    mockUserDataMapper.findByIdForAdmin.mockResolvedValue({
      id: "usr_1", email: "a@b.com", name: "Alice", roles: ["ADMIN"],
      referralCode: "REF1", createdAt: "2024-01-01", credential: null,
      affiliateEnabled: true, conversationCount: 3,
      preferences: [{ key: "theme", value: "dark" }],
      referrals: [],
      recentConversations: [{ id: "conv_1", title: "Test", lane: "support", updatedAt: "2024-01-02" }],
    });

    const { loadAdminUserDetail } = await import("@/lib/admin/users/admin-users");
    const detail = await loadAdminUserDetail("usr_1");

    expect(detail.user.id).toBe("usr_1");
    expect(detail.user.roleLabel).toBe("Admin");
    expect(detail.conversationCount).toBe(3);
    expect(detail.preferences).toHaveLength(1);
    expect(detail.recentConversations).toHaveLength(1);
  });

  it("calls notFound for missing user", async () => {
    mockUserDataMapper.findByIdForAdmin.mockResolvedValue(null);

    const { loadAdminUserDetail } = await import("@/lib/admin/users/admin-users");
    await expect(loadAdminUserDetail("usr_missing")).rejects.toThrow("notFound");
    expect(notFoundMock).toHaveBeenCalled();
  });
});

// ── D2.5: User admin actions (parsing) ─────────────────────────────────

describe("user admin actions parsing", () => {
  it("parseRoleForm extracts valid role ID", async () => {
    const { parseRoleForm } = await import("@/lib/admin/users/admin-users-actions");
    const fd = new FormData();
    fd.set("roleId", "role_admin");
    expect(parseRoleForm(fd)).toEqual({ roleId: "role_admin" });
  });

  it("parseRoleForm rejects invalid role ID", async () => {
    const { parseRoleForm } = await import("@/lib/admin/users/admin-users-actions");
    const fd = new FormData();
    fd.set("roleId", "role_bogus");
    expect(() => parseRoleForm(fd)).toThrow("Invalid role ID");
  });

  it("parseAffiliateForm parses enabled flag", async () => {
    const { parseAffiliateForm } = await import("@/lib/admin/users/admin-users-actions");
    const fd = new FormData();
    fd.set("enabled", "true");
    expect(parseAffiliateForm(fd)).toEqual({ enabled: true });
  });

  it("parseBulkRoleForm extracts IDs and role", async () => {
    const { parseBulkRoleForm } = await import("@/lib/admin/users/admin-users-actions");
    const fd = new FormData();
    fd.set("ids", "usr_1,usr_2");
    fd.set("roleId", "role_staff");
    const result = parseBulkRoleForm(fd);
    expect(result.ids).toEqual(["usr_1", "usr_2"]);
    expect(result.roleId).toBe("role_staff");
  });

  it("parseBulkRoleForm rejects empty IDs", async () => {
    const { parseBulkRoleForm } = await import("@/lib/admin/users/admin-users-actions");
    const fd = new FormData();
    fd.set("ids", "  ");
    fd.set("roleId", "role_staff");
    expect(() => parseBulkRoleForm(fd)).toThrow();
  });
});

// ── D2.8: Signup event emission ────────────────────────────────────────

describe("signup event emission", () => {
  it("emits user_signup event when recorder is provided", async () => {
    const { RegisterUserInteractor } = await import("@/core/use-cases/RegisterUserInteractor");

    const recorder = { recordSignup: vi.fn().mockResolvedValue(undefined) };
    const userRepo = {
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "usr_new", email: "alice@example.com", name: "Alice", roles: ["AUTHENTICATED"] }),
      findById: vi.fn(),
    };
    const hasher = { hash: vi.fn().mockResolvedValue("$hashed"), verify: vi.fn() };
    const sessionRepo = { create: vi.fn().mockResolvedValue(undefined), findByToken: vi.fn(), delete: vi.fn(), deleteExpired: vi.fn() };

    const interactor = new RegisterUserInteractor(userRepo, hasher, sessionRepo, recorder);
    await interactor.execute({ email: "alice@example.com", password: "password123", name: "Alice" });

    expect(recorder.recordSignup).toHaveBeenCalledWith(
      expect.objectContaining({ id: "usr_new", email: "alice@example.com" }),
    );
  });

  it("does not fail when recorder is not provided", async () => {
    const { RegisterUserInteractor } = await import("@/core/use-cases/RegisterUserInteractor");

    const userRepo = {
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "usr_new", email: "bob@example.com", name: "Bob", roles: ["AUTHENTICATED"] }),
      findById: vi.fn(),
    };
    const hasher = { hash: vi.fn().mockResolvedValue("$hashed"), verify: vi.fn() };
    const sessionRepo = { create: vi.fn().mockResolvedValue(undefined), findByToken: vi.fn(), delete: vi.fn(), deleteExpired: vi.fn() };

    const interactor = new RegisterUserInteractor(userRepo, hasher, sessionRepo);
    const result = await interactor.execute({ email: "bob@example.com", password: "password123", name: "Bob" });

    expect(result.user.id).toBe("usr_new");
  });
});
