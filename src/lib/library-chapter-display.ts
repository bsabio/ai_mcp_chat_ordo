const CHAPTER_TITLE_PATTERN = /^(Chapter\s+(\d+))\s*(?:—|-|:)\s*(.+)$/i;

export interface SplitLibraryChapterTitleResult {
  fullTitle: string;
  displayTitle: string;
  chapterLabel: string | null;
  chapterNumber: number | null;
}

export interface LibraryChapterDisplayInput {
  title: string;
  sequenceIndex: number;
  totalChapters: number;
  slug?: string;
}

export interface LibraryChapterDisplay {
  fullTitle: string;
  displayTitle: string;
  chapterLabel: string;
  chapterNumber: number;
  hasExplicitChapterNumber: boolean;
  sequenceIndex: number;
  totalChapters: number;
  progressLabel: string;
  stageLabel: string;
  railLabel: string;
  slug?: string;
}

function buildLibraryChapterStageLabel(chapterLabel: string, sequenceIndex: number, totalChapters: number): string {
  if (totalChapters <= 1) {
    return "Single chapter";
  }

  if (sequenceIndex === 0) {
    return "Opening chapter";
  }

  if (sequenceIndex === totalChapters - 1) {
    return "Closing chapter";
  }

  return chapterLabel;
}

function buildLibraryChapterProgressLabel(sequenceIndex: number, totalChapters: number): string {
  if (totalChapters <= 0) {
    return "0 / 0";
  }

  return `${sequenceIndex + 1} / ${totalChapters}`;
}

export function splitLibraryChapterTitle(title: string): SplitLibraryChapterTitleResult {
  const fullTitle = title.trim();
  const match = fullTitle.match(CHAPTER_TITLE_PATTERN);

  if (!match) {
    return {
      fullTitle,
      displayTitle: fullTitle,
      chapterLabel: null,
      chapterNumber: null,
    };
  }

  const chapterNumber = Number.parseInt(match[2], 10);

  return {
    fullTitle,
    displayTitle: match[3].trim(),
    chapterLabel: `Chapter ${chapterNumber}`,
    chapterNumber,
  };
}

export function buildLibraryChapterDisplay(input: LibraryChapterDisplayInput): LibraryChapterDisplay {
  const parsed = splitLibraryChapterTitle(input.title);
  const fallbackChapterNumber = input.sequenceIndex + 1;
  const chapterNumber = parsed.chapterNumber ?? fallbackChapterNumber;
  const chapterLabel = parsed.chapterLabel ?? `Chapter ${chapterNumber}`;

  return {
    slug: input.slug,
    fullTitle: parsed.fullTitle,
    displayTitle: parsed.displayTitle,
    chapterLabel,
    chapterNumber,
    hasExplicitChapterNumber: parsed.chapterNumber !== null,
    sequenceIndex: input.sequenceIndex,
    totalChapters: input.totalChapters,
    progressLabel: buildLibraryChapterProgressLabel(input.sequenceIndex, input.totalChapters),
    stageLabel: buildLibraryChapterStageLabel(chapterLabel, input.sequenceIndex, input.totalChapters),
    railLabel: String(chapterNumber).padStart(2, "0"),
  };
}