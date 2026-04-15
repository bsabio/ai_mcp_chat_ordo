import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChatInput } from "@/frameworks/ui/ChatInput";

const CHAT_PLACEHOLDER = "Ask Studio Ordo...";

describe("ChatInput", () => {
  it("submits on Enter without Shift", () => {
    const onSend = vi.fn();

    render(
      <ChatInput
        value="Draft a response"
        onChange={vi.fn()}
        onSend={onSend}
        isSending={false}
        canSend={true}
        activeTrigger={null}
        suggestions={[]}
        mentionIndex={0}
        onMentionIndexChange={vi.fn()}
        onSuggestionSelect={vi.fn()}
        pendingFiles={[]}
        onFileSelect={vi.fn()}
        onFileRemove={vi.fn()}
        onFileDrop={vi.fn()}
      />,
    );

    fireEvent.keyDown(screen.getByPlaceholderText(CHAT_PLACEHOLDER), {
      key: "Enter",
    });

    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("does not submit on Shift+Enter", () => {
    const onSend = vi.fn();

    render(
      <ChatInput
        value="Line one"
        onChange={vi.fn()}
        onSend={onSend}
        isSending={false}
        canSend={true}
        activeTrigger={null}
        suggestions={[]}
        mentionIndex={0}
        onMentionIndexChange={vi.fn()}
        onSuggestionSelect={vi.fn()}
        pendingFiles={[]}
        onFileSelect={vi.fn()}
        onFileRemove={vi.fn()}
        onFileDrop={vi.fn()}
      />,
    );

    fireEvent.keyDown(screen.getByPlaceholderText(CHAT_PLACEHOLDER), {
      key: "Enter",
      shiftKey: true,
    });

    expect(onSend).not.toHaveBeenCalled();
  });

  it("renders a textarea composer", () => {
    render(
      <ChatInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        isSending={false}
        canSend={false}
        activeTrigger={null}
        suggestions={[]}
        mentionIndex={0}
        onMentionIndexChange={vi.fn()}
        onSuggestionSelect={vi.fn()}
        pendingFiles={[]}
        onFileSelect={vi.fn()}
        onFileRemove={vi.fn()}
        onFileDrop={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText(CHAT_PLACEHOLDER).tagName).toBe("TEXTAREA");
  });

  it("exposes idle composer and send semantics when the field is empty", () => {
    const { container } = render(
      <ChatInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        isSending={false}
        canSend={false}
        activeTrigger={null}
        suggestions={[]}
        mentionIndex={0}
        onMentionIndexChange={vi.fn()}
        onSuggestionSelect={vi.fn()}
        pendingFiles={[]}
        onFileSelect={vi.fn()}
        onFileRemove={vi.fn()}
        onFileDrop={vi.fn()}
      />,
    );

    expect(container.querySelector('[data-chat-composer-form="true"]')).toHaveAttribute("data-chat-composer-state", "idle");
    expect(container.querySelector('[data-chat-composer-field="true"]')).not.toBeNull();
    expect(container.querySelector('[data-chat-send-state="idle"]')).not.toBeNull();
  });

  it("exposes ready composer and send semantics when input exists", () => {
    const { container } = render(
      <ChatInput
        value="Audit this workflow"
        onChange={vi.fn()}
        onSend={vi.fn()}
        isSending={false}
        canSend={true}
        activeTrigger={null}
        suggestions={[]}
        mentionIndex={0}
        onMentionIndexChange={vi.fn()}
        onSuggestionSelect={vi.fn()}
        pendingFiles={[]}
        onFileSelect={vi.fn()}
        onFileRemove={vi.fn()}
        onFileDrop={vi.fn()}
      />,
    );

    expect(container.querySelector('[data-chat-composer-form="true"]')).toHaveAttribute("data-chat-composer-state", "ready");
    expect(container.querySelector('[data-chat-send-state="ready"]')).not.toBeNull();
  });

  it("uses semantic composer surface classes for frame and field", () => {
    const { container } = render(
      <ChatInput
        value="Audit this workflow"
        onChange={vi.fn()}
        onSend={vi.fn()}
        isSending={false}
        canSend={true}
        activeTrigger={null}
        suggestions={[]}
        mentionIndex={0}
        onMentionIndexChange={vi.fn()}
        onSuggestionSelect={vi.fn()}
        pendingFiles={[]}
        onFileSelect={vi.fn()}
        onFileRemove={vi.fn()}
        onFileDrop={vi.fn()}
      />,
    );

    expect(container.querySelector('[data-chat-composer-form="true"]')?.className).toContain("ui-chat-composer-frame");
    expect(container.querySelector('[data-chat-composer-field="true"]')?.className).toContain("ui-chat-composer-field");
  });

  it("renders a stop control while a stream is active", () => {
    const onStopStream = vi.fn();

    render(
      <ChatInput
        value="Draft a response"
        onChange={vi.fn()}
        onSend={vi.fn()}
        isSending={true}
        canSend={false}
        canStopStream={true}
        onStopStream={onStopStream}
        activeTrigger={null}
        suggestions={[]}
        mentionIndex={0}
        onMentionIndexChange={vi.fn()}
        onSuggestionSelect={vi.fn()}
        pendingFiles={[]}
        onFileSelect={vi.fn()}
        onFileRemove={vi.fn()}
        onFileDrop={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Stop generation" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sending message" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Stop generation" }));
    expect(onStopStream).toHaveBeenCalledTimes(1);
  });
});