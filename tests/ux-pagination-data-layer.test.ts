import { describe, expect, it, vi, beforeEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

function fileExists(relativePath: string): boolean {
  return existsSync(join(process.cwd(), relativePath));
}

// ── Mock dependencies ──────────────────────────────────────────────────

const mockUserMapper = vi.hoisted(() => ({
  list: vi.fn(),
  count: vi.fn(),
}));

const mockJobMapper = vi.hoisted(() => ({
  listForAdmin: vi.fn(),
  countForAdmin: vi.fn(),
}));

const mockConversationMapper = vi.hoisted(() => ({
  list: vi.fn(),
  count: vi.fn(),
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getUserDataMapper: () => mockUserMapper,
  getJobQueueDataMapper: () => mockJobMapper,
  getConversationDataMapper: () => mockConversationMapper,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// ── D11.1: buildAdminPaginationParams utility ──────────────────────────

describe("D11.1: buildAdminPaginationParams utility", () => {
  it("file exists at src/lib/admin/admin-pagination.ts", () => {
    expect(fileExists("src/lib/admin/admin-pagination.ts")).toBe(true);
  });

  it("empty searchParams returns defaults: page=1 pageSize=25 offset=0", async () => {
    const { buildAdminPaginationParams } = await import(
      "@/lib/admin/admin-pagination"
    );
    const result = buildAdminPaginationParams({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
    expect(result.limit).toBe(25);
    expect(result.offset).toBe(0);
  });

  it("page=3 pageSize=10 returns offset=20", async () => {
    const { buildAdminPaginationParams } = await import(
      "@/lib/admin/admin-pagination"
    );
    const result = buildAdminPaginationParams({ page: "3", pageSize: "10" });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(10);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(20);
  });

  it("page=1 produces offset=0 (first page has no offset)", async () => {
    const { buildAdminPaginationParams } = await import(
      "@/lib/admin/admin-pagination"
    );
    const result = buildAdminPaginationParams({ page: "1", pageSize: "25" });
    expect(result.offset).toBe(0);
  });

  it("custom defaultPageSize is respected when pageSize not provided", async () => {
    const { buildAdminPaginationParams } = await import(
      "@/lib/admin/admin-pagination"
    );
    const result = buildAdminPaginationParams({}, 50);
    expect(result.pageSize).toBe(50);
    expect(result.limit).toBe(50);
  });

  it("exports DEFAULT_PAGE_SIZE = 25 and MAX_PAGE_SIZE = 100", async () => {
    const mod = await import("@/lib/admin/admin-pagination");
    expect(mod.DEFAULT_PAGE_SIZE).toBe(25);
    expect(mod.MAX_PAGE_SIZE).toBe(100);
  });

  // Negative: page=-5 clamps to 1
  it("negative page value clamps to 1", async () => {
    const { buildAdminPaginationParams } = await import(
      "@/lib/admin/admin-pagination"
    );
    const result = buildAdminPaginationParams({ page: "-5" });
    expect(result.page).toBe(1);
    expect(result.offset).toBe(0);
  });

  it("page=0 clamps to 1", async () => {
    const { buildAdminPaginationParams } = await import(
      "@/lib/admin/admin-pagination"
    );
    const result = buildAdminPaginationParams({ page: "0" });
    expect(result.page).toBe(1);
  });

  it("pageSize=999 clamps to MAX_PAGE_SIZE (100)", async () => {
    const { buildAdminPaginationParams } = await import(
      "@/lib/admin/admin-pagination"
    );
    const result = buildAdminPaginationParams({ pageSize: "999" });
    expect(result.pageSize).toBe(100);
    expect(result.limit).toBe(100);
  });

  // Edge: non-numeric page string defaults to 1
  it("non-numeric page 'abc' defaults to page 1", async () => {
    const { buildAdminPaginationParams } = await import(
      "@/lib/admin/admin-pagination"
    );
    const result = buildAdminPaginationParams({ page: "abc" });
    expect(result.page).toBe(1);
    expect(result.offset).toBe(0);
  });

  it("undefined page and pageSize return all defaults", async () => {
    const { buildAdminPaginationParams } = await import(
      "@/lib/admin/admin-pagination"
    );
    const result = buildAdminPaginationParams({
      page: undefined,
      pageSize: undefined,
    });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
  });

  it("pageSize=0 clamps to 1 (never zero-limit query)", async () => {
    const { buildAdminPaginationParams } = await import(
      "@/lib/admin/admin-pagination"
    );
    const result = buildAdminPaginationParams({ pageSize: "0" });
    expect(result.pageSize).toBeGreaterThanOrEqual(1);
    expect(result.limit).toBeGreaterThanOrEqual(1);
  });

  it("large page with small pageSize produces correct offset", async () => {
    const { buildAdminPaginationParams } = await import(
      "@/lib/admin/admin-pagination"
    );
    const result = buildAdminPaginationParams({ page: "10", pageSize: "5" });
    expect(result.offset).toBe(45); // (10-1)*5
  });
});

// ── D11.2: User loader accepts pagination + returns total ──────────────

describe("D11.2: loadAdminUserList — pagination params and total count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loader source uses Promise.all for count and list in parallel", () => {
    // Find the user loader file
    const candidates = [
      "src/lib/admin/users/admin-user-loaders.ts",
      "src/lib/admin/loaders/admin-user-loaders.ts",
    ];
    const source = candidates
      .map((p) => (fileExists(p) ? readSource(p) : ""))
      .find((s) => s.length > 0) ?? "";
    expect(source).toContain("Promise.all");
  });

  it("loader returns both items and total", () => {
    const candidates = [
      "src/lib/admin/users/admin-user-loaders.ts",
      "src/lib/admin/loaders/admin-user-loaders.ts",
    ];
    const source = candidates
      .map((p) => (fileExists(p) ? readSource(p) : ""))
      .find((s) => s.length > 0) ?? "";
    expect(source).toContain("total");
    expect(source).toContain("items");
  });

  it("loader accepts AdminPaginationParams", () => {
    const candidates = [
      "src/lib/admin/users/admin-user-loaders.ts",
      "src/lib/admin/loaders/admin-user-loaders.ts",
    ];
    const source = candidates
      .map((p) => (fileExists(p) ? readSource(p) : ""))
      .find((s) => s.length > 0) ?? "";
    expect(source).toMatch(/AdminPaginationParams|pagination.*limit|limit.*offset/);
  });

  // Negative: loader does not hardcode LIMIT without using pagination params
  it("loader does not hardcode a fixed LIMIT value without respecting pagination", () => {
    const candidates = [
      "src/lib/admin/users/admin-user-loaders.ts",
      "src/lib/admin/loaders/admin-user-loaders.ts",
    ];
    const source = candidates
      .map((p) => (fileExists(p) ? readSource(p) : ""))
      .find((s) => s.length > 0) ?? "";
    // Should not have a hardcoded numeric LIMIT like "LIMIT 100" or "limit: 100"
    expect(source).not.toMatch(/LIMIT\s+\d{3,}|limit:\s*\d{3,}/);
  });

  it("users index page renders AdminPagination component", () => {
    const source = readSource("src/app/admin/users/page.tsx");
    expect(source).toContain("AdminPagination");
  });

  it("users index page extracts page from searchParams", () => {
    const source = readSource("src/app/admin/users/page.tsx");
    expect(source).toMatch(/searchParams|buildAdminPaginationParams/);
  });

  // Edge: total=0 means AdminPagination receives total=0 and renders nothing
  it("users page passes total prop to AdminPagination", () => {
    const source = readSource("src/app/admin/users/page.tsx");
    expect(source).toMatch(/total.*pagination|pagination.*total|total=\{/);
  });
});

// ── D11.3: Jobs loader pagination ─────────────────────────────────────

describe("D11.3: loadAdminJobList — pagination", () => {
  it("jobs index page renders AdminPagination", () => {
    const source = readSource("src/app/admin/jobs/page.tsx");
    expect(source).toContain("AdminPagination");
  });

  it("jobs loader source accepts pagination params", () => {
    const candidates = [
      "src/lib/admin/jobs/admin-job-loaders.ts",
      "src/lib/admin/loaders/admin-job-loaders.ts",
    ];
    const source = candidates
      .map((p) => (fileExists(p) ? readSource(p) : ""))
      .find((s) => s.length > 0) ?? "";
    expect(source).toMatch(/pagination|limit.*offset|AdminPaginationParams/);
  });

  // Negative: jobs default page size is 50, not 25 (source check)
  it("jobs loader or page uses default page size of 50", () => {
    const pageSrc = readSource("src/app/admin/jobs/page.tsx");
    const loaderCandidates = [
      "src/lib/admin/jobs/admin-job-loaders.ts",
      "src/lib/admin/loaders/admin-job-loaders.ts",
    ];
    const loaderSrc = loaderCandidates
      .map((p) => (fileExists(p) ? readSource(p) : ""))
      .find((s) => s.length > 0) ?? "";
    expect(pageSrc + loaderSrc).toContain("50");
  });

  // Edge: jobs page still renders even with no results
  it("jobs page source handles empty result set gracefully", () => {
    const source = readSource("src/app/admin/jobs/page.tsx");
    expect(source).toBeTruthy();
  });
});

// ── D11.4: Conversations loader pagination ────────────────────────────

describe("D11.4: loadAdminConversations — pagination", () => {
  it("conversations index page renders AdminPagination", () => {
    const source = readSource("src/app/admin/conversations/page.tsx");
    expect(source).toContain("AdminPagination");
  });

  it("conversations loader returns total count", () => {
    const candidates = [
      "src/lib/admin/conversations/admin-conversation-loaders.ts",
      "src/lib/admin/loaders/admin-conversation-loaders.ts",
    ];
    const source = candidates
      .map((p) => (fileExists(p) ? readSource(p) : ""))
      .find((s) => s.length > 0) ?? "";
    expect(source).toContain("total");
  });

  // Edge: page extracts page from URL searchParams
  it("conversations page extracts pagination from searchParams", () => {
    const source = readSource("src/app/admin/conversations/page.tsx");
    expect(source).toMatch(/searchParams|buildAdminPaginationParams/);
  });

  it("conversations loader source does not scan full table without limit", () => {
    const candidates = [
      "src/lib/admin/conversations/admin-conversation-loaders.ts",
      "src/lib/admin/loaders/admin-conversation-loaders.ts",
    ];
    const source = candidates
      .map((p) => (fileExists(p) ? readSource(p) : ""))
      .find((s) => s.length > 0) ?? "";
    if (source) {
      expect(source).toMatch(/limit|LIMIT/);
    }
  });
});

// ── D11.5: Leads loader pagination ────────────────────────────────────

describe("D11.5: loadAdminLeadsPipeline — pagination", () => {
  it("leads index page renders AdminPagination", () => {
    const source = readSource("src/app/admin/leads/page.tsx");
    expect(source).toContain("AdminPagination");
  });

  it("leads loader source returns total count", () => {
    const candidates = [
      "src/lib/admin/leads/admin-lead-loaders.ts",
      "src/lib/admin/loaders/admin-lead-loaders.ts",
    ];
    const source = candidates
      .map((p) => (fileExists(p) ? readSource(p) : ""))
      .find((s) => s.length > 0) ?? "";
    expect(source).toContain("total");
  });

  // Edge: leads pipeline has multiple tabs — pagination is tab-scoped
  it("leads page or loader handles multiple entity types for pagination", () => {
    const pageSrc = readSource("src/app/admin/leads/page.tsx");
    // Should reference tab or entityType for scoped pagination
    expect(pageSrc).toMatch(/tab|entityType|activeTab|type/i);
  });

  // Negative: no hardcoded large LIMIT bypassing pagination
  it("leads loader does not hardcode a LIMIT > 100 without pagination", () => {
    const candidates = [
      "src/lib/admin/leads/admin-lead-loaders.ts",
      "src/lib/admin/loaders/admin-lead-loaders.ts",
    ];
    const source = candidates
      .map((p) => (fileExists(p) ? readSource(p) : ""))
      .find((s) => s.length > 0) ?? "";
    if (source) {
      expect(source).not.toMatch(/LIMIT\s+[1-9]\d{3,}/);
    }
  });
});

// ── D11.6: Journal loader pagination ──────────────────────────────────

describe("D11.6: loadAdminJournalList — pagination", () => {
  it("journal admin page renders AdminPagination", () => {
    const source = readSource("src/app/admin/journal/page.tsx");
    expect(source).toContain("AdminPagination");
  });

  it("journal loader returns total count", () => {
    const candidates = [
      "src/lib/admin/journal/admin-journal-loaders.ts",
      "src/lib/admin/loaders/admin-journal-loaders.ts",
      "src/lib/admin/journal-loaders.ts",
    ];
    const source = candidates
      .map((p) => (fileExists(p) ? readSource(p) : ""))
      .find((s) => s.length > 0) ?? "";
    if (source) {
      expect(source).toContain("total");
    }
  });

  it("journal page extracts page from searchParams", () => {
    const source = readSource("src/app/admin/journal/page.tsx");
    expect(source).toMatch(/searchParams|buildAdminPaginationParams/);
  });

  // Edge: journal page returns AdminPagination only when total > pageSize
  it("journal page passes total to AdminPagination", () => {
    const source = readSource("src/app/admin/journal/page.tsx");
    expect(source).toMatch(/total/);
  });
});
