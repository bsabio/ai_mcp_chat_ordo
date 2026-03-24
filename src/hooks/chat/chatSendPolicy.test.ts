import { describe, expect, it } from "vitest";

import type { ChatMessage } from "@/core/entities/chat-message";

import {
  prepareChatSend,
  shouldRefreshConversationAfterStream,
  validateChatSend,
} from "./chatSendPolicy";

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `${role}-${content}`,
    role,
    content,
    parts: [{ type: "text", text: content }],
    timestamp: new Date("2026-03-23T00:00:00.000Z"),
  };
}

describe("chatSendPolicy", () => {
  it("rejects empty sends and concurrent sends", () => {
    expect(validateChatSend("   ", 0, false)).toEqual({
      trimmedMessage: "",
      error: "Cannot send an empty message.",
    });

    expect(validateChatSend("Hello", 0, true)).toEqual({
      trimmedMessage: "Hello",
      error: "A message is already sending.",
    });
  });

  it("accepts text-only and attachment-only sends", () => {
    expect(validateChatSend("  Hello  ", 0, false)).toEqual({
      trimmedMessage: "Hello",
      error: null,
    });

    expect(validateChatSend("   ", 1, false)).toEqual({
      trimmedMessage: "",
      error: null,
    });
  });

  it("builds optimistic messages and backend history from the current transcript", () => {
    const prepared = prepareChatSend(
      [createMessage("assistant", "Welcome")],
      "Audit this workflow",
      [],
    );

    expect(prepared.assistantIndex).toBe(2);
    expect(prepared.optimisticMessages).toHaveLength(3);
    expect(prepared.optimisticMessages[1]).toMatchObject({
      role: "user",
      content: "Audit this workflow",
    });
    expect(prepared.optimisticMessages[2]).toMatchObject({
      role: "assistant",
      content: "",
    });
    expect(prepared.historyForBackend).toEqual([
      { role: "assistant", content: "Welcome" },
      { role: "user", content: "Audit this workflow" },
    ]);
  });

  it("refreshes only when the stream resolves to a different or newly created conversation", () => {
    expect(shouldRefreshConversationAfterStream(null, "conv_new")).toBe(true);
    expect(shouldRefreshConversationAfterStream("conv_current", null)).toBe(false);
    expect(shouldRefreshConversationAfterStream("conv_current", "conv_current")).toBe(false);
    expect(shouldRefreshConversationAfterStream("conv_current", "conv_other")).toBe(true);
  });
});