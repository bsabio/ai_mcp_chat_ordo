import { afterEach, describe, expect, it } from "vitest";
import { getModelCandidates, looksLikeMath, SYSTEM_PROMPT } from "@/lib/chat/policy";

const ORIGINAL_ENV = process.env;

describe("chat policy", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("detects arithmetic expression syntax", () => {
    expect(looksLikeMath("what is 4 * 11?")).toBe(true);
  });

  it("detects math keywords", () => {
    expect(looksLikeMath("please calculate the product of 8 and 2")).toBe(true);
  });

  it("does not classify regular text as math", () => {
    expect(looksLikeMath("hello there")).toBe(false);
  });

  it("includes mandatory calculator usage in system prompt", () => {
    expect(SYSTEM_PROMPT).toContain("MUST use the calculator tool");
  });

  it("returns configured model first and dedupes", () => {
    process.env = {
      ...ORIGINAL_ENV,
      API__ANTHROPIC_MODEL: "claude-sonnet-4-6",
    };

    expect(getModelCandidates()).toEqual(["claude-sonnet-4-6", "claude-haiku-4-5", "claude-opus-4-6"]);
  });

  it("returns fallback list when model not configured", () => {
    process.env = {
      ...ORIGINAL_ENV,
      ANTHROPIC_MODEL: "",
      API__ANTHROPIC_MODEL: "",
    };

    expect(getModelCandidates()).toEqual(["claude-haiku-4-5", "claude-sonnet-4-6", "claude-opus-4-6"]);
  });
});
