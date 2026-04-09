import { describe, expect, it } from "vitest";

import {
  evaluateCanonicalCorpusSearchPayload,
  evaluateRuntimeSelfKnowledgeAnswer,
} from "@/lib/evals/runtime-integrity-checks";

describe("runtime integrity checks", () => {
  it("marks canonical search payloads matched only when the full citation contract holds", () => {
    const passing = evaluateCanonicalCorpusSearchPayload({
      groundingState: "prefetched_section",
      followUp: "cite_canonical_paths",
      results: [
        {
          documentSlug: "archetype-atlas",
          sectionSlug: "ch04-the-sage",
          canonicalPath: "/library/archetype-atlas/ch04-the-sage",
          resolverPath: "/library/section/ch04-the-sage",
        },
      ],
      prefetchedSection: {
        canonicalPath: "/library/archetype-atlas/ch04-the-sage",
      },
    });

    const failing = evaluateCanonicalCorpusSearchPayload({
      groundingState: "prefetched_section",
      followUp: "cite_canonical_paths",
      results: [
        {
          documentSlug: "archetype-atlas",
          sectionSlug: "ch04-the-sage",
          canonicalPath: "/library/section/ch04-the-sage",
          resolverPath: "/library/section/ch04-the-sage",
        },
      ],
      prefetchedSection: {
        canonicalPath: "/library/archetype-atlas/ch04-the-sage",
      },
    });

    expect(passing.matchedExpected).toBe(true);
    expect(failing.canonicalPathsReturned).toBe(false);
    expect(failing.matchedExpected).toBe(false);
  });

  it("accepts paraphrased self-knowledge answers when they match inspected runtime facts", () => {
    const evaluation = evaluateRuntimeSelfKnowledgeAnswer(
      "Runtime inspection shows 25 available capabilities, and the current page is /library/archetype-atlas/ch04-the-sage (The Sage).",
      {
        toolCount: 25,
        currentPathname: "/library/archetype-atlas/ch04-the-sage",
        currentPage: {
          mainHeading: "The Sage",
          title: "The Sage | Studio Ordo",
        },
      },
    );

    expect(evaluation.verifiedToolsReported).toBe(true);
    expect(evaluation.pageContextReported).toBe(true);
    expect(evaluation.matchedExpected).toBe(true);
  });

  it("fails self-knowledge answers that omit or distort runtime facts", () => {
    const evaluation = evaluateRuntimeSelfKnowledgeAnswer(
      "I probably have a lot of tools and you are still on the homepage.",
      {
        toolCount: 25,
        currentPathname: "/library/archetype-atlas/ch04-the-sage",
        currentPage: {
          mainHeading: "The Sage",
          title: "The Sage | Studio Ordo",
        },
      },
    );

    expect(evaluation.verifiedToolsReported).toBe(false);
    expect(evaluation.pageContextReported).toBe(false);
    expect(evaluation.matchedExpected).toBe(false);
  });
});