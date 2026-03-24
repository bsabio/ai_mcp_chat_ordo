import { describe, expect, it, vi } from "vitest";

import { createChatStreamProcessor } from "./chatStreamProcessor";

describe("chatStreamProcessor", () => {
  it("processes tool events through the configured strategy stack", () => {
    const dispatch = vi.fn();
    const processor = createChatStreamProcessor();

    processor.process(
      { type: "tool_call", name: "search", args: { q: "plan" } },
      { dispatch, assistantIndex: 4 },
    );

    expect(dispatch).toHaveBeenCalledWith({
      type: "APPEND_TOOL_CALL",
      index: 4,
      name: "search",
      args: { q: "plan" },
    });
  });

  it("processes conversation id events through the configured strategy stack", () => {
    const dispatch = vi.fn();
    const processor = createChatStreamProcessor();

    processor.process(
      { type: "conversation_id", id: "conv_new" },
      { dispatch, assistantIndex: 0 },
    );

    expect(dispatch).toHaveBeenCalledWith({
      type: "SET_CONVERSATION_ID",
      conversationId: "conv_new",
    });
  });
});