"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useGlobalChat } from "@/hooks/useGlobalChat";
import { usePresentedChatMessages } from "@/hooks/usePresentedChatMessages";
import { useUICommands } from "@/hooks/useUICommands";
import { useChatComposerController } from "@/hooks/chat/useChatComposerController";
import type { ActionLinkType } from "@/core/entities/rich-content";

export type ActionDispatchDeps = {
  router: ReturnType<typeof useRouter>;
  conversationId: string | null;
  setConversationId: (id: string) => void;
  refreshConversation: (id?: string) => void;
  setComposerText: (text: string) => void;
};

export const ACTION_HANDLERS: Record<ActionLinkType, (deps: ActionDispatchDeps, value: string, params?: Record<string, string>) => void> = {
  conversation: (deps, value, params) => {
    const targetId = value || params?.id;
    if (!targetId) return;
    if (deps.conversationId && deps.conversationId !== targetId) {
      if (!window.confirm("Switch to a different conversation? Your current thread will be saved.")) return;
    }
    deps.setConversationId(targetId);
    deps.refreshConversation(targetId);
  },
  route: (deps, value) => {
    if (value.startsWith("/") && !value.startsWith("//")) deps.router.push(value);
  },
  send: (deps, value, params) => {
    deps.setComposerText(value || params?.text || "");
  },
  corpus: (deps, value) => {
    deps.router.push(`/library/section/${value}`);
  },
};

export function useChatSurfaceState({
  isEmbedded,
}: {
  isEmbedded: boolean;
}) {
  const router = useRouter();
  const { messages, isSending, sendMessage, conversationId, isLoadingMessages, setConversationId, refreshConversation } =
    useGlobalChat();
  const [sessionSearchQuery, setSessionSearchQuery] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    activeTrigger,
    canSend,
    handleFileRemove,
    handleFileSelect,
    handleInputChange,
    handleSend,
    handleSuggestionSelect,
    input,
    mentionIndex,
    pendingFiles,
    setComposerText,
    setMentionIndex,
    suggestions: mentionSuggestions,
  } = useChatComposerController({
    isSending,
    onSendMessage: sendMessage,
    textareaRef,
  });

  const {
    presentedMessages,
    dynamicSuggestions,
    scrollDependency,
  } = usePresentedChatMessages(messages);

  useUICommands(presentedMessages, isLoadingMessages);

  const handleSuggestionClick = useCallback(async (txt: string) => {
    if (isSending) {
      return;
    }

    await sendMessage(txt);
  }, [isSending, sendMessage]);

  const handleLinkClick = useCallback((slug: string) => {
    router.push(`/library/section/${slug}`);
  }, [router]);

  const handleActionClick = useCallback(
    (actionType: ActionLinkType, value: string, params?: Record<string, string>) => {
      const deps: ActionDispatchDeps = { router, conversationId, setConversationId, refreshConversation, setComposerText };
      const handler = ACTION_HANDLERS[actionType];
      handler?.(deps, value, params);
    },
    [router, conversationId, setConversationId, refreshConversation, setComposerText],
  );

  const isHeroState =
    isEmbedded &&
    !sessionSearchQuery &&
    presentedMessages.length === 1 &&
    presentedMessages[0]?.role === "assistant" &&
    presentedMessages[0]?.suggestions.length > 0;

  const contentProps = {
    activeTrigger: activeTrigger ? activeTrigger.char : null,
    canSend,
    dynamicSuggestions,
    input,
    inputRef: textareaRef,
    isHeroState,
    isLoadingMessages,
    isSending,
    mentionIndex,
    messages: presentedMessages,
    onFileRemove: handleFileRemove,
    onFileSelect: handleFileSelect,
    onInputChange: handleInputChange,
    onLinkClick: handleLinkClick,
    onActionClick: handleActionClick,
    onMentionIndexChange: setMentionIndex,
    onSend: handleSend,
    onSuggestionClick: handleSuggestionClick,
    onSuggestionSelect: handleSuggestionSelect,
    pendingFiles,
    scrollDependency,
    searchQuery: sessionSearchQuery,
    suggestions: mentionSuggestions,
  };

  return {
    activeTrigger: activeTrigger ? activeTrigger.char : null,
    canSend,
    contentProps,
    conversationId,
    dynamicSuggestions,
    handleActionClick,
    handleFileRemove,
    handleFileSelect,
    handleInputChange,
    handleLinkClick,
    handleSend,
    handleSuggestionClick,
    handleSuggestionSelect,
    input,
    isHeroState,
    isLoadingMessages,
    isSending,
    mentionIndex,
    mentionSuggestions,
    pendingFiles,
    presentedMessages,
    scrollDependency,
    sessionSearchQuery,
    setMentionIndex,
    setSessionSearchQuery,
    textareaRef,
  };
}