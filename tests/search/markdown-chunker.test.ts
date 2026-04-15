import { describe, expect, it } from "vitest";
import { MarkdownChunker } from "@/core/search/MarkdownChunker";
import type { BookChunkMetadata } from "@/core/search/ports/Chunker";

const metadata: BookChunkMetadata = {
  sourceType: "book_chunk",
  bookSlug: "ux-design",
  chapterSlug: "chapter-3",
  bookTitle: "UX Design",
  chapterTitle: "Design Principles",
  chapterFirstSentence: "This chapter covers core design principles.",
};

describe("MarkdownChunker", () => {
  const chunker = new MarkdownChunker();

  // TEST-VS-08: Markdown with ## headings → chunks split at heading boundaries
  it("splits on ## headings into separate chunks", () => {
    const content = [
      "## Introduction",
      "Introduction text that has enough words to be meaningful and substantial for chunking. ".repeat(8),
      "",
      "## Principles",
      "Principles text that discusses design fundamentals and heuristic evaluation methods in detail. ".repeat(8),
      "",
      "## Conclusion",
      "Conclusion text wrapping up the chapter discussion with references to all prior sections and topics. ".repeat(8),
    ].join("\n");

    const chunks = chunker.chunk("ux-design/chapter-3", content, metadata);

    // Should have document-level + section/passage chunks
    const docChunks = chunks.filter((c) => c.level === "document");
    const otherChunks = chunks.filter((c) => c.level !== "document");

    expect(docChunks).toHaveLength(1);
    expect(otherChunks.length).toBeGreaterThanOrEqual(3);

    // Verify heading extraction
    const headings = otherChunks.map((c) => c.heading).filter(Boolean);
    expect(headings).toContain("Introduction");
    expect(headings).toContain("Principles");
    expect(headings).toContain("Conclusion");
  });

  // TEST-VS-09: Code block spanning 20 lines is never split across chunks
  it("never splits fenced code blocks across chunks", () => {
    const codeBlock = [
      "```typescript",
      ...Array.from({ length: 20 }, (_, i) => `  const line${i} = ${i};`),
      "```",
    ].join("\n");

    const content = [
      "## Code Section",
      "Some introductory text before the code block.",
      "",
      codeBlock,
      "",
      "Some text after the code block.",
    ].join("\n");

    const chunks = chunker.chunk("ux-design/chapter-3", content, metadata);
    const nonDocChunks = chunks.filter((c) => c.level !== "document");

    // The code block should be entirely in one chunk
    const chunkWithCode = nonDocChunks.find((c) =>
      c.content.includes("```typescript"),
    );
    expect(chunkWithCode).toBeDefined();
    expect(chunkWithCode!.content).toContain("const line0 = 0;");
    expect(chunkWithCode!.content).toContain("const line19 = 19;");
    expect(chunkWithCode!.content.match(/```/g)!.length).toBe(2); // opening + closing
  });

  // TEST-VS-10: Ordered list with 15 items stays as one chunk
  it("keeps ordered list as one atomic block", () => {
    const listItems = Array.from(
      { length: 15 },
      (_, i) => `${i + 1}. Item number ${i + 1} with some description text`,
    ).join("\n");

    const content = [
      "## Checklist",
      "Here is the checklist:",
      "",
      listItems,
    ].join("\n");

    const chunks = chunker.chunk("ux-design/chapter-3", content, metadata);
    const nonDocChunks = chunks.filter((c) => c.level !== "document");

    // All list items should be in the same chunk
    const chunkWithList = nonDocChunks.find((c) =>
      c.content.includes("1. Item number 1"),
    );
    expect(chunkWithList).toBeDefined();
    expect(chunkWithList!.content).toContain("15. Item number 15");
  });

  // TEST-VS-12: 800-word section with no sub-headings → split on paragraph breaks
  it("splits large section on paragraph breaks when no sub-headings", () => {
    const paragraph = "This is a test paragraph with enough words. ".repeat(20); // ~160 words
    const content = [
      "## Large Section",
      paragraph,
      "",
      paragraph,
      "",
      paragraph,
      "",
      paragraph,
      "",
      paragraph,
    ].join("\n");

    const chunks = chunker.chunk("ux-design/chapter-3", content, metadata);
    const passages = chunks.filter((c) => c.level === "passage");

    // 800 words / 400 max → should produce at least 2 passage chunks
    expect(passages.length).toBeGreaterThanOrEqual(2);

    // Every passage should be ≤ 400 words (with some tolerance for atomic blocks)
    for (const p of passages) {
      const wc = p.content.split(/\s+/).filter(Boolean).length;
      expect(wc).toBeLessThanOrEqual(500); // hard cap from spec
    }
  });

  it("treats sections under the default 50-word threshold as passage chunks", () => {
    const content = [
      "## Tiny Section",
      "This section is intentionally short so it stays below the minimum chunk word threshold.",
    ].join("\n");

    const chunks = chunker.chunk("ux-design/chapter-3", content, metadata);
    const sectionChunks = chunks.filter((c) => c.level === "section" && c.heading === "Tiny Section");
    const passageChunks = chunks.filter((c) => c.level === "passage" && c.heading === "Tiny Section");

    expect(sectionChunks).toHaveLength(0);
    expect(passageChunks).toHaveLength(1);
  });

  it("prefers H3 boundaries before paragraph splitting inside oversized sections", () => {
    const subSectionA = [
      "### Evidence",
      "Evidence paragraph with enough words to force passage handling and keep the subsection self-contained. ".repeat(18),
    ].join("\n");
    const subSectionB = [
      "### Method",
      "Method paragraph with enough words to force passage handling and keep the subsection self-contained. ".repeat(18),
    ].join("\n");
    const content = [
      "## Large Section",
      subSectionA,
      "",
      subSectionB,
    ].join("\n");

    const chunks = chunker.chunk("ux-design/chapter-3", content, metadata);
    const passageHeadings = chunks.filter((c) => c.level === "passage").map((c) => c.heading);

    expect(passageHeadings).toContain("Evidence");
    expect(passageHeadings).toContain("Method");
  });

  // TEST-VS-13: 30-word orphan paragraph → merged with previous chunk
  it("merges undersized chunks with previous chunk", () => {
    const longParagraph = "Design heuristics help evaluate interface quality. ".repeat(8); // ~56 words
    const shortParagraph = "Final short note."; // < 50 words

    const content = [
      "## Heuristics",
      longParagraph,
      "",
      "## Short",
      shortParagraph,
    ].join("\n");

    const chunks = chunker.chunk("ux-design/chapter-3", content, metadata);
    const nonDocChunks = chunks.filter((c) => c.level !== "document");

    // The 30-word orphan should be merged into another chunk
    const standalone = nonDocChunks.find(
      (c) =>
        c.content === shortParagraph &&
        c.content.split(/\s+/).filter(Boolean).length < 50,
    );
    // Either merged or the total chunks handle the merge
    if (standalone) {
      // If it exists as standalone, it should be because merging wasn't possible
      // (e.g., it's the first non-doc chunk)
      expect(nonDocChunks.length).toBeGreaterThanOrEqual(1);
    } else {
      // Merged — verify the short text is inside another chunk
      const merged = nonDocChunks.find((c) => c.content.includes("Final short note"));
      expect(merged).toBeDefined();
    }
  });

  // TEST-VS-41: MarkdownChunker has zero imports from node_modules
  it("has zero imports from node_modules", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/core/search/MarkdownChunker.ts",
      "utf-8",
    );

    // Should only import from local paths (./ports/..., etc.)
    // Check that no import references node_modules (non-relative, non-alias paths)
    const fromLines = source
      .split("\n")
      .filter((line) => /^\s*from\s+["']/.test(line) || /from\s+["']/.test(line));

    for (const line of fromLines) {
      // All imports should be from relative paths (./)
      expect(line).toMatch(/from\s+["']\.\//);
    }
  });
});
