import { describe, it, expect, vi } from "vitest";
import { SearchCorpusCommand } from "@/core/use-cases/tools/CorpusTools";
import { RoleAwareSearchFormatter } from "@/core/tool-registry/ToolResultFormatter";
import type { SearchHandler } from "@/core/search/ports/SearchHandler";
import type { HybridSearchResult } from "@/core/search/types";
import type { CorpusRepository } from "@/core/use-cases/CorpusRepository";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";

const sampleHybridResults: HybridSearchResult[] = [
  {
    bookTitle: "Software Engineering",
    bookNumber: "1",
    bookSlug: "software-engineering",
    chapterTitle: "Bauhaus History",
    chapterSlug: "bauhaus-history",
    rrfScore: 0.85,
    vectorRank: 1,
    bm25Rank: 3,
    relevance: "high",
    matchPassage: "The Bauhaus movement was founded by Walter Gropius in 1919. It focused on functional design and the unity of art and craft.",
    matchSection: "Origins",
    matchHighlight: "The **Bauhaus** movement was founded by Walter Gropius in 1919.",
    passageOffset: { start: 0, end: 120 },
  },
];

function makeMockSearchHandler(results: HybridSearchResult[]): SearchHandler {
  const handler: SearchHandler = {
    canHandle: () => true,
    search: vi.fn().mockResolvedValue(results),
    setNext: vi.fn().mockReturnThis(),
  };
  return handler;
}

function makeMockCorpusRepo(): CorpusRepository {
  return {
    getAllDocuments: vi.fn().mockResolvedValue([]),
    getAllSections: vi.fn().mockResolvedValue([]),
    getSectionsByDocument: vi.fn().mockResolvedValue([]),
    getSection: vi.fn().mockImplementation(async () => {
      throw new Error("section not found");
    }),
    getDocument: vi.fn().mockResolvedValue(null),
  };
}

type SearchCorpusToolPayload = {
  query: string;
  groundingState: "no_results" | "search_only" | "prefetched_section";
  followUp: string;
  prefetchedSection: Record<string, unknown> | null;
  results: Record<string, unknown>[];
};

describe("Sprint 4 — Tool Integration", () => {
  const mockRepo = makeMockCorpusRepo();
  const authCtx: ToolExecutionContext = { role: "AUTHENTICATED", userId: "user-1" };
  const anonCtx: ToolExecutionContext = { role: "ANONYMOUS", userId: "anon" };

  describe("SearchCorpusCommand with hybrid handler", () => {
    const handler = makeMockSearchHandler(sampleHybridResults);
    const command = new SearchCorpusCommand(mockRepo, handler);

    // VSEARCH-38 — backward compatible existing fields
    it("returns existing fields (book, chapter, etc.) — backward compatible", async () => {
      const result = await command.execute({ query: "bauhaus" }, authCtx) as SearchCorpusToolPayload;
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toHaveProperty("book", "1. Software Engineering");
      expect(result.results[0]).toHaveProperty("bookNumber", "1");
      expect(result.results[0]).toHaveProperty("chapter", "Bauhaus History");
      expect(result.results[0]).toHaveProperty("chapterSlug", "bauhaus-history");
      expect(result.results[0]).toHaveProperty("bookSlug", "software-engineering");
      expect(result.results[0]).toHaveProperty("matchContext");
      expect(result.results[0]).toHaveProperty("relevance", "high");
    });

    it("returns matchPassage in output", async () => {
      const result = await command.execute({ query: "bauhaus" }, authCtx) as SearchCorpusToolPayload;
      expect(result.results[0]).toHaveProperty("matchPassage", sampleHybridResults[0].matchPassage);
    });

    it("returns matchHighlight with **bold** terms", async () => {
      const result = await command.execute({ query: "bauhaus" }, authCtx) as SearchCorpusToolPayload;
      expect(result.results[0]).toHaveProperty("matchHighlight");
      expect(result.results[0].matchHighlight as string).toContain("**Bauhaus**");
    });

    it("returns matchSection heading", async () => {
      const result = await command.execute({ query: "bauhaus" }, authCtx) as SearchCorpusToolPayload;
      expect(result.results[0]).toHaveProperty("matchSection", "Origins");
    });

    it("returns rrfScore, vectorRank, bm25Rank, passageOffset", async () => {
      const result = await command.execute({ query: "bauhaus" }, authCtx) as SearchCorpusToolPayload;
      expect(result.results[0]).toHaveProperty("rrfScore", 0.85);
      expect(result.results[0]).toHaveProperty("vectorRank", 1);
      expect(result.results[0]).toHaveProperty("bm25Rank", 3);
      expect(result.results[0]).toHaveProperty("passageOffset", { start: 0, end: 120 });
    });
  });

  describe("SearchCorpusCommand without handler (legacy fallback)", () => {
    it("falls back to legacy keyword scoring", async () => {
      const legacyCommand = new SearchCorpusCommand(mockRepo);
      const result = await legacyCommand.execute({ query: "bauhaus" }, authCtx) as SearchCorpusToolPayload;
      // With empty mock repo, the legacy path now returns the structured no-results payload
      expect(result).toEqual({
        query: "bauhaus",
        groundingState: "no_results",
        followUp: "refine_query",
        retrievalQuality: "none",
        results: [],
        prefetchedSection: null,
      });
    });
  });

  describe("RoleAwareSearchFormatter with hybrid fields", () => {
    const formatter = new RoleAwareSearchFormatter();
    const handler = makeMockSearchHandler(sampleHybridResults);
    const command = new SearchCorpusCommand(mockRepo, handler);

    it("strips hybrid fields for ANONYMOUS", async () => {
      const rawResult = await command.execute({ query: "bauhaus" }, authCtx);
      const formatted = formatter.format("search_corpus", rawResult, anonCtx) as SearchCorpusToolPayload;
      expect(formatted.results).toHaveLength(1);
      expect(formatted.prefetchedSection).toBeNull();
      expect(formatted.results[0]).toHaveProperty("book");
      expect(formatted.results[0]).toHaveProperty("matchSection", "Origins");
      expect(formatted.results[0]).not.toHaveProperty("matchPassage");
      expect(formatted.results[0]).not.toHaveProperty("matchHighlight");
      expect(formatted.results[0]).not.toHaveProperty("rrfScore");
      expect(formatted.results[0]).not.toHaveProperty("vectorRank");
      expect(formatted.results[0]).not.toHaveProperty("bm25Rank");
      expect(formatted.results[0]).not.toHaveProperty("passageOffset");
      expect(formatted.results[0]).not.toHaveProperty("matchContext");
      expect(formatted.results[0]).not.toHaveProperty("bookSlug");
      expect(formatted.results[0]).not.toHaveProperty("chapterSlug");
    });

    it("preserves hybrid fields for AUTHENTICATED", async () => {
      const rawResult = await command.execute({ query: "bauhaus" }, authCtx);
      const formatted = formatter.format("search_corpus", rawResult, authCtx) as SearchCorpusToolPayload;
      expect(formatted.results).toHaveLength(1);
      expect(formatted.results[0]).toHaveProperty("matchPassage");
      expect(formatted.results[0]).toHaveProperty("matchHighlight");
      expect(formatted.results[0]).toHaveProperty("matchSection");
      expect(formatted.results[0]).toHaveProperty("rrfScore");
      expect(formatted.results[0]).toHaveProperty("vectorRank");
      expect(formatted.results[0]).toHaveProperty("bm25Rank");
      expect(formatted.results[0]).toHaveProperty("passageOffset");
    });
  });
});
