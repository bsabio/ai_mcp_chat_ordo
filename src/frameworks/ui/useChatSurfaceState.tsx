"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useGlobalChat } from "@/hooks/useGlobalChat";
import { usePresentedChatMessages } from "@/hooks/usePresentedChatMessages";
import { useUICommands } from "@/hooks/useUICommands";
import { useChatComposerController } from "@/hooks/chat/useChatComposerController";
import type { ActionLinkType } from "@/core/entities/rich-content";
import { buildTranscriptCopy } from "@/lib/chat/conversation-portability";
import {
  exportConversationById,
  importConversationFromPayload,
} from "@/hooks/chat/chatConversationApi";

export type ActionDispatchDeps = {
  router: ReturnType<typeof useRouter>;
  conversationId: string | null;
  setConversationId: (id: string) => void;
  refreshConversation: (id?: string) => void;
  setComposerText: (text: string) => void;
};

async function postJobAction(jobId: string, operation: string) {
  const response = await fetch(`/api/chat/jobs/${encodeURIComponent(jobId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: operation }),
  });

  if (!response.ok) {
    throw new Error("Job action failed.");
  }

  return response.json() as Promise<{ job?: { conversationId?: string } }>;
}

function resolveExternalActionUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("//")) {
    return null;
  }

  if (trimmed.startsWith("/")) {
    return new URL(trimmed, window.location.origin).toString();
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export const ACTION_HANDLERS: Record<ActionLinkType, (deps: ActionDispatchDeps, value: string, params?: Record<string, string>) => void | Promise<void>> = {
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
  external: (_deps, value, params) => {
    const target = resolveExternalActionUrl(value || params?.url || "");
    if (!target) {
      return;
    }
    window.open(target, "_blank", "noopener,noreferrer");
  },
  job: async (deps, value, params) => {
    const operation = params?.operation;
    if (!value || !operation) {
      return;
    }

    const payload = await postJobAction(value, operation);
    deps.refreshConversation(payload.job?.conversationId || deps.conversationId || undefined);
  },
};

export function useChatSurfaceState({
  isEmbedded,
}: {
  isEmbedded: boolean;
}) {
  const router = useRouter();
  const {
    activeStreamId,
    messages,
    isSending,
    retryFailedMessage,
    sendMessage,
    stopStream,
    conversationId,
    currentConversation,
    isLoadingMessages,
    applyConversationPayload,
    setConversationId,
    refreshConversation,
  } =
    useGlobalChat();
  const [sessionSearchQuery, setSessionSearchQuery] = useState("");
  const [isConversationActionPending, setIsConversationActionPending] = useState(false);

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
      void handler?.(deps, value, params);
    },
    [router, conversationId, setConversationId, refreshConversation, setComposerText],
  );

  const handleRetryClick = useCallback(async (retryKey: string) => {
    if (isSending) {
      return;
    }

    await retryFailedMessage(retryKey);
  }, [isSending, retryFailedMessage]);

  const handleCopyTranscript = useCallback(async () => {
    const transcript = buildTranscriptCopy(messages);
    if (!transcript) {
      return;
    }

    try {
      await navigator.clipboard.writeText(transcript);
    } catch {
      /* clipboard unavailable */
    }
  }, [messages]);

  const handleExportConversation = useCallback(async () => {
    if (!conversationId) {
      return;
    }

    setIsConversationActionPending(true);
    try {
      const result = await exportConversationById(conversationId);
      if (result.status !== "exported" || !result.payload) {
        return;
      }

      const blob = new Blob([`${JSON.stringify(result.payload, null, 2)}\n`], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `conversation-${conversationId}.json`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsConversationActionPending(false);
    }
  }, [conversationId]);

  const handleImportConversationFile = useCallback(async (file: File) => {
    setIsConversationActionPending(true);
    try {
      const result = await importConversationFromPayload(await file.text());
      if (result.status === "imported" && result.payload) {
        applyConversationPayload(result.payload);
      }
    } finally {
      setIsConversationActionPending(false);
    }
  }, [applyConversationPayload]);

  const isHeroState =
    isEmbedded &&
    !sessionSearchQuery &&
    presentedMessages.length === 1 &&
    presentedMessages[0]?.role === "assistant" &&
    presentedMessages[0]?.suggestions.length > 0;

  const contentProps = {
    activeTrigger: activeTrigger ? activeTrigger.char : null,
    activeStreamId,
    canSend,
    canCopyTranscript: messages.length > 0,
    canExportConversation: Boolean(conversationId),
    canImportConversation: true,
    canStopStream: Boolean(activeStreamId),
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
    onRetryClick: handleRetryClick,
    onSend: handleSend,
    onCopyTranscript: handleCopyTranscript,
    onExportConversation: handleExportConversation,
    onImportConversationFile: handleImportConversationFile,
    onSuggestionClick: handleSuggestionClick,
    onSuggestionSelect: handleSuggestionSelect,
    onStopStream: stopStream,
    pendingFiles,
    isConversationActionPending,
    scrollDependency,
    searchQuery: sessionSearchQuery,
    suggestions: mentionSuggestions,
  };

  return {
    activeTrigger: activeTrigger ? activeTrigger.char : null,
    activeStreamId,
    canSend,
    canCopyTranscript: messages.length > 0,
    canExportConversation: Boolean(conversationId),
    canImportConversation: true,
    canStopStream: Boolean(activeStreamId),
    contentProps,
    conversationId,
    currentConversation,
    dynamicSuggestions,
    handleActionClick,
    handleCopyTranscript,
    handleExportConversation,
    handleImportConversationFile,
    handleFileRemove,
    handleFileSelect,
    handleInputChange,
    handleLinkClick,
    handleRetryClick,
    handleSend,
    handleSuggestionClick,
    handleSuggestionSelect,
    input,
    isHeroState,
    isLoadingMessages,
    isSending,
    isConversationActionPending,
    mentionIndex,
    mentionSuggestions,
    stopStream,
    pendingFiles,
    presentedMessages,
    scrollDependency,
    sessionSearchQuery,
    setMentionIndex,
    setSessionSearchQuery,
    textareaRef,
  };
}