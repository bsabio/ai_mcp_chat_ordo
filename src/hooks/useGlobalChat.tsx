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
import { usePathname } from "next/navigation";
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
import { useChatJobEvents } from "@/hooks/chat/useChatJobEvents";
import { useChatPushNotifications } from "@/hooks/useChatPushNotifications";
import { useChatConversationSession } from "@/hooks/chat/useChatConversationSession";
import { useChatSend } from "@/hooks/chat/useChatSend";
import type { RoleName } from "@/core/entities/user";
import type { TaskOriginHandoff } from "@/lib/chat/task-origin-handoff";
import { useInstancePrompts } from "@/lib/config/InstanceConfigContext";
import type { RestoredConversationPayload } from "@/hooks/chat/chatConversationApi";
import {
  buildReferralContext,
  shouldRefreshBootstrapMessages,
} from "@/hooks/chat/chatBootstrap";
import type { FailedSendPayload } from "@/hooks/chat/useChatSend";
import { hydrateFailedSendRecovery } from "@/hooks/chat/chatFailedSendRecovery";

interface ChatContextType {
  messages: ChatMessage[];
  isSending: boolean;
  activeStreamId: string | null;
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
  stopStream: () => Promise<{ ok: boolean; error?: string }>;
  setConversationId: (id: string | null) => void;
  refreshConversation: (conversationIdOverride?: string | null) => Promise<void>;
  applyConversationPayload: (payload: RestoredConversationPayload) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({
  children,
  initialRole = "ANONYMOUS",
}: {
  children: ReactNode;
  initialRole?: RoleName;
}) {
  const currentPathname = usePathname();
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

  useEffect(() => {
    const { failedSends } = hydrateFailedSendRecovery(messages);
    const nextFailedSends = new Map<string, FailedSendPayload>();

    for (const payload of failedSends) {
      const existing = failedSendsRef.current.get(payload.retryKey);
      nextFailedSends.set(payload.retryKey, {
        ...payload,
        ...(existing?.taskOriginHandoff
          ? { taskOriginHandoff: existing.taskOriginHandoff }
          : {}),
      });
    }

    failedSendsRef.current = nextFailedSends;
  }, [messages]);

  const {
    conversationId,
    currentConversation,
    isLoadingMessages,
    refreshConversation,
    setCurrentConversation,
    setConversationId,
  } = useChatConversationSession({
    dispatch,
  });

  const applyConversationPayload = useCallback((payload: RestoredConversationPayload) => {
    setConversationId(payload.conversationId);
    setCurrentConversation(payload.conversation);
    dispatch({ type: "REPLACE_ALL", messages: payload.messages });
  }, [dispatch, setConversationId, setCurrentConversation]);

  // Fetch referral context from cookie
  useEffect(() => {
    if (referralResolved.current || initialRole !== "ANONYMOUS") return;
    referralResolved.current = true;

    fetch("/api/referral/visit")
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

  const { activeStreamId, sendMessage, retryFailedMessage, stopStream } = useChatSend({
    conversationId,
    currentPathname,
    refreshConversation,
    dispatch,
    getFailedSend,
    messages,
    registerFailedSend,
    setConversationId,
    setIsSending,
    clearFailedSend,
  });

  useChatJobEvents({
    conversationId,
    dispatch,
  });

  useChatPushNotifications(initialRole);

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
      messages, isSending, activeStreamId, conversationId,
      currentConversation,
      isLoadingMessages,
      routingSnapshot: currentConversation?.routingSnapshot ?? null,
      retryFailedMessage,
      sendMessage,
      stopStream,
      setConversationId,
      refreshConversation,
      applyConversationPayload,
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
