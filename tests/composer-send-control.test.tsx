import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ComposerSendControl } from "@/frameworks/ui/ComposerSendControl";

describe("ComposerSendControl", () => {
  it("CCH-T371a: renders stop button when canStopStream is true and onStopStream is provided", () => {
    const { container } = render(
      <ComposerSendControl
        canSend={false}
        hasContent={true}
        isSending={true}
        canStopStream={true}
        onStopStream={vi.fn()}
      />,
    );

    const stopButton = screen.getByRole("button", { name: "Stop generation" });
    expect(stopButton).toBeInTheDocument();
    expect(stopButton).toHaveAttribute("data-chat-stop-state", "active");
    expect(container.querySelector('[data-chat-stop-label="true"]')).not.toBeNull();
  });

  it("CCH-T371b: calls onStopStream when stop button is clicked", () => {
    const onStopStream = vi.fn();

    render(
      <ComposerSendControl
        canSend={false}
        hasContent={true}
        isSending={true}
        canStopStream={true}
        onStopStream={onStopStream}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Stop generation" }));
    expect(onStopStream).toHaveBeenCalledTimes(1);
  });

  it("CCH-T372a: renders send button in ready state when hasContent is true and canSend is true", () => {
    render(
      <ComposerSendControl
        canSend={true}
        hasContent={true}
        isSending={false}
        canStopStream={false}
      />,
    );

    const sendButton = screen.getByRole("button", { name: "Send" });
    expect(sendButton).toHaveAttribute("data-chat-send-state", "ready");
    expect(sendButton.className).toContain("ui-chat-send-ready");
  });

  it("CCH-T372b: renders send button in idle state when hasContent is false", () => {
    render(
      <ComposerSendControl
        canSend={false}
        hasContent={false}
        isSending={false}
        canStopStream={false}
      />,
    );

    const sendButton = screen.getByRole("button", { name: "Send" });
    expect(sendButton).toHaveAttribute("data-chat-send-state", "idle");
    expect(sendButton.className).toContain("ui-chat-send-idle");
  });

  it("CCH-T372c: renders send button with disabled class when hasContent is true but canSend is false", () => {
    render(
      <ComposerSendControl
        canSend={false}
        hasContent={true}
        isSending={false}
        canStopStream={false}
      />,
    );

    const sendButton = screen.getByRole("button", { name: "Send" });
    expect(sendButton.className).toContain("ui-chat-send-disabled");
    expect(sendButton).toBeDisabled();
  });

  it("CCH-T372d: renders loading dots and sending label when isSending is true and no stop", () => {
    render(
      <ComposerSendControl
        canSend={false}
        hasContent={true}
        isSending={true}
        canStopStream={false}
      />,
    );

    const sendButton = screen.getByRole("button", { name: "Sending message" });
    expect(sendButton).toBeInTheDocument();
    expect(sendButton.querySelectorAll(".animate-bounce")).toHaveLength(3);
  });
});
