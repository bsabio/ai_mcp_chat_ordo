import { describe, expect, it, vi } from "vitest";

import { createChatStreamDispatcher } from "./chatStreamDispatch";

describe("chatStreamDispatch", () => {
  it("routes conversation-id updates through setConversationId and tracks the resolved id", () => {
    const dispatch = vi.fn();
    const setConversationId = vi.fn();
    const streamDispatch = createChatStreamDispatcher({
      initialConversationId: "conv_initial",
      dispatch,
      setConversationId,
    });

    streamDispatch.dispatchStreamAction({ type: "SET_CONVERSATION_ID", conversationId: "conv_new" });

    expect(setConversationId).toHaveBeenCalledWith("conv_new");
    expect(dispatch).not.toHaveBeenCalled();
    expect(streamDispatch.getResolvedConversationId()).toBe("conv_new");
  });

  it("forwards non-conversation actions to the reducer dispatch", () => {
    const dispatch = vi.fn();
    const setConversationId = vi.fn();
    const streamDispatch = createChatStreamDispatcher({
      initialConversationId: null,
      dispatch,
      setConversationId,
    });

    streamDispatch.dispatchStreamAction({ type: "APPEND_TEXT", index: 2, delta: "Hello" });

    expect(dispatch).toHaveBeenCalledWith({ type: "APPEND_TEXT", index: 2, delta: "Hello" });
    expect(setConversationId).not.toHaveBeenCalled();
    expect(streamDispatch.getResolvedConversationId()).toBeNull();
  });
});