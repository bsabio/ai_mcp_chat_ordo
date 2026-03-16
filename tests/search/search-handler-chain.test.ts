import { describe, it, expect, vi } from "vitest";
import {
  HybridSearchHandler,
  BM25SearchHandler,
  LegacyKeywordHandler,
  EmptyResultHandler,
} from "@/core/search/SearchHandlerChain";
import { HybridSearchEngine } from "@/core/search/HybridSearchEngine";
import { BM25Scorer } from "@/core/search/BM25Scorer";
import { QueryProcessor } from "@/core/search/QueryProcessor";
import { LowercaseStep } from "@/core/search/query-steps/LowercaseStep";
import { InMemoryBM25IndexStore } from "@/adapters/InMemoryBM25IndexStore";
import type { Embedder } from "@/core/search/ports/Embedder";
import type { VectorStore, EmbeddingRecord } from "@/core/search/ports/VectorStore";
import type { CorpusRepository } from "@/core/use-cases/CorpusRepository";
import type { Document } from "@/core/entities/corpus";
import { Section } from "@/core/entities/corpus";

const mockDocuments: Document[] = [
  { slug: "book-1", title: "Book One", number: "1", id: "1" },
];

const mockSections: Section[] = [
  new Section(
    "book-1", "ch-1", "Bauhaus History",
    "The Bauhaus movement was founded by Walter Gropius. It focused on functional design.",
    ["Walter Gropius"], ["Check functionality"], ["Founding"],
  ),
];

function makeMockRepo(): CorpusRepository {
  return {
    getAllDocuments: vi.fn().mockResolvedValue(mockDocuments),
    getAllSections: vi.fn().mockResolvedValue(mockSections),
    getSectionsByDocument: vi.fn().mockResolvedValue(mockSections),
    getSection: vi.fn().mockResolvedValue(mockSections[0]),
    getDocument: vi.fn().mockResolvedValue(mockDocuments[0]),
  };
}

function makeMockEmbedder(ready: boolean): Embedder {
  return {
    embed: vi.fn().mockResolvedValue(new Float32Array(384)),
    embedBatch: vi.fn().mockResolvedValue([new Float32Array(384)]),
    dimensions: () => 384,
    isReady: () => ready,
  };
}

function makeVectorRecord(id: string, content: string): EmbeddingRecord {
  return {
    id,
    sourceType: "document_chunk",
    sourceId: "book-1",
    chunkIndex: 0,
    chunkLevel: "passage",
    heading: null,
    content,
    embeddingInput: content,
    contentHash: "hash",
    modelVersion: "test",
    embedding: new Float32Array(384),
    metadata: {
      sourceType: "document_chunk",
      documentTitle: "Book One",
      documentId: "1",
      documentSlug: "book-1",
      sectionTitle: "Ch",
      sectionSlug: "ch-1",
      sectionFirstSentence: content,
      bookTitle: "Book One",
      bookSlug: "book-1",
      bookNumber: "1",
      chapterTitle: "Ch",
      chapterSlug: "ch-1",
      chapterFirstSentence: content,
    },
  };
}

function makeVectorStore(records: EmbeddingRecord[]): VectorStore {
  return {
    upsert: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => records),
    getBySourceId: vi.fn(() => records),
    getContentHash: vi.fn(() => null),
    getModelVersion: vi.fn(() => null),
    count: vi.fn(() => records.length),
  };
}

describe("SearchHandlerChain", () => {
  // TEST-VS-26
  it("embeddings table empty → BM25-only results via fallback", async () => {
    const bm25IndexStore = new InMemoryBM25IndexStore();
    bm25IndexStore.saveIndex("document_chunk", {
      avgDocLength: 10, docCount: 1,
      docLengths: new Map([["doc1", 10]]),
      termDocFrequencies: new Map([["bauhaus", 1]]),
    });

    const embedder = makeMockEmbedder(false);
    const engine = {} as HybridSearchEngine; // won't be called
    const bm25Processor = new QueryProcessor([new LowercaseStep()]);

    const vectorStore = makeVectorStore([
      makeVectorRecord("doc1", "The Bauhaus movement was important."),
    ]);

    const hybrid = new HybridSearchHandler(engine, embedder, bm25IndexStore, "document_chunk");
    const bm25 = new BM25SearchHandler(new BM25Scorer(), bm25IndexStore, vectorStore, bm25Processor, "document_chunk");
    const legacy = new LegacyKeywordHandler(makeMockRepo());
    const empty = new EmptyResultHandler();

    hybrid.setNext(bm25);
    bm25.setNext(legacy);
    legacy.setNext(empty);

    const results = await hybrid.search("Bauhaus");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].vectorRank).toBeNull(); // no vector used
  });

  // TEST-VS-27
  it("embedding model fails → BM25-only results via fallback", async () => {
    const bm25IndexStore = new InMemoryBM25IndexStore();
    bm25IndexStore.saveIndex("document_chunk", {
      avgDocLength: 10, docCount: 1,
      docLengths: new Map([["doc1", 10]]),
      termDocFrequencies: new Map([["bauhaus", 1]]),
    });

    const embedder = makeMockEmbedder(false);
    const engine = {} as HybridSearchEngine;
    const bm25Processor = new QueryProcessor([new LowercaseStep()]);

    const vectorStore = makeVectorStore([
      makeVectorRecord("doc1", "The Bauhaus movement was important."),
    ]);

    const hybrid = new HybridSearchHandler(engine, embedder, bm25IndexStore, "document_chunk");
    const bm25 = new BM25SearchHandler(new BM25Scorer(), bm25IndexStore, vectorStore, bm25Processor, "document_chunk");
    const legacy = new LegacyKeywordHandler(makeMockRepo());
    const empty = new EmptyResultHandler();

    hybrid.setNext(bm25);
    bm25.setNext(legacy);
    legacy.setNext(empty);

    const results = await hybrid.search("Bauhaus");
    expect(results.length).toBeGreaterThan(0);
  });

  // TEST-VS-28
  it("BM25 index unavailable → legacy keyword scoring", async () => {
    const bm25IndexStore = new InMemoryBM25IndexStore(); // empty — no index
    const embedder = makeMockEmbedder(false);
    const engine = {} as HybridSearchEngine;
    const bm25Processor = new QueryProcessor([new LowercaseStep()]);
    const vectorStore = makeVectorStore([]);

    const hybrid = new HybridSearchHandler(engine, embedder, bm25IndexStore, "document_chunk");
    const bm25 = new BM25SearchHandler(new BM25Scorer(), bm25IndexStore, vectorStore, bm25Processor, "document_chunk");
    const legacy = new LegacyKeywordHandler(makeMockRepo());
    const empty = new EmptyResultHandler();

    hybrid.setNext(bm25);
    bm25.setNext(legacy);
    legacy.setNext(empty);

    const results = await hybrid.search("Bauhaus");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].vectorRank).toBeNull();
    expect(results[0].bm25Rank).toBeNull();
  });

  // TEST-VS-45
  it("chain delegates to BM25SearchHandler when embedder unavailable", async () => {
    const bm25IndexStore = new InMemoryBM25IndexStore();
    bm25IndexStore.saveIndex("document_chunk", {
      avgDocLength: 10, docCount: 1,
      docLengths: new Map([["doc1", 10]]),
      termDocFrequencies: new Map([["test", 1]]),
    });

    const embedder = makeMockEmbedder(false); // not ready
    const engine = {} as HybridSearchEngine;
    const bm25Processor = new QueryProcessor([new LowercaseStep()]);

    const vectorStore = makeVectorStore([
      makeVectorRecord("doc1", "Test content for testing."),
    ]);

    const hybrid = new HybridSearchHandler(engine, embedder, bm25IndexStore, "document_chunk");
    const bm25 = new BM25SearchHandler(new BM25Scorer(), bm25IndexStore, vectorStore, bm25Processor, "document_chunk");
    const legacy = new LegacyKeywordHandler(makeMockRepo());

    hybrid.setNext(bm25);
    bm25.setNext(legacy);

    const results = await hybrid.search("test");
    // Should get BM25 results (vectorRank is null)
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].vectorRank).toBeNull();
    expect(results[0].bm25Rank).not.toBeNull();
  });

  // TEST-VS-46
  it("chain delegates to LegacyKeywordHandler when BM25 index unavailable", async () => {
    const bm25IndexStore = new InMemoryBM25IndexStore(); // empty
    const embedder = makeMockEmbedder(false);
    const engine = {} as HybridSearchEngine;
    const bm25Processor = new QueryProcessor([new LowercaseStep()]);
    const vectorStore = makeVectorStore([]);

    const hybrid = new HybridSearchHandler(engine, embedder, bm25IndexStore, "document_chunk");
    const bm25 = new BM25SearchHandler(new BM25Scorer(), bm25IndexStore, vectorStore, bm25Processor, "document_chunk");
    const legacy = new LegacyKeywordHandler(makeMockRepo());
    const empty = new EmptyResultHandler();

    hybrid.setNext(bm25);
    bm25.setNext(legacy);
    legacy.setNext(empty);

    const results = await hybrid.search("Walter Gropius");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].vectorRank).toBeNull();
    expect(results[0].bm25Rank).toBeNull();
    expect(results[0].chapterSlug).toBe("ch-1");
  });
});
