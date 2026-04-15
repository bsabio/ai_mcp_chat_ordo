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

const PORTAL_SELECTOR = [
  "[role='dialog']:not([data-chat-container-mode]):not([data-chat-floating-shell='true'])",
  "[data-radix-popper-content-wrapper]:not([data-chat-container-mode])",
].join(", ");

const CAPTURE_DEBOUNCE_MS = 150;

export interface CurrentPageMemento {
  /** Read the latest cached snapshot. Never blocks. */
  getSnapshot(): CurrentPageSnapshot | undefined;
  /** Start observing. Call once on mount. */
  start(): void;
  /** Stop observing. Call on unmount. */
  stop(): void;
  /** Update the current pathname (called on route change). */
  setPathname(pathname: string): void;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function findContentRoot(): HTMLElement | null {
  const root = document.querySelector(CONTENT_ROOT_SELECTOR);
  return root instanceof HTMLElement ? root : null;
}

function cloneAndStrip(root: HTMLElement): HTMLElement {
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

function collectPortalText(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const portals = document.querySelectorAll(PORTAL_SELECTOR);
  if (portals.length === 0) {
    return null;
  }

  const parts: string[] = [];
  portals.forEach((portal) => {
    const text = normalizeWhitespace(portal.textContent ?? "");
    if (text) {
      parts.push(text);
    }
  });

  return parts.length > 0 ? `[Active Dialog] ${parts.join(" ")}` : null;
}

function captureSnapshot(pathname: string, cachedSelection: string | null): CurrentPageSnapshot | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  const root = findContentRoot() ?? document.body;
  const clone = cloneAndStrip(root);
  const mainHeading = collectHeadings(clone, "h1")[0] ?? null;
  let contentExcerpt = normalizeWhitespace(clone.textContent ?? "") || null;

  const portalText = collectPortalText();
  if (portalText && contentExcerpt) {
    contentExcerpt = `${contentExcerpt} ${portalText}`;
  } else if (portalText) {
    contentExcerpt = portalText;
  }

  return normalizeCurrentPageSnapshot({
    pathname,
    title: normalizeWhitespace(document.title),
    mainHeading,
    sectionHeadings: collectHeadings(clone, "h2, h3, h4"),
    selectedText: cachedSelection,
    contentExcerpt,
  }) ?? undefined;
}

function isSelectionInChatContainer(selection: Selection): boolean {
  const anchorNode = selection.anchorNode;
  const anchorElement = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement;
  return !!anchorElement?.closest("[data-chat-container-mode], [data-chat-floating-shell='true']");
}

export function createCurrentPageMemento(): CurrentPageMemento {
  let snapshot: CurrentPageSnapshot | undefined;
  let pathname = "";
  let cachedSelection: string | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let observer: MutationObserver | null = null;
  let running = false;

  function scheduleCapture() {
    if (!running) return;
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      snapshot = captureSnapshot(pathname, cachedSelection);
    }, CAPTURE_DEBOUNCE_MS);
  }

  function handleSelectionChange() {
    if (typeof window.getSelection !== "function") return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    if (isSelectionInChatContainer(selection)) return;
    const text = normalizeWhitespace(selection.toString());
    if (text) {
      cachedSelection = text;
    }
  }

  function handleMutation() {
    scheduleCapture();
  }

  return {
    getSnapshot() {
      return snapshot;
    },

    start() {
      if (running) return;
      running = true;

      document.addEventListener("selectionchange", handleSelectionChange);

      observer = new MutationObserver(handleMutation);
      const root = findContentRoot() ?? document.body;
      observer.observe(root, { childList: true, subtree: true, characterData: true });

      // Initial capture
      snapshot = captureSnapshot(pathname, cachedSelection);
    },

    stop() {
      running = false;
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      document.removeEventListener("selectionchange", handleSelectionChange);
    },

    setPathname(nextPathname: string) {
      pathname = nextPathname;
      cachedSelection = null;
      scheduleCapture();
    },
  };
}
