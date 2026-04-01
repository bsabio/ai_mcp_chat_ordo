import type { Conversation } from "@/core/entities/conversation";
import type { ChatMessage } from "@/core/entities/chat-message";
import type { RoleName } from "@/core/entities/user";

import type { ReferralContext } from "./chatState";

interface ReferralApiResponse {
  referrer?: {
    name?: string;
    credential?: string | null;
  } | null;
}

interface BootstrapRefreshOptions {
  messages: ChatMessage[];
  initialRole: RoleName;
  bootstrapRole: RoleName;
  conversationId: string | null;
  currentConversation: Conversation | null;
  isLoadingMessages: boolean;
  isSending: boolean;
}

export function buildReferralContext(data: ReferralApiResponse | null | undefined): ReferralContext | null {
  const referrer = data?.referrer;
  const referrerName = referrer?.name?.trim();

  if (!referrerName) {
    return null;
  }

  return {
    referrerName,
    referrerCredential: referrer?.credential ?? undefined,
  };
}

export function hasOnlyBootstrapAssistantMessage(messages: ChatMessage[]): boolean {
  return messages.length === 1 && messages[0]?.role === "assistant";
}

export function shouldRefreshBootstrapMessages({
  messages,
  initialRole,
  bootstrapRole,
  conversationId,
  currentConversation,
  isLoadingMessages,
  isSending,
}: BootstrapRefreshOptions): boolean {
  return (
    hasOnlyBootstrapAssistantMessage(messages)
    && bootstrapRole !== initialRole
    && !conversationId
    && !currentConversation
    && !isLoadingMessages
    && !isSending
  );
}