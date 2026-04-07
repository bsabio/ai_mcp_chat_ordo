import { describe, expect, it } from "vitest";

import { stripLeadingMarkdownTitle } from "@/lib/markdown/strip-leading-markdown-title";

describe("stripLeadingMarkdownTitle", () => {
  it("removes a duplicate leading h1 heading", () => {
    const content = [
      "# Chapter 0 — The Thread: From Craft to Component",
      "",
      "## Abstract",
      "",
      "Every component library starts with user failure.",
    ].join("\n");

    expect(stripLeadingMarkdownTitle("Chapter 0 — The Thread: From Craft to Component", content)).toBe([
      "## Abstract",
      "",
      "Every component library starts with user failure.",
    ].join("\n"));
  });

  it("removes a duplicate plain-text title line", () => {
    const content = [
      "Systems Thinking",
      "",
      "Opening paragraph.",
    ].join("\n");

    expect(stripLeadingMarkdownTitle("Systems Thinking", content)).toBe("Opening paragraph.");
  });

  it("preserves content when the first heading is not the page title", () => {
    const content = [
      "## Abstract",
      "",
      "Opening paragraph.",
    ].join("\n");

    expect(stripLeadingMarkdownTitle("Systems Thinking", content)).toBe(content);
  });
});