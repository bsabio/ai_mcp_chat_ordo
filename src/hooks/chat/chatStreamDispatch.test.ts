import { describe, expect, it, vi } from "vitest";

import { createChatStreamDispatcher } from "./chatStreamDispatch";

describe("chatStreamDispatch", () => {
  it("routes conversation-id updates through setConversationId and tracks the resolved id", () => {
    const dispatch = vi.fn();
    const setConversationId = vi.fn();
    const setStreamId = vi.fn();
    const streamDispatch = createChatStreamDispatcher({
      initialConversationId: "conv_initial",
      dispatch,
      setConversationId,
      setStreamId,
    });

    streamDispatch.dispatchStreamAction({ type: "SET_CONVERSATION_ID", conversationId: "conv_new" });

    expect(setConversationId).toHaveBeenCalledWith("conv_new");
    expect(setStreamId).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    expect(streamDispatch.getResolvedConversationId()).toBe("conv_new");
  });

  it("routes stream-id updates through setStreamId and tracks the resolved stream id", () => {
    const dispatch = vi.fn();
    const setConversationId = vi.fn();
    const setStreamId = vi.fn();
    const streamDispatch = createChatStreamDispatcher({
      initialConversationId: "conv_initial",
      dispatch,
      setConversationId,
      setStreamId,
    });

    streamDispatch.dispatchStreamAction({ type: "SET_STREAM_ID", streamId: "stream_live_1" });

    expect(setStreamId).toHaveBeenCalledWith("stream_live_1");
    expect(setConversationId).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    expect(streamDispatch.getResolvedStreamId()).toBe("stream_live_1");
  });

  it("forwards non-conversation actions to the reducer dispatch", () => {
    const dispatch = vi.fn();
    const setConversationId = vi.fn();
    const setStreamId = vi.fn();
    const streamDispatch = createChatStreamDispatcher({
      initialConversationId: null,
      dispatch,
      setConversationId,
      setStreamId,
    });

    streamDispatch.dispatchStreamAction({ type: "APPEND_TEXT", index: 2, delta: "Hello" });

    expect(dispatch).toHaveBeenCalledWith({ type: "APPEND_TEXT", index: 2, delta: "Hello" });
    expect(setConversationId).not.toHaveBeenCalled();
    expect(setStreamId).not.toHaveBeenCalled();
    expect(streamDispatch.getResolvedConversationId()).toBeNull();
    expect(streamDispatch.getResolvedStreamId()).toBeNull();
  });
});