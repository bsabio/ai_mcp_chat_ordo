import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "@/core/entities/chat-message";
import { useFailedSendRecovery } from "./useFailedSendRecovery";

vi.mock("@/hooks/chat/chatFailedSendRecovery", () => ({
  hydrateFailedSendRecovery: (messages: ChatMessage[]) => {
    const failedSends = messages
      .filter((m) => m.metadata?.failedSend)
      .map((m) => ({
        retryKey: m.metadata!.failedSend!.retryKey,
        failedUserMessageId: m.metadata!.failedSend!.failedUserMessageId,
        messageText: "retry text",
        attachments: [],
      }));
    return { messages, failedSends };
  },
}));

function makeMessages(failedKeys: string[]): ChatMessage[] {
  return failedKeys.map((key) => ({
    id: key,
    role: "assistant" as const,
    content: "",
    timestamp: new Date(),
    metadata: {
      failedSend: { retryKey: key, failedUserMessageId: `user_${key}` },
    },
  }));
}

describe("useFailedSendRecovery", () => {
  it("returns stable callback references", () => {
    const { result, rerender } = renderHook(() =>
      useFailedSendRecovery([]),
    );

    const first = result.current;
    rerender();
    const second = result.current;

    expect(first.getFailedSend).toBe(second.getFailedSend);
    expect(first.registerFailedSend).toBe(second.registerFailedSend);
    expect(first.clearFailedSend).toBe(second.clearFailedSend);
  });

  it("registers and retrieves a failed send payload", () => {
    const { result } = renderHook(() => useFailedSendRecovery([]));

    act(() => {
      result.current.registerFailedSend({
        retryKey: "r1",
        failedUserMessageId: "u1",
        messageText: "hello",
        attachments: [],
      });
    });

    expect(result.current.getFailedSend("r1")).toEqual(
      expect.objectContaining({ retryKey: "r1", messageText: "hello" }),
    );
  });

  it("clears a failed send payload", () => {
    const { result } = renderHook(() => useFailedSendRecovery([]));

    act(() => {
      result.current.registerFailedSend({
        retryKey: "r1",
        failedUserMessageId: "u1",
        messageText: "hello",
        attachments: [],
      });
    });

    act(() => {
      result.current.clearFailedSend("r1");
    });

    expect(result.current.getFailedSend("r1")).toBeUndefined();
  });

  it("hydrates failed sends from messages", () => {
    const messages = makeMessages(["f1", "f2"]);

    const { result } = renderHook(() => useFailedSendRecovery(messages));

    expect(result.current.getFailedSend("f1")).toEqual(
      expect.objectContaining({ retryKey: "f1" }),
    );
    expect(result.current.getFailedSend("f2")).toEqual(
      expect.objectContaining({ retryKey: "f2" }),
    );
  });

  it("preserves taskOriginHandoff during hydration", () => {
    const messages = makeMessages(["f1"]);

    const { result, rerender } = renderHook(
      ({ msgs }) => useFailedSendRecovery(msgs),
      { initialProps: { msgs: [] as ChatMessage[] } },
    );

    act(() => {
      result.current.registerFailedSend({
        retryKey: "f1",
        failedUserMessageId: "user_f1",
        messageText: "hello",
        attachments: [],
        taskOriginHandoff: {
          sourceBlockId: "lead_queue",
          sourceContextId: "test_context",
        },
      });
    });

    rerender({ msgs: messages });

    const payload = result.current.getFailedSend("f1");
    expect(payload?.taskOriginHandoff).toEqual({
      sourceBlockId: "lead_queue",
      sourceContextId: "test_context",
    });
  });
});
