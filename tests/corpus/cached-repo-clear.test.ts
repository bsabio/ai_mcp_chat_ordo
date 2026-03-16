import { describe, it, expect, vi, beforeEach } from "vitest";
import { CachedCorpusRepository } from "@/adapters/CachedCorpusRepository";
import type { CorpusRepository } from "@/core/use-cases/CorpusRepository";
import type { Document, Section } from "@/core/entities/corpus";

function makeDocument(slug: string): Document {
  return { slug, title: `Book ${slug}`, number: "I" };
}

function makeMockInner(initial: Document[]) {
  const documents = [...initial];
  return {
    repo: {
      getAllDocuments: vi.fn(async () => [...documents]),
      getDocument: vi.fn(async (slug: string) => documents.find((document) => document.slug === slug) ?? null),
      getSectionsByDocument: vi.fn(async () => [] as Section[]),
      getAllSections: vi.fn(async () => [] as Section[]),
      getSection: vi.fn(async () => ({}) as Section),
    } satisfies CorpusRepository,
    addDocument(slug: string) {
      documents.push(makeDocument(slug));
    },
  };
}

describe("CachedCorpusRepository — clearCache", () => {
  let inner: ReturnType<typeof makeMockInner>;
  let cached: CachedCorpusRepository;

  beforeEach(() => {
    inner = makeMockInner([makeDocument("alpha")]);
    cached = new CachedCorpusRepository(inner.repo);
  });

  it("resets all caches so next call re-fetches from inner", async () => {
    // Populate caches
    await cached.getAllDocuments();
    await cached.getDocument("alpha");
    expect(inner.repo.getAllDocuments).toHaveBeenCalledTimes(1);
    expect(inner.repo.getDocument).toHaveBeenCalledTimes(1);

    // Clear and re-fetch
    cached.clearCache();
    await cached.getAllDocuments();
    await cached.getDocument("alpha");
    expect(inner.repo.getAllDocuments).toHaveBeenCalledTimes(2);
    expect(inner.repo.getDocument).toHaveBeenCalledTimes(2);
  });

  it("returns fresh data after inner source changes", async () => {
    // Warm cache — 1 document
    const before = await cached.getAllDocuments();
    expect(before).toHaveLength(1);

    // Mutate underlying source
    inner.addDocument("beta");

    // Cache still stale
    expect(await cached.getAllDocuments()).toHaveLength(1);

    // After clear — picks up the new document
    cached.clearCache();
    const after = await cached.getAllDocuments();
    expect(after).toHaveLength(2);
    expect(after.map((document) => document.slug)).toContain("beta");
  });
});
