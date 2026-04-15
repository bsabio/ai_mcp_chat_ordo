/**
 * Sprint 18 — Embedding Tool Domain Tests
 *
 * Tests all 6 domain functions + getEmbeddingToolSchemas() factory
 * using mock dependencies.
 */
import { describe, it, expect, vi } from "vitest";
import type { EmbeddingToolDeps } from "./embedding-tool";
import {
  embedText,
  embedDocument,
  searchSimilar,
  getIndexStats,
  deleteEmbeddings,
  getEmbeddingToolSchemas,
} from "./embedding-tool";

function createMockDeps(overrides?: Partial<EmbeddingToolDeps>): EmbeddingToolDeps {
  return {
    embedder: {
      embed: vi.fn().mockResolvedValue(new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5])),
      dimensions: vi.fn().mockReturnValue(5),
      isReady: vi.fn().mockReturnValue(true),
    } as unknown as EmbeddingToolDeps["embedder"],
    vectorStore: {
      count: vi.fn().mockReturnValue(10),
      delete: vi.fn(),
    } as unknown as EmbeddingToolDeps["vectorStore"],
    bm25IndexStore: {
      getIndex: vi.fn().mockReturnValue({ docCount: 5, avgDocLength: 120 }),
      isStale: vi.fn().mockReturnValue(false),
    } as unknown as EmbeddingToolDeps["bm25IndexStore"],
    searchHandler: {
      search: vi.fn().mockResolvedValue([{ sourceId: "doc/ch1", score: 0.9 }]),
    } as unknown as EmbeddingToolDeps["searchHandler"],
    pipelineFactory: {
      createForSource: vi.fn().mockReturnValue({
        indexDocument: vi.fn().mockResolvedValue({ indexed: 1 }),
        rebuildAll: vi.fn().mockResolvedValue({ rebuilt: 5 }),
      }),
    } as unknown as EmbeddingToolDeps["pipelineFactory"],
    corpusRepo: {
      getAllDocuments: vi.fn().mockResolvedValue([]),
      getAllSections: vi.fn().mockResolvedValue([]),
    } as unknown as EmbeddingToolDeps["corpusRepo"],
    ...overrides,
  };
}

describe("embedding-tool", () => {
  describe("embedText", () => {
    it("returns dimensions and embedding preview", async () => {
      const deps = createMockDeps();
      const result = await embedText(deps, { text: "hello world" });
      expect(result).toHaveProperty("dimensions", 5);
      expect(result).toHaveProperty("embeddingPreview");
      expect(result.embeddingPreview).toHaveLength(5);
    });

    it("throws on empty text", async () => {
      const deps = createMockDeps();
      await expect(embedText(deps, { text: "" })).rejects.toThrow("non-empty");
    });
  });

  describe("embedDocument", () => {
    it("indexes a document and returns result", async () => {
      const deps = createMockDeps();
      const result = await embedDocument(deps, {
        source_type: "corpus",
        source_id: "book/chapter",
        content: "Some content.",
      });
      expect(result).toEqual({ indexed: 1 });
      expect(deps.pipelineFactory.createForSource).toHaveBeenCalledWith("corpus");
    });

    it("throws on missing fields", async () => {
      const deps = createMockDeps();
      await expect(
        embedDocument(deps, { source_type: "", source_id: "x", content: "y" }),
      ).rejects.toThrow("requires");
    });
  });

  describe("searchSimilar", () => {
    it("returns search results for a valid query", async () => {
      const deps = createMockDeps();
      const results = await searchSimilar(deps, { query: "test query" });
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty("sourceId", "doc/ch1");
    });

    it("throws on empty query", async () => {
      const deps = createMockDeps();
      await expect(searchSimilar(deps, { query: "" })).rejects.toThrow("non-empty");
    });
  });

  describe("getIndexStats", () => {
    it("returns stats object with all expected fields", () => {
      const deps = createMockDeps();
      const stats = getIndexStats(deps, {});
      expect(stats).toHaveProperty("embeddingCount", 10);
      expect(stats).toHaveProperty("bm25DocCount", 5);
      expect(stats).toHaveProperty("embedderReady", true);
      expect(stats).toHaveProperty("dimensions", 5);
    });
  });

  describe("deleteEmbeddings", () => {
    it("deletes and returns count", () => {
      const mockVectorStore = {
        count: vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(9),
        delete: vi.fn(),
      };
      const deps = createMockDeps({
        vectorStore: mockVectorStore as unknown as EmbeddingToolDeps["vectorStore"],
      });
      const result = deleteEmbeddings(deps, { source_id: "book/ch1" });
      expect(result).toEqual({ deleted: 1, source_id: "book/ch1" });
      expect(mockVectorStore.delete).toHaveBeenCalledWith("book/ch1");
    });

    it("throws on empty source_id", () => {
      const deps = createMockDeps();
      expect(() => deleteEmbeddings(deps, { source_id: "" })).toThrow("non-empty");
    });
  });

  describe("getEmbeddingToolSchemas", () => {
    it("returns 6 tool schemas", () => {
      const schemas = getEmbeddingToolSchemas("corpus");
      expect(schemas).toHaveLength(6);
    });

    it("interpolates sourceType into descriptions", () => {
      const schemas = getEmbeddingToolSchemas("my-source");
      const embedDoc = schemas.find((s) => s.name === "embed_document");
      const rebuild = schemas.find((s) => s.name === "rebuild_index");
      expect(JSON.stringify(embedDoc)).toContain("my-source");
      expect(JSON.stringify(rebuild)).toContain("my-source");
    });

    it("each schema has name, description, and inputSchema", () => {
      const schemas = getEmbeddingToolSchemas("test");
      for (const schema of schemas) {
        expect(schema).toHaveProperty("name");
        expect(schema).toHaveProperty("description");
        expect(schema).toHaveProperty("inputSchema");
        expect(schema.inputSchema).toHaveProperty("type", "object");
      }
    });
  });
});
