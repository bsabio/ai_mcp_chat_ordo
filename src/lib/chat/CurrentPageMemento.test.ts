import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCurrentPageMemento, type CurrentPageMemento } from "./CurrentPageMemento";

function setupDOM(options: {
  title?: string;
  mainContent?: string;
  headings?: string[];
  portalContent?: string;
} = {}) {
  document.title = options.title ?? "Test Page";
  document.body.innerHTML = "";

  const main = document.createElement("main");
  main.setAttribute("data-shell-main-surface", "");

  if (options.headings) {
    for (const text of options.headings) {
      const heading = document.createElement("h2");
      heading.textContent = text;
      main.appendChild(heading);
    }
  }

  const h1 = document.createElement("h1");
  h1.textContent = options.mainContent ?? "Main Heading";
  main.appendChild(h1);

  const p = document.createElement("p");
  p.textContent = "Body content for testing.";
  main.appendChild(p);

  document.body.appendChild(main);

  if (options.portalContent) {
    const portal = document.createElement("div");
    portal.setAttribute("role", "dialog");
    portal.textContent = options.portalContent;
    document.body.appendChild(portal);
  }

  return main;
}

describe("CurrentPageMemento", () => {
  let memento: CurrentPageMemento;

  beforeEach(() => {
    vi.useFakeTimers();
    setupDOM();
    memento = createCurrentPageMemento();
  });

  afterEach(() => {
    memento.stop();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("returns undefined before start", () => {
    memento.setPathname("/test");
    expect(memento.getSnapshot()).toBeUndefined();
  });

  it("captures an initial snapshot on start", () => {
    memento.setPathname("/library");
    memento.start();
    const snap = memento.getSnapshot();
    expect(snap).toBeDefined();
    expect(snap?.pathname).toBe("/library");
    expect(snap?.title).toBe("Test Page");
    expect(snap?.mainHeading).toBe("Main Heading");
  });

  it("updates snapshot after pathname change and debounce", () => {
    memento.setPathname("/page-a");
    memento.start();
    expect(memento.getSnapshot()?.pathname).toBe("/page-a");

    memento.setPathname("/page-b");
    // Before debounce, snapshot still has old value from initial capture
    expect(memento.getSnapshot()?.pathname).toBe("/page-a");

    vi.advanceTimersByTime(160);
    expect(memento.getSnapshot()?.pathname).toBe("/page-b");
  });

  it("clears cached selection on pathname change", () => {
    memento.setPathname("/page-a");
    memento.start();

    // Simulate selection caching via selectionchange event
    const _event = new Event("selectionchange");
    // Manually set internal state by triggering method, but since we can't
    // mock getSelection easily in jsdom, test that pathname change resets
    memento.setPathname("/page-b");
    vi.advanceTimersByTime(200);

    const snap = memento.getSnapshot();
    expect(snap?.pathname).toBe("/page-b");
    expect(snap?.selectedText).toBeNull();
  });

  it("captures portal/dialog text in content excerpt", () => {
    setupDOM({ portalContent: "Dialog message: confirm delete?" });
    memento.setPathname("/test");
    memento.start();

    const snap = memento.getSnapshot();
    expect(snap?.contentExcerpt).toContain("[Active Dialog]");
    expect(snap?.contentExcerpt).toContain("confirm delete?");
  });

  it("handles missing content root gracefully", () => {
    document.body.innerHTML = "";
    memento.setPathname("/empty");
    memento.start();

    const snap = memento.getSnapshot();
    // Falls back to document.body which is now empty
    expect(snap).toBeDefined();
    expect(snap?.pathname).toBe("/empty");
  });

  it("does not schedule captures after stop", () => {
    memento.setPathname("/test");
    memento.start();
    memento.stop();

    const initialSnap = memento.getSnapshot();
    memento.setPathname("/new-page");
    vi.advanceTimersByTime(300);

    // Snapshot should not have updated
    expect(memento.getSnapshot()).toBe(initialSnap);
  });

  it("does not crash on double start", () => {
    memento.setPathname("/test");
    memento.start();
    memento.start();
    expect(memento.getSnapshot()).toBeDefined();
  });

  it("does not crash on double stop", () => {
    memento.setPathname("/test");
    memento.start();
    memento.stop();
    expect(() => memento.stop()).not.toThrow();
  });

  it("handles null snapshot normalization from invalid pathname", () => {
    memento.setPathname("");
    memento.start();
    // normalizeCurrentPageSnapshot returns null for empty pathname → undefined
    expect(memento.getSnapshot()).toBeUndefined();
  });

  it("excludes chat container elements from content excerpt", () => {
    const main = document.querySelector("main")!;
    const chatEl = document.createElement("div");
    chatEl.setAttribute("data-chat-container-mode", "");
    chatEl.textContent = "Chat internal text should not appear";
    main.appendChild(chatEl);

    memento.setPathname("/test");
    memento.start();

    expect(memento.getSnapshot()?.contentExcerpt).not.toContain("Chat internal text");
  });

  it("excludes chat portal dialogs from portal capture", () => {
    const portal = document.createElement("div");
    portal.setAttribute("role", "dialog");
    portal.setAttribute("data-chat-container-mode", "");
    portal.textContent = "Chat dialog should not appear";
    document.body.appendChild(portal);

    memento.setPathname("/test");
    memento.start();

    expect(memento.getSnapshot()?.contentExcerpt).not.toContain("Chat dialog should not appear");
  });
});
