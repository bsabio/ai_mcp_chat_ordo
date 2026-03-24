import { useCallback, useRef, type Dispatch } from "react";

import type { ChatMessage } from "@/core/entities/chat-message";
import type { TaskOriginHandoff } from "@/lib/chat/task-origin-handoff";

import type { ChatAction } from "./chatState";
import {
  cleanupChatAttachments,
  uploadChatAttachments,
} from "./chatAttachmentApi";
import {
  prepareChatSend,
  shouldRefreshConversationAfterStream,
  validateChatSend,
} from "./chatSendPolicy";
import { useChatStreamRuntime } from "./useChatStreamRuntime";

interface UseChatSendOptions {
  conversationId: string | null;
  refreshConversation: (conversationIdOverride?: string | null) => Promise<void>;
  dispatch: Dispatch<ChatAction>;
  messages: ChatMessage[];
  setConversationId: (conversationId: string | null) => void;
  setIsSending: (isSending: boolean) => void;
}

export function useChatSend({
  conversationId,
  refreshConversation,
  dispatch,
  messages,
  setConversationId,
  setIsSending,
}: UseChatSendOptions) {
  const inFlightRef = useRef(false);
  const runStream = useChatStreamRuntime({
    conversationId,
    dispatch,
    setConversationId,
  });

  return useCallback(
    async (
      messageText: string,
      files: File[] = [],
      taskOriginHandoff?: TaskOriginHandoff,
    ) => {
      const { trimmedMessage, error } = validateChatSend(
        messageText,
        files.length,
        inFlightRef.current,
      );

      if (error) {
        return { ok: false, error };
      }

      inFlightRef.current = true;
      setIsSending(true);
      let uploadedAttachmentIds: string[] = [];

      try {
        const attachmentParts = files.length
          ? await uploadChatAttachments(files, conversationId)
          : [];
        uploadedAttachmentIds = attachmentParts.map((attachment) => attachment.assetId);
        const preparedSend = prepareChatSend(messages, trimmedMessage, attachmentParts);

        dispatch({
          type: "REPLACE_ALL",
          messages: preparedSend.optimisticMessages,
        });

        const resolvedConversationId = await runStream(
          preparedSend.historyForBackend,
          preparedSend.assistantIndex,
          attachmentParts,
          taskOriginHandoff,
        );

        if (shouldRefreshConversationAfterStream(conversationId, resolvedConversationId)) {
          await refreshConversation(resolvedConversationId);
        }

        return { ok: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unexpected chat error.";
        await cleanupChatAttachments(uploadedAttachmentIds);
        dispatch({
          type: "SET_ERROR",
          index: messages.length + 1,
          error: errorMessage,
        });
        return { ok: false, error: errorMessage };
      } finally {
        setIsSending(false);
        inFlightRef.current = false;
      }
    },
    [
      conversationId,
      refreshConversation,
      dispatch,
      messages,
      setIsSending,
      runStream,
    ],
  );
}