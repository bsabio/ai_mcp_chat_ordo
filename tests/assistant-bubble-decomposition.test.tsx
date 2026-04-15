import fs from "node:fs";
import path from "node:path";

import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MessageList } from "@/frameworks/ui/MessageList";
import type { PresentedMessage } from "@/adapters/ChatPresenter";

vi.mock("@/components/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function makeMessage(overrides: Partial<PresentedMessage>): PresentedMessage {
  return {
    id: overrides.id ?? "assistant-1",
    role: overrides.role ?? "assistant",
    rawContent: overrides.rawContent ?? "Welcome back.",
    content: overrides.content ?? {
      blocks: [
        {
          type: "paragraph",
          content: [{ type: "text", text: overrides.rawContent ?? "Welcome back." }],
        },
      ],
    },
    commands: overrides.commands ?? [],
    suggestions: overrides.suggestions ?? [],
    actions: overrides.actions ?? [],
    attachments: overrides.attachments ?? [],
    failedSend: overrides.failedSend,
    generationStatus: overrides.generationStatus,
    status: overrides.status ?? "confirmed",
    timestamp: overrides.timestamp ?? "12:00",
    toolRenderEntries: overrides.toolRenderEntries ?? [],
  };
}

describe("Assistant bubble decomposition", () => {
  it("defines AssistantBubbleContent and AssistantBubbleFooter in MessageList", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/frameworks/ui/MessageList.tsx"),
      "utf-8",
    );

    expect(source).toContain("const AssistantBubbleContent");
    expect(source).toContain("const AssistantBubbleFooter");
  });

  it("uses requestAnimationFrame for the initial greeting typewriter", () => {
    const requestAnimationFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation(() => 1);
    const cancelAnimationFrameSpy = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => undefined);

    const { unmount } = render(
      <MessageList
        messages={[makeMessage({ rawContent: "Hello builder." })]}
        isSending={false}
        dynamicSuggestions={[]}
        isHeroState={false}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery=""
        isEmbedded
      />,
    );

    expect(requestAnimationFrameSpy).toHaveBeenCalled();

    unmount();

    expect(cancelAnimationFrameSpy).toHaveBeenCalled();
  });
});
