import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCorpusSummariesMock, listPublishedMock } = vi.hoisted(() => ({
  getCorpusSummariesMock: vi.fn(),
  listPublishedMock: vi.fn(),
}));

vi.mock("@/lib/config/instance", () => ({
  getInstanceIdentity: () => ({
    domain: "studioordo.com",
  }),
}));

vi.mock("@/lib/corpus-library", () => ({
  getCorpusSummaries: getCorpusSummariesMock,
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getBlogPostRepository: () => ({
    listPublished: listPublishedMock,
  }),
}));

import sitemap from "@/app/sitemap";

describe("/app/sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits canonical /journal public URLs without duplicate /blog entries", async () => {
    getCorpusSummariesMock.mockResolvedValue([
      {
        slug: "systems",
        sectionSlugs: ["overview", "delivery"],
      },
    ]);
    listPublishedMock.mockResolvedValue([
      {
        slug: "launch-plan",
        publishedAt: "2026-03-26T00:00:00.000Z",
      },
      {
        slug: "ops-ledger",
        publishedAt: null,
      },
    ]);

    const result = await sitemap();
    const urls = result.map((entry) => entry.url);

    expect(urls).toContain("https://studioordo.com/journal");
    expect(urls).toContain("https://studioordo.com/journal/launch-plan");
    expect(urls).toContain("https://studioordo.com/journal/ops-ledger");
    expect(urls).toContain("https://studioordo.com/library/systems/overview");
    expect(urls).toContain("https://studioordo.com/library/systems/delivery");
    expect(urls).not.toContain("https://studioordo.com/blog");
    expect(urls).not.toContain("https://studioordo.com/blog/launch-plan");
  });
});