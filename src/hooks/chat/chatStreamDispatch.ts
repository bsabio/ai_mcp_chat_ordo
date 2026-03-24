import type { Dispatch } from "react";

import type { ChatAction } from "./chatState";

export interface StreamConversationIdAction {
  type: "SET_CONVERSATION_ID";
  conversationId: string;
}

interface CreateChatStreamDispatchOptions {
  initialConversationId: string | null;
  dispatch: Dispatch<ChatAction>;
  setConversationId: (conversationId: string | null) => void;
}

export interface ChatStreamDispatcher {
  dispatchStreamAction: (action: ChatAction | StreamConversationIdAction) => void;
  getResolvedConversationId: () => string | null;
}

export function createChatStreamDispatcher({
  initialConversationId,
  dispatch,
  setConversationId,
}: CreateChatStreamDispatchOptions): ChatStreamDispatcher {
  let resolvedConversationId = initialConversationId;

  return {
    dispatchStreamAction(action) {
      if (action.type === "SET_CONVERSATION_ID") {
        resolvedConversationId = action.conversationId;
        setConversationId(action.conversationId);
        return;
      }

      dispatch(action);
    },
    getResolvedConversationId() {
      return resolvedConversationId;
    },
  };
}