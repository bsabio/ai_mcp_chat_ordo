import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useChatStreamRuntime } from "@/hooks/chat/useChatStreamRuntime";

const { fetchStreamMock } = vi.hoisted(() => ({
  fetchStreamMock: vi.fn(),
}));

vi.mock("@/adapters/StreamProviderFactory", () => ({
  getChatStreamProvider: () => ({
    fetchStream: fetchStreamMock,
  }),
}));

describe("useChatStreamRuntime", () => {
  afterEach(() => {
    fetchStreamMock.mockReset();
    vi.useRealTimers();
  });

  it("batches contiguous text deltas and flushes before a tool event", async () => {
    fetchStreamMock.mockResolvedValue({
      async *events() {
        yield { type: "text", delta: "Hel" };
        yield { type: "text", delta: "lo" };
        yield { type: "tool_call", name: "search", args: { q: "plan" } };
        yield { type: "done" };
      },
    });

    const dispatch = vi.fn();
    const setConversationId = vi.fn();
    const { result } = renderHook(() => useChatStreamRuntime({
      conversationId: "conv_1",
      currentPathname: "/register",
      dispatch,
      setConversationId,
    }));

    await result.current([], 2, []);

    expect(fetchStreamMock).toHaveBeenCalledWith([], {
      conversationId: "conv_1",
      currentPathname: "/register",
      attachments: [],
      taskOriginHandoff: undefined,
    });

    expect(dispatch).toHaveBeenNthCalledWith(1, {
      type: "APPEND_TEXT",
      index: 2,
      delta: "Hello",
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: "APPEND_TOOL_CALL",
      index: 2,
      name: "search",
      args: { q: "plan" },
    });
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(setConversationId).not.toHaveBeenCalled();
  });

  it("flushes pending text at stream completion and preserves conversation id updates", async () => {
    vi.useFakeTimers();

    fetchStreamMock.mockResolvedValue({
      async *events() {
        yield { type: "conversation_id", id: "conv_new" };
        yield { type: "text", delta: "Hi" };
      },
    });

    const dispatch = vi.fn();
    const setConversationId = vi.fn();
    const { result } = renderHook(() => useChatStreamRuntime({
      conversationId: null,
      currentPathname: "/library",
      dispatch,
      setConversationId,
    }));

    const runPromise = result.current([], 0, []);
    await vi.runAllTimersAsync();
    const resolvedConversationId = await runPromise;

    expect(setConversationId).toHaveBeenCalledWith("conv_new");
    expect(dispatch).toHaveBeenCalledWith({
      type: "APPEND_TEXT",
      index: 0,
      delta: "Hi",
    });
    expect(resolvedConversationId).toBe("conv_new");
  });

  it("forwards a provided current page snapshot to the stream adapter", async () => {
    fetchStreamMock.mockResolvedValue({
      async *events() {
        yield { type: "done" };
      },
    });

    const dispatch = vi.fn();
    const setConversationId = vi.fn();
    const { result } = renderHook(() => useChatStreamRuntime({
      conversationId: "conv_2",
      currentPathname: "/library",
      dispatch,
      setConversationId,
    }));

    await result.current(
      [{ role: "user", content: "What page am I on?" }],
      1,
      [],
      undefined,
      {
        pathname: "/library",
        title: "Library — 10 Books, 104 Chapters | Studio Ordo",
        mainHeading: "Books, chapters, and reusable reference material.",
        sectionHeadings: [],
        selectedText: null,
        contentExcerpt: "The library is organized as books.",
      },
    );

    expect(fetchStreamMock).toHaveBeenCalledWith(
      [{ role: "user", content: "What page am I on?" }],
      {
        conversationId: "conv_2",
        currentPathname: "/library",
        currentPageSnapshot: {
          pathname: "/library",
          title: "Library — 10 Books, 104 Chapters | Studio Ordo",
          mainHeading: "Books, chapters, and reusable reference material.",
          sectionHeadings: [],
          selectedText: null,
          contentExcerpt: "The library is organized as books.",
        },
        attachments: [],
        taskOriginHandoff: undefined,
      },
    );
  });
});