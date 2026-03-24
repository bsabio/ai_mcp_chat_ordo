import { describe, expect, it } from "vitest";

import type { ChatMessage } from "@/core/entities/chat-message";
import { chatReducer } from "@/hooks/chat/chatState";

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: overrides.id ?? "msg_1",
    role: overrides.role ?? "assistant",
    content: overrides.content ?? "Hello",
    timestamp: overrides.timestamp ?? new Date("2026-03-23T12:00:00.000Z"),
    parts: overrides.parts ?? [{ type: "text", text: overrides.content ?? "Hello" }],
  };
}

describe("chatReducer", () => {
  it("appends text to the trailing text part when present", () => {
    const state = [makeMessage({ content: "Hel", parts: [{ type: "text", text: "Hel" }] })];

    const next = chatReducer(state, { type: "APPEND_TEXT", index: 0, delta: "lo" });

    expect(next[0]?.content).toBe("Hello");
    expect(next[0]?.parts).toEqual([{ type: "text", text: "Hello" }]);
  });

  it("starts a new text part when the trailing part is not text", () => {
    const state = [makeMessage({
      content: "Tool done",
      parts: [{ type: "tool_result", name: "search", result: { ok: true } }],
    })];

    const next = chatReducer(state, { type: "APPEND_TEXT", index: 0, delta: " Next" });

    expect(next[0]?.parts).toEqual([
      { type: "tool_result", name: "search", result: { ok: true } },
      { type: "text", text: " Next" },
    ]);
  });

  it("appends tool call parts without changing content", () => {
    const state = [makeMessage()];

    const next = chatReducer(state, {
      type: "APPEND_TOOL_CALL",
      index: 0,
      name: "search",
      args: { query: "workflow" },
    });

    expect(next[0]?.content).toBe("Hello");
    expect(next[0]?.parts?.[1]).toEqual({ type: "tool_call", name: "search", args: { query: "workflow" } });
  });

  it("appends tool result parts without changing content", () => {
    const state = [makeMessage()];

    const next = chatReducer(state, {
      type: "APPEND_TOOL_RESULT",
      index: 0,
      name: "search",
      result: { items: 3 },
    });

    expect(next[0]?.content).toBe("Hello");
    expect(next[0]?.parts?.[1]).toEqual({ type: "tool_result", name: "search", result: { items: 3 } });
  });

  it("replaces the active assistant tail with an error message", () => {
    const state = [
      makeMessage({ id: "user_1", role: "user", content: "Question" }),
      makeMessage({ id: "assistant_1", role: "assistant", content: "Partial" }),
    ];

    const next = chatReducer(state, { type: "SET_ERROR", index: 1, error: "Stream failed" });

    expect(next).toHaveLength(2);
    expect(next[1]?.role).toBe("assistant");
    expect(next[1]?.content).toBe("Stream failed");
  });
});