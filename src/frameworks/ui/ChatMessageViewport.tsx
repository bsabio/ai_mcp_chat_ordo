import React from "react";

import type { PresentedMessage } from "@/adapters/ChatPresenter";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useMessageScrollBoundaryLock } from "@/hooks/useMessageScrollBoundaryLock";

import { MessageList } from "./MessageList";
import type { ActionLinkType } from "@/core/entities/rich-content";

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
  onSuggestionClick: (text: string) => void;
  scrollDependency: string;
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
  onSuggestionClick,
  scrollDependency,
  searchQuery,
}) => {
  const { scrollRef, isAtBottom, scrollToBottom, handleScroll } =
    useChatScroll(scrollDependency);

  useMessageScrollBoundaryLock(scrollRef, isEmbedded);

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden"
      data-chat-message-region="true"
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 ${isHeroState ? "h-24 opacity-45" : "h-32 opacity-70"} bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--highlight-base)_28%,transparent),transparent_72%)]`} aria-hidden="true" />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`z-10 flex h-full flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-2 sm:px-6 sm:py-3 ${isEmbedded ? "pt-1 pb-1 sm:pb-2" : ""}`}
        data-chat-message-viewport="true"
        data-chat-transcript-plane={!isEmbedded ? "true" : undefined}
      >
        {isLoadingMessages ? (
          <div className="flex h-32 items-center justify-center text-xs opacity-40 animate-pulse">
            Loading conversation…
          </div>
        ) : (
          <div
            className={`${isFullScreen ? "mx-auto w-full max-w-4xl" : "w-full"} ${isEmbedded ? `flex min-h-full flex-col ${isHeroState ? "justify-center" : "justify-end"}` : ""}`}
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
              searchQuery={searchQuery}
              isEmbedded={isEmbedded}
            />
          </div>
        )}
      </div>

      {!isAtBottom && (
        <div
          className="absolute left-0 right-0 z-10 flex justify-center px-3 pointer-events-none"
          style={{
            bottom: isEmbedded
              ? "calc(var(--chat-scroll-cta-offset) + var(--safe-area-inset-bottom))"
              : "max(1rem, var(--safe-area-inset-bottom))",
          }}
        >
          <button
            onClick={() => scrollToBottom()}
            className="pointer-events-auto focus-ring min-h-11 rounded-full bg-[color-mix(in_oklab,var(--accent)_92%,var(--foreground))] px-4 py-2 text-[11px] font-bold text-accent-foreground shadow-[0_20px_34px_-22px_color-mix(in_srgb,var(--shadow-base)_42%,transparent)] transition-all hover:scale-[1.03] hover:shadow-[0_22px_38px_-22px_color-mix(in_srgb,var(--shadow-base)_46%,transparent)]"
            aria-label="Scroll to bottom"
          >
            ↓ Scroll to bottom
          </button>
        </div>
      )}
    </div>
  );
};