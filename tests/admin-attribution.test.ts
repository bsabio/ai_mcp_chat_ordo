import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getDb: getDbMock,
}));

import {
  loadJournalAttribution,
  loadSinglePostAttribution,
} from "@/lib/admin/attribution/admin-attribution";

function mockDbQuery(rows: unknown[]) {
  const allMock = vi.fn().mockReturnValue(rows);
  const getMock = vi.fn().mockReturnValue(rows[0] ?? undefined);
  getDbMock.mockReturnValue({
    prepare: vi.fn(() => ({ all: allMock, get: getMock })),
  });
  return { allMock, getMock };
}

describe("loadJournalAttribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns attribution entries from database", async () => {
    const mockEntries = [
      {
        postId: "post_1",
        postTitle: "AI Governance Today",
        postSlug: "ai-governance-today",
        publishedAt: "2024-06-01",
        conversationsSourced: 5,
        leadsGenerated: 3,
        dealsGenerated: 1,
        estimatedRevenue: 2500,
      },
    ];
    mockDbQuery(mockEntries);

    const results = await loadJournalAttribution();
    expect(results).toEqual(mockEntries);
  });

  it("applies date filters when provided", async () => {
    const prepareMock = vi.fn((sql: string) => ({ all: vi.fn().mockReturnValue([]), sql }));
    getDbMock.mockReturnValue({ prepare: prepareMock });

    await loadJournalAttribution({
      afterDate: "2024-01-01",
      beforeDate: "2024-12-31",
    });

    const sql = String(prepareMock.mock.calls[0][0]);
    expect(sql).toContain("bp.published_at >= ?");
    expect(sql).toContain("bp.published_at <= ?");
  });

  it("returns empty array when no posts exist", async () => {
    mockDbQuery([]);
    const results = await loadJournalAttribution();
    expect(results).toEqual([]);
  });
});

describe("loadSinglePostAttribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns attribution metrics for a post slug", async () => {
    const mockRow = {
      conversationsSourced: 3,
      leadsGenerated: 2,
      dealsGenerated: 1,
      estimatedRevenue: 1500,
    };
    mockDbQuery([mockRow]);

    const result = await loadSinglePostAttribution("test-post");
    expect(result).toEqual(mockRow);
  });

  it("returns null when no attribution data exists", async () => {
    const getMock = vi.fn().mockReturnValue(undefined);
    getDbMock.mockReturnValue({
      prepare: vi.fn(() => ({ get: getMock })),
    });

    const result = await loadSinglePostAttribution("no-data-post");
    expect(result).toBeNull();
  });

  it("queries with the post slug parameter", async () => {
    const prepareMock = vi.fn((sql: string) => ({ get: vi.fn().mockReturnValue(undefined), sql }));
    getDbMock.mockReturnValue({ prepare: prepareMock });

    await loadSinglePostAttribution("my-article-slug");

    const sql = String(prepareMock.mock.calls[0][0]);
    expect(sql).toContain("referral_source");
    expect(sql).toContain("session_source");
  });
});
