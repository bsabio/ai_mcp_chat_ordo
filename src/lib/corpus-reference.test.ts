import { describe, expect, it } from "vitest";

import type { CorpusIndexEntry } from "@/core/use-cases/CorpusIndexInteractor";

import { resolveCanonicalCorpusReference } from "./corpus-reference";

function makeEntry(overrides: Partial<CorpusIndexEntry>): CorpusIndexEntry {
  return {
    documentSlug: "second-renaissance",
    documentTitle: "The Second Renaissance",
    documentId: "I",
    sectionSlug: "ch01-why-now",
    sectionTitle: "Why Now: The Printing Press Analogy",
    contributors: [],
    supplements: [],
    headings: [],
    contentPreview: "The printing press analogy explains why this transition compounds.",
    filePath: "",
    bookSlug: "second-renaissance",
    bookTitle: "The Second Renaissance",
    bookNumber: "I",
    chapterSlug: "ch01-why-now",
    chapterTitle: "Why Now: The Printing Press Analogy",
    practitioners: [],
    checklistItems: [],
    audience: "public",
    ...overrides,
  };
}

describe("resolveCanonicalCorpusReference", () => {
  const index = [
    makeEntry({
      documentSlug: "second-renaissance",
      sectionSlug: "ch01-why-now",
      sectionTitle: "Why Now: The Printing Press Analogy",
    }),
    makeEntry({
      documentSlug: "archetype-atlas",
      documentTitle: "The Archetype Atlas",
      documentId: "III",
      sectionSlug: "ch04-the-sage",
      sectionTitle: "The Sage: Clarity, Method, Evidence",
      bookSlug: "archetype-atlas",
      bookTitle: "The Archetype Atlas",
      bookNumber: "III",
      chapterSlug: "ch04-the-sage",
      chapterTitle: "The Sage: Clarity, Method, Evidence",
    }),
  ];

  it("returns canonical paths for exact references", () => {
    expect(resolveCanonicalCorpusReference(index, "second-renaissance", "ch01-why-now")).toMatchObject({
      resolved: true,
      resolvedFromAlias: false,
      canonicalPath: "/library/second-renaissance/ch01-why-now",
      resolverPath: "/library/section/ch01-why-now",
    });
  });

  it("canonicalizes unique alias references", () => {
    expect(resolveCanonicalCorpusReference(index, "wrong-book", "why-now")).toMatchObject({
      resolved: true,
      resolvedFromAlias: true,
      documentSlug: "second-renaissance",
      sectionSlug: "ch01-why-now",
      canonicalPath: "/library/second-renaissance/ch01-why-now",
    });
  });

  it("falls back safely when a section cannot be resolved", () => {
    expect(resolveCanonicalCorpusReference(index, "wrong-book", "missing-section")).toMatchObject({
      resolved: false,
      canonicalPath: null,
      resolverPath: null,
      fallbackSearchPath: "/library",
      fallbackSearchQuery: "missing-section",
    });
  });
});