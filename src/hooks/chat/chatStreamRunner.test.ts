import { describe, expect, it, vi } from "vitest";

import { createChatStreamDispatcher } from "./chatStreamDispatch";
import { createChatStreamProcessor } from "./chatStreamProcessor";
import { runChatStream } from "./chatStreamRunner";

describe("chatStreamRunner", () => {
  it("flushes pending text before processing a non-text event", async () => {
    const textBuffer = {
      append: vi.fn(),
      flush: vi.fn(),
      flushBeforeNonTextEvent: vi.fn(),
      dispose: vi.fn(),
    };
    const dispatch = vi.fn();
    const setConversationId = vi.fn();
    const setStreamId = vi.fn();
    const streamDispatch = createChatStreamDispatcher({
      initialConversationId: "conv_1",
      dispatch,
      setConversationId,
      setStreamId,
    });

    await runChatStream({
      stream: {
        async *events() {
          yield { type: "text", delta: "Hi" };
          yield { type: "tool_call", name: "search", args: { q: "plan" } };
        },
      },
      textBuffer,
      streamDispatch,
      streamProcessor: createChatStreamProcessor(),
      assistantIndex: 2,
    });

    expect(textBuffer.append).toHaveBeenCalledWith("Hi");
    expect(textBuffer.flushBeforeNonTextEvent).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: "APPEND_TOOL_CALL",
      index: 2,
      name: "search",
      args: { q: "plan" },
    });
    expect(textBuffer.dispose).toHaveBeenCalledTimes(1);
  });

  it("returns the resolved conversation id after stream updates", async () => {
    const textBuffer = {
      append: vi.fn(),
      flush: vi.fn(),
      flushBeforeNonTextEvent: vi.fn(),
      dispose: vi.fn(),
    };
    const dispatch = vi.fn();
    const setConversationId = vi.fn();
    const setStreamId = vi.fn();
    const streamDispatch = createChatStreamDispatcher({
      initialConversationId: null,
      dispatch,
      setConversationId,
      setStreamId,
    });

    const resolvedConversationId = await runChatStream({
      stream: {
        async *events() {
          yield { type: "stream_id", id: "stream_live_1" };
          yield { type: "conversation_id", id: "conv_new" };
        },
      },
      textBuffer,
      streamDispatch,
      streamProcessor: createChatStreamProcessor(),
      assistantIndex: 0,
    });

    expect(setStreamId).toHaveBeenCalledWith("stream_live_1");
    expect(setConversationId).toHaveBeenCalledWith("conv_new");
    expect(resolvedConversationId).toBe("conv_new");
    expect(textBuffer.dispose).toHaveBeenCalledTimes(1);
  });
});