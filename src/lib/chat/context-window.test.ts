import { describe, it, expect } from "vitest";
import { buildContextWindow, normalizeAlternation } from "./context-window";
import type { Message } from "@/core/entities/conversation";

function makeMessage(overrides: Partial<Message> = {}, index = 0): Message {
  return {
    id: `msg_${index}`,
    conversationId: "conv_1",
    role: "user",
    content: `Message ${index}`,
    parts: [{ type: "text", text: `Message ${index}` }],
    createdAt: new Date(2024, 0, 1, 0, index).toISOString(),
    tokenEstimate: 4,
    ...overrides,
  };
}

describe("buildContextWindow", () => {
  it("returns all non-system messages when no summary exists", () => {
    const messages = [
      makeMessage({ role: "user", content: "Hello" }, 0),
      makeMessage({ role: "assistant", content: "Hi" }, 1),
      makeMessage({ role: "user", content: "Question" }, 2),
    ];

    const { contextMessages, hasSummary, summaryText } = buildContextWindow(messages);
    expect(hasSummary).toBe(false);
    expect(summaryText).toBeNull();
    expect(contextMessages).toHaveLength(3);
    expect(contextMessages[0].content).toBe("Hello");
    expect(contextMessages[2].content).toBe("Question");
  });

  it("returns summary text separately and only post-summary messages", () => {
    const messages = [
      makeMessage({ role: "user", content: "Old msg 1" }, 0),
      makeMessage({ role: "assistant", content: "Old reply 1" }, 1),
      makeMessage(
        {
          role: "system",
          content: "Summary of discussion",
          parts: [{ type: "summary", text: "Summary of discussion", coversUpToMessageId: "msg_1" }],
        },
        2,
      ),
      makeMessage({ role: "user", content: "New msg" }, 3),
      makeMessage({ role: "assistant", content: "New reply" }, 4),
    ];

    const { contextMessages, hasSummary, summaryText } = buildContextWindow(messages);
    expect(hasSummary).toBe(true);
    expect(summaryText).toBe("Summary of discussion");
    expect(contextMessages).toHaveLength(2);
    expect(contextMessages[0].content).toBe("New msg");
    expect(contextMessages[1].content).toBe("New reply");
  });

  it("filters out system messages from post-summary window", () => {
    const messages = [
      makeMessage(
        {
          role: "system",
          content: "Old summary",
          parts: [{ type: "summary", text: "Old summary", coversUpToMessageId: "msg_0" }],
        },
        0,
      ),
      makeMessage({ role: "user", content: "After summary" }, 1),
      makeMessage({ role: "system", content: "Another system msg", parts: [] }, 2),
      makeMessage({ role: "assistant", content: "Reply" }, 3),
    ];

    const { contextMessages, hasSummary, summaryText } = buildContextWindow(messages);
    expect(hasSummary).toBe(true);
    expect(summaryText).toBe("Old summary");
    expect(contextMessages).toHaveLength(2);
    expect(contextMessages.every((m) => m.content !== "Another system msg")).toBe(true);
  });

  it("does not synthesize an assistant acknowledgement for summaries", () => {
    const messages = [
      makeMessage(
        {
          role: "system",
          content: "Summary of discussion",
          parts: [{ type: "summary", text: "Summary of discussion", coversUpToMessageId: "msg_0" }],
        },
        0,
      ),
      makeMessage({ role: "user", content: "Current question" }, 1),
    ];

    const { contextMessages } = buildContextWindow(messages);
    expect(
      contextMessages.some((message) =>
        message.content.includes("Understood. I have context from our earlier discussion."),
      ),
    ).toBe(false);
  });

  it("merges consecutive user messages into a single user turn", () => {
    const messages = [
      makeMessage({ role: "user", content: "msg1" }, 0),
      makeMessage({ role: "user", content: "msg2" }, 1),
      makeMessage({ role: "user", content: "msg3" }, 2),
    ];

    const { contextMessages } = buildContextWindow(messages);
    expect(contextMessages).toHaveLength(1);
    expect(contextMessages[0].role).toBe("user");
    expect(contextMessages[0].content).toContain("msg1");
    expect(contextMessages[0].content).toContain("msg2");
    expect(contextMessages[0].content).toContain("msg3");
  });

  it("merges consecutive assistant messages after a failed round", () => {
    const messages = [
      makeMessage({ role: "user", content: "Hello" }, 0),
      makeMessage({ role: "assistant", content: "reply1" }, 1),
      makeMessage({ role: "assistant", content: "reply2" }, 2),
      makeMessage({ role: "user", content: "follow up" }, 3),
    ];

    const { contextMessages } = buildContextWindow(messages);
    expect(contextMessages).toHaveLength(3);
    expect(contextMessages[0].role).toBe("user");
    expect(contextMessages[1].role).toBe("assistant");
    expect(contextMessages[1].content).toContain("reply1");
    expect(contextMessages[1].content).toContain("reply2");
    expect(contextMessages[2].role).toBe("user");
  });

  it("trims old messages when count exceeds maxContextMessages", () => {
    const messages: Message[] = [];
    for (let i = 0; i < 60; i++) {
      messages.push(
        makeMessage({ role: i % 2 === 0 ? "user" : "assistant", content: `m${i}` }, i),
      );
    }

    const { contextMessages } = buildContextWindow(messages);
    expect(contextMessages.length).toBeLessThanOrEqual(40);
    // Should still start with user
    expect(contextMessages[0].role).toBe("user");
    // Should contain the most recent messages
    expect(contextMessages[contextMessages.length - 1].content).toBe("m59");
  });

  it("trims old messages when total characters exceed maxContextCharacters", () => {
    const bigContent = "x".repeat(50_000);
    const messages = [
      makeMessage({ role: "user", content: bigContent }, 0),
      makeMessage({ role: "assistant", content: bigContent }, 1),
      makeMessage({ role: "user", content: "recent question" }, 2),
    ];

    const { contextMessages } = buildContextWindow(messages);
    // The two 50K messages exceed 80K budget, so at least the oldest should be trimmed
    expect(contextMessages.length).toBeLessThanOrEqual(2);
    expect(contextMessages[contextMessages.length - 1].content).toBe("recent question");
  });

  it("ensures window starts with a user message after trimming", () => {
    const messages: Message[] = [];
    for (let i = 0; i < 50; i++) {
      messages.push(
        makeMessage({ role: i % 2 === 0 ? "user" : "assistant", content: `m${i}` }, i),
      );
    }
    // After trimming to 40, index 10..49 → starts with assistant (m10 is user, m11 is assistant)
    // Actually 50-40=10, slice starts at idx 10 which is user (even idx). OK. Let's force it:
    // Add an extra assistant at the front to shift parity
    const shifted = [
      makeMessage({ role: "assistant", content: "stale" }, 100),
      ...messages,
    ];

    const { contextMessages } = buildContextWindow(shifted);
    expect(contextMessages[0].role).toBe("user");
  });
});

describe("normalizeAlternation", () => {
  it("returns empty array for empty input", () => {
    expect(normalizeAlternation([])).toEqual([]);
  });

  it("passes through already-alternating messages", () => {
    const msgs = [
      { role: "user" as const, content: "a" },
      { role: "assistant" as const, content: "b" },
    ];
    expect(normalizeAlternation(msgs)).toEqual(msgs);
  });

  it("merges three consecutive user messages", () => {
    const msgs = [
      { role: "user" as const, content: "a" },
      { role: "user" as const, content: "b" },
      { role: "user" as const, content: "c" },
    ];
    const result = normalizeAlternation(msgs);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("a\n\nb\n\nc");
  });

  it("merges consecutive same-role messages at various positions", () => {
    const msgs = [
      { role: "user" as const, content: "u1" },
      { role: "user" as const, content: "u2" },
      { role: "assistant" as const, content: "a1" },
      { role: "assistant" as const, content: "a2" },
      { role: "user" as const, content: "u3" },
    ];
    const result = normalizeAlternation(msgs);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ role: "user", content: "u1\n\nu2" });
    expect(result[1]).toEqual({ role: "assistant", content: "a1\n\na2" });
    expect(result[2]).toEqual({ role: "user", content: "u3" });
  });
});
