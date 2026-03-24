import type { ChatMessage } from "@/core/entities/chat-message";
import { MessageFactory } from "@/core/entities/MessageFactory";
import type { AttachmentPart } from "@/lib/chat/message-attachments";

export interface SendValidationResult {
  trimmedMessage: string;
  error: string | null;
}

export interface PreparedChatSend {
  assistantIndex: number;
  optimisticMessages: ChatMessage[];
  historyForBackend: Array<{
    role: ChatMessage["role"];
    content: string;
  }>;
}

export function validateChatSend(
  messageText: string,
  fileCount: number,
  isInFlight: boolean,
): SendValidationResult {
  const trimmedMessage = messageText.trim();

  if (!trimmedMessage && fileCount === 0) {
    return { trimmedMessage, error: "Cannot send an empty message." };
  }

  if (isInFlight) {
    return { trimmedMessage, error: "A message is already sending." };
  }

  return { trimmedMessage, error: null };
}

export function prepareChatSend(
  messages: ChatMessage[],
  trimmedMessage: string,
  attachmentParts: AttachmentPart[],
): PreparedChatSend {
  const userParts = [
    ...(trimmedMessage ? [{ type: "text" as const, text: trimmedMessage }] : []),
    ...attachmentParts,
  ];
  const userMessage = MessageFactory.createUserMessage(trimmedMessage, userParts);
  const nextMessages = [...messages, userMessage];

  return {
    assistantIndex: nextMessages.length,
    optimisticMessages: [...nextMessages, MessageFactory.createAssistantMessage()],
    historyForBackend: nextMessages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  };
}

export function shouldRefreshConversationAfterStream(
  activeConversationId: string | null,
  resolvedConversationId: string | null,
): boolean {
  if (!activeConversationId) {
    return true;
  }

  if (!resolvedConversationId) {
    return false;
  }

  return resolvedConversationId !== activeConversationId;
}