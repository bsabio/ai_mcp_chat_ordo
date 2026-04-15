import { describe, expect, it } from "vitest";

import { RoleAwareSearchFormatter } from "./ToolResultFormatter";

describe("RoleAwareSearchFormatter", () => {
  it("preserves canonical metadata while redacting prefetched section content for anonymous payloads", () => {
    const formatter = new RoleAwareSearchFormatter();

    const formatted = formatter.format(
      "search_corpus",
      {
        query: "sage clarity",
        groundingState: "prefetched_section",
        followUp: "cite_canonical_paths",
        prefetchedSection: {
          title: "The Sage",
          content: "redacted full content",
        },
        results: [
          {
            document: "3. The Archetype Atlas",
            documentId: "3",
            section: "The Sage",
            sectionSlug: "ch04-the-sage",
            documentSlug: "archetype-atlas",
            relevance: "high",
            book: "3. The Archetype Atlas",
            bookNumber: "3",
            chapter: "The Sage",
            chapterSlug: "ch04-the-sage",
            bookSlug: "archetype-atlas",
            canonicalPath: "/library/archetype-atlas/ch04-the-sage",
            resolverPath: "/library/section/ch04-the-sage",
            chunkMetadata: {
              chunkId: "archetype-atlas/ch04-the-sage#passage:0",
              chunkLevel: "passage",
              localChunkIndex: 0,
              localChunkCount: 2,
              parentChunkId: "archetype-atlas/ch04-the-sage#section:0",
              previousChunkId: null,
              nextChunkId: "archetype-atlas/ch04-the-sage#section:1",
              boundarySource: "h2_heading",
              conceptKeywords: ["sage", "clarity"],
            },
          },
        ],
      },
      { role: "ANONYMOUS", userId: "anonymous" },
    ) as {
      groundingState: string;
      prefetchedSection: unknown;
      results: Array<Record<string, unknown>>;
    };

    expect(formatted.groundingState).toBe("search_only");
    expect(formatted.prefetchedSection).toBeNull();
    expect(formatted.results[0]).toMatchObject({
      documentSlug: "archetype-atlas",
      sectionSlug: "ch04-the-sage",
      canonicalPath: "/library/archetype-atlas/ch04-the-sage",
      resolverPath: "/library/section/ch04-the-sage",
      chunkMetadata: {
        chunkId: "archetype-atlas/ch04-the-sage#passage:0",
        chunkLevel: "passage",
        localChunkIndex: 0,
        localChunkCount: 2,
        parentChunkId: "archetype-atlas/ch04-the-sage#section:0",
        previousChunkId: null,
        nextChunkId: "archetype-atlas/ch04-the-sage#section:1",
        boundarySource: "h2_heading",
        conceptKeywords: ["sage", "clarity"],
      },
    });
  });
});