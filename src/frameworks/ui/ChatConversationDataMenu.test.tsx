// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChatConversationDataMenu } from "./ChatConversationDataMenu";

describe("ChatConversationDataMenu", () => {
  it("opens the menu and dispatches transcript copy from top chrome", () => {
    const onCopyTranscript = vi.fn();

    render(
      <ChatConversationDataMenu
        canCopyTranscript
        canExportConversation
        canImportConversation
        onCopyTranscript={onCopyTranscript}
        onExportConversation={vi.fn()}
        onImportConversationFile={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open conversation data menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy transcript" }));

    expect(onCopyTranscript).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("wires import JSON through the hidden file input bridge", () => {
    const onImportConversationFile = vi.fn();

    const { container } = render(
      <ChatConversationDataMenu
        canCopyTranscript
        canExportConversation
        canImportConversation
        onCopyTranscript={vi.fn()}
        onExportConversation={vi.fn()}
        onImportConversationFile={onImportConversationFile}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open conversation data menu" }));

    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();

    fireEvent.change(input as HTMLInputElement, {
      target: {
        files: [new File(["{}"], "conversation.json", { type: "application/json" })],
      },
    });

    expect(onImportConversationFile).toHaveBeenCalledTimes(1);
    expect(onImportConversationFile).toHaveBeenCalledWith(expect.any(File));
  });

  it("disables busy actions and returns focus to the trigger when dismissed with escape", () => {
    render(
      <ChatConversationDataMenu
        canCopyTranscript
        canExportConversation
        canImportConversation
        isBusy
        onCopyTranscript={vi.fn()}
        onExportConversation={vi.fn()}
        onImportConversationFile={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Open conversation data menu" });
    fireEvent.click(trigger);

    expect(screen.getByRole("menuitem", { name: "Copy transcript" })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "Export JSON" })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "Import JSON" })).toBeDisabled();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});