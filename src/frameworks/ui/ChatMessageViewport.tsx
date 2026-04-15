import React, { useEffect, useRef } from "react";

import type { PresentedMessage } from "@/adapters/ChatPresenter";
import type { ActionLinkType } from "@/core/entities/rich-content";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useMessageScrollBoundaryLock } from "@/hooks/useMessageScrollBoundaryLock";

import { MessageList } from "./MessageList";

interface ChatMessageViewportProps {
  dynamicSuggestions: string[];
  isEmbedded: boolean;
  isHeroState: boolean;
  isFullScreen: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  messages: PresentedMessage[];
  onLinkClick: (slug: string) => void;
  onActionClick?: (actionType: ActionLinkType, value: string, params?: Record<string, string>) => void;
  onRetryClick?: (retryKey: string) => void;
  onSuggestionClick: (text: string) => void;
  scrollDependency: number;
  searchQuery: string;
}

export const ChatMessageViewport: React.FC<ChatMessageViewportProps> = ({
  dynamicSuggestions,
  isEmbedded,
  isHeroState,
  isFullScreen,
  isLoadingMessages,
  isSending,
  messages,
  onLinkClick,
  onActionClick,
  onRetryClick,
  onSuggestionClick,
  scrollDependency,
  searchQuery,
}) => {
  const { scrollRef, isAtBottom, scrollToBottom, handleScroll, resetPin } =
    useChatScroll(scrollDependency);
  useMessageScrollBoundaryLock(scrollRef, isEmbedded);

  // Fix 5: When the message count changes (conversation switch via
  // REPLACE_ALL, or new message arrival), force re-pin to bottom.
  // This does NOT trigger on content-length changes within an existing
  // message (streaming tokens), so the user can still scroll up during
  // streaming without being yanked back.
  const messageCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length !== messageCountRef.current) {
      messageCountRef.current = messages.length;
      resetPin();
    }
  }, [messages.length, resetPin]);

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden"
      data-chat-message-region="true"
    >
      <div className={`ui-chat-viewport-glow pointer-events-none absolute inset-x-0 top-0 ${isHeroState ? "h-24 opacity-45" : "h-32 opacity-70"}`} aria-hidden="true" />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="ui-chat-transcript-plane ui-chat-transcript-frame z-10 flex h-full min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
        data-chat-message-viewport="true"
        data-chat-transcript-mode={isEmbedded ? "embedded" : "floating"}
        data-chat-transcript-plane={!isEmbedded ? "true" : undefined}
      >
        {isLoadingMessages ? (
          <div className="flex h-32 items-center justify-center text-xs opacity-40 animate-pulse">
            Loading conversation…
          </div>
        ) : (
          <div
            className={`shrink-0 ${isFullScreen ? "mx-auto w-full max-w-4xl" : "w-full"} ${isEmbedded ? `flex min-h-full flex-col ${isHeroState ? "justify-center" : "justify-end"}` : ""}`}
            data-chat-message-stack={isEmbedded ? "true" : undefined}
          >
            <MessageList
              messages={messages}
              isSending={isSending}
              dynamicSuggestions={dynamicSuggestions}
              isHeroState={isHeroState}
              onSuggestionClick={onSuggestionClick}
              onLinkClick={onLinkClick}
              onActionClick={onActionClick}
              onRetryClick={onRetryClick}
              searchQuery={searchQuery}
              isEmbedded={isEmbedded}
            />
          </div>
        )}
      </div>

      {!isAtBottom && (
        <div
          className="ui-chat-scroll-cta-dock absolute left-0 right-0 z-10 flex justify-center pointer-events-none"
          style={{
            bottom: isEmbedded
              ? "calc(var(--chat-scroll-cta-offset) + var(--safe-area-inset-bottom))"
              : "max(var(--space-4), var(--safe-area-inset-bottom))",
          }}
        >
          <button
            onClick={() => scrollToBottom()}
            className="ui-chat-scroll-cta pointer-events-auto focus-ring min-h-11 rounded-full px-(--space-4) py-(--space-2) text-[11px] font-bold transition-all hover:scale-[1.03] hover:shadow-[0_22px_38px_-22px_color-mix(in_srgb,var(--shadow-base)_46%,transparent)]"
            aria-label="Scroll to bottom"
          >
            ↓ Scroll to bottom
          </button>
        </div>
      )}
    </div>
  );
};

export const MemoizedChatMessageViewport = React.memo(ChatMessageViewport);