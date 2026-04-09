import { describe, it, expect } from "vitest";
import { getToolComposition } from "@/lib/chat/tool-composition-root";
import { buildCorpusBasePrompt, corpusConfig } from "./corpus-vocabulary";

describe("buildCorpusBasePrompt", () => {
  const prompt = buildCorpusBasePrompt();
  const registryToolNames = getToolComposition().registry.getToolNames();

  // --- Section presence ---
  it("contains INTERACTIVE ACTION FORMATTING section header", () => {
    expect(prompt).toContain("INTERACTIVE ACTION FORMATTING:");
  });

  it("contains __actions__ directive with syntax example", () => {
    expect(prompt).toContain("__actions__:[");
  });

  it("preserves existing __suggestions__ mandate", () => {
    expect(prompt).toContain("DYNAMIC SUGGESTIONS (MANDATORY - never skip):");
    expect(prompt).toContain('__suggestions__:["Q1?","Q2?","Q3?","Q4?"]');
  });

  it("does not include a static hardcoded TOOLS section", () => {
    expect(prompt).not.toContain("TOOLS:");
  });

  it("uses live corpus counts instead of stale hardcoded totals", () => {
    expect(prompt).toContain(`${corpusConfig.documentCount} books and ${corpusConfig.sectionCount} chapters`);
    expect(prompt).not.toContain("8 books and 61 chapters");
  });

  it("does not hardcode a stale numbered corpus inventory", () => {
    expect(prompt).not.toContain("1. The Second Renaissance —");
    expect(prompt).toContain("prefer corpus retrieval over memory");
  });

  it("does not include any live registry tool identifiers in the base prompt", () => {
    for (const toolName of registryToolNames) {
      expect(prompt).not.toContain(`**${toolName}**`);
      expect(prompt).not.toContain(`\`${toolName}\``);
      expect(prompt).not.toMatch(new RegExp(`\\b${toolName}\\b`));
    }
  });

  // --- Action type examples ---
  it("contains action link example for conversation type", () => {
    expect(prompt).toContain("?conversation=");
  });

  it("contains action link example for route type", () => {
    expect(prompt).toContain("?route=");
  });

  it("contains action link example for send type", () => {
    expect(prompt).toContain("?send=");
  });

  it("contains action link example for corpus type", () => {
    expect(prompt).toContain("?corpus=");
  });

  // --- Constraints and guidance ---
  it("contains entity ID availability constraint", () => {
    expect(prompt).toContain("Only use conversation action links when entity IDs are provided");
  });

  it("contains inline-vs-chip redundancy guidance", () => {
    expect(prompt).toContain("Do NOT duplicate the same action as both an inline link AND a chip");
  });

  it("contains direct navigation tool guidance", () => {
    expect(prompt).toContain("Do not rely only on route action links");
  });

  it("contains self-knowledge truthfulness guidance", () => {
    expect(prompt).toContain("SELF-KNOWLEDGE AND RUNTIME TRUTH:");
    expect(prompt).toContain("Distinguish verified runtime facts from inference");
    expect(prompt).toContain("do not invent lane or confidence values");
  });

  it("contains max 3 actions per message rule", () => {
    expect(prompt).toContain("Max 3 actions per message");
  });

  it("contains verb-first label guidance", () => {
    expect(prompt).toContain("verb-first, under 40 characters");
  });

  // --- Section ordering ---
  it("places INTERACTIVE ACTION FORMATTING after UI CONTROL", () => {
    const uiControlIdx = prompt.indexOf("UI CONTROL:");
    const actionFormatIdx = prompt.indexOf("INTERACTIVE ACTION FORMATTING:");
    expect(uiControlIdx).toBeGreaterThan(-1);
    expect(actionFormatIdx).toBeGreaterThan(-1);
    expect(actionFormatIdx).toBeGreaterThan(uiControlIdx);
  });

  it("places INTERACTIVE ACTION FORMATTING before DYNAMIC SUGGESTIONS", () => {
    const actionFormatIdx = prompt.indexOf("INTERACTIVE ACTION FORMATTING:");
    const suggestionsIdx = prompt.indexOf("DYNAMIC SUGGESTIONS");
    expect(actionFormatIdx).toBeGreaterThan(-1);
    expect(suggestionsIdx).toBeGreaterThan(-1);
    expect(suggestionsIdx).toBeGreaterThan(actionFormatIdx);
  });

  it("places __actions__ before __suggestions__ in directive order", () => {
    const actionsIdx = prompt.indexOf("__actions__:");
    const suggestionsIdx = prompt.indexOf("__suggestions__:");
    expect(actionsIdx).toBeGreaterThan(-1);
    expect(suggestionsIdx).toBeGreaterThan(-1);
    expect(suggestionsIdx).toBeGreaterThan(actionsIdx);
  });

  // --- Brevity updates ---
  it("updated RESPONSE STYLE references action links", () => {
    expect(prompt).toContain("use action links instead of prose instructions");
  });

  it("updated RESPONSE STYLE references operator brief card limits", () => {
    expect(prompt).toContain("2-3 bullet points max");
  });

  // --- Edge cases ---
  it("produces a non-empty string", () => {
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("contains no unresolved template literal placeholders", () => {
    expect(prompt).not.toMatch(/\$\{[^}]+\}/);
  });

  it("contains WRONG/RIGHT contrasting examples", () => {
    expect(prompt).toContain("WRONG:");
    expect(prompt).toContain("RIGHT:");
  });

  it("base prompt stays under 16000 characters", () => {
    expect(prompt.length).toBeLessThan(16000);
  });
});
