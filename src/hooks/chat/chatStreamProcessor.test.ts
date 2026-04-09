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

  it("processes generation-stopped events through the configured strategy stack", () => {
    const dispatch = vi.fn();
    const processor = createChatStreamProcessor();

    processor.process(
      {
        type: "generation_stopped",
        actor: "user",
        reason: "stopped_by_owner",
        partialContentRetained: true,
        recordedAt: "2026-03-25T10:00:00.000Z",
      },
      { dispatch, assistantIndex: 2 },
    );

    expect(dispatch).toHaveBeenCalledWith({
      type: "SET_STREAM_TERMINAL_STATE",
      index: 2,
      generation: {
        type: "generation_status",
        status: "stopped",
        actor: "user",
        reason: "stopped_by_owner",
        partialContentRetained: true,
        recordedAt: "2026-03-25T10:00:00.000Z",
      },
    });
  });

  it("treats generic stream errors as interrupted terminal state", () => {
    const dispatch = vi.fn();
    const processor = createChatStreamProcessor();

    processor.process(
      { type: "error", message: "Connection lost during streaming." },
      { dispatch, assistantIndex: 1 },
    );

    expect(dispatch).toHaveBeenCalledWith({
      type: "SET_STREAM_TERMINAL_STATE",
      index: 1,
      generation: {
        status: "interrupted",
        actor: "system",
        reason: "Connection lost during streaming.",
      },
    });
  });
});