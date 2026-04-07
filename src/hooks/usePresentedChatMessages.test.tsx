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
    // scrollDependency is now a monotonic counter — first render produces 1
    expect(screen.getByTestId("scroll-dependency")).toHaveTextContent("1");
  });
});