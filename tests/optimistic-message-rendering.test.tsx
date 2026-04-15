import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { usePresentedChatMessages } from "@/hooks/usePresentedChatMessages";
import type { ChatMessage } from "@/core/entities/chat-message";

function Harness({
  messages,
  isSending = false,
}: {
  messages: ChatMessage[];
  isSending?: boolean;
}) {
  const { presentedMessages } = usePresentedChatMessages(messages, isSending);

  return (
    <div>
      {presentedMessages.map((msg) => (
        <div
          key={msg.id}
          data-testid={`msg-${msg.id}`}
          data-role={msg.role}
          data-status={msg.status}
        >
          {msg.rawContent}
        </div>
      ))}
    </div>
  );
}

function makeUserMessage(id: string, content: string): ChatMessage {
  return {
    id,
    role: "user",
    content,
    timestamp: new Date("2026-03-18T10:00:00.000Z"),
    parts: [{ type: "text" as const, text: content }],
  };
}

function makeAssistantMessage(
  id: string,
  content: string,
  failedSend?: { retryKey: string; failedUserMessageId: string },
): ChatMessage {
  return {
    id,
    role: "assistant",
    content,
    timestamp: new Date("2026-03-18T10:00:01.000Z"),
    parts: [{ type: "text" as const, text: content }],
    metadata: failedSend ? { failedSend } : undefined,
  };
}

describe("Optimistic message rendering", () => {
  it("CCH-T400: pending message appears immediately with pending status", () => {
    const messages: ChatMessage[] = [
      makeUserMessage("user-1", "Hello"),
      makeAssistantMessage("assistant-1", ""),
    ];

    render(<Harness messages={messages} isSending={true} />);

    const userMsg = screen.getByTestId("msg-user-1");
    expect(userMsg).toHaveAttribute("data-status", "pending");
    expect(userMsg).toHaveTextContent("Hello");
  });

  it("CCH-T401: server success replaces pending with confirmed", () => {
    const sendingMessages: ChatMessage[] = [
      makeUserMessage("user-1", "Hello"),
      makeAssistantMessage("assistant-1", ""),
    ];

    const { rerender } = render(
      <Harness messages={sendingMessages} isSending={true} />,
    );

    expect(screen.getByTestId("msg-user-1")).toHaveAttribute("data-status", "pending");

    const confirmedMessages: ChatMessage[] = [
      makeUserMessage("user-1", "Hello"),
      makeAssistantMessage("assistant-1", "Hi there!"),
    ];

    rerender(<Harness messages={confirmedMessages} isSending={false} />);

    expect(screen.getByTestId("msg-user-1")).toHaveAttribute("data-status", "confirmed");
  });

  it("CCH-T405: server failure transitions to failed status", () => {
    const messages: ChatMessage[] = [
      makeUserMessage("user-1", "Hello"),
      makeAssistantMessage("assistant-1", "Rate limited", {
        retryKey: "user-1",
        failedUserMessageId: "user-1",
      }),
    ];

    render(<Harness messages={messages} isSending={false} />);

    expect(screen.getByTestId("msg-user-1")).toHaveAttribute("data-status", "failed");
  });

  it("CCH-T406: unmounting while pending causes no error", () => {
    const messages: ChatMessage[] = [
      makeUserMessage("user-1", "Hello"),
      makeAssistantMessage("assistant-1", ""),
    ];

    const { unmount } = render(
      <Harness messages={messages} isSending={true} />,
    );

    expect(() => unmount()).not.toThrow();
  });

  it("CCH-T410: multiple rapid sends produce ordered pending messages", () => {
    const messages: ChatMessage[] = [
      makeUserMessage("user-1", "First"),
      makeAssistantMessage("assistant-1", "Reply to first"),
      makeUserMessage("user-2", "Second"),
      makeAssistantMessage("assistant-2", "Reply to second"),
      makeUserMessage("user-3", "Third"),
      makeAssistantMessage("assistant-3", ""),
    ];

    render(<Harness messages={messages} isSending={true} />);

    // Earlier messages are confirmed, only the last user message is pending
    expect(screen.getByTestId("msg-user-1")).toHaveAttribute("data-status", "confirmed");
    expect(screen.getByTestId("msg-user-2")).toHaveAttribute("data-status", "confirmed");
    expect(screen.getByTestId("msg-user-3")).toHaveAttribute("data-status", "pending");
  });

  it("CCH-T411: messages maintain chronological order regardless of resolution", () => {
    const messages: ChatMessage[] = [
      makeUserMessage("user-1", "First"),
      makeAssistantMessage("assistant-1", "Reply first"),
      makeUserMessage("user-2", "Second"),
      makeAssistantMessage("assistant-2", "Reply second"),
      makeUserMessage("user-3", "Third"),
      makeAssistantMessage("assistant-3", "Reply third"),
    ];

    const { container } = render(
      <Harness messages={messages} isSending={false} />,
    );

    const userMsgs = container.querySelectorAll('[data-role="user"]');
    expect(userMsgs).toHaveLength(3);
    expect(userMsgs[0]).toHaveTextContent("First");
    expect(userMsgs[1]).toHaveTextContent("Second");
    expect(userMsgs[2]).toHaveTextContent("Third");
  });

  it("CCH-T412: pending message with file attachments renders", () => {
    const userMsg = makeUserMessage("user-1", "Here are my docs");
    userMsg.parts = [
      { type: "text" as const, text: "Here are my docs" },
      {
        type: "attachment" as const,
        mimeType: "application/pdf",
        fileName: "report.pdf",
        fileSize: 1024,
        assetId: "asset-1",
      },
    ];

    const messages: ChatMessage[] = [
      userMsg,
      makeAssistantMessage("assistant-1", ""),
    ];

    render(<Harness messages={messages} isSending={true} />);

    const msg = screen.getByTestId("msg-user-1");
    expect(msg).toHaveAttribute("data-status", "pending");
    expect(msg).toHaveTextContent("Here are my docs");
  });

  it("confirmed messages default to confirmed status", () => {
    const messages: ChatMessage[] = [
      makeUserMessage("user-1", "Hello"),
      makeAssistantMessage("assistant-1", "Hi there!"),
    ];

    render(<Harness messages={messages} isSending={false} />);

    expect(screen.getByTestId("msg-user-1")).toHaveAttribute("data-status", "confirmed");
    expect(screen.getByTestId("msg-assistant-1")).toHaveAttribute("data-status", "confirmed");
  });
});
