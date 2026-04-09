import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PresentedMessage } from "@/adapters/ChatPresenter";
import * as useChatScrollModule from "@/hooks/useChatScroll";

import { ChatMessageViewport } from "./ChatMessageViewport";

const messageListSpy = vi.fn();

vi.mock("@/hooks/useChatScroll", () => ({
  useChatScroll: vi.fn(() => ({
    scrollRef: { current: null },
    isAtBottom: true,
    scrollToBottom: vi.fn(),
    handleScroll: vi.fn(),
    resetPin: vi.fn(),
  })),
}));

vi.mock("@/hooks/useMessageScrollBoundaryLock", () => ({
  useMessageScrollBoundaryLock: vi.fn(),
}));

vi.mock("./MessageList", () => ({
  MessageList: (props: unknown) => {
    messageListSpy(props);
    return <div data-testid="message-list" />;
  },
}));

function makeMessage(overrides: Partial<PresentedMessage>): PresentedMessage {
  return {
    id: overrides.id ?? "msg-1",
    role: overrides.role ?? "assistant",
    rawContent: overrides.rawContent ?? "",
    content: overrides.content ?? { blocks: [] },
    commands: overrides.commands ?? [],
    suggestions: overrides.suggestions ?? [],
    actions: overrides.actions ?? [],
    attachments: overrides.attachments ?? [],
    failedSend: overrides.failedSend,
    generationStatus: overrides.generationStatus,
    timestamp: overrides.timestamp ?? "12:00",
  };
}

describe("ChatMessageViewport", () => {
  beforeEach(() => {
    messageListSpy.mockClear();
  });

  it("renders the transcript stack even when messages contain job-status blocks", () => {
    const messages = [
      makeMessage({
        id: "msg-latest",
        content: {
          blocks: [
            {
              type: "job-status",
              jobId: "job_running",
              label: "Produce Blog Article",
              toolName: "produce_blog_article",
              title: "AI Governance Playbook",
              status: "running",
              subtitle: "Queued from the default worker runtime",
              progressPercent: 42,
              progressLabel: "Reviewing article",
            },
          ],
        },
      }),
    ];

    render(
      <ChatMessageViewport
        dynamicSuggestions={[]}
        isEmbedded={true}
        isHeroState={false}
        isFullScreen={false}
        isLoadingMessages={false}
        isSending={false}
        messages={messages}
        onLinkClick={vi.fn()}
        onActionClick={vi.fn()}
        onSuggestionClick={vi.fn()}
        scrollDependency={1}
        searchQuery=""
      />,
    );

    expect(screen.getByTestId("message-list")).toBeInTheDocument();
    expect(screen.queryByLabelText("Active work")).not.toBeInTheDocument();
    expect(screen.queryByText("Running now")).not.toBeInTheDocument();
    expect(screen.queryByText("Queued next")).not.toBeInTheDocument();
  });

  it("shows the scroll-to-bottom control when the viewport is not at the latest message", () => {
    const messages: PresentedMessage[] = [];
    const scrollToBottom = vi.fn();
    vi.mocked(useChatScrollModule.useChatScroll).mockReturnValue({
      scrollRef: { current: null },
      isAtBottom: false,
      scrollToBottom,
      handleScroll: vi.fn(),
      resetPin: vi.fn(),
    });

    render(
      <ChatMessageViewport
        dynamicSuggestions={[]}
        isEmbedded={true}
        isHeroState={false}
        isFullScreen={false}
        isLoadingMessages={false}
        isSending={false}
        messages={messages}
        onLinkClick={vi.fn()}
        onActionClick={vi.fn()}
        onSuggestionClick={vi.fn()}
        scrollDependency={1}
        searchQuery=""
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Scroll to bottom" }));
    expect(scrollToBottom).toHaveBeenCalledTimes(1);
  });

  it("forwards retry handling to the transcript list", () => {
    const onRetryClick = vi.fn();

    render(
      <ChatMessageViewport
        dynamicSuggestions={[]}
        isEmbedded={true}
        isHeroState={false}
        isFullScreen={false}
        isLoadingMessages={false}
        isSending={false}
        messages={[makeMessage({ id: "assistant-1", role: "assistant", rawContent: "Partial answer" })]}
        onLinkClick={vi.fn()}
        onActionClick={vi.fn()}
        onRetryClick={onRetryClick}
        onSuggestionClick={vi.fn()}
        scrollDependency={1}
        searchQuery=""
      />,
    );

    expect(messageListSpy).toHaveBeenCalledWith(
      expect.objectContaining({ onRetryClick }),
    );
  });
});