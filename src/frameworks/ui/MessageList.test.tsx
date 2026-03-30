import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PresentedMessage } from "@/adapters/ChatPresenter";
import { MessageList } from "@/frameworks/ui/MessageList";

vi.mock("@/components/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function makeMessage(overrides: Partial<PresentedMessage>): PresentedMessage {
  return {
    id: overrides.id ?? "msg-1",
    role: overrides.role ?? "assistant",
    rawContent: overrides.rawContent ?? "",
    content: overrides.content ?? {
      blocks: [
        {
          type: "paragraph",
          content: [{ type: "text", text: overrides.rawContent ?? "" }],
        },
      ],
    },
    commands: overrides.commands ?? [],
    suggestions: overrides.suggestions ?? [],
    actions: overrides.actions ?? [],
    attachments: overrides.attachments ?? [],
    failedSend: overrides.failedSend,
    timestamp: overrides.timestamp ?? "12:00",
  };
}

describe("MessageList", () => {
  it("does not render latest assistant chips when filtering hides the true latest message", () => {
    const messages = [
      makeMessage({ id: "assistant-1", role: "assistant", rawContent: "Alpha strategy" }),
      makeMessage({ id: "user-1", role: "user", rawContent: "Tell me more" }),
      makeMessage({ id: "assistant-2", role: "assistant", rawContent: "Beta delivery plan" }),
    ];

    render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={["Explore next sprint"]}
        isHeroState={false}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery="alpha"
        isEmbedded
      />,
    );

    expect(screen.queryByRole("button", { name: "Explore next sprint" })).not.toBeInTheDocument();
  });

  it("matches search queries against rendered message text", () => {
    const messages = [
      makeMessage({ id: "assistant-1", role: "assistant", rawContent: "Architecture guidance" }),
      makeMessage({ id: "assistant-2", role: "assistant", rawContent: "Delivery planning" }),
    ];

    render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={[]}
        isHeroState={false}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery="delivery"
        isEmbedded
      />,
    );

    expect(screen.getByText("Delivery planning")).toBeInTheDocument();
    expect(screen.queryByText("Architecture guidance")).not.toBeInTheDocument();
  });

  it("matches search queries against action link labels", () => {
    const messages = [
      makeMessage({
        id: "assistant-1",
        role: "assistant",
        rawContent: "Talk to Morgan Lee about it.",
        content: {
          blocks: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Talk to " },
                { type: "action-link", label: "Morgan Lee", actionType: "conversation", value: "conv_001" },
                { type: "text", text: " about it." },
              ],
            },
          ],
        },
      }),
      makeMessage({ id: "assistant-2", role: "assistant", rawContent: "Unrelated message" }),
    ];

    render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={[]}
        isHeroState={false}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery="morgan"
        isEmbedded
      />,
    );

    expect(screen.getByText(/Morgan Lee/)).toBeInTheDocument();
    expect(screen.queryByText("Unrelated message")).not.toBeInTheDocument();
  });

  it("matches search queries against operator brief sections", () => {
    const messages = [
      makeMessage({
        id: "assistant-1",
        role: "assistant",
        rawContent: "NOW\nProtect customer outcome.",
        content: {
          blocks: [
            {
              type: "operator-brief",
              sections: [
                {
                  label: "NOW",
                  summary: [{ type: "text", text: "Protect customer outcome." }],
                },
                {
                  label: "NEXT",
                  summary: [{ type: "text", text: "Review the queue." }],
                },
                {
                  label: "WAIT",
                  summary: [{ type: "text", text: "Defer cleanup." }],
                },
              ],
            },
          ],
        },
      }),
    ];

    render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={[]}
        isHeroState={false}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery="customer outcome"
        isEmbedded
      />,
    );

    expect(screen.getByText("Protect customer outcome.")).toBeInTheDocument();
    expect(screen.getByText("Defer cleanup.")).toBeInTheDocument();
  });

  it("adds an embedded fold gutter so the latest message and chips rest above the fold", () => {
    const messages = [
      makeMessage({ id: "assistant-1", role: "assistant", rawContent: "Ready with next steps", suggestions: ["Explore next sprint"] }),
    ];

    render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={["Explore next sprint"]}
        isHeroState
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery=""
        isEmbedded
      />,
    );

      const list = screen.getByText("Bring me the workflow.").closest("[data-message-list-mode]");
    expect(list).toHaveAttribute("data-chat-fold-buffer", "true");
    expect(list).toHaveAttribute("data-message-list-state", "hero");
    expect(list?.className).toContain("ui-chat-message-stack");
    expect(list).toHaveAttribute("data-chat-suggestion-tail", "absent");
  });

  it("hides the seeded assistant bubble on the first-screen hero state", () => {
    const messages = [
      makeMessage({ id: "assistant-1", role: "assistant", rawContent: "Describe the workflow problem, orchestration gap, or training goal.", suggestions: ["Fix a bottleneck"] }),
    ];

    render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={["Fix a bottleneck"]}
        isHeroState
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery=""
        isEmbedded
      />,
    );

    expect(screen.queryByText("Describe the workflow problem, orchestration gap, or training goal.")).not.toBeInTheDocument();
    expect(screen.getByText("Bring me the workflow.")).toBeInTheDocument();
  });

  it("falls back to conversation state when the single message is not the seeded hero", () => {
    const messages = [
      makeMessage({ id: "assistant-1", role: "assistant", rawContent: "Ready with next steps" }),
    ];

    render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={[]}
        isHeroState={false}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery=""
        isEmbedded
      />,
    );

    const list = screen.getByText("Ready with next steps").closest("[data-message-list-mode]");
    expect(list).toHaveAttribute("data-message-list-state", "conversation");
    expect(list).toHaveAttribute("data-chat-suggestion-tail", "absent");
    expect(list?.className).toContain("ui-chat-message-stack");
  });

  it("centers the initial suggestion chips as part of the hero stack", () => {
    const messages = [
      makeMessage({ id: "assistant-1", role: "assistant", rawContent: "Ready with next steps", suggestions: ["Stress-test this AI plan"] }),
    ];

    render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={["Stress-test this AI plan"]}
        isHeroState
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery=""
        isEmbedded
      />,
    );

    expect(screen.getByRole("button", { name: "Stress-test this AI plan" }).closest("div")?.className).toContain("justify-center");
  });

  it("applies semantic chat surface classes to assistant and user bubbles", () => {
    const messages = [
      makeMessage({ id: "assistant-1", role: "assistant", rawContent: "Assistant note" }),
      makeMessage({ id: "user-1", role: "user", rawContent: "User reply" }),
    ];

    const { container } = render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={[]}
        isHeroState={false}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery=""
        isEmbedded
      />,
    );

    expect(container.querySelector('[data-chat-message-role="assistant"] [data-chat-bubble-surface="true"]')?.className).toContain("ui-chat-message-assistant");
    expect(container.querySelector('[data-chat-message-role="user"] [data-chat-bubble-surface="true"]')?.className).toContain("ui-chat-message-user");
  });

  it("disables suggestion chips while a send is in flight", () => {
    const messages = [
      makeMessage({ id: "assistant-1", role: "assistant", rawContent: "Ready with next steps", suggestions: ["Stress-test this AI plan"] }),
    ];

    render(
      <MessageList
        messages={messages}
        isSending
        dynamicSuggestions={["Stress-test this AI plan"]}
        isHeroState
        isSuggestionDisabled
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery=""
        isEmbedded
      />,
    );

    expect(screen.getByRole("button", { name: "Stress-test this AI plan" })).toBeDisabled();
  });

  it("renders follow-up suggestions in the secondary chip group after the conversation starts", () => {
    const messages = [
      makeMessage({ id: "user-1", role: "user", rawContent: "Audit this workflow" }),
      makeMessage({ id: "assistant-1", role: "assistant", rawContent: "Pick the audit path." }),
    ];

    const { container } = render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={["Audit a user onboarding flow"]}
        isHeroState={false}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery=""
        isEmbedded
      />,
    );

    expect(container.querySelector('[data-chat-suggestion-group="followup"]')).not.toBeNull();
    expect(container.querySelector('[data-chat-suggestion-priority="promoted"]')).not.toBeNull();
    expect(container.querySelector('[data-chat-suggestion-rank="primary"]')).not.toBeNull();
    expect(screen.getByRole("button", { name: "Audit a user onboarding flow" })).toBeInTheDocument();
  });

  it("marks the latest assistant message as the floating conversation anchor while keeping the user reply supporting", () => {
    const messages = [
      makeMessage({ id: "user-1", role: "user", rawContent: "Audit this workflow" }),
      makeMessage({ id: "assistant-1", role: "assistant", rawContent: "Pick the audit path." }),
    ];

    const { container } = render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={[]}
        isHeroState={false}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery=""
        isEmbedded={false}
      />,
    );

    expect(container.querySelector('[data-chat-message-role="assistant"][data-chat-message-emphasis="anchor"]')).not.toBeNull();
    expect(container.querySelector('[data-chat-message-role="user"][data-chat-message-emphasis="supporting"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-chat-bubble-surface="true"]')).toHaveLength(2);
  });

  it("marks hero suggestions as balanced and neutral rather than promoted", () => {
    const messages = [
      makeMessage({ id: "assistant-1", role: "assistant", rawContent: "Ready with next steps", suggestions: ["Stress-test this AI plan", "Audit this workflow"] }),
    ];

    const { container } = render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={["Stress-test this AI plan", "Audit this workflow"]}
        isHeroState
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery=""
        isEmbedded
      />,
    );

    expect(container.querySelector('[data-chat-suggestion-group="hero"]')).not.toBeNull();
    expect(container.querySelector('[data-chat-suggestion-priority="balanced"]')).not.toBeNull();
    expect(container.querySelector('[data-chat-suggestion-rank="neutral"]')).not.toBeNull();
  });

  it("renders the migrated homepage service chips and path cards inside hero state", () => {
    const messages = [
      makeMessage({ id: "assistant-1", role: "assistant", rawContent: "Ready with next steps", suggestions: ["Stress-test this AI plan"] }),
    ];

    render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={["Stress-test this AI plan"]}
        isHeroState
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery=""
        isEmbedded
      />,
    );

      expect(screen.getAllByText("Studio Ordo")).toHaveLength(1);
    expect(screen.getByText("Strategic AI Advisory")).toBeInTheDocument();
    expect(screen.getByText("Orchestration Training")).toBeInTheDocument();
    expect(screen.getByText("Bring me the workflow.")).toBeInTheDocument();
      expect(screen.getByText(/Paste a workflow, AI plan, or team handoff/i)).toBeInTheDocument();
      expect(screen.queryByText("Try asking")).not.toBeInTheDocument();
  });

  it("does not render the homepage intro when hero state is inactive", () => {
    const messages = [
      makeMessage({ id: "user-1", role: "user", rawContent: "Show the queue" }),
      makeMessage({ id: "assistant-1", role: "assistant", rawContent: "Ready with next steps" }),
    ];

    render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={[]}
        isHeroState={false}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery=""
        isEmbedded
      />,
    );

    expect(screen.queryByText("Strategic AI Advisory")).not.toBeInTheDocument();
    expect(screen.queryByText("Teams")).not.toBeInTheDocument();
  });

  it("renders MessageActionChips when an assistant message has actions", () => {
    const onActionClick = vi.fn();
    const messages = [
      makeMessage({
        id: "assistant-1",
        role: "assistant",
        rawContent: "Here are your next steps.",
        actions: [
          { label: "Open thread", action: "conversation", params: { id: "conv_001" } },
          { label: "View library", action: "route", params: { path: "/library" } },
        ],
      }),
    ];

    const { container } = render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={[]}
        isHeroState={false}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        onActionClick={onActionClick}
        searchQuery=""
        isEmbedded
      />,
    );

    expect(container.querySelector('[data-chat-action-chips="true"]')).not.toBeNull();
    expect(screen.getByRole("group", { name: "Message actions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open thread" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View library" })).toBeInTheDocument();
    expect(container.querySelector('[data-chat-action-chip="conversation"]')).not.toBeNull();
    expect(container.querySelector('[data-chat-action-chip="route"]')).not.toBeNull();
  });

  it("does not render action chip region when message has no actions", () => {
    const messages = [
      makeMessage({
        id: "assistant-1",
        role: "assistant",
        rawContent: "Just a regular message.",
        actions: [],
      }),
    ];

    const { container } = render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={[]}
        isHeroState={false}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery=""
        isEmbedded
      />,
    );

    expect(container.querySelector('[data-chat-action-chips="true"]')).toBeNull();
  });

  it("dispatches onActionClick with correct arguments when an action chip is clicked", () => {
    const onActionClick = vi.fn();
    const messages = [
      makeMessage({
        id: "assistant-1",
        role: "assistant",
        rawContent: "Next steps.",
        actions: [
          { label: "Send offer", action: "send", params: { text: "Draft advisory offer" } },
        ],
      }),
    ];

    render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={[]}
        isHeroState={false}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        onActionClick={onActionClick}
        searchQuery=""
        isEmbedded
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Send offer" }));
    expect(onActionClick).toHaveBeenCalledWith("send", "Draft advisory offer", { text: "Draft advisory offer" });
  });

  it("disables action chips during streaming", () => {
    const messages = [
      makeMessage({
        id: "assistant-1",
        role: "assistant",
        rawContent: "Thinking...",
        actions: [
          { label: "Open thread", action: "conversation", params: { id: "conv_001" } },
        ],
      }),
    ];

    render(
      <MessageList
        messages={messages}
        isSending
        dynamicSuggestions={[]}
        isHeroState={false}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery=""
        isEmbedded
      />,
    );

    expect(screen.getByRole("button", { name: "Open thread" })).toBeDisabled();
  });

  it("limits action chips to 3 when message has more", () => {
    const messages = [
      makeMessage({
        id: "assistant-1",
        role: "assistant",
        rawContent: "Many actions.",
        actions: [
          { label: "Action 1", action: "route", params: { path: "/a" } },
          { label: "Action 2", action: "route", params: { path: "/b" } },
          { label: "Action 3", action: "route", params: { path: "/c" } },
          { label: "Action 4", action: "route", params: { path: "/d" } },
          { label: "Action 5", action: "route", params: { path: "/e" } },
        ],
      }),
    ];

    const { container } = render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={[]}
        isHeroState={false}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery=""
        isEmbedded
      />,
    );

    const chips = container.querySelectorAll("[data-chat-action-chip]");
    expect(chips).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Action 4" })).not.toBeInTheDocument();
  });

  it("renders a retry button for failed assistant messages", () => {
    const onRetryClick = vi.fn();
    const messages = [
      makeMessage({ id: "user-1", role: "user", rawContent: "Audit this workflow" }),
      makeMessage({
        id: "assistant-failure",
        role: "assistant",
        rawContent: "Provider unavailable",
        failedSend: {
          retryKey: "user-1",
          failedUserMessageId: "user-1",
        },
      }),
    ];

    render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={[]}
        isHeroState={false}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        onRetryClick={onRetryClick}
        searchQuery=""
        isEmbedded
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetryClick).toHaveBeenCalledWith("user-1");
  });
});