"use client";

import { useEffect, useRef, type Dispatch } from "react";

import type { RoleName } from "@/core/entities/user";
import type { Conversation } from "@/core/entities/conversation";
import type { ChatMessage } from "@/core/entities/chat-message";
import {
  createInitialChatMessages,
  type ReferralContext,
  type ChatAction,
} from "@/hooks/chat/chatState";
import { shouldRefreshBootstrapMessages } from "@/hooks/chat/chatBootstrap";
import type { InstancePrompts } from "@/lib/config/defaults";

interface UseBootstrapMessagesOptions {
  messages: ChatMessage[];
  initialRole: RoleName;
  conversationId: string | null;
  currentConversation: Conversation | null;
  isLoadingMessages: boolean;
  isSending: boolean;
  prompts: InstancePrompts;
  referralCtx: ReferralContext | undefined;
  dispatch: Dispatch<ChatAction>;
}

export function useBootstrapMessages({
  messages,
  initialRole,
  conversationId,
  currentConversation,
  isLoadingMessages,
  isSending,
  prompts,
  referralCtx,
  dispatch,
}: UseBootstrapMessagesOptions): void {
  const bootstrapRoleRef = useRef<RoleName>(initialRole);

  useEffect(() => {
    if (!shouldRefreshBootstrapMessages({
      messages,
      initialRole,
      bootstrapRole: bootstrapRoleRef.current,
      conversationId,
      currentConversation,
      isLoadingMessages,
      isSending,
    })) {
      return;
    }

    bootstrapRoleRef.current = initialRole;
    dispatch({
      type: "REPLACE_ALL",
      messages: createInitialChatMessages(initialRole, prompts, referralCtx),
    });
  }, [
    conversationId,
    currentConversation,
    initialRole,
    isLoadingMessages,
    isSending,
    messages,
    prompts,
    referralCtx,
    dispatch,
  ]);
}
