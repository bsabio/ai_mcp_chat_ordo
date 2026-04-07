import {
  normalizeCurrentPageSnapshot,
  type CurrentPageSnapshot,
} from "@/lib/chat/current-page-context";

const CONTENT_ROOT_SELECTOR = "main[data-shell-main-surface], main, [data-shell-main-surface]";
const EXCLUDED_CONTENT_SELECTOR = [
  "[data-chat-container-mode]",
  "[data-chat-floating-shell='true']",
  "[data-chat-shell-kind='floating']",
  "nav",
  "footer",
  "script",
  "style",
  "noscript",
  "template",
  "[aria-hidden='true']",
].join(", ");

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function findContentRoot(): HTMLElement | null {
  const root = document.querySelector(CONTENT_ROOT_SELECTOR);
  return root instanceof HTMLElement ? root : null;
}

function cloneContentRoot(root: HTMLElement): HTMLElement {
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(EXCLUDED_CONTENT_SELECTOR).forEach((node) => node.remove());
  return clone;
}

function collectHeadings(root: ParentNode, selector: string): string[] {
  return Array.from(root.querySelectorAll(selector))
    .map((heading) => normalizeWhitespace(heading.textContent ?? ""))
    .filter(Boolean)
    .filter((heading, index, values) => values.indexOf(heading) === index);
}

function collectSelectedText(): string | null {
  if (typeof window.getSelection !== "function") {
    return null;
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    return null;
  }

  const anchorNode = selection.anchorNode;
  const anchorElement = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement;
  if (anchorElement?.closest("[data-chat-container-mode], [data-chat-floating-shell='true']")) {
    return null;
  }

  const text = normalizeWhitespace(selection.toString());
  return text || null;
}

export function collectCurrentPageSnapshot(currentPathname: string): CurrentPageSnapshot | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  const root = findContentRoot() ?? document.body;
  const clone = cloneContentRoot(root);
  const mainHeading = collectHeadings(clone, "h1")[0] ?? null;
  const contentExcerpt = normalizeWhitespace(clone.textContent ?? "") || null;

  return normalizeCurrentPageSnapshot({
    pathname: currentPathname,
    title: normalizeWhitespace(document.title),
    mainHeading,
    sectionHeadings: collectHeadings(clone, "h2, h3, h4"),
    selectedText: collectSelectedText(),
    contentExcerpt,
  }) ?? undefined;
}