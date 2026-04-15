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

  it("advertises the response-state contract", () => {
    expect(prompt).toContain("RESPONSE STATE (MANDATORY):");
    expect(prompt).toContain('__response_state__:"open"');
  });

  it("keeps session_resolution out of the base prompt because it is runtime-owned", () => {
    expect(prompt).toMatch(/response_state/i);
    expect(prompt).not.toMatch(/session_resolution/i);
  });

  it("gates __suggestions__ on the open response state", () => {
    expect(prompt).toContain("STATE-DEPENDENT SUGGESTIONS:");
    expect(prompt).toContain('__suggestions__:["Q1?","Q2?"]');
    expect(prompt).toContain("Emit 1-4 short, varied follow-ups only when they add value.");
    expect(prompt).toContain("Quality over count. Prefer zero suggestions over filler.");
    expect(prompt).toContain('Do NOT emit __suggestions__ for "closed".');
    expect(prompt).toContain('Do NOT emit __suggestions__ for "needs_input".');
  });

  it("does not include a static hardcoded TOOLS section", () => {
    expect(prompt).not.toContain("TOOLS:");
  });

  it("uses live corpus counts instead of stale hardcoded totals", () => {
    expect(prompt).toContain(`${corpusConfig.documentCount} books and ${corpusConfig.sectionCount} chapters`);
    expect(prompt).not.toContain("8 books and 61 chapters");
  });

  it("makes retrieval a locate-then-read contract", () => {
    expect(prompt).toContain("Treat corpus retrieval as a locate-then-read flow: first locate the likely section, then read the section payload.");
    expect(prompt).toContain("If `groundingState` is `search_only`, perform the read step before making detailed chapter-level claims.");
    expect(prompt).toContain("If `groundingState` is `prefetched_section`, treat `prefetchedSection` as the completed read step");
  });

  it("forbids dead corpus links when canonical metadata is missing", () => {
    expect(prompt).toContain("Never cite a corpus link unless `canonicalPath` or `resolverPath` is present.");
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

  it("places INTERACTIVE ACTION FORMATTING before RESPONSE STATE", () => {
    const actionFormatIdx = prompt.indexOf("INTERACTIVE ACTION FORMATTING:");
    const responseStateIdx = prompt.indexOf("RESPONSE STATE");
    expect(actionFormatIdx).toBeGreaterThan(-1);
    expect(responseStateIdx).toBeGreaterThan(-1);
    expect(responseStateIdx).toBeGreaterThan(actionFormatIdx);
  });

  it("places __actions__ before __response_state__ before __suggestions__ in directive order", () => {
    const actionsIdx = prompt.indexOf("__actions__:");
    const responseStateIdx = prompt.indexOf("__response_state__:");
    const suggestionsIdx = prompt.indexOf("__suggestions__:");
    expect(actionsIdx).toBeGreaterThan(-1);
    expect(responseStateIdx).toBeGreaterThan(-1);
    expect(suggestionsIdx).toBeGreaterThan(-1);
    expect(responseStateIdx).toBeGreaterThan(actionsIdx);
    expect(suggestionsIdx).toBeGreaterThan(responseStateIdx);
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
