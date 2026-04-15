/**
 * Sprint 18 — Librarian/Corpus Tool Domain Tests
 *
 * Tests corpus operations via CorpusToolDeps mock and validates
 * getCorpusToolSchemas() factory output.
 *
 * Note: corpusList/corpusGet/corpusAdd/corpusRemove all interact with the
 * filesystem via the corpusDir path. These tests focus on input validation
 * and schema correctness rather than full filesystem I/O (which is tested
 * in integration).
 */
import { describe, it, expect, vi } from "vitest";
import type { CorpusToolDeps } from "./librarian-tool";
import {
  corpusGetDocument,
  corpusRemoveDocument,
  corpusRemoveSection,
  getCorpusToolSchemas,
} from "./librarian-tool";

function createMockDeps(): CorpusToolDeps {
  return {
    corpusDir: "/tmp/test-corpus",
    vectorStore: {
      delete: vi.fn(),
    } as unknown as CorpusToolDeps["vectorStore"],
    clearCaches: vi.fn(),
  };
}

describe("librarian-tool", () => {
  describe("input validation", () => {
    it("corpusGetDocument throws on empty slug", async () => {
      const deps = createMockDeps();
      await expect(corpusGetDocument(deps, { slug: "" })).rejects.toThrow();
    });

    it("corpusGetDocument throws on slug with path traversal", async () => {
      const deps = createMockDeps();
      await expect(corpusGetDocument(deps, { slug: "../etc" })).rejects.toThrow();
    });

    it("corpusRemoveDocument throws on empty slug", async () => {
      const deps = createMockDeps();
      await expect(corpusRemoveDocument(deps, { slug: "" })).rejects.toThrow();
    });

    it("corpusRemoveSection throws on empty book_slug", async () => {
      const deps = createMockDeps();
      await expect(
        corpusRemoveSection(deps, { book_slug: "", chapter_slug: "ch1" })
      ).rejects.toThrow();
    });

    it("corpusRemoveSection throws on empty chapter_slug", async () => {
      const deps = createMockDeps();
      await expect(
        corpusRemoveSection(deps, { book_slug: "book", chapter_slug: "" })
      ).rejects.toThrow();
    });
  });

  describe("getCorpusToolSchemas", () => {
    it("returns 6 tool schemas", () => {
      const schemas = getCorpusToolSchemas();
      expect(schemas).toHaveLength(6);
    });

    it("each schema has name, description, and inputSchema", () => {
      const schemas = getCorpusToolSchemas();
      for (const schema of schemas) {
        expect(schema).toHaveProperty("name");
        expect(schema).toHaveProperty("description");
        expect(schema).toHaveProperty("inputSchema");
        expect(schema.inputSchema).toHaveProperty("type", "object");
      }
    });

    it("contains all expected tool names", () => {
      const schemas = getCorpusToolSchemas();
      const names = schemas.map((s) => s.name);
      expect(names).toEqual([
        "corpus_list",
        "corpus_get",
        "corpus_add_document",
        "corpus_add_section",
        "corpus_remove_document",
        "corpus_remove_section",
      ]);
    });

    it("corpus_add_document schema includes zip_base64 property", () => {
      const schemas = getCorpusToolSchemas();
      const addDoc = schemas.find((s) => s.name === "corpus_add_document")!;
      expect(addDoc.inputSchema.properties).toHaveProperty("zip_base64");
    });
  });
});
