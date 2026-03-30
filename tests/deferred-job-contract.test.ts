import { describe, expect, it } from "vitest";
import { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";

function makeDeferredDescriptor(overrides: Partial<ToolDescriptor> = {}): ToolDescriptor {
  return {
    name: "draft_content_deferred",
    schema: { description: "Deferred draft content", input_schema: { type: "object", properties: {} } },
    command: { execute: async () => ({ queued: true }) },
    roles: ["ADMIN"],
    category: "content",
    executionMode: "deferred",
    deferred: {
      dedupeStrategy: "per-conversation-payload",
      retryable: true,
      notificationPolicy: "completion-and-failure",
    },
    ...overrides,
  };
}

describe("deferred job contract", () => {
  it("registers and exposes deferred execution metadata", () => {
    const registry = new ToolRegistry();
    registry.register(makeDeferredDescriptor());

    expect(registry.getDescriptor("draft_content_deferred")).toMatchObject({
      executionMode: "deferred",
      deferred: {
        dedupeStrategy: "per-conversation-payload",
        retryable: true,
        notificationPolicy: "completion-and-failure",
      },
    });
  });

  it("returns undefined for unknown descriptors", () => {
    const registry = new ToolRegistry();
    expect(registry.getDescriptor("missing_tool")).toBeUndefined();
  });

  it("preserves inline tools without deferred metadata", () => {
    const registry = new ToolRegistry();
    registry.register(
      makeDeferredDescriptor({
        name: "inline_tool",
        executionMode: "inline",
        deferred: undefined,
      }),
    );

    expect(registry.getDescriptor("inline_tool")).toMatchObject({
      executionMode: "inline",
    });
    expect(registry.getDescriptor("inline_tool")?.deferred).toBeUndefined();
  });
});
