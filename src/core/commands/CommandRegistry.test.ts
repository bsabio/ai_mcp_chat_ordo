import { describe, expect, it, vi } from "vitest";

import type { Command } from "./Command";
import { CommandRegistry } from "./CommandRegistry";

function createCommand(overrides: Partial<Command> & Pick<Command, "id" | "title" | "category">): Command {
  return {
    execute: vi.fn(),
    ...overrides,
  };
}

describe("CommandRegistry", () => {
  it("resolves commands by normalized id and alias", () => {
    const registry = CommandRegistry.create([
      createCommand({ id: "clear", title: "Clear", category: "Chat", aliases: ["cls"] }),
    ]);

    expect(registry.resolveCommand("clear")?.id).toBe("clear");
    expect(registry.resolveCommand("/clear")?.id).toBe("clear");
    expect(registry.resolveCommand("CLS")?.id).toBe("clear");
  });

  it("finds commands by alias text as well as title and category", () => {
    const registry = CommandRegistry.create([
      createCommand({ id: "compact", title: "Compact", category: "Chat", aliases: ["summarize-thread"] }),
      createCommand({ id: "export", title: "Export", category: "Chat" }),
    ]);

    expect(registry.findCommands("summarize").map((command) => command.id)).toEqual(["compact"]);
    expect(registry.findCommands("chat").map((command) => command.id)).toEqual(["compact", "export"]);
  });
});