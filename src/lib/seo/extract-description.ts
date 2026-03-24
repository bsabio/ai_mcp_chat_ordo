/**
 * Extract a plain-text description from markdown content.
 * Strips the leading title, abstract heading, and markdown formatting.
 * Returns the first meaningful paragraph, truncated to maxLength characters.
 */
export function extractDescription(markdown: string, maxLength = 160): string {
  const lines = markdown.split("\n");

  let started = false;
  const paragraphLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!started) {
      if (trimmed.startsWith("# ")) continue;
      if (trimmed.startsWith("## ")) continue;
      if (trimmed === "---") continue;
      if (trimmed === "") continue;
      started = true;
    }
    if (started) {
      if (trimmed === "" && paragraphLines.length > 0) break;
      if (trimmed.startsWith("## ")) break;
      if (trimmed === "---") break;
      paragraphLines.push(trimmed);
    }
  }

  let text = paragraphLines.join(" ");
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, "");       // images
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");           // bold
  text = text.replace(/\*([^*]+)\*/g, "$1");                // italic
  text = text.replace(/`([^`]+)`/g, "$1");                  // inline code
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");     // links
  text = text.trim();

  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > maxLength * 0.7 ? truncated.slice(0, lastSpace) : truncated) + "…";
}
