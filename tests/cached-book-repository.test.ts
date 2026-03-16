import { describe, it, expect } from "vitest";
import { CachedCorpusRepository } from "@/adapters/CachedCorpusRepository";
import type { CorpusRepository } from "@/core/use-cases/CorpusRepository";
import type { Document } from "@/core/entities/corpus";
import { Section } from "@/core/entities/corpus";

function createMockRepo(): CorpusRepository & { callCounts: Record<string, number> } {
  const callCounts: Record<string, number> = {
    getAllDocuments: 0,
    getDocument: 0,
    getSectionsByDocument: 0,
    getAllSections: 0,
    getSection: 0,
  };

  const document: Document = { slug: "book-1", title: "Book One", number: "1" };
  const section = new Section("book-1", "ch-1", "Chapter One", "Content", [], [], []);

  return {
    callCounts,
    async getAllDocuments() { callCounts.getAllDocuments++; return [document]; },
    async getDocument(slug: string) { callCounts.getDocument++; return slug === "book-1" ? document : null; },
    async getSectionsByDocument() { callCounts.getSectionsByDocument++; return [section]; },
    async getAllSections() { callCounts.getAllSections++; return [section]; },
    async getSection() { callCounts.getSection++; return section; },
  };
}

describe("CachedCorpusRepository", () => {
  // TEST-CACHE-01
  it("getAllSections called twice → inner called once", async () => {
    const mock = createMockRepo();
    const cached = new CachedCorpusRepository(mock);

    await cached.getAllSections();
    await cached.getAllSections();

    expect(mock.callCounts.getAllSections).toBe(1);
  });

  // TEST-CACHE-02
  it("getSection with same key called twice → inner called once", async () => {
    const mock = createMockRepo();
    const cached = new CachedCorpusRepository(mock);

    await cached.getSection("book-1", "ch-1");
    await cached.getSection("book-1", "ch-1");

    expect(mock.callCounts.getSection).toBe(1);
  });

  // TEST-CACHE-03
  it("getSection with different keys → inner called for each unique key", async () => {
    const mock = createMockRepo();
    const cached = new CachedCorpusRepository(mock);

    await cached.getSection("book-1", "ch-1");
    await cached.getSection("book-1", "ch-2");

    expect(mock.callCounts.getSection).toBe(2);
  });

  // TEST-CACHE-04
  it("getAllDocuments cached independently from getAllSections", async () => {
    const mock = createMockRepo();
    const cached = new CachedCorpusRepository(mock);

    await cached.getAllDocuments();
    await cached.getAllSections();
    await cached.getAllDocuments();
    await cached.getAllSections();

    expect(mock.callCounts.getAllDocuments).toBe(1);
    expect(mock.callCounts.getAllSections).toBe(1);
  });
});
