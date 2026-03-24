import { describe, expect, it } from "vitest";
import { SystemPromptBuilder } from "@/core/use-cases/SystemPromptBuilder";
import { ROLE_DIRECTIVES } from "@/core/entities/role-directives";
import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";
import type { RoleName } from "@/core/entities/user";
import type { UserPreference } from "@/core/ports/UserPreferencesRepository";
import { getToolRegistry } from "@/lib/chat/tool-composition-root";
import { buildCorpusBasePrompt } from "@/lib/corpus-vocabulary";
import { EXPECTED_ROLE_TOOL_SETS } from "./helpers/role-tool-sets";

const TOOL_MANIFEST_HEADER = "TOOLS AVAILABLE TO YOU:";
const MANIFEST_FOOTER = "When the user asks what you can do, list these tools by name with a one-line description of each.";
const SUMMARY_HEADER = "[Server summary of earlier conversation]";
const ROUTING_HEADER = "[Server routing metadata]";
const USER_PREFERENCES_HEADER = "[Server user preferences]";

function extractManifestToolNames(prompt: string): string[] {
  const match = prompt.match(/TOOLS AVAILABLE TO YOU:([\s\S]*?)(?:\n\n|\nWhen the user asks)/);
  if (!match) return [];
  return Array.from(match[1].matchAll(/\*\*([a-z_]+)\*\*/g)).map((m) => m[1]);
}

function extractIdentitySection(prompt: string): string {
  const manifestIndex = prompt.indexOf(TOOL_MANIFEST_HEADER);
  if (manifestIndex === -1) {
    return prompt;
  }

  return prompt.slice(0, manifestIndex);
}

function buildPrompt(role: RoleName): string {
  const tools = getToolRegistry().getSchemasForRole(role);
  const snapshot = createConversationRoutingSnapshot({
    lane: "development",
    confidence: 0.84,
    detectedNeedSummary: "Technical implementation request",
  });
  const prefs: UserPreference[] = [
    { key: "response_style", value: "bullets", updatedAt: "2026-03-24T12:00:00.000Z" },
    { key: "tone", value: "professional", updatedAt: "2026-03-24T12:00:01.000Z" },
  ];

  return new SystemPromptBuilder()
    .withSection({ key: "identity", content: buildCorpusBasePrompt(), priority: 10 })
    .withToolManifest(tools.map((tool) => ({ name: tool.name, description: tool.description ?? "" })))
    .withSection({ key: "role_directive", content: ROLE_DIRECTIVES[role], priority: 20 })
    .withUserPreferences(prefs)
    .withConversationSummary("User previously asked about implementation sequencing.")
    .withRoutingContext(snapshot)
    .build();
}

describe("system prompt assembly", () => {
  it("orders sections as identity, tool manifest, role directive, user preferences, summary, then routing", () => {
    const prompt = buildPrompt("AUTHENTICATED");

    const identityIndex = prompt.indexOf("You are Studio Ordo");
    const manifestIndex = prompt.indexOf(TOOL_MANIFEST_HEADER);
    const directiveIndex = prompt.indexOf("ROLE CONTEXT — REGISTERED USER:");
    const preferencesIndex = prompt.indexOf(USER_PREFERENCES_HEADER);
    const summaryIndex = prompt.indexOf(SUMMARY_HEADER);
    const routingIndex = prompt.indexOf(ROUTING_HEADER);

    expect(identityIndex).toBeGreaterThan(-1);
    expect(manifestIndex).toBeGreaterThan(identityIndex);
    expect(directiveIndex).toBeGreaterThan(manifestIndex);
    expect(preferencesIndex).toBeGreaterThan(directiveIndex);
    expect(summaryIndex).toBeGreaterThan(preferencesIndex);
    expect(routingIndex).toBeGreaterThan(summaryIndex);
  });

  it("contains exactly one tool manifest block", () => {
    const prompt = buildPrompt("AUTHENTICATED");

    expect(prompt.split(TOOL_MANIFEST_HEADER)).toHaveLength(2);
    expect(prompt.split(MANIFEST_FOOTER)).toHaveLength(2);
  });

  it("ANONYMOUS assembled prompt contains exactly the anonymous tool set", () => {
    const prompt = buildPrompt("ANONYMOUS");

    expect(extractManifestToolNames(prompt).sort()).toEqual(EXPECTED_ROLE_TOOL_SETS.ANONYMOUS);
  });

  it("ADMIN assembled prompt contains exactly the admin tool set including admin-only tools", () => {
    const prompt = buildPrompt("ADMIN");

    expect(extractManifestToolNames(prompt).sort()).toEqual(EXPECTED_ROLE_TOOL_SETS.ADMIN);
    expect(prompt).toContain("**admin_web_search**");
    expect(prompt).toContain("**draft_content**");
    expect(prompt).toContain("**publish_content**");
  });

  it("APPRENTICE assembled prompt includes the full member tool subset expected by the role", () => {
    const prompt = buildPrompt("APPRENTICE");
    const manifestNames = extractManifestToolNames(prompt);

    expect(manifestNames.slice().sort()).toEqual(EXPECTED_ROLE_TOOL_SETS.APPRENTICE);
    expect(manifestNames).toEqual(expect.arrayContaining([
      "search_my_conversations",
      "generate_audio",
      "generate_chart",
      "generate_graph",
      "get_section",
      "get_checklist",
      "list_practitioners",
      "set_preference",
    ]));
  });

  it("includes graph usage guidance in the assembled manifest for member roles", () => {
    const prompt = buildPrompt("AUTHENTICATED");

    expect(prompt).toContain("time-series questions, comparisons across segments or categories, distributions, outlier analysis");
    expect(prompt).toContain("explicit requests for a graph, trend, plot, values over time, or custom visualization");
  });

  it("identity section does not leak raw tool names outside the manifest block", () => {
    const prompt = buildPrompt("ADMIN");
    const identitySection = extractIdentitySection(prompt);
    const toolNames = getToolRegistry().getToolNames();

    for (const toolName of toolNames) {
      expect(identitySection).not.toContain(`**${toolName}**`);
      expect(identitySection).not.toContain(`\`${toolName}\``);
      expect(identitySection).not.toMatch(new RegExp(`\\b${toolName}\\b`));
    }
  });
});