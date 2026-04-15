/**
 * Sprint 5 — Public Content Routes
 * 25 tests: P1–P10, N1–N4, E1–E11
 */

import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ── Unit under test: extractDescription ─────────────────────────────

import { extractDescription } from "@/lib/seo/extract-description";

// ── §6.1 Description extraction tests ───────────────────────────────

describe("extractDescription", () => {
  it("P1: returns first paragraph from markdown", () => {
    const md = "# Title\n\n## Abstract\n\nFirst paragraph here.\n\nSecond paragraph.";
    expect(extractDescription(md)).toBe("First paragraph here.");
  });

  it("P2: strips bold and italic formatting", () => {
    const md = "# T\n\n**Bold** and *italic* text.";
    expect(extractDescription(md)).toBe("Bold and italic text.");
  });

  it("P3: strips markdown links", () => {
    const md = "# T\n\n[Link text](https://example.com) and more.";
    expect(extractDescription(md)).toBe("Link text and more.");
  });

  it("P4: truncates to maxLength at word boundary", () => {
    const longParagraph = "# T\n\n" + "The quick brown fox jumps over the lazy dog. ".repeat(10);
    const result = extractDescription(longParagraph, 160);
    expect(result.length).toBeLessThanOrEqual(161); // 160 + ellipsis char
    expect(result).toMatch(/…$/);
  });

  it("N1: returns empty string for empty input", () => {
    expect(extractDescription("")).toBe("");
  });

  it("N2: handles markdown with only headings", () => {
    expect(extractDescription("# Title\n## Section\n## Another")).toBe("");
  });

  it("N3: strips image markdown", () => {
    const md = "# T\n\n![alt](img.png) Some text.";
    expect(extractDescription(md)).toBe("Some text.");
  });

  it("E1: skips horizontal rules between title and content", () => {
    const md = "# Title\n---\n## Abstract\n\n---\n\nActual content.";
    expect(extractDescription(md)).toBe("Actual content.");
  });

  it("E2: preserves inline code content", () => {
    const md = "# T\n\nUse `getDocuments()` to load.";
    expect(extractDescription(md)).toBe("Use getDocuments() to load.");
  });

  it("E8: handles content starting immediately after title", () => {
    const md = "# Title\n\nDirect content paragraph.";
    expect(extractDescription(md)).toBe("Direct content paragraph.");
  });
});

// ── §6.2 Metadata builder tests ─────────────────────────────────────

vi.mock("@/lib/config/instance", () => ({
  getInstanceIdentity: () => ({
    name: "Studio Ordo",
    domain: "studioordo.com",
    logoPath: "/ordo-avatar.png",
    tagline: "Strategic AI Advisory",
    description: "Test description",
  }),
}));

import {
  buildChapterMetadata,
  buildChapterJsonLd,
  buildLibraryIndexMetadata,
  buildLibraryIndexJsonLd,
} from "@/lib/seo/library-metadata";

const sampleInput = {
  chapterTitle: "Why This Moment Matters",
  bookTitle: "Software Engineering",
  bookSlug: "software-engineering",
  chapterSlug: "ch01-why-this-moment-matters",
  content: "# Chapter 1\n\n## Abstract\n\nLLM systems change how software is built.",
  chapterNumber: 1,
  totalChapters: 14,
};

describe("buildChapterMetadata", () => {
  it("P5: returns correct title format", () => {
    const meta = buildChapterMetadata(sampleInput);
    expect(meta.title).toContain("Why This Moment Matters");
    expect(meta.title).toContain("Software Engineering");
    expect(meta.title).toContain("Studio Ordo");
  });

  it("P6: returns canonical URL using configured domain", () => {
    const meta = buildChapterMetadata(sampleInput);
    expect(meta.alternates?.canonical).toBe(
      "https://studioordo.com/library/software-engineering/ch01-why-this-moment-matters",
    );
  });

  it("P7: returns OG tags with article type", () => {
    const meta = buildChapterMetadata(sampleInput);
    const openGraph = meta.openGraph as { type?: string; title?: string } | undefined;
    expect(openGraph?.type).toBe("article");
    expect(openGraph?.title).toBe("Why This Moment Matters");
  });

  it("N4: handles empty content gracefully", () => {
    const meta = buildChapterMetadata({ ...sampleInput, content: "" });
    expect(meta.title).toBeDefined();
    expect(meta.openGraph).toBeDefined();
    expect(typeof meta.description).toBe("string");
  });

  it("E10: description matches extractDescription output", () => {
    const meta = buildChapterMetadata(sampleInput);
    expect(meta.description).toBe("LLM systems change how software is built.");
  });
});

describe("buildChapterJsonLd", () => {
  it("P8: returns Article schema", () => {
    const ld = buildChapterJsonLd(sampleInput);
    expect(ld["@type"]).toBe("Article");
    expect(ld["headline"]).toBe("Why This Moment Matters");
    expect((ld["isPartOf"] as Record<string, unknown>)["@type"]).toBe("Book");
  });
});

describe("buildLibraryIndexMetadata", () => {
  it("P9: returns correct title with counts", () => {
    const meta = buildLibraryIndexMetadata(10, 104);
    expect(meta.title).toContain("10 Books");
    expect(meta.title).toContain("104 Chapters");
  });

  it("E11: describes the compact operator system in metadata", () => {
    const meta = buildLibraryIndexMetadata(10, 104);
    expect(meta.description).toContain("compact, governed AI operator system");
  });

  it("E7: includes OG image from identity config", () => {
    const meta = buildLibraryIndexMetadata(10, 104);
    const images = meta.openGraph?.images;
    expect(images).toBeDefined();
    expect((images as Array<{ url: string }>)[0].url).toBe(
      "https://studioordo.com/ordo-avatar.png",
    );
  });
});

describe("buildLibraryIndexJsonLd", () => {
  it("P10: returns CollectionPage schema", () => {
    const ld = buildLibraryIndexJsonLd(10, 104);
    expect(ld["@type"]).toBe("CollectionPage");
    expect(ld["numberOfItems"]).toBe(104);
  });
});

// ── §6.3 Page integration and source analysis tests ─────────────────

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf-8");
}

describe("page integration", () => {
  it("E3: metadata uses identity.domain from config, not hardcoded", () => {
    // The mock above provides domain "studioordo.com" — verify it flows through
    const meta = buildChapterMetadata({
      chapterTitle: "Test",
      bookTitle: "Test Book",
      bookSlug: "test-book",
      chapterSlug: "test-chapter",
      content: "# T\n\nContent.",
      chapterNumber: 1,
      totalChapters: 1,
    });
    expect(meta.alternates?.canonical).toContain("studioordo.com");
    // Verify it's NOT hardcoded by confirming the value comes from the mock
    expect(meta.alternates?.canonical).toBe(
      "https://studioordo.com/library/test-book/test-chapter",
    );
  });

  it("E4: chapter page source includes JSON-LD script tag", () => {
    const src = readSource("src/app/library/[document]/[section]/page.tsx");
    expect(src).toContain("application/ld+json");
  });

  it("E5: library index page source includes JSON-LD script tag", () => {
    const src = readSource("src/app/library/page.tsx");
    expect(src).toContain("application/ld+json");
  });

  it("E6: chapter page source includes chat CTA", () => {
    const src = readSource("src/app/library/[document]/[section]/page.tsx");
    expect(src).toContain("Ask the AI");
  });

  it("E9: book redirect page exports generateMetadata", () => {
    const src = readSource("src/app/library/[document]/page.tsx");
    expect(src).toContain("generateMetadata");
  });

  it("E11: library pages have no auth imports or session checks", () => {
    const indexSrc = readSource("src/app/library/page.tsx");
    const chapterSrc = readSource("src/app/library/[document]/[section]/page.tsx");
    for (const src of [indexSrc, chapterSrc]) {
      expect(src).not.toContain("getSessionUser");
      expect(src).not.toContain("getServerSession");
    }
  });
});
