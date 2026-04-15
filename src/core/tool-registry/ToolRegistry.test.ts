import { describe, expect, it, vi } from "vitest";

import { ToolRegistry } from "./ToolRegistry";
import type { ToolDescriptor } from "./ToolDescriptor";

function createDescriptor(name: string, roles: ToolDescriptor["roles"] = "ALL"): ToolDescriptor {
  return {
    name,
    roles,
    category: "system",
    schema: {
      description: `${name} description`,
      input_schema: { type: "object", properties: {} },
    },
    command: {
      execute: vi.fn(),
    },
  };
}

describe("ToolRegistry.getSchemasForRole", () => {
  it("returns schemas in alphabetical order regardless of registration order", () => {
    const registry = new ToolRegistry();

    registry.register(createDescriptor("zeta_tool"));
    registry.register(createDescriptor("alpha_tool"));
    registry.register(createDescriptor("middle_tool"));

    expect(registry.getSchemasForRole("ANONYMOUS").map((schema) => schema.name)).toEqual([
      "alpha_tool",
      "middle_tool",
      "zeta_tool",
    ]);
  });

  it("sorts after role filtering so each role gets a deterministic manifest", () => {
    const registry = new ToolRegistry();

    registry.register(createDescriptor("zeta_tool", ["ADMIN"]));
    registry.register(createDescriptor("alpha_tool", ["ANONYMOUS", "ADMIN"]));
    registry.register(createDescriptor("middle_tool", ["ANONYMOUS"]));

    expect(registry.getSchemasForRole("ANONYMOUS").map((schema) => schema.name)).toEqual([
      "alpha_tool",
      "middle_tool",
    ]);
    expect(registry.getSchemasForRole("ADMIN").map((schema) => schema.name)).toEqual([
      "alpha_tool",
      "zeta_tool",
    ]);
  });
});