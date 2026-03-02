import { describe, expect, it } from "vitest";
import { getLatestUserMessage, parseIncomingMessages } from "@/lib/chat/validation";

describe("chat validation", () => {
  it("throws for empty message array", () => {
    expect(() => parseIncomingMessages({ messages: [] })).toThrow("messages must be a non-empty array.");
  });

  it("returns parsed messages when valid", () => {
    const messages = parseIncomingMessages({ messages: [{ role: "user", content: "hello" }] });
    expect(messages).toHaveLength(1);
  });

  it("throws when user message is missing", () => {
    expect(() => getLatestUserMessage([{ role: "assistant", content: "ready" }])).toThrow(
      "No user message found.",
    );
  });

  it("returns latest user message", () => {
    const value = getLatestUserMessage([
      { role: "user", content: "first" },
      { role: "assistant", content: "ok" },
      { role: "user", content: "second" },
    ]);

    expect(value).toBe("second");
  });
});
