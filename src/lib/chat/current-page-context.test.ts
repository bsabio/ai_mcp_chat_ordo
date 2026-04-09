import { describe, expect, it } from "vitest";

import {
  formatCurrentPagePromptContext,
  normalizeCurrentPageSnapshot,
  resolveCurrentPageDetails,
  sanitizePathname,
} from "./current-page-context";

describe("current-page-context", () => {
  it("sanitizes pathnames to a safe internal route shape", () => {
    expect(sanitizePathname("/library?<script>alert(1)</script>")).toBe("/libraryscriptalert1/script");
  });

  it("normalizes and truncates snapshot fields", () => {
    const snapshot = normalizeCurrentPageSnapshot({
      pathname: "/library",
      title: "  Library   Home  ",
      mainHeading: "  Library  ",
      sectionHeadings: [" Featured ", "Featured", "  New Additions "],
      selectedText: "  Selected text  ",
      contentExcerpt: "  Browse the corpus.  ",
    });

    expect(snapshot).toEqual({
      pathname: "/library",
      title: "Library Home",
      mainHeading: "Library",
      sectionHeadings: ["Featured", "New Additions"],
      selectedText: "Selected text",
      contentExcerpt: "Browse the corpus.",
    });
  });

  it("resolves route labels and formats authoritative prompt instructions", () => {
    const details = resolveCurrentPageDetails("/library", {
      pathname: "/library",
      title: "Library",
      mainHeading: "Library",
      sectionHeadings: ["Featured"],
      selectedText: null,
      contentExcerpt: "Browse the corpus.",
    });

    const promptBlock = formatCurrentPagePromptContext(details);
    expect(details.label).toBe("Library");
    expect(promptBlock).toContain("[Authoritative current page snapshot]");
    expect(promptBlock).toContain("trust this snapshot");
    expect(promptBlock).toContain("say the current page is unknown rather than inferring it");
    expect(promptBlock).toContain("pathname=/library");
  });
});