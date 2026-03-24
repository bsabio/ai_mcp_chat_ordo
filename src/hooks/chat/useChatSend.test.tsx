import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ChatMessage } from "@/core/entities/chat-message";
import { useChatSend } from "@/hooks/chat/useChatSend";

const {
  runStreamMock,
  uploadChatAttachmentsMock,
  cleanupChatAttachmentsMock,
} = vi.hoisted(() => ({
  runStreamMock: vi.fn(),
  uploadChatAttachmentsMock: vi.fn(),
  cleanupChatAttachmentsMock: vi.fn(),
}));

vi.mock("@/hooks/chat/useChatStreamRuntime", () => ({
  useChatStreamRuntime: () => runStreamMock,
}));

vi.mock("@/hooks/chat/chatAttachmentApi", () => ({
  uploadChatAttachments: uploadChatAttachmentsMock,
  cleanupChatAttachments: cleanupChatAttachmentsMock,
}));

function Harness({
  conversationId = null,
  messages = [],
  refreshConversation = vi.fn(),
}: {
  conversationId?: string | null;
  messages?: ChatMessage[];
  refreshConversation?: (conversationIdOverride?: string | null) => Promise<void>;
}) {
  const dispatch = vi.fn();
  const setConversationId = vi.fn();
  const setIsSending = vi.fn();

  const sendMessage = useChatSend({
    conversationId,
    refreshConversation,
    dispatch,
    messages,
    setConversationId,
    setIsSending,
  });

  return (
    <div>
      <button type="button" onClick={() => void sendMessage("Audit this workflow")}>send</button>
    </div>
  );
}

describe("useChatSend", () => {
  beforeEach(() => {
    runStreamMock.mockReset();
    uploadChatAttachmentsMock.mockReset();
    cleanupChatAttachmentsMock.mockReset();
    uploadChatAttachmentsMock.mockResolvedValue([]);
    cleanupChatAttachmentsMock.mockResolvedValue(undefined);
  });

  it("does not refresh when streaming completes on the current conversation", async () => {
    const refreshConversation = vi.fn().mockResolvedValue(undefined);
    runStreamMock.mockResolvedValue("conv_existing");

    render(
      <Harness
        conversationId="conv_existing"
        messages={[
          {
            id: "msg_1",
            role: "assistant",
            content: "Welcome",
            parts: [{ type: "text", text: "Welcome" }],
            timestamp: new Date("2026-03-23T10:00:00.000Z"),
          },
        ]}
        refreshConversation={refreshConversation}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "send" }));

    await waitFor(() => {
      expect(runStreamMock).toHaveBeenCalledTimes(1);
    });

    expect(refreshConversation).not.toHaveBeenCalled();
  });

  it("refreshes when streaming creates or resolves a different conversation id", async () => {
    const refreshConversation = vi.fn().mockResolvedValue(undefined);
    runStreamMock.mockResolvedValue("conv_new");

    render(<Harness refreshConversation={refreshConversation} />);

    fireEvent.click(screen.getByRole("button", { name: "send" }));

    await waitFor(() => {
      expect(refreshConversation).toHaveBeenCalledWith("conv_new");
    });
  });
});