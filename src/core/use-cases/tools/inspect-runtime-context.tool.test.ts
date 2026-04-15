import { describe, expect, it } from "vitest";

import { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { createInspectRuntimeContextTool } from "./inspect-runtime-context.tool";

describe("inspect_runtime_context tool", () => {
  it("returns role-scoped tool information and authoritative current page details", async () => {
    const registry = new ToolRegistry();
    registry.register(createInspectRuntimeContextTool(registry));

    const tool = createInspectRuntimeContextTool(registry);
    const result = await tool.command.execute(
      {},
      {
        role: "ANONYMOUS",
        userId: "anonymous",
        currentPathname: "/library",
        currentPageSnapshot: {
          pathname: "/library",
          title: "Library",
          mainHeading: "Library",
          sectionHeadings: ["Featured"],
          selectedText: null,
          contentExcerpt: "Browse the library.",
        },
      },
    );

    expect(result.action).toBe("inspect_runtime_context");
    expect(result.role).toBe("ANONYMOUS");
    expect(result.currentPage?.pathname).toBe("/library");
    expect(result.availableTools.map((entry) => entry.name)).toContain("inspect_runtime_context");
    expect(result.toolCount).toBe(result.availableTools.length);
  });

  it("returns prompt runtime provenance when explicitly requested", async () => {
    const registry = new ToolRegistry();
    registry.register(createInspectRuntimeContextTool(registry));

    const tool = createInspectRuntimeContextTool(registry);
    const promptRuntime = {
      surface: "chat_stream" as const,
      text: "system prompt",
      effectiveHash: "hash_prompt",
      slotRefs: [
        {
          role: "ALL",
          promptType: "base" as const,
          source: "db" as const,
          promptId: "prompt_base_1",
          version: 3,
        },
      ],
      sections: [
        {
          key: "identity",
          sourceKind: "slot" as const,
          priority: 10,
          content: "system prompt",
          includedInText: true,
          slotKey: "ALL/base",
        },
      ],
      warnings: [],
    };

    const result = await tool.command.execute(
      { includePrompt: true },
      {
        role: "ANONYMOUS",
        userId: "anonymous",
        promptRuntime,
      },
    );

    expect(result.promptRuntime).toEqual({
      surface: "chat_stream",
      effectiveHash: "hash_prompt",
      slotRefs: promptRuntime.slotRefs,
      sections: [
        {
          key: "identity",
          sourceKind: "slot",
          priority: 10,
          includedInText: true,
          slotKey: "ALL/base",
        },
      ],
      warnings: [],
      redacted: true,
    });
  });
});