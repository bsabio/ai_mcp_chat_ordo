import { describe, expect, it, vi } from "vitest";

const {
  getCorpusIndexMock,
  redirectMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getCorpusIndexMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  notFoundMock: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

vi.mock("@/lib/corpus-library", () => ({
  getCorpusIndex: getCorpusIndexMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  notFound: notFoundMock,
}));

import LibrarySectionResolverPage from "@/app/library/section/[slug]/page";

describe("library section resolver route", () => {
  it("redirects a chapter slug to the canonical library chapter route", async () => {
    getCorpusIndexMock.mockResolvedValue([
      {
        bookSlug: "software-engineering",
        chapterSlug: "audit-to-sprint",
      },
    ]);

    await expect(
      LibrarySectionResolverPage({
        params: Promise.resolve({ slug: "audit-to-sprint" }),
      }),
    ).rejects.toThrow("redirect:/library/software-engineering/audit-to-sprint");
  });

  it("redirects a book slug to the canonical library book route", async () => {
    getCorpusIndexMock.mockResolvedValue([
      {
        bookSlug: "software-engineering",
        chapterSlug: "audit-to-sprint",
      },
    ]);

    await expect(
      LibrarySectionResolverPage({
        params: Promise.resolve({ slug: "software-engineering" }),
      }),
    ).rejects.toThrow("redirect:/library/software-engineering");
  });

  it("returns notFound for unknown section slugs", async () => {
    getCorpusIndexMock.mockResolvedValue([]);

    await expect(
      LibrarySectionResolverPage({ params: Promise.resolve({ slug: "missing-section" }) }),
    ).rejects.toThrow("notFound");
  });
});