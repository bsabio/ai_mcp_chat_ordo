import { describe, expect, it, vi } from "vitest";

import type { Document } from "@/core/entities/corpus";
import { Section } from "@/core/entities/corpus";
import type { CorpusRepository } from "@/core/use-cases/CorpusRepository";

import { GetSectionCommand } from "./CorpusTools";

function createRepository(sections: Section[], documents: Document[] = [
  {
    slug: "second-renaissance",
    title: "The Second Renaissance",
    number: "I",
    audience: "public",
  },
]): CorpusRepository {

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

describe("GetSectionCommand", () => {
  it("returns structured metadata, navigation, and related sections", async () => {
    const documents: Document[] = [
      {
        slug: "second-renaissance",
        title: "The Second Renaissance",
        number: "I",
        audience: "public",
      },
      {
        slug: "archetype-atlas",
        title: "The Archetype Atlas",
        number: "III",
        audience: "public",
      },
    ];
    const command = new GetSectionCommand(createRepository([
      new Section(
        "second-renaissance",
        "ch00-introduction",
        "Introduction",
        "This chapter frames the broader transition.",
        [],
        [],
        ["transition"],
      ),
      new Section(
        "second-renaissance",
        "ch01-why-now",
        "Why Now: The Printing Press Analogy",
        "The printing press analogy explains why this transition compounds.",
        [],
        ["proof"],
        ["printing press", "transition"],
      ),
      new Section(
        "second-renaissance",
        "ch02-signal",
        "Signal And Proof",
        "Visible proof makes the transition legible to other people.",
        [],
        ["proof"],
        ["signal", "transition"],
      ),
      new Section(
        "archetype-atlas",
        "ch04-the-sage",
        "The Sage: Clarity, Method, Evidence",
        "Clarity and evidence give the reader a stable method.",
        [],
        ["evidence"],
        ["clarity", "method"],
      ),
    ], documents));

    const result = await command.execute(
      { document_slug: "second-renaissance", section_slug: "ch01-why-now" },
      { role: "AUTHENTICATED", userId: "user-1" },
    );

    expect(result).toMatchObject({
      found: true,
      title: "Why Now: The Printing Press Analogy",
      document: "I. The Second Renaissance",
      canonicalPath: "/library/second-renaissance/ch01-why-now",
      resolverPath: "/library/section/ch01-why-now",
      contentTruncated: false,
    });
    expect(result.content).toContain("The printing press analogy explains why this transition compounds.");
    expect(result.navigation.previous?.sectionSlug).toBe("ch00-introduction");
    expect(result.navigation.next?.sectionSlug).toBe("ch02-signal");
    expect(result.relatedSections.length).toBeGreaterThanOrEqual(2);
    expect(result.relatedSections.every((section) => section.canonicalPath !== null || section.fallbackSearchPath !== null)).toBe(true);
  });

  it("truncates long sections while preserving structured metadata", async () => {
    const longContent = "The printing press analogy matters. ".repeat(180);
    const command = new GetSectionCommand(createRepository([
      new Section(
        "second-renaissance",
        "ch01-why-now",
        "Why Now: The Printing Press Analogy",
        longContent,
        [],
        [],
        [],
      ),
    ]));

    const result = await command.execute(
      { document_slug: "second-renaissance", section_slug: "ch01-why-now" },
      { role: "AUTHENTICATED", userId: "user-1" },
    );

    expect(result.found).toBe(true);
    expect(result.content).toContain("[... truncated ...]");
    expect(result.contentTruncated).toBe(true);
    expect(Array.isArray(result.relatedSections)).toBe(true);
  });

  it("resolves alias inputs canonically and falls back safely when missing", async () => {
    const command = new GetSectionCommand(createRepository([
      new Section(
        "second-renaissance",
        "ch01-why-now",
        "Why Now: The Printing Press Analogy",
        "The printing press analogy explains why this transition compounds.",
        [],
        [],
        [],
      ),
    ]));

    const aliased = await command.execute(
      { document_slug: "wrong-book", section_slug: "why-now" },
      { role: "AUTHENTICATED", userId: "user-1" },
    );
    const missing = await command.execute(
      { document_slug: "wrong-book", section_slug: "missing-section" },
      { role: "AUTHENTICATED", userId: "user-1" },
    );

    expect(aliased).toMatchObject({
      found: true,
      resolvedFromAlias: true,
      canonicalPath: "/library/second-renaissance/ch01-why-now",
      resolverPath: "/library/section/ch01-why-now",
    });
    expect(missing).toMatchObject({
      found: false,
      canonicalPath: null,
      resolverPath: null,
      fallbackSearchPath: "/library",
      fallbackSearchQuery: "missing-section",
    });
  });
});