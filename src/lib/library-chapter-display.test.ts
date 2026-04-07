import { describe, expect, it } from "vitest";

import { buildLibraryChapterDisplay, splitLibraryChapterTitle } from "@/lib/library-chapter-display";

describe("splitLibraryChapterTitle", () => {
  it("extracts the explicit chapter label from numbered titles", () => {
    expect(splitLibraryChapterTitle("Chapter 2 — The Swiss Grid: Spatial Rhythm and Mathematics")).toEqual({
      fullTitle: "Chapter 2 — The Swiss Grid: Spatial Rhythm and Mathematics",
      displayTitle: "The Swiss Grid: Spatial Rhythm and Mathematics",
      chapterLabel: "Chapter 2",
      chapterNumber: 2,
    });
  });

  it("leaves unnumbered titles unchanged", () => {
    expect(splitLibraryChapterTitle("Systems Thinking")).toEqual({
      fullTitle: "Systems Thinking",
      displayTitle: "Systems Thinking",
      chapterLabel: null,
      chapterNumber: null,
    });
  });
});

describe("buildLibraryChapterDisplay", () => {
  it("keeps sequence position distinct from the canonical chapter number", () => {
    expect(
      buildLibraryChapterDisplay({
        title: "Chapter 2 — The Swiss Grid: Spatial Rhythm and Mathematics",
        sequenceIndex: 2,
        totalChapters: 10,
        slug: "ch02-the-swiss-grid",
      }),
    ).toMatchObject({
      slug: "ch02-the-swiss-grid",
      displayTitle: "The Swiss Grid: Spatial Rhythm and Mathematics",
      chapterLabel: "Chapter 2",
      chapterNumber: 2,
      hasExplicitChapterNumber: true,
      progressLabel: "3 / 10",
      stageLabel: "Chapter 2",
      railLabel: "02",
    });
  });

  it("falls back to sequence numbering when the title has no chapter prefix", () => {
    expect(
      buildLibraryChapterDisplay({
        title: "Systems Thinking",
        sequenceIndex: 0,
        totalChapters: 6,
      }),
    ).toMatchObject({
      displayTitle: "Systems Thinking",
      chapterLabel: "Chapter 1",
      chapterNumber: 1,
      hasExplicitChapterNumber: false,
      progressLabel: "1 / 6",
      stageLabel: "Opening chapter",
      railLabel: "01",
    });
  });
});