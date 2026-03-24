"use client";

import React from "react";

import type { PresentedMessage } from "@/adapters/ChatPresenter";
import type { MentionItem } from "@/core/entities/mentions";

import { ChatInput } from "./ChatInput";
import { ChatMessageViewport } from "./ChatMessageViewport";
import type { ActionLinkType } from "@/core/entities/rich-content";

interface ChatContentSurfaceProps {
  activeTrigger: string | null;
  canSend: boolean;
  dynamicSuggestions: string[];
  input: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  isEmbedded: boolean;
  isFullScreen: boolean;
  isHeroState: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  mentionIndex: number;
  messages: PresentedMessage[];
  onFileRemove: (index: number) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onInputChange: (value: string, selectionStart: number) => void;
  onLinkClick: (slug: string) => void;
  onActionClick?: (actionType: ActionLinkType, value: string, params?: Record<string, string>) => void;
  onMentionIndexChange: (index: number) => void;
  onSend: () => void;
  onSuggestionClick: (text: string) => void;
  onSuggestionSelect: (item: MentionItem) => void;
  pendingFiles: File[];
  scrollDependency: string;
  searchQuery: string;
  suggestions: MentionItem[];
}

export function ChatContentSurface({
  activeTrigger,
  canSend,
  dynamicSuggestions,
  input,
  inputRef,
  isEmbedded,
  isFullScreen,
  isHeroState,
  isLoadingMessages,
  isSending,
  mentionIndex,
  messages,
  onFileRemove,
  onFileSelect,
  onInputChange,
  onLinkClick,
  onActionClick,
  onMentionIndexChange,
  onSend,
  onSuggestionClick,
  onSuggestionSelect,
  pendingFiles,
  scrollDependency,
  searchQuery,
  suggestions,
}: ChatContentSurfaceProps) {
  return (
    <>
      <div className="relative min-h-0 overflow-hidden">
        <ChatMessageViewport
          dynamicSuggestions={dynamicSuggestions}
          isEmbedded={isEmbedded}
          isHeroState={isHeroState}
          isFullScreen={isFullScreen}
          isLoadingMessages={isLoadingMessages}
          isSending={isSending}
          messages={messages}
          onLinkClick={onLinkClick}
          onActionClick={onActionClick}
          onSuggestionClick={onSuggestionClick}
          scrollDependency={scrollDependency}
          searchQuery={searchQuery}
        />
      </div>

      <div
        className={`relative flex-none bg-[linear-gradient(180deg,color-mix(in_oklab,var(--background)_56%,transparent)_0%,color-mix(in_oklab,var(--background)_92%,transparent)_40%,var(--background)_100%)] px-3 pb-2 shadow-[0_-10px_24px_-26px_color-mix(in_srgb,var(--shadow-base)_16%,transparent)] backdrop-blur-sm sm:px-(--container-padding) sm:pb-3 ${!isEmbedded && isFullScreen ? "safe-area-px safe-area-pb" : ""}`}
        data-chat-composer-row={isEmbedded ? "true" : undefined}
        data-chat-composer-plane={!isEmbedded ? "true" : undefined}
        style={{
          paddingTop: isEmbedded ? "var(--phi-1)" : "0.625rem",
        }}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-16 top-0 h-px bg-linear-to-r from-transparent via-foreground/8 to-transparent" />
        <div className={isFullScreen ? "mx-auto w-full max-w-4xl" : "w-full"} data-chat-composer-shell="true">
          <ChatInput
            inputRef={inputRef}
            value={input}
            onChange={onInputChange}
            onSend={onSend}
            isSending={isSending}
            canSend={canSend}
            onArrowUp={() => {}}
            activeTrigger={activeTrigger}
            suggestions={suggestions}
            mentionIndex={mentionIndex}
            onMentionIndexChange={onMentionIndexChange}
            onSuggestionSelect={onSuggestionSelect}
            pendingFiles={pendingFiles}
            onFileSelect={onFileSelect}
            onFileRemove={onFileRemove}
          />
        </div>
      </div>
    </>
  );
}