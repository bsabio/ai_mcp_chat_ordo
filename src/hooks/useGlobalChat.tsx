"use client";

import React, { createContext, useContext, useReducer, useState, useMemo, useCallback, useEffect, ReactNode } from "react";
export type { MessagePart } from "@/core/entities/message-parts";
import type { MessagePart } from "@/core/entities/message-parts";
export type { ChatMessage } from "@/core/entities/chat-message";
import type { ChatMessage } from "@/core/entities/chat-message";
import type { ConversationSummary } from "@/core/entities/conversation";

import { 
  StreamProcessor, 
  TextDeltaStrategy, 
  ToolCallStrategy, 
  ToolResultStrategy, 
  ErrorStrategy,
  ConversationIdStrategy 
} from "@/lib/chat/StreamStrategy";
import { getChatStreamProvider } from "@/adapters/StreamProviderFactory";
import { MessageFactory } from "@/core/entities/MessageFactory";

type ChatAction =
  | { type: "REPLACE_ALL"; messages: ChatMessage[] }
  | { type: "APPEND_TEXT"; index: number; delta: string }
  | {
      type: "APPEND_TOOL_CALL";
      index: number;
      name: string;
      args: Record<string, unknown>;
    }
  | {
      type: "APPEND_TOOL_RESULT";
      index: number;
      name: string;
      result: unknown;
    }
  | { type: "SET_ERROR"; index: number; error: string }
  | { type: "SET_CONVERSATION_ID"; conversationId: string };

function chatReducer(state: ChatMessage[], action: ChatAction): ChatMessage[] {
  switch (action.type) {
    case "REPLACE_ALL":
      return action.messages;
    case "APPEND_TEXT": {
      const updated = [...state];
      const msg = updated[action.index];
      if (!msg) return state;
      const parts = [...(msg.parts || [])];
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.type === "text") {
        parts[parts.length - 1] = {
          ...lastPart,
          text: lastPart.text + action.delta,
        };
      } else {
        parts.push({ type: "text", text: action.delta });
      }
      updated[action.index] = {
        ...msg,
        content: (msg.content || "") + action.delta,
        parts,
      };
      return updated;
    }
    case "APPEND_TOOL_CALL": {
      const updated = [...state];
      const msg = updated[action.index];
      if (!msg) return state;
      const parts = [
        ...(msg.parts || []),
        { type: "tool_call" as const, name: action.name, args: action.args },
      ];
      updated[action.index] = { ...msg, parts };
      return updated;
    }
    case "APPEND_TOOL_RESULT": {
      const updated = [...state];
      const msg = updated[action.index];
      if (!msg) return state;
      const parts = [
        ...(msg.parts || []),
        {
          type: "tool_result" as const,
          name: action.name,
          result: action.result,
        },
      ];
      updated[action.index] = { ...msg, parts };
      return updated;
    }
    case "SET_ERROR": {
      return [
        ...state.slice(0, action.index),
        { id: crypto.randomUUID(), role: "assistant", content: action.error, parts: [], timestamp: new Date() },
      ];
    }
    default:
      return state;
  }
}

interface ChatContextType {
  messages: ChatMessage[];
  input: string;
  isSending: boolean;
  canSend: boolean;
  conversationId: string | null;
  conversations: ConversationSummary[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  setInput: (val: string) => void;
  sendMessage: (eventOrMessage?: { preventDefault: () => void } | string) => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  newConversation: () => void;
  deleteConversation: (id: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const streamAdapter = getChatStreamProvider();
const streamProcessor = new StreamProcessor([
  new TextDeltaStrategy(),
  new ToolCallStrategy(),
  new ToolResultStrategy(),
  new ErrorStrategy(),
  new ConversationIdStrategy(),
]);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, dispatch] = useReducer(chatReducer, [
    MessageFactory.createHeroMessage(
      "The PD Advisor helps you build high-performance products by combining deep architectural wisdom with modern AI workflows. I can help you navigate the library, check your development patterns, or identify the best practitioners for your next sprint.",
      ["Explore the Library", "Check Architectural Patterns", "Find Practitioners", "Switch to Bauhaus Theme"]
    )
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const canSend = useMemo(
    () => input.trim().length > 0 && !isSending,
    [input, isSending],
  );

  const refreshConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const res = await fetch("/api/conversations");
      // 401 is expected for anonymous users — just skip loading
      if (res.status === 401) return;
      if (res.ok) {
        const data = await res.json() as { conversations: ConversationSummary[] };
        setConversations(data.conversations);
      }
    } catch {
      // Silent fail — conversations list is non-critical
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  // Load conversations on mount
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  const newConversation = useCallback(() => {
    setConversationId(null);
    dispatch({
      type: "REPLACE_ALL",
      messages: [
        MessageFactory.createHeroMessage(
          "The PD Advisor helps you build high-performance products by combining deep architectural wisdom with modern AI workflows. I can help you navigate the library, check your development patterns, or identify the best practitioners for your next sprint.",
          ["Explore the Library", "Check Architectural Patterns", "Find Practitioners", "Switch to Bauhaus Theme"]
        ),
      ],
    });
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(id)}`);
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) return;
      const data = await res.json() as {
        conversation: { id: string };
        messages: Array<{
          id: string;
          role: "user" | "assistant";
          content: string;
          parts: MessagePart[];
          createdAt: string;
        }>;
      };

      const loaded: ChatMessage[] = data.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        parts: m.parts,
        timestamp: new Date(m.createdAt),
      }));

      setConversationId(data.conversation.id);
      dispatch({ type: "REPLACE_ALL", messages: loaded });
    } catch {
      // Silent fail
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) {
        newConversation();
      }
    } catch {
      // Silent fail
    }
  }, [conversationId, newConversation]);

  // Listen for SET_CONVERSATION_ID actions from the stream processor
  const dispatchWithConversationId = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (action: any) => {
      if (action.type === "SET_CONVERSATION_ID") {
        setConversationId(action.conversationId);
        return;
      }
      dispatch(action);
    },
    [],
  );

  async function sendMessage(eventOrMessage?: { preventDefault: () => void } | string) {
    let messageText = input.trim();
    
    if (typeof eventOrMessage === "string") {
      messageText = eventOrMessage.trim();
    } else {
      eventOrMessage?.preventDefault();
    }

    if (!messageText && !canSend) return;

    const userMessage = MessageFactory.createUserMessage(messageText);
    const nextMessages = [...messages, userMessage];
    const assistantIndex = nextMessages.length;

    dispatch({
      type: "REPLACE_ALL",
      messages: [
        ...nextMessages,
        MessageFactory.createAssistantMessage(),
      ],
    });
    setInput("");
    setIsSending(true);

    try {
      const historyForBackend = nextMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const stream = await streamAdapter.fetchStream(historyForBackend, {
        conversationId: conversationId || undefined,
      });
      
      for await (const event of stream.events()) {
        streamProcessor.process(event, { dispatch: dispatchWithConversationId, assistantIndex });
      }

      // Refresh conversation list after sending
      refreshConversations();
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        index: assistantIndex,
        error: error instanceof Error ? error.message : "Unexpected chat error.",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <ChatContext.Provider value={{
      messages, input, isSending, canSend, conversationId, conversations,
      isLoadingConversations, isLoadingMessages,
      setInput, sendMessage, loadConversation, newConversation, deleteConversation, refreshConversations
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useGlobalChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useGlobalChat must be used within a ChatProvider");
  }
  return context;
}
