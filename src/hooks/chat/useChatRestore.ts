import { useEffect, type Dispatch } from "react";

import type { Conversation } from "@/core/entities/conversation";
import type { ChatAction } from "./chatState";
import { restoreActiveConversation, restoreConversationById } from "./chatConversationApi";

function clearConversationIdQueryParam(): void {
  const url = new URL(window.location.href);

  if (!url.searchParams.has("conversationId")) {
    return;
  }

  url.searchParams.delete("conversationId");
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", nextUrl || "/");
}

interface UseChatRestoreOptions {
  dispatch: Dispatch<ChatAction>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setConversationId: (conversationId: string | null) => void;
  setIsLoadingMessages: (isLoading: boolean) => void;
}

export function useChatRestore({
  dispatch,
  setCurrentConversation,
  setConversationId,
  setIsLoadingMessages,
}: UseChatRestoreOptions): void {
  useEffect(() => {
    const loadActiveConversation = async () => {
      try {
        const queryConversationId = new URLSearchParams(window.location.search).get("conversationId");
        const result = queryConversationId
          ? await restoreConversationById(queryConversationId)
          : await restoreActiveConversation();

        if (result.status === "missing") {
          return;
        }

        if (result.status === "unauthorized") {
          console.warn(
            queryConversationId
              ? `Conversation restore unexpectedly required authentication for ${queryConversationId}.`
              : "Active conversation restore unexpectedly required authentication.",
          );
          return;
        }

        if (result.status === "network-error" || result.status === "aborted") {
          return;
        }

        if (result.status === "unexpected-error") {
          console.error(
            queryConversationId
              ? `Unexpected failure while restoring conversation ${queryConversationId}.`
              : "Unexpected failure while restoring active conversation.",
          );
          return;
        }

        if (result.status === "error") {
          console.error(
            queryConversationId
              ? `Failed to restore conversation ${queryConversationId}: ${result.statusCode ?? "unknown"}`
              : `Failed to restore active conversation: ${result.statusCode ?? "unknown"}`,
          );
          return;
        }

        if (result.payload) {
          setConversationId(result.payload.conversationId);
          setCurrentConversation(result.payload.conversation);
          dispatch({ type: "REPLACE_ALL", messages: result.payload.messages });
        }
      } finally {
        clearConversationIdQueryParam();
        setIsLoadingMessages(false);
      }
    };

    void loadActiveConversation();
  }, [dispatch, setCurrentConversation, setConversationId, setIsLoadingMessages]);
}