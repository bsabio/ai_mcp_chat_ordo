import { describe, expect, it } from "vitest";

import { buildCorpusIndexContentHash, CORPUS_INDEX_SIGNATURE_VERSION } from "./corpus-indexing";
import type { DocumentChunkMetadata } from "./ports/Chunker";

const metadata: DocumentChunkMetadata = {
  sourceType: "document_chunk",
  documentSlug: "second-renaissance",
  sectionSlug: "ch01-why-now",
  documentTitle: "The Second Renaissance",
  documentId: "1",
  sectionTitle: "Why Now: The Printing Press Analogy",
  sectionFirstSentence: "The printing press analogy explains why this transition compounds.",
  bookSlug: "second-renaissance",
  chapterSlug: "ch01-why-now",
  bookTitle: "The Second Renaissance",
  bookNumber: "1",
  chapterTitle: "Why Now: The Printing Press Analogy",
  chapterFirstSentence: "The printing press analogy explains why this transition compounds.",
};

describe("buildCorpusIndexContentHash", () => {
  it("stays stable for identical content and corpus metadata", () => {
    const left = buildCorpusIndexContentHash("hello world", metadata);
    const right = buildCorpusIndexContentHash("hello world", metadata);

    expect(left).toBe(right);
    expect(CORPUS_INDEX_SIGNATURE_VERSION).toBe("corpus-index-v2");
  });

  it("changes when corpus metadata changes even if content does not", () => {
    const original = buildCorpusIndexContentHash("hello world", metadata);
    const changed = buildCorpusIndexContentHash("hello world", {
      ...metadata,
      sectionTitle: "Why This Historical Analogy Matters",
    });

    expect(changed).not.toBe(original);
  });
});