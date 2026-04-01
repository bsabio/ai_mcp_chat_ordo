import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getDb: getDbMock,
}));

import { searchAdminEntities } from "@/lib/admin/search/admin-search";

function mockDb(rows: unknown[] = []) {
  const allMock = vi.fn().mockReturnValue(rows);
  getDbMock.mockReturnValue({
    prepare: vi.fn(() => ({ all: allMock })),
  });
  return allMock;
}

describe("searchAdminEntities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array for queries shorter than 2 characters", async () => {
    const allMock = mockDb();
    const results = await searchAdminEntities("a");
    expect(results).toEqual([]);
    expect(allMock).not.toHaveBeenCalled();
  });

  it("returns empty array for empty query", async () => {
    const allMock = mockDb();
    const results = await searchAdminEntities("");
    expect(results).toEqual([]);
    expect(allMock).not.toHaveBeenCalled();
  });

  it("queries database with LIKE pattern for valid queries", async () => {
    const mockResults = [
      {
        entityType: "user",
        id: "user_1",
        title: "Alice Smith",
        subtitle: "User — alice@example.com",
        href: "/admin/users/user_1",
        matchField: "name",
        updatedAt: "2024-01-01",
      },
    ];
    mockDb(mockResults);

    const results = await searchAdminEntities("Alice");
    expect(results).toEqual(mockResults);
  });

  it("filters by entity types when provided", async () => {
    const prepareMock = vi.fn((sql: string) => ({ all: vi.fn().mockReturnValue([]), sql }));
    getDbMock.mockReturnValue({ prepare: prepareMock });

    await searchAdminEntities("test", { entityTypes: ["user", "lead"] });

    // The SQL should only contain user and lead tables, not all 9
    const sql = String(prepareMock.mock.calls[0]?.[0]);
    expect(sql).toContain("users");
    expect(sql).toContain("lead_records");
    expect(sql).not.toContain("conversations");
  });

  it("returns empty when entity type filter matches none", async () => {
    const allMock = mockDb();
    const results = await searchAdminEntities("test", { entityTypes: ["nonexistent"] });
    expect(results).toEqual([]);
    expect(allMock).not.toHaveBeenCalled();
  });

  it("respects limit option", async () => {
    const prepareMock = vi.fn((sql: string) => ({ all: vi.fn().mockReturnValue([]), sql }));
    getDbMock.mockReturnValue({ prepare: prepareMock });

    await searchAdminEntities("test", { limit: 5 });

    const sql = String(prepareMock.mock.calls[0]?.[0]);
    expect(sql).toContain("LIMIT");
  });

  it("includes all 9 entity types in default query", async () => {
    const prepareMock = vi.fn((sql: string) => ({ all: vi.fn().mockReturnValue([]), sql }));
    getDbMock.mockReturnValue({ prepare: prepareMock });

    await searchAdminEntities("test");

    const sql = String(prepareMock.mock.calls[0]?.[0]);
    expect(sql).toContain("users");
    expect(sql).toContain("lead_records");
    expect(sql).toContain("consultation_requests");
    expect(sql).toContain("deal_records");
    expect(sql).toContain("training_path_records");
    expect(sql).toContain("conversations");
    expect(sql).toContain("job_requests");
    expect(sql).toContain("system_prompts");
    expect(sql).toContain("blog_posts");
  });
});
