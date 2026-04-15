import { describe, expect, it } from "vitest";

import { classifyChunkBoundarySource, MarkdownChunker } from "./MarkdownChunker";
import type { DocumentChunkMetadata } from "./ports/Chunker";

const metadata: DocumentChunkMetadata = {
  sourceType: "document_chunk",
  documentSlug: "signal-and-deployment",
  sectionSlug: "ch01-proof-blocks",
  documentTitle: "Signal And Deployment",
  documentId: "7",
  sectionTitle: "Proof Blocks And Signal",
  sectionFirstSentence: "Signal clarity depends on evidence and method.",
  bookSlug: "signal-and-deployment",
  chapterSlug: "ch01-proof-blocks",
  bookTitle: "Signal And Deployment",
  bookNumber: "7",
  chapterTitle: "Proof Blocks And Signal",
  chapterFirstSentence: "Signal clarity depends on evidence and method.",
};

describe("MarkdownChunker", () => {
  it("annotates document chunks with boundary, adjacency, and concept metadata", () => {
    const chunker = new MarkdownChunker();
    const content = [
      "## Signal Design",
      "",
      "Signal clarity depends on evidence and method. Proof has to be legible enough that another person can verify it in context.",
      "",
      "Repeated proof compounds because judgment follows visible method rather than isolated claims. Builders need concrete before-and-after evidence to make the case.",
      "",
      "### Proof Blocks",
      "",
      "Proof blocks keep the mechanism whole. They connect the initial state, the intervention, the resulting state, and the attribution in one place.",
      "",
      "## Deployment",
      "",
      "Deployment turns isolated proof into a repeatable public signal that other people can verify.",
    ].join("\n");

    const chunks = chunker.chunk("signal-and-deployment/ch01-proof-blocks", content, metadata, {
      maxChunkWords: 24,
      minChunkWords: 5,
    });

    const documentChunk = chunks.find((chunk) => chunk.level === "document");
    const nonDocumentChunks = chunks.filter((chunk) => chunk.level !== "document");
    const firstSectionChunk = nonDocumentChunks.find((chunk) => chunk.level === "section");
    const firstPassageChunk = nonDocumentChunks.find((chunk) => chunk.level === "passage");

    expect(documentChunk?.metadata).toMatchObject({
      chunkLevel: "document",
      chunkId: "signal-and-deployment/ch01-proof-blocks#document:0",
      boundarySource: "document_start",
    });
    expect(nonDocumentChunks.map((chunk) => (chunk.metadata as DocumentChunkMetadata).localChunkIndex)).toEqual(
      nonDocumentChunks.map((_, index) => index),
    );
    expect(nonDocumentChunks.every((chunk) => typeof (chunk.metadata as DocumentChunkMetadata).chunkId === "string")).toBe(true);
    expect(firstSectionChunk?.metadata).toMatchObject({
      boundarySource: "h2_heading",
      previousChunkId: null,
    });
    expect(firstPassageChunk?.metadata).toMatchObject({
      parentChunkId: (firstSectionChunk?.metadata as DocumentChunkMetadata | undefined)?.chunkId,
      previousChunkId: (firstSectionChunk?.metadata as DocumentChunkMetadata | undefined)?.chunkId,
    });
    expect(((firstPassageChunk?.metadata as DocumentChunkMetadata | undefined)?.conceptKeywords?.length ?? 0)).toBeGreaterThan(0);
    expect(firstSectionChunk ? classifyChunkBoundarySource(content, firstSectionChunk) : null).toBe("h2_heading");
  });
});