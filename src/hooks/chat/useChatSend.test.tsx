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
  failedSendPayloads = [],
  messages = [],
  refreshConversation = vi.fn(),
}: {
  conversationId?: string | null;
  failedSendPayloads?: Array<{
    retryKey: string;
    failedUserMessageId: string;
    messageText: string;
    files: File[];
  }>;
  messages?: ChatMessage[];
  refreshConversation?: (conversationIdOverride?: string | null) => Promise<void>;
}) {
  const dispatch = vi.fn();
  const setConversationId = vi.fn();
  const setIsSending = vi.fn();
  const failedSends = new Map(
    failedSendPayloads.map((payload) => [payload.retryKey, payload]),
  );

  const { sendMessage, retryFailedMessage } = useChatSend({
    conversationId,
    refreshConversation,
    dispatch,
    getFailedSend: (retryKey) => failedSends.get(retryKey),
    messages,
    registerFailedSend: (payload) => {
      failedSends.set(payload.retryKey, payload);
    },
    setConversationId,
    setIsSending,
    clearFailedSend: (retryKey) => {
      failedSends.delete(retryKey);
    },
  });

  return (
    <div>
      <button type="button" onClick={() => void sendMessage("Audit this workflow")}>send</button>
      <button type="button" onClick={() => void retryFailedMessage("user-1")}>retry</button>
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
        failedSendPayloads={[
          {
            retryKey: "user-1",
            failedUserMessageId: "user-1",
            messageText: "Audit this workflow",
            files: [],
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

  it("retries a failed message in place instead of appending a duplicate user turn", async () => {
    const refreshConversation = vi.fn().mockResolvedValue(undefined);
    runStreamMock.mockResolvedValue("conv_existing");

    render(
      <Harness
        conversationId="conv_existing"
        messages={[
          {
            id: "msg_0",
            role: "assistant",
            content: "Welcome",
            parts: [{ type: "text", text: "Welcome" }],
            timestamp: new Date("2026-03-24T10:00:00.000Z"),
          },
          {
            id: "user-1",
            role: "user",
            content: "Audit this workflow",
            parts: [{ type: "text", text: "Audit this workflow" }],
            timestamp: new Date("2026-03-24T10:01:00.000Z"),
          },
          {
            id: "assistant-failure",
            role: "assistant",
            content: "Provider unavailable",
            parts: [],
            metadata: {
              failedSend: {
                retryKey: "user-1",
                failedUserMessageId: "user-1",
              },
            },
            timestamp: new Date("2026-03-24T10:01:01.000Z"),
          },
        ]}
        failedSendPayloads={[
          {
            retryKey: "user-1",
            failedUserMessageId: "user-1",
            messageText: "Audit this workflow",
            files: [],
          },
        ]}
        refreshConversation={refreshConversation}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "retry" }));

    await waitFor(() => {
      expect(runStreamMock).toHaveBeenCalledTimes(1);
    });

    expect(runStreamMock).toHaveBeenCalledWith(
      [
        { role: "assistant", content: "Welcome" },
        { role: "user", content: "Audit this workflow" },
      ],
      2,
      [],
      undefined,
    );
    expect(refreshConversation).not.toHaveBeenCalled();
  });
});