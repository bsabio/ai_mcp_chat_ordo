function skipLeadingBlankLines(lines: string[], index: number): number {
  let nextIndex = index;

  while (nextIndex < lines.length && lines[nextIndex]?.trim() === "") {
    nextIndex += 1;
  }

  return nextIndex;
}

export function stripLeadingMarkdownTitle(title: string, content: string): string {
  const normalizedContent = content.replace(/\r\n/g, "\n").trim();
  const normalizedTitle = title.trim();

  if (!normalizedContent || !normalizedTitle) {
    return normalizedContent;
  }

  const lines = normalizedContent.split("\n");
  const firstMeaningfulIndex = skipLeadingBlankLines(lines, 0);
  const firstMeaningfulLine = lines[firstMeaningfulIndex]?.trim();

  if (!firstMeaningfulLine) {
    return normalizedContent;
  }

  const headingMatch = firstMeaningfulLine.match(/^#{1,6}\s+(.*)$/);
  const normalizedFirstLine = (headingMatch?.[1] ?? firstMeaningfulLine).trim();

  if (normalizedFirstLine !== normalizedTitle) {
    return normalizedContent;
  }

  const contentStartIndex = skipLeadingBlankLines(lines, firstMeaningfulIndex + 1);
  return lines.slice(contentStartIndex).join("\n").trim();
}