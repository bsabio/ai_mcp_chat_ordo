import { SHELL_ROUTES } from "@/lib/shell/shell-navigation";

const MAX_TITLE_CHARS = 200;
const MAX_HEADING_CHARS = 200;
const MAX_SECTION_HEADINGS = 6;
const MAX_SECTION_HEADING_CHARS = 160;
const MAX_SELECTED_TEXT_CHARS = 400;
const MAX_CONTENT_EXCERPT_CHARS = 1600;

export interface CurrentPageSnapshot {
  pathname: string;
  title: string | null;
  mainHeading: string | null;
  sectionHeadings: string[];
  selectedText: string | null;
  contentExcerpt: string | null;
}

export interface CurrentPageDetails extends CurrentPageSnapshot {
  label: string | null;
  description: string | null;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeText(value: string | null | undefined, maxChars: number): string | null {
  if (!value) {
    return null;
  }

  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxChars);
}

export function sanitizePathname(pathname: string): string {
  return pathname.replace(/[^a-zA-Z0-9/_-]/g, "");
}

function resolveRouteMatch(pathname: string) {
  return SHELL_ROUTES
    .filter((route) => route.kind === "internal" && (route.href === pathname || pathname.startsWith(route.href + "/")))
    .sort((left, right) => right.href.length - left.href.length)[0];
}

export function normalizeCurrentPageSnapshot(
  snapshot: Partial<CurrentPageSnapshot> | null | undefined,
): CurrentPageSnapshot | null {
  if (!snapshot || typeof snapshot.pathname !== "string") {
    return null;
  }

  const pathname = sanitizePathname(snapshot.pathname);
  if (!pathname) {
    return null;
  }

  const headings = Array.isArray(snapshot.sectionHeadings)
    ? snapshot.sectionHeadings
      .map((heading) => (typeof heading === "string" ? normalizeText(heading, MAX_SECTION_HEADING_CHARS) : null))
      .filter((heading): heading is string => Boolean(heading))
      .filter((heading, index, values) => values.indexOf(heading) === index)
      .slice(0, MAX_SECTION_HEADINGS)
    : [];

  return {
    pathname,
    title: normalizeText(snapshot.title, MAX_TITLE_CHARS),
    mainHeading: normalizeText(snapshot.mainHeading, MAX_HEADING_CHARS),
    sectionHeadings: headings,
    selectedText: normalizeText(snapshot.selectedText, MAX_SELECTED_TEXT_CHARS),
    contentExcerpt: normalizeText(snapshot.contentExcerpt, MAX_CONTENT_EXCERPT_CHARS),
  };
}

export function resolveCurrentPageDetails(
  pathname: string,
  snapshot?: Partial<CurrentPageSnapshot> | null,
): CurrentPageDetails {
  const safePathname = sanitizePathname(pathname);
  const normalizedSnapshot = normalizeCurrentPageSnapshot(
    snapshot ? { ...snapshot, pathname: safePathname || snapshot.pathname || "" } : null,
  );
  const match = safePathname ? resolveRouteMatch(safePathname) : undefined;

  return {
    pathname: safePathname,
    label: match?.label ?? null,
    description: match?.description ?? null,
    title: normalizedSnapshot?.title ?? null,
    mainHeading: normalizedSnapshot?.mainHeading ?? null,
    sectionHeadings: normalizedSnapshot?.sectionHeadings ?? [],
    selectedText: normalizedSnapshot?.selectedText ?? null,
    contentExcerpt: normalizedSnapshot?.contentExcerpt ?? null,
  };
}

export function formatCurrentPagePromptContext(details: CurrentPageDetails): string {
  const lines = [
    "",
    "[Authoritative current page snapshot]",
    "Use this snapshot as the source of truth for questions about what page the user is viewing and what is visible on that page.",
    "If earlier assistant messages conflict with this snapshot, ignore the earlier assistant messages and trust this snapshot.",
    "If no authoritative page snapshot is available elsewhere in the prompt, say the current page is unknown rather than inferring it from earlier assistant text.",
    `pathname=${details.pathname}`,
  ];

  if (details.label) {
    lines.push(`route_label=${JSON.stringify(details.label)}`);
  }

  if (details.description) {
    lines.push(`route_description=${JSON.stringify(details.description)}`);
  }

  if (details.title) {
    lines.push(`document_title=${JSON.stringify(details.title)}`);
  }

  if (details.mainHeading) {
    lines.push(`main_heading=${JSON.stringify(details.mainHeading)}`);
  }

  if (details.sectionHeadings.length > 0) {
    lines.push(`section_headings=${JSON.stringify(details.sectionHeadings)}`);
  }

  if (details.selectedText) {
    lines.push(`selected_text=${JSON.stringify(details.selectedText)}`);
  }

  if (details.contentExcerpt) {
    lines.push(`visible_content_excerpt=${JSON.stringify(details.contentExcerpt)}`);
  }

  return lines.join("\n");
}