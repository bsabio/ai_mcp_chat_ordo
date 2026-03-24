import { useCallback, useState, type Dispatch } from "react";

import type { Conversation } from "@/core/entities/conversation";

import type { ChatAction } from "./chatState";
import {
  restoreActiveConversation,
  restoreConversationById,
} from "./chatConversationApi";
import { useChatRestore } from "./useChatRestore";

interface UseChatConversationSessionOptions {
  dispatch: Dispatch<ChatAction>;
}

interface ChatConversationSession {
  conversationId: string | null;
  currentConversation: Conversation | null;
  isLoadingMessages: boolean;
  refreshConversation: (conversationIdOverride?: string | null) => Promise<void>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setConversationId: (conversationId: string | null) => void;
}

export function useChatConversationSession({
  dispatch,
}: UseChatConversationSessionOptions): ChatConversationSession {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  const refreshConversation = useCallback(async (conversationIdOverride?: string | null) => {
    const restoreTargetId = conversationIdOverride ?? conversationId;
    let result = restoreTargetId
      ? await restoreConversationById(restoreTargetId)
      : await restoreActiveConversation();

    // Newly created conversations can race between the streamed id arriving and
    // the canonical active-conversation endpoint reflecting the persisted thread.
    if (
      restoreTargetId &&
      restoreTargetId !== conversationId &&
      (result.status === "missing" || result.status === "error" || result.status === "network-error")
    ) {
      result = await restoreActiveConversation();
    }

    if (result.status !== "restored" || !result.payload) {
      return;
    }

    setConversationId(result.payload.conversationId);
    setCurrentConversation(result.payload.conversation);
    dispatch({ type: "REPLACE_ALL", messages: result.payload.messages });
  }, [conversationId, dispatch]);

  useChatRestore({
    dispatch,
    setCurrentConversation,
    setConversationId,
    setIsLoadingMessages,
  });

  return {
    conversationId,
    currentConversation,
    isLoadingMessages,
    refreshConversation,
    setCurrentConversation,
    setConversationId,
  };
}