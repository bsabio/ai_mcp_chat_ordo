import { describe, expect, it, vi } from "vitest";

import type { Document } from "@/core/entities/corpus";
import { Section } from "@/core/entities/corpus";
import type { SearchHandler } from "@/core/search/ports/SearchHandler";
import type { CorpusRepository } from "@/core/use-cases/CorpusRepository";

import { SearchCorpusCommand } from "./CorpusTools";

function createRepository(sections: Section[], documents: Document[] = [
  { slug: "archetype-atlas", title: "The Archetype Atlas", number: "3", audience: "public" },
]): CorpusRepository {

  return {
    getAllDocuments: vi.fn().mockResolvedValue(documents),
    getAllSections: vi.fn().mockResolvedValue(sections),
    getSectionsByDocument: vi.fn().mockResolvedValue(sections),
    getSection: vi.fn(async (documentSlug: string, sectionSlug: string) => {
      const section = sections.find(
        (candidate) => candidate.documentSlug === documentSlug && candidate.sectionSlug === sectionSlug,
      );

      if (!section) {
        throw new Error(`Missing section: ${documentSlug}/${sectionSlug}`);
      }

      return section;
    }),
    getDocument: vi.fn(async (slug: string) => documents.find((document) => document.slug === slug) ?? null),
  };
}

describe("SearchCorpusCommand", () => {
  it("returns canonical paths and prefetched grounding for a strong signed-in match", async () => {
    const documents: Document[] = [
      { slug: "archetype-atlas", title: "The Archetype Atlas", number: "3", audience: "public" },
      { slug: "second-renaissance", title: "The Second Renaissance", number: "1", audience: "public" },
    ];
    const sections = [
      new Section(
        "archetype-atlas",
        "ch04-the-sage",
        "The Sage: Clarity, Method, Evidence",
        "The Sage values method, clarity, rigor, and evidence in judgment.",
        [],
        ["evidence"],
        ["clarity", "method"],
      ),
      new Section(
        "archetype-atlas",
        "ch05-the-magician",
        "The Magician: Method In Practice",
        "Method and clarity become transformation when they are deployed repeatedly in practice.",
        [],
        ["method"],
        ["clarity", "deployment"],
      ),
      new Section(
        "second-renaissance",
        "ch02-signal-and-proof",
        "Signal And Proof",
        "Visible proof depends on evidence, clarity, and repeated method.",
        [],
        ["proof"],
        ["evidence", "clarity"],
      ),
    ];

    const command = new SearchCorpusCommand(createRepository(sections, documents));
    const result = await command.execute(
      { query: "clarity method evidence" },
      { role: "AUTHENTICATED", userId: "user-1" },
    ) as {
      groundingState: string;
      followUp: string;
      prefetchedSection: {
        found: boolean;
        title: string | null;
        canonicalPath: string | null;
        content: string | null;
        relatedSections: Array<{ canonicalPath: string | null }>;
      } | null;
      results: Array<{ canonicalPath: string; resolverPath: string }>;
    };

    expect(result.groundingState).toBe("prefetched_section");
    expect(result.followUp).toBe("cite_canonical_paths");
    expect(result.prefetchedSection).toMatchObject({
      found: true,
      title: "The Sage: Clarity, Method, Evidence",
      canonicalPath: "/library/archetype-atlas/ch04-the-sage",
    });
    expect(result.prefetchedSection?.content).toContain("The Sage values method");
    expect(result.prefetchedSection?.relatedSections.length).toBeGreaterThanOrEqual(2);
    expect(result.prefetchedSection?.relatedSections.every((section) => section.canonicalPath !== null)).toBe(true);
    expect(result.results[0]).toMatchObject({
      canonicalPath: "/library/archetype-atlas/ch04-the-sage",
      resolverPath: "/library/section/ch04-the-sage",
    });
  });

  it("falls back to search-only grounding when multiple high-confidence results compete", async () => {
    const sections = [
      new Section(
        "archetype-atlas",
        "ch04-the-sage",
        "The Sage: Clarity, Method, Evidence",
        "Method and evidence matter in judgment.",
        [],
        [],
        [],
      ),
      new Section(
        "archetype-atlas",
        "ch06-the-magician",
        "The Magician: Transformation Through Method",
        "Method and transformation both matter in guided change.",
        [],
        [],
        [],
      ),
    ];

    const command = new SearchCorpusCommand(createRepository(sections));
    const result = await command.execute(
      { query: "method" },
      { role: "AUTHENTICATED", userId: "user-1" },
    ) as {
      groundingState: string;
      followUp: string;
      prefetchedSection: unknown;
      results: Array<{ canonicalPath: string }>;
    };

    expect(result.groundingState).toBe("search_only");
    expect(result.followUp).toBe("call_get_section_before_detailed_claims");
    expect(result.prefetchedSection).toBeNull();
    expect(result.results).toHaveLength(2);
  });

  it("passes hybrid search metadata through result items without forcing a prefetch", async () => {
    const sections = [
      new Section(
        "second-renaissance",
        "ch01-why-now",
        "Why Now: The Printing Press Analogy",
        "The printing press analogy explains why this transition compounds.",
        [],
        [],
        [],
      ),
    ];
    const searchHandler: SearchHandler = {
      canHandle: () => true,
      setNext: vi.fn().mockReturnThis(),
      search: vi.fn().mockResolvedValue([
        {
          documentTitle: "The Second Renaissance",
          documentId: "I",
          documentSlug: "second-renaissance",
          sectionTitle: "Why Now: The Printing Press Analogy",
          sectionSlug: "ch01-why-now",
          bookTitle: "The Second Renaissance",
          bookNumber: "I",
          bookSlug: "second-renaissance",
          chapterTitle: "Why Now: The Printing Press Analogy",
          chapterSlug: "ch01-why-now",
          relevance: "high",
          rrfScore: 0.87,
          vectorRank: 1,
          bm25Rank: 2,
          matchPassage: "The printing press analogy explains why this transition compounds.",
          matchSection: "Why Now",
          matchHighlight: "printing press analogy",
          passageOffset: { start: 12, end: 84 },
          chunkMetadata: {
            chunkId: "second-renaissance/ch01-why-now#passage:0",
            chunkLevel: "passage",
            localChunkIndex: 0,
            localChunkCount: 2,
            parentChunkId: "second-renaissance/ch01-why-now#section:0",
            previousChunkId: null,
            nextChunkId: "second-renaissance/ch01-why-now#section:1",
            boundarySource: "h2_heading",
            conceptKeywords: ["printing", "press", "analogy"],
          },
        },
      ]),
    };

    const command = new SearchCorpusCommand(createRepository(sections), searchHandler);
    const result = await command.execute(
      { query: "printing press analogy" },
      { role: "ANONYMOUS", userId: "user-1" },
    ) as {
      groundingState: string;
      results: Array<{
        canonicalPath: string;
        relevance: string;
        rrfScore?: number;
        vectorRank?: number | null;
        bm25Rank?: number | null;
        matchPassage?: string;
        matchSection?: string | null;
        passageOffset?: { start: number; end: number };
        chunkMetadata?: {
          chunkLevel: string | null;
          localChunkIndex: number | null;
          boundarySource: string | null;
          conceptKeywords: string[];
        } | null;
      }>;
      prefetchedSection: unknown;
    };

    expect(result.groundingState).toBe("search_only");
    expect(result.prefetchedSection).toBeNull();
    expect(result.results[0]).toMatchObject({
      canonicalPath: "/library/second-renaissance/ch01-why-now",
      relevance: "high",
      rrfScore: 0.87,
      vectorRank: 1,
      bm25Rank: 2,
      matchPassage: "The printing press analogy explains why this transition compounds.",
      matchSection: "Why Now",
      passageOffset: { start: 12, end: 84 },
      chunkMetadata: {
        chunkLevel: "passage",
        localChunkIndex: 0,
        boundarySource: "h2_heading",
        conceptKeywords: ["printing", "press", "analogy"],
      },
    });
  });

  it("canonicalizes alias-style search results and degrades unresolved links safely", async () => {
    const sections = [
      new Section(
        "second-renaissance",
        "ch01-why-now",
        "Why Now: The Printing Press Analogy",
        "The printing press analogy explains why this transition compounds.",
        [],
        [],
        [],
      ),
    ];
    const documents: Document[] = [
      { slug: "second-renaissance", title: "The Second Renaissance", number: "I", audience: "public" },
    ];
    const searchHandler: SearchHandler = {
      canHandle: () => true,
      setNext: vi.fn().mockReturnThis(),
      search: vi.fn().mockResolvedValue([
        {
          documentTitle: "The Second Renaissance",
          documentId: "I",
          documentSlug: "the-second-renaissance",
          sectionTitle: "Why Now: The Printing Press Analogy",
          sectionSlug: "why-now",
          relevance: "high",
          matchContext: "The printing press analogy explains why this transition compounds.",
        },
        {
          documentTitle: "Missing Book",
          documentId: "?",
          documentSlug: "missing-book",
          sectionTitle: "Missing Section",
          sectionSlug: "missing-section",
          relevance: "medium",
          matchContext: "Unresolved search result.",
        },
      ]),
    };

    const command = new SearchCorpusCommand(createRepository(sections, documents), searchHandler);
    const result = await command.execute(
      { query: "why now" },
      { role: "AUTHENTICATED", userId: "user-1" },
    ) as {
      results: Array<{
        documentSlug: string;
        sectionSlug: string;
        canonicalPath: string | null;
        resolverPath: string | null;
        fallbackSearchPath: string | null;
        fallbackSearchQuery: string | null;
      }>;
    };

    expect(result.results[0]).toMatchObject({
      documentSlug: "second-renaissance",
      sectionSlug: "ch01-why-now",
      canonicalPath: "/library/second-renaissance/ch01-why-now",
      resolverPath: "/library/section/ch01-why-now",
    });
    expect(result.results[1]).toMatchObject({
      canonicalPath: null,
      resolverPath: null,
      fallbackSearchPath: "/library",
      fallbackSearchQuery: "missing-section",
    });
  });
});