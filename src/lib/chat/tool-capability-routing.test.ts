import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";

import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";
import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";

import { getRequestScopedToolSelection } from "./tool-capability-routing";

function createTool(name: string): Anthropic.Tool {
  return {
    name,
    description: "",
    input_schema: { type: "object", properties: {} },
  };
}

function createRegistry(tools: Anthropic.Tool[]): ToolRegistry {
  return {
    getSchemasForRole: () => tools,
  } as unknown as ToolRegistry;
}

describe("getRequestScopedToolSelection", () => {
  it("keeps the full manifest for non-admin roles", () => {
    const tools = [
      createTool("navigate_to_page"),
      createTool("search_corpus"),
      createTool("generate_audio"),
    ];

    const selection = getRequestScopedToolSelection(
      createRegistry(tools),
      "AUTHENTICATED",
      createConversationRoutingSnapshot({ lane: "organization", confidence: 0.95 }),
    );

    expect(selection.prefiltered).toBe(false);
    expect(selection.tools.map((tool) => tool.name)).toEqual([
      "navigate_to_page",
      "search_corpus",
      "generate_audio",
    ]);
    expect(selection.allowedToolNames).toEqual([
      "navigate_to_page",
      "search_corpus",
      "generate_audio",
    ]);
  });

  it("narrows high-confidence admin organization turns to the scoped allowlist", () => {
    const tools = [
      createTool("navigate_to_page"),
      createTool("search_corpus"),
      createTool("admin_search"),
      createTool("list_deferred_jobs"),
      createTool("generate_audio"),
    ];

    const selection = getRequestScopedToolSelection(
      createRegistry(tools),
      "ADMIN",
      createConversationRoutingSnapshot({ lane: "organization", confidence: 0.95 }),
    );

    expect(selection.prefiltered).toBe(true);
    expect(selection.tools.map((tool) => tool.name)).toEqual([
      "navigate_to_page",
      "search_corpus",
      "admin_search",
      "list_deferred_jobs",
    ]);
    expect(selection.allowedToolNames).toEqual([
      "navigate_to_page",
      "search_corpus",
      "admin_search",
      "list_deferred_jobs",
    ]);
  });

  it("does not prefilter low-confidence admin turns", () => {
    const tools = [
      createTool("navigate_to_page"),
      createTool("search_corpus"),
      createTool("generate_audio"),
    ];

    const selection = getRequestScopedToolSelection(
      createRegistry(tools),
      "ADMIN",
      createConversationRoutingSnapshot({ lane: "organization", confidence: 0.45 }),
    );

    expect(selection.prefiltered).toBe(false);
    expect(selection.tools.map((tool) => tool.name)).toEqual([
      "navigate_to_page",
      "search_corpus",
      "generate_audio",
    ]);
  });
});