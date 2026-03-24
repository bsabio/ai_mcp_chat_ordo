import { useCallback, useRef, type Dispatch } from "react";

import { MessageFactory } from "@/core/entities/MessageFactory";
import type { ChatMessage } from "@/core/entities/chat-message";
import type { AttachmentPart } from "@/lib/chat/message-attachments";
import type { TaskOriginHandoff } from "@/lib/chat/task-origin-handoff";

import type { ChatAction } from "./chatState";
import {
  cleanupChatAttachments,
  uploadChatAttachments,
} from "./chatAttachmentApi";
import {
  type PreparedChatSend,
  prepareChatSend,
  shouldRefreshConversationAfterStream,
  validateChatSend,
} from "./chatSendPolicy";
import { useChatStreamRuntime } from "./useChatStreamRuntime";

interface UseChatSendOptions {
  conversationId: string | null;
  refreshConversation: (conversationIdOverride?: string | null) => Promise<void>;
  dispatch: Dispatch<ChatAction>;
  getFailedSend: (retryKey: string) => FailedSendPayload | undefined;
  messages: ChatMessage[];
  registerFailedSend: (payload: FailedSendPayload) => void;
  setConversationId: (conversationId: string | null) => void;
  setIsSending: (isSending: boolean) => void;
  clearFailedSend: (retryKey: string) => void;
}

export interface FailedSendPayload {
  retryKey: string;
  failedUserMessageId: string;
  messageText: string;
  files: File[];
  taskOriginHandoff?: TaskOriginHandoff;
}

function createFailedAssistantMessage(errorMessage: string, retryKey: string, failedUserMessageId: string) {
  return MessageFactory.createAssistantMessage(errorMessage, [], {
    failedSend: {
      retryKey,
      failedUserMessageId,
    },
  });
}

function prepareRetrySend(
  messages: ChatMessage[],
  failedUserMessageId: string,
  trimmedMessage: string,
  attachmentParts: AttachmentPart[],
): PreparedChatSend | null {
  const failedUserIndex = messages.findIndex((message) => message.id === failedUserMessageId);
  if (failedUserIndex < 0) {
    return null;
  }

  const existingUserMessage = messages[failedUserIndex];
  if (!existingUserMessage || existingUserMessage.role !== "user") {
    return null;
  }

  const userParts = [
    ...(trimmedMessage ? [{ type: "text" as const, text: trimmedMessage }] : []),
    ...attachmentParts,
  ];
  const assistantIndex = failedUserIndex + 1;
  const optimisticMessages = [
    ...messages.slice(0, failedUserIndex),
    {
      ...existingUserMessage,
      content: trimmedMessage,
      parts: userParts,
    },
    MessageFactory.createAssistantMessage(),
  ];

  return {
    assistantIndex,
    optimisticMessages,
    historyForBackend: optimisticMessages.slice(0, assistantIndex).map((message) => ({
      role: message.role,
      content: message.content,
    })),
  };
}

export function useChatSend({
  conversationId,
  refreshConversation,
  dispatch,
  getFailedSend,
  messages,
  registerFailedSend,
  setConversationId,
  setIsSending,
  clearFailedSend,
}: UseChatSendOptions) {
  const inFlightRef = useRef(false);
  const runStream = useChatStreamRuntime({
    conversationId,
    dispatch,
    setConversationId,
  });

  const sendMessage = useCallback(
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
      let preparedSend: PreparedChatSend | null = null;

      try {
        const attachmentParts = files.length
          ? await uploadChatAttachments(files, conversationId)
          : [];
        uploadedAttachmentIds = attachmentParts.map((attachment) => attachment.assetId);
        preparedSend = prepareChatSend(messages, trimmedMessage, attachmentParts);

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

        if (preparedSend) {
          const failedUserMessageId = preparedSend.optimisticMessages[preparedSend.assistantIndex - 1]?.id;
          if (failedUserMessageId) {
            registerFailedSend({
              retryKey: failedUserMessageId,
              failedUserMessageId,
              messageText: trimmedMessage,
              files: [...files],
              taskOriginHandoff,
            });

            const failedMessages = [...preparedSend.optimisticMessages];
            failedMessages[preparedSend.assistantIndex] = createFailedAssistantMessage(
              errorMessage,
              failedUserMessageId,
              failedUserMessageId,
            );

            dispatch({
              type: "REPLACE_ALL",
              messages: failedMessages,
            });
          }
        }

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
      registerFailedSend,
      messages,
      setIsSending,
      runStream,
    ],
  );

  const retryFailedMessage = useCallback(
    async (retryKey: string) => {
      const failedSend = getFailedSend(retryKey);
      if (!failedSend) {
        return { ok: false, error: "This failed message can no longer be retried." };
      }

      const { trimmedMessage, error } = validateChatSend(
        failedSend.messageText,
        failedSend.files.length,
        inFlightRef.current,
      );

      if (error) {
        return { ok: false, error };
      }

      inFlightRef.current = true;
      setIsSending(true);
      let uploadedAttachmentIds: string[] = [];
      let preparedRetry: PreparedChatSend | null = null;

      try {
        const attachmentParts = failedSend.files.length
          ? await uploadChatAttachments(failedSend.files, conversationId)
          : [];
        uploadedAttachmentIds = attachmentParts.map((attachment) => attachment.assetId);
        preparedRetry = prepareRetrySend(
          messages,
          failedSend.failedUserMessageId,
          trimmedMessage,
          attachmentParts,
        );

        if (!preparedRetry) {
          return { ok: false, error: "The original message is no longer available." };
        }

        dispatch({
          type: "REPLACE_ALL",
          messages: preparedRetry.optimisticMessages,
        });

        const resolvedConversationId = await runStream(
          preparedRetry.historyForBackend,
          preparedRetry.assistantIndex,
          attachmentParts,
          failedSend.taskOriginHandoff,
        );

        if (shouldRefreshConversationAfterStream(conversationId, resolvedConversationId)) {
          await refreshConversation(resolvedConversationId);
        }

        clearFailedSend(retryKey);
        return { ok: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unexpected chat error.";
        await cleanupChatAttachments(uploadedAttachmentIds);

        if (preparedRetry) {
          const failedMessages = [...preparedRetry.optimisticMessages];
          failedMessages[preparedRetry.assistantIndex] = createFailedAssistantMessage(
            errorMessage,
            retryKey,
            failedSend.failedUserMessageId,
          );

          dispatch({
            type: "REPLACE_ALL",
            messages: failedMessages,
          });
        }

        registerFailedSend(failedSend);
        return { ok: false, error: errorMessage };
      } finally {
        setIsSending(false);
        inFlightRef.current = false;
      }
    },
    [
      clearFailedSend,
      conversationId,
      dispatch,
      getFailedSend,
      messages,
      refreshConversation,
      registerFailedSend,
      runStream,
      setIsSending,
    ],
  );

  return {
    retryFailedMessage,
    sendMessage,
  };
}