import { describe, expect, it, vi } from "vitest";

import { ChatPresenter } from "@/adapters/ChatPresenter";
import type { CommandParserService } from "@/adapters/CommandParserService";
import type { MarkdownParserService } from "@/adapters/MarkdownParserService";
import type { ChatMessage } from "@/core/entities/chat-message";

const markdownParser = {
  parse: vi.fn().mockReturnValue({ blocks: [] }),
} as unknown as MarkdownParserService;

const commandParser = {
  parse: vi.fn().mockReturnValue([]),
} as unknown as CommandParserService;

describe("ChatPresenter AST boundary", () => {
  it("preserves migrated tool results in toolRenderEntries instead of rich-content blocks", () => {
    const presenter = new ChatPresenter(markdownParser, commandParser);
    const message: ChatMessage = {
      id: "chart-msg-1",
      role: "assistant",
      content: "",
      timestamp: new Date("2026-04-09T12:00:00Z"),
      parts: [
        { type: "tool_call", name: "generate_chart", args: { chartType: "pie" } },
        {
          type: "tool_result",
          name: "generate_chart",
          result: {
            action: "generate_chart",
            code: "pie title Load\n  \"A\" : 1",
          },
        },
      ],
    };

    const presented = presenter.present(message);

    expect(presented.content.blocks).toEqual([]);
    expect(presented.toolRenderEntries).toContainEqual(
      expect.objectContaining({ kind: "tool-call", name: "generate_chart" }),
    );
  });

  it("routes command-only tools to UI commands rather than tool render entries", () => {
    const presenter = new ChatPresenter(markdownParser, commandParser);
    const message: ChatMessage = {
      id: "cmd-msg-1",
      role: "assistant",
      content: "",
      timestamp: new Date("2026-04-09T12:00:00Z"),
      parts: [
        { type: "tool_call", name: "set_theme", args: { theme: "bauhaus" } },
      ],
    };

    const presented = presenter.present(message);

    expect(presented.commands).toContainEqual(
      expect.objectContaining({ type: "set_theme", theme: "bauhaus" }),
    );
    expect(presented.toolRenderEntries).toEqual([]);
  });

  it("pushes unknown tools into toolRenderEntries when no job snapshots exist", () => {
    const presenter = new ChatPresenter(markdownParser, commandParser);
    const message: ChatMessage = {
      id: "unknown-msg-1",
      role: "assistant",
      content: "",
      timestamp: new Date("2026-04-09T12:00:00Z"),
      parts: [
        { type: "tool_call", name: "calculator", args: { expression: "2+2" } },
        { type: "tool_result", name: "calculator", result: 4 },
      ],
    };

    const presented = presenter.present(message);

    expect(presented.content.blocks).toEqual([]);
    expect(presented.toolRenderEntries).toContainEqual(
      expect.objectContaining({ kind: "tool-call", name: "calculator", result: 4 }),
    );
  });
});
