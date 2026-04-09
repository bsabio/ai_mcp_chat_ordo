import type { Dispatch } from "react";

import type { ChatAction, GenerationStatusUpdate } from "./chatState";

export interface StreamConversationIdAction {
  type: "SET_CONVERSATION_ID";
  conversationId: string;
}

export interface StreamIdAction {
  type: "SET_STREAM_ID";
  streamId: string;
}

export interface StreamTerminalStateAction {
  type: "SET_STREAM_TERMINAL_STATE";
  index: number;
  generation: GenerationStatusUpdate;
}

interface CreateChatStreamDispatchOptions {
  initialConversationId: string | null;
  dispatch: Dispatch<ChatAction>;
  setConversationId: (conversationId: string | null) => void;
  setStreamId: (streamId: string | null) => void;
}

export interface ChatStreamDispatcher {
  dispatchStreamAction: (action: ChatAction | StreamConversationIdAction | StreamIdAction | StreamTerminalStateAction) => void;
  getResolvedConversationId: () => string | null;
  getResolvedStreamId: () => string | null;
  getResolvedTerminalState: () => GenerationStatusUpdate | null;
}

export function createChatStreamDispatcher({
  initialConversationId,
  dispatch,
  setConversationId,
  setStreamId,
}: CreateChatStreamDispatchOptions): ChatStreamDispatcher {
  let resolvedConversationId = initialConversationId;
  let resolvedStreamId: string | null = null;
  let resolvedTerminalState: GenerationStatusUpdate | null = null;

  return {
    dispatchStreamAction(action) {
      if (action.type === "SET_CONVERSATION_ID") {
        resolvedConversationId = action.conversationId;
        setConversationId(action.conversationId);
        return;
      }

      if (action.type === "SET_STREAM_ID") {
        resolvedStreamId = action.streamId;
        setStreamId(action.streamId);
        return;
      }

      if (action.type === "SET_STREAM_TERMINAL_STATE") {
        resolvedTerminalState = action.generation;
        dispatch({
          type: "UPSERT_GENERATION_STATUS",
          index: action.index,
          generation: action.generation,
        });
        return;
      }

      dispatch(action);
    },
    getResolvedConversationId() {
      return resolvedConversationId;
    },
    getResolvedStreamId() {
      return resolvedStreamId;
    },
    getResolvedTerminalState() {
      return resolvedTerminalState;
    },
  };
}