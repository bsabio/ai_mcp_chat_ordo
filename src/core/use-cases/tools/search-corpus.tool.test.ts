import { describe, expect, it, vi } from "vitest";

import type { Document } from "@/core/entities/corpus";
import { Section } from "@/core/entities/corpus";
import type { CorpusRepository } from "@/core/use-cases/CorpusRepository";

import { SearchCorpusCommand } from "./CorpusTools";

function createRepository(sections: Section[]): CorpusRepository {
  const documents: Document[] = [
    { slug: "archetype-atlas", title: "The Archetype Atlas", number: "3", audience: "public" },
  ];

  return {
    getAllDocuments: vi.fn().mockResolvedValue(documents),
    getAllSections: vi.fn().mockResolvedValue(sections),
    getSectionsByDocument: vi.fn().mockResolvedValue(sections),
    getSection: vi.fn(async (documentSlug: string, sectionSlug: string) => {
      const section = sections.find(
        (candidate) => candidate.documentSlug === documentSlug && candidate.sectionSlug === sectionSlug,
      );

      if (!section) {
        throw new Error(`Missing section: ${documentSlug}/${sectionSlug}`);
      }

      return section;
    }),
    getDocument: vi.fn(async (slug: string) => documents.find((document) => document.slug === slug) ?? null),
  };
}

describe("SearchCorpusCommand", () => {
  it("returns canonical paths and prefetched grounding for a strong signed-in match", async () => {
    const sections = [
      new Section(
        "archetype-atlas",
        "ch04-the-sage",
        "The Sage: Clarity, Method, Evidence",
        "The Sage values method, clarity, rigor, and evidence in judgment.",
        [],
        [],
        [],
      ),
    ];

    const command = new SearchCorpusCommand(createRepository(sections));
    const result = await command.execute(
      { query: "clarity method evidence" },
      { role: "AUTHENTICATED", userId: "user-1" },
    ) as {
      groundingState: string;
      followUp: string;
      prefetchedSection: { title: string; canonicalPath: string; content: string } | null;
      results: Array<{ canonicalPath: string; resolverPath: string }>;
    };

    expect(result.groundingState).toBe("prefetched_section");
    expect(result.followUp).toBe("cite_canonical_paths");
    expect(result.prefetchedSection).toMatchObject({
      title: "The Sage: Clarity, Method, Evidence",
      canonicalPath: "/library/archetype-atlas/ch04-the-sage",
    });
    expect(result.prefetchedSection?.content).toContain("The Sage values method");
    expect(result.results[0]).toMatchObject({
      canonicalPath: "/library/archetype-atlas/ch04-the-sage",
      resolverPath: "/library/section/ch04-the-sage",
    });
  });

  it("falls back to search-only grounding when multiple high-confidence results compete", async () => {
    const sections = [
      new Section(
        "archetype-atlas",
        "ch04-the-sage",
        "The Sage: Clarity, Method, Evidence",
        "Method and evidence matter in judgment.",
        [],
        [],
        [],
      ),
      new Section(
        "archetype-atlas",
        "ch06-the-magician",
        "The Magician: Transformation Through Method",
        "Method and transformation both matter in guided change.",
        [],
        [],
        [],
      ),
    ];

    const command = new SearchCorpusCommand(createRepository(sections));
    const result = await command.execute(
      { query: "method" },
      { role: "AUTHENTICATED", userId: "user-1" },
    ) as {
      groundingState: string;
      followUp: string;
      prefetchedSection: unknown;
      results: Array<{ canonicalPath: string }>;
    };

    expect(result.groundingState).toBe("search_only");
    expect(result.followUp).toBe("call_get_section_before_detailed_claims");
    expect(result.prefetchedSection).toBeNull();
    expect(result.results).toHaveLength(2);
  });
});