const INLINE_MARKDOWN_PATTERN = /(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(`[^`]+`)/;
const BLOCK_MARKDOWN_PATTERN = /(^|\n)(#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s+|```|\|.+\|)/m;

const LOWERCASE_CONNECTORS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

function isHeadingBoundary(line: string | undefined): boolean {
  if (!line) {
    return true;
  }

  const trimmed = line.trim();
  return trimmed === "" || trimmed === "---" || /^#{1,6}\s/.test(trimmed);
}

function isTitleCaseHeading(line: string): boolean {
  if (line.length === 0 || line.length > 90) {
    return false;
  }

  if (line.endsWith(".") || line.endsWith(":")) {
    return false;
  }

  if (line.endsWith("?")) {
    return true;
  }

  const words = line.split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    return false;
  }

  return words.every((word, index) => {
    const normalized = word.replace(/^["'(]+|["'),.!?;:]+$/g, "");
    if (!normalized) {
      return true;
    }

    const lower = normalized.toLowerCase();
    if (index > 0 && LOWERCASE_CONNECTORS.has(lower)) {
      return true;
    }

    return /^[A-Z0-9][A-Za-z0-9'’/&()-]*$/.test(normalized);
  });
}

function stripDuplicateTitle(title: string, lines: string[]): string[] {
  let index = 0;
  while (index < lines.length && lines[index]?.trim() === "") {
    index += 1;
  }

  const firstMeaningfulLine = lines[index]?.trim();
  if (!firstMeaningfulLine) {
    return lines;
  }

  if (firstMeaningfulLine === title.trim() || firstMeaningfulLine === `# ${title.trim()}`) {
    index += 1;
    while (index < lines.length && lines[index]?.trim() === "") {
      index += 1;
    }
    return lines.slice(index);
  }

  return lines;
}

export function hasStructuredMarkdown(content: string): boolean {
  return BLOCK_MARKDOWN_PATTERN.test(content) || INLINE_MARKDOWN_PATTERN.test(content);
}

export function normalizeBlogMarkdown(title: string, content: string): string {
  const trimmedContent = content.replace(/\r\n/g, "\n").trim();
  if (!trimmedContent) {
    return trimmedContent;
  }

  const lines = stripDuplicateTitle(title, trimmedContent.split("\n"));

  return lines
    .map((line, index, source) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return "";
      }

      if (
        /^#{1,6}\s/.test(trimmed)
        || /^[-*+]\s/.test(trimmed)
        || /^\d+\.\s/.test(trimmed)
        || /^>\s/.test(trimmed)
        || /^```/.test(trimmed)
        || /^\|.+\|/.test(trimmed)
      ) {
        return line;
      }

      if (
        isHeadingBoundary(source[index - 1])
        && !/^---$/.test(trimmed)
        && isTitleCaseHeading(trimmed)
      ) {
        return `## ${trimmed}`;
      }

      return line;
    })
    .join("\n")
    .trim();
}