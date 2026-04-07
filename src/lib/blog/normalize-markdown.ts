import { stripLeadingMarkdownTitle } from "../markdown/strip-leading-markdown-title";

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

export function hasStructuredMarkdown(content: string): boolean {
  return BLOCK_MARKDOWN_PATTERN.test(content) || INLINE_MARKDOWN_PATTERN.test(content);
}

export function normalizeBlogMarkdown(title: string, content: string): string {
  const trimmedContent = stripLeadingMarkdownTitle(title, content);
  if (!trimmedContent) {
    return trimmedContent;
  }

  const lines = trimmedContent.split("\n");

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