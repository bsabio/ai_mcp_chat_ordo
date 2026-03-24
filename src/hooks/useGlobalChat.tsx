"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Conversation } from "@/core/entities/conversation";
import type { ConversationRoutingSnapshot } from "@/core/entities/conversation-routing";
export type { MessagePart } from "@/core/entities/message-parts";
export type { ChatMessage } from "@/core/entities/chat-message";
import type { ChatMessage } from "@/core/entities/chat-message";
import {
  chatReducer,
  createInitialChatMessages,
  type ReferralContext,
} from "@/hooks/chat/chatState";
import { useChatConversationSession } from "@/hooks/chat/useChatConversationSession";
import { useChatSend } from "@/hooks/chat/useChatSend";
import type { RoleName } from "@/core/entities/user";
import type { TaskOriginHandoff } from "@/lib/chat/task-origin-handoff";
import { useInstancePrompts } from "@/lib/config/InstanceConfigContext";
import {
  buildReferralContext,
  extractReferralCode,
  shouldRefreshBootstrapMessages,
} from "@/hooks/chat/chatBootstrap";
import type { FailedSendPayload } from "@/hooks/chat/useChatSend";

interface ChatContextType {
  messages: ChatMessage[];
  isSending: boolean;
  conversationId: string | null;
  currentConversation: Conversation | null;
  isLoadingMessages: boolean;
  routingSnapshot: ConversationRoutingSnapshot | null;
  sendMessage: (
    messageText: string,
    files?: File[],
    taskOriginHandoff?: TaskOriginHandoff,
  ) => Promise<{ ok: boolean; error?: string }>;
  retryFailedMessage: (retryKey: string) => Promise<{ ok: boolean; error?: string }>;
  setConversationId: (id: string | null) => void;
  refreshConversation: (conversationIdOverride?: string | null) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({
  children,
  initialRole = "ANONYMOUS",
}: {
  children: ReactNode;
  initialRole?: RoleName;
}) {
  const prompts = useInstancePrompts();
  const [referralCtx, setReferralCtx] = useState<ReferralContext | undefined>(undefined);
  const referralResolved = useRef(false);
  const [messages, dispatch] = useReducer(
    chatReducer,
    initialRole,
    (role) => createInitialChatMessages(role, prompts),
  );
  const [isSending, setIsSending] = useState(false);
  const bootstrapRoleRef = useRef<RoleName>(initialRole);
  const failedSendsRef = useRef(new Map<string, FailedSendPayload>());

  const getFailedSend = useCallback((retryKey: string) => failedSendsRef.current.get(retryKey), []);
  const registerFailedSend = useCallback((payload: FailedSendPayload) => {
    failedSendsRef.current.set(payload.retryKey, payload);
  }, []);
  const clearFailedSend = useCallback((retryKey: string) => {
    failedSendsRef.current.delete(retryKey);
  }, []);

  const {
    conversationId,
    currentConversation,
    isLoadingMessages,
    refreshConversation,
    setConversationId,
  } = useChatConversationSession({
    dispatch,
  });

  // Fetch referral context from cookie
  useEffect(() => {
    if (referralResolved.current) return;
    referralResolved.current = true;

    const refCode = extractReferralCode(document.cookie);
    if (!refCode) return;

    fetch(`/api/referral/${encodeURIComponent(refCode)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const ctx = buildReferralContext(data);
        if (!ctx) return;
        setReferralCtx(ctx);
        dispatch({
          type: "REPLACE_ALL",
          messages: createInitialChatMessages(initialRole, prompts, ctx),
        });
      })
      .catch(() => { /* fall back to default greeting */ });
  }, [initialRole, prompts]);

  const { sendMessage, retryFailedMessage } = useChatSend({
    conversationId,
    refreshConversation,
    dispatch,
    getFailedSend,
    messages,
    registerFailedSend,
    setConversationId,
    setIsSending,
    clearFailedSend,
  });

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
  ]);

  return (
    <ChatContext.Provider value={{
      messages, isSending, conversationId,
      currentConversation,
      isLoadingMessages,
      routingSnapshot: currentConversation?.routingSnapshot ?? null,
      retryFailedMessage,
      sendMessage,
      setConversationId,
      refreshConversation
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
