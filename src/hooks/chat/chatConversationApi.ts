import type { MessagePart } from "@/core/entities/message-parts";
import type { ChatMessage } from "@/core/entities/chat-message";
import type { Conversation } from "@/core/entities/conversation";
import { requestJson, requestStatus } from "./chatRequest";

export interface RestoredConversationPayload {
  conversationId: string;
  conversation: Conversation;
  messages: ChatMessage[];
}

export interface RestoreConversationResult {
  status: "restored" | "missing" | "unauthorized" | "error" | "network-error" | "aborted" | "unexpected-error";
  payload?: RestoredConversationPayload;
  statusCode?: number;
}

export interface ArchiveConversationResult {
  status: "archived" | "rejected" | "network-error" | "aborted" | "unexpected-error";
  statusCode?: number;
}

interface RestoreConversationResponse {
  conversation: Conversation;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    parts: MessagePart[];
    createdAt: string;
  }>;
}

async function restoreConversationFromPath(path: string): Promise<RestoreConversationResult> {
  const result = await requestJson<RestoreConversationResponse>(path);

  if (result.status === "http-error") {
    if (result.statusCode === 404) {
      return { status: "missing", statusCode: 404 };
    }

    if (result.statusCode === 401) {
      return { status: "unauthorized", statusCode: 401 };
    }

    return { status: "error", statusCode: result.statusCode };
  }

  if (result.status === "network-error" || result.status === "aborted" || result.status === "unexpected-error") {
    return { status: result.status };
  }

  return {
    status: "restored",
    payload: {
      conversationId: result.data.conversation.id,
      conversation: result.data.conversation,
      messages: result.data.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        parts: message.parts,
        timestamp: new Date(message.createdAt),
      })),
    },
  };
}

export async function restoreActiveConversation(): Promise<RestoreConversationResult> {
  return restoreConversationFromPath("/api/conversations/active");
}

export async function restoreConversationById(
  conversationId: string,
): Promise<RestoreConversationResult> {
  return restoreConversationFromPath(
    `/api/conversations/${encodeURIComponent(conversationId)}`,
  );
}

export async function archiveActiveConversation(): Promise<ArchiveConversationResult> {
  const result = await requestStatus("/api/conversations/active/archive", {
    method: "POST",
  });

  if (result.status === "http-error") {
    return { status: "rejected", statusCode: result.statusCode };
  }

  if (result.status === "network-error" || result.status === "aborted" || result.status === "unexpected-error") {
    return { status: result.status };
  }

  return { status: "archived", statusCode: result.statusCode };
}