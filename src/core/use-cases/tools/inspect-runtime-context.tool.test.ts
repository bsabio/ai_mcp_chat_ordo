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
});