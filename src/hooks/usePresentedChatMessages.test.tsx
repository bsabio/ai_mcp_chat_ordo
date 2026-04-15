import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { usePresentedChatMessages } from "@/hooks/usePresentedChatMessages";
import type { ChatMessage } from "@/core/entities/chat-message";

function Harness({ messages }: { messages: ChatMessage[] }) {
  const { presentedMessages, dynamicSuggestions, scrollDependency } =
    usePresentedChatMessages(messages);

  return (
    <div>
      <div data-testid="message-count">{presentedMessages.length}</div>
      <div data-testid="suggestion-count">{dynamicSuggestions.length}</div>
      <div data-testid="last-response-state">{presentedMessages[0]?.responseState ?? "none"}</div>
      <div data-testid="scroll-dependency">{scrollDependency}</div>
    </div>
  );
}

describe("usePresentedChatMessages", () => {
  it("derives rendered messages, suggestions, and scroll dependency together", () => {
    const messages: ChatMessage[] = [
      {
        id: "assistant-1",
        role: "assistant",
        content: 'Plan the rollout.\n\n__suggestions__:["Review risks","Define milestones"]',
        timestamp: new Date("2026-03-15T12:00:00.000Z"),
        parts: [],
      },
    ];

    render(<Harness messages={messages} />);

    expect(screen.getByTestId("message-count")).toHaveTextContent("1");
    expect(screen.getByTestId("suggestion-count")).toHaveTextContent("2");
    expect(screen.getByTestId("last-response-state")).toHaveTextContent("open");
    // scrollDependency is now a monotonic counter — first render produces 1
    expect(screen.getByTestId("scroll-dependency")).toHaveTextContent("1");
  });

  it("suppresses dynamic suggestions for closed assistant answers", () => {
    const messages: ChatMessage[] = [
      {
        id: "assistant-2",
        role: "assistant",
        content: 'Done.\n\n__response_state__:"closed"\n\n__suggestions__:["Should stay hidden"]',
        timestamp: new Date("2026-03-15T12:05:00.000Z"),
        parts: [],
      },
    ];

    render(<Harness messages={messages} />);

    expect(screen.getByTestId("suggestion-count")).toHaveTextContent("0");
    expect(screen.getByTestId("last-response-state")).toHaveTextContent("closed");
  });
});