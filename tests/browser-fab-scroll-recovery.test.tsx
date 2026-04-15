import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChatMessageViewport } from "@/frameworks/ui/ChatMessageViewport";

const scrollToBottomMock = vi.fn();

vi.mock("@/hooks/useChatScroll", () => ({
  useChatScroll: () => ({
    scrollRef: { current: null },
    isAtBottom: false,
    scrollToBottom: scrollToBottomMock,
    handleScroll: vi.fn(),
    resetPin: vi.fn(),
  }),
}));

vi.mock("@/hooks/useMessageScrollBoundaryLock", () => ({
  useMessageScrollBoundaryLock: vi.fn(),
}));

describe("browser FAB scroll recovery", () => {
  it("keeps follow-up chips available below the fold and recovers the viewport through the scroll CTA", () => {
    scrollToBottomMock.mockReset();

    render(
      <ChatMessageViewport
        dynamicSuggestions={[
          "Audit a design handoff workflow",
          "Audit an engineering deployment process",
          "Audit a user onboarding flow",
        ]}
        isEmbedded={false}
        isHeroState={false}
        isFullScreen={false}
        isLoadingMessages={false}
        isSending={false}
        messages={[
          {
            id: "user-1",
            role: "user",
            rawContent: "Audit this workflow",
            content: {
              blocks: [{ type: "paragraph", content: [{ type: "text", text: "Audit this workflow" }] }],
            },
            commands: [],
            suggestions: [],
            actions: [],
            attachments: [],
            status: "confirmed",
            timestamp: "12:00",
            toolRenderEntries: [],
          },
          {
            id: "assistant-1",
            role: "assistant",
            rawContent: "One quick clarifying question before I dig in: what kind of workflow are you auditing?",
            content: {
              blocks: [{ type: "paragraph", content: [{ type: "text", text: "One quick clarifying question before I dig in: what kind of workflow are you auditing?" }] }],
            },
            commands: [],
            suggestions: [
              "Audit a design handoff workflow",
              "Audit an engineering deployment process",
              "Audit a user onboarding flow",
            ],
            actions: [],
            attachments: [],
            status: "confirmed",
            timestamp: "12:01",
            toolRenderEntries: [],
          },
        ]}
        onLinkClick={vi.fn()}
        onSuggestionClick={vi.fn()}
        scrollDependency={1}
        searchQuery=""
      />,
    );

    expect(screen.getByRole("button", { name: "Audit a user onboarding flow" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scroll to bottom" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Scroll to bottom" }));

    expect(scrollToBottomMock).toHaveBeenCalledTimes(1);
  });
});