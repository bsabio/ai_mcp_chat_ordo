import { describe, expect, it, vi } from "vitest";
import { InMemoryVectorStore } from "@/adapters/InMemoryVectorStore";
import { InMemoryBM25IndexStore } from "@/adapters/InMemoryBM25IndexStore";
import type { Embedder } from "@/core/search/ports/Embedder";
import type { SearchHandler } from "@/core/search/ports/SearchHandler";
import type { EmbeddingPipelineFactory } from "@/core/search/EmbeddingPipelineFactory";
import type { EmbeddingPipeline } from "@/core/search/EmbeddingPipeline";
import type { CorpusRepository } from "@/core/use-cases/CorpusRepository";
import type { HybridSearchResult, IndexResult, RebuildResult } from "@/core/search/types";
import type { EmbeddingToolDeps } from "../../mcp/embedding-tool";
import {
  embedText,
  embedDocument,
  searchSimilar,
  rebuildIndex,
  getIndexStats,
  deleteEmbeddings,
} from "../../mcp/embedding-tool";

// --- Test doubles ---
function createMockEmbedder(): Embedder {
  const vec = new Float32Array(384);
  for (let i = 0; i < 384; i++) vec[i] = i * 0.001;
  return {
    embed: vi.fn().mockResolvedValue(vec),
    embedBatch: vi.fn().mockResolvedValue([vec]),
    dimensions: vi.fn().mockReturnValue(384),
    isReady: vi.fn().mockReturnValue(true),
  };
}

function createMockSearchHandler(results: HybridSearchResult[] = []): SearchHandler {
  return {
    canHandle: vi.fn().mockReturnValue(true),
    search: vi.fn().mockResolvedValue(results),
    setNext: vi.fn().mockReturnThis(),
  };
}

const MOCK_INDEX_RESULT: IndexResult = {
  sourceId: "test-book/ch-1",
  status: "created",
  chunksUpserted: 3,
};

const MOCK_REBUILD_RESULT: RebuildResult = {
  created: 2,
  updated: 0,
  unchanged: 0,
  orphansDeleted: 0,
  totalChunks: 6,
};

function createMockPipelineFactory(): EmbeddingPipelineFactory {
  const mockPipeline = {
    indexDocument: vi.fn().mockResolvedValue(MOCK_INDEX_RESULT),
    rebuildAll: vi.fn().mockResolvedValue(MOCK_REBUILD_RESULT),
  } as unknown as EmbeddingPipeline;

  return {
    createForSource: vi.fn().mockReturnValue(mockPipeline),
  } as unknown as EmbeddingPipelineFactory;
}

function createMockCorpusRepo(): CorpusRepository {
  return {
    getAllDocuments: vi.fn().mockResolvedValue([
      { slug: "lean-startup", title: "The Lean Startup", number: "1" },
      { slug: "zero-to-one", title: "Zero to One", number: "2" },
    ]),
    getAllSections: vi.fn().mockResolvedValue([
      {
        documentSlug: "lean-startup",
        sectionSlug: "ch-1",
        title: "Vision",
        content: "Start with a vision. Build iteratively.",
        contributors: [],
        supplements: [],
        headings: [],
      },
      {
        documentSlug: "zero-to-one",
        sectionSlug: "ch-1",
        title: "The Future",
        content: "Every moment in business happens only once.",
        contributors: [],
        supplements: [],
        headings: [],
      },
    ]),
    getDocument: vi.fn(),
    getSectionsByDocument: vi.fn(),
    getSection: vi.fn(),
  };
}

function createDeps(overrides?: Partial<EmbeddingToolDeps>): EmbeddingToolDeps {
  return {
    embedder: createMockEmbedder(),
    vectorStore: new InMemoryVectorStore(),
    bm25IndexStore: new InMemoryBM25IndexStore(),
    searchHandler: createMockSearchHandler(),
    pipelineFactory: createMockPipelineFactory(),
    corpusRepo: createMockCorpusRepo(),
    ...overrides,
  };
}

// --- Tests ---

describe("embedText (VSEARCH-30)", () => {
  it("returns dimensions and embeddingPreview array", async () => {
    const deps = createDeps();
    const result = await embedText(deps, { text: "hello world" });

    expect(result.dimensions).toBe(384);
    expect(result.embeddingPreview).toHaveLength(5);
    expect(Array.isArray(result.embeddingPreview)).toBe(true);
    expect(deps.embedder.embed).toHaveBeenCalledWith("hello world");
  });

  it("throws on empty text", async () => {
    const deps = createDeps();
    await expect(embedText(deps, { text: "" })).rejects.toThrow(
      "embed_text requires a non-empty 'text' string.",
    );
  });
});

describe("embedDocument (VSEARCH-31)", () => {
  it("delegates to pipeline.indexDocument and returns IndexResult", async () => {
    const deps = createDeps();
    const result = await embedDocument(deps, {
      source_type: "book_chunk",
      source_id: "test-book/ch-1",
      content: "Some chapter content here.",
    });

    expect(result).toEqual(MOCK_INDEX_RESULT);
    const factory = deps.pipelineFactory as unknown as {
      createForSource: ReturnType<typeof vi.fn>;
    };
    expect(factory.createForSource).toHaveBeenCalledWith("book_chunk");
  });

  it("throws when required fields are missing", async () => {
    const deps = createDeps();
    await expect(
      embedDocument(deps, { source_type: "", source_id: "x", content: "y" }),
    ).rejects.toThrow(
      "embed_document requires source_type, source_id, and content.",
    );
  });
});

describe("searchSimilar (VSEARCH-32)", () => {
  const sampleResult: HybridSearchResult = {
    bookTitle: "The Lean Startup",
    bookNumber: "1",
    bookSlug: "lean-startup",
    chapterTitle: "Vision",
    chapterSlug: "ch-1",
    rrfScore: 0.95,
    vectorRank: 1,
    bm25Rank: 2,
    relevance: "high",
    matchPassage: "Start with a vision.",
    matchSection: "Introduction",
    matchHighlight: "Start with a **vision**.",
    passageOffset: { start: 0, end: 20 },
  };

  it("delegates to searchHandler.search and returns results", async () => {
    const handler = createMockSearchHandler([sampleResult]);
    const deps = createDeps({ searchHandler: handler });
    const results = await searchSimilar(deps, { query: "startup vision" });

    expect(results).toEqual([sampleResult]);
    expect(handler.search).toHaveBeenCalledWith("startup vision", {});
  });

  it("passes source_type and limit as filters", async () => {
    const handler = createMockSearchHandler([]);
    const deps = createDeps({ searchHandler: handler });
    await searchSimilar(deps, {
      query: "test",
      source_type: "document_chunk",
      limit: 5,
    });

    expect(handler.search).toHaveBeenCalledWith("test", {
      sourceType: "document_chunk",
      limit: 5,
    });
  });

  it("throws on empty query", async () => {
    const deps = createDeps();
    await expect(searchSimilar(deps, { query: "" })).rejects.toThrow(
      "search_similar requires a non-empty 'query' string.",
    );
  });
});

describe("rebuildIndex (VSEARCH-33)", () => {
  it("delegates to pipeline.rebuildAll and returns RebuildResult", async () => {
    const deps = createDeps();
    const result = await rebuildIndex(deps, { source_type: "document_chunk" });

    expect(result).toEqual(MOCK_REBUILD_RESULT);
    const factory = deps.pipelineFactory as unknown as {
      createForSource: ReturnType<typeof vi.fn>;
    };
    expect(factory.createForSource).toHaveBeenCalledWith("document_chunk");
  });

  it("throws for unsupported source_type", async () => {
    const deps = createDeps();
    await expect(
      rebuildIndex(deps, { source_type: "conversation" }),
    ).rejects.toThrow(
      'Unsupported source_type: conversation. Only "document_chunk" is supported.',
    );
  });

  it("throws when source_type is missing", async () => {
    const deps = createDeps();
    await expect(
      rebuildIndex(deps, { source_type: "" }),
    ).rejects.toThrow("rebuild_index requires a source_type.");
  });
});

describe("getIndexStats (VSEARCH-34)", () => {
  it("returns embeddingCount, bm25 stats, and embedder readiness", () => {
    const bm25Store = new InMemoryBM25IndexStore();
    bm25Store.saveIndex("document_chunk", {
      avgDocLength: 150,
      docCount: 10,
      docLengths: new Map(),
      termDocFrequencies: new Map(),
    });

    const deps = createDeps({ bm25IndexStore: bm25Store });
    const result = getIndexStats(deps, { source_type: "document_chunk" });

    expect(result.sourceType).toBe("document_chunk");
    expect(result.embeddingCount).toBe(0);
    expect(result.bm25DocCount).toBe(10);
    expect(result.bm25AvgDocLength).toBe(150);
    expect(result.bm25Stale).toBe(false);
    expect(result.embedderReady).toBe(true);
    expect(result.dimensions).toBe(384);
  });

  it("defaults to document_chunk when no source_type given", () => {
    const deps = createDeps();
    const result = getIndexStats(deps, {});
    expect(result.sourceType).toBe("document_chunk");
  });
});

describe("deleteEmbeddings", () => {
  it("removes entries and returns deleted count", () => {
    const store = new InMemoryVectorStore();
    store.upsert([
      {
        id: "book_chunk:test/ch-1:0",
        sourceType: "book_chunk",
        sourceId: "test/ch-1",
        chunkIndex: 0,
        chunkLevel: "passage",
        heading: null,
        content: "test content",
        embeddingInput: "test content",
        contentHash: "abc123",
        modelVersion: "v1",
        embedding: new Float32Array(384),
        metadata: {
          sourceType: "book_chunk",
          bookSlug: "test",
          chapterSlug: "ch-1",
          bookTitle: "Test",
          chapterTitle: "Ch 1",
          chapterFirstSentence: "test",
        },
      },
    ]);

    const deps = createDeps({ vectorStore: store });
    expect(store.count()).toBe(1);

    const result = deleteEmbeddings(deps, { source_id: "test/ch-1" });
    expect(result.deleted).toBe(1);
    expect(result.source_id).toBe("test/ch-1");
    expect(store.count()).toBe(0);
  });

  it("throws on empty source_id", () => {
    const deps = createDeps();
    expect(() => deleteEmbeddings(deps, { source_id: "" })).toThrow(
      "delete_embeddings requires a non-empty 'source_id' string.",
    );
  });
});
