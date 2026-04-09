"use client";

import React from "react";

import type { PresentedMessage } from "@/adapters/ChatPresenter";
import type { MentionItem } from "@/core/entities/mentions";

import { ChatInput } from "./ChatInput";
import { ChatConversationToolbar } from "./ChatConversationToolbar";
import { ChatMessageViewport } from "./ChatMessageViewport";
import type { ActionLinkType } from "@/core/entities/rich-content";

interface ChatContentSurfaceProps {
  activeTrigger: string | null;
  canSend: boolean;
  canCopyTranscript?: boolean;
  canExportConversation?: boolean;
  canImportConversation?: boolean;
  canStopStream?: boolean;
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
  onRetryClick?: (retryKey: string) => void;
  onSend: () => void;
  onCopyTranscript?: () => void | Promise<unknown>;
  onExportConversation?: () => void | Promise<unknown>;
  onImportConversationFile?: (file: File) => void | Promise<unknown>;
  onSuggestionClick: (text: string) => void;
  onSuggestionSelect: (item: MentionItem) => void;
  onStopStream?: () => void | Promise<unknown>;
  pendingFiles: File[];
  isConversationActionPending?: boolean;
  scrollDependency: number;
  searchQuery: string;
  suggestions: MentionItem[];
}

export function ChatContentSurface({
  activeTrigger,
  canSend,
  canCopyTranscript,
  canExportConversation,
  canImportConversation,
  canStopStream,
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
  onRetryClick,
  onSend,
  onCopyTranscript,
  onExportConversation,
  onImportConversationFile,
  onSuggestionClick,
  onSuggestionSelect,
  onStopStream,
  pendingFiles,
  isConversationActionPending,
  scrollDependency,
  searchQuery,
  suggestions,
}: ChatContentSurfaceProps) {
  const helperTextId = isEmbedded
    ? "chat-composer-helper-embedded"
    : isFullScreen
      ? "chat-composer-helper-floating-fullscreen"
      : "chat-composer-helper-floating";

  return (
    <>
      <div className="relative h-full min-h-0 overflow-hidden">
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
          onRetryClick={onRetryClick}
          onSuggestionClick={onSuggestionClick}
          scrollDependency={scrollDependency}
          searchQuery={searchQuery}
        />
      </div>

      <div
        className={`ui-chat-composer-plane relative flex-none ${!isEmbedded && isFullScreen ? "safe-area-px safe-area-pb" : ""}`}
        data-chat-composer-row={isEmbedded ? "true" : undefined}
        data-chat-composer-plane={!isEmbedded ? "true" : undefined}
      >
        <ChatConversationToolbar
          canCopyTranscript={Boolean(canCopyTranscript)}
          canExportConversation={Boolean(canExportConversation)}
          canImportConversation={canImportConversation !== false}
          isBusy={Boolean(isConversationActionPending)}
          onCopyTranscript={onCopyTranscript}
          onExportConversation={onExportConversation}
          onImportConversationFile={onImportConversationFile}
        />
        <div aria-hidden="true" className="ui-chat-composer-seam pointer-events-none absolute inset-x-(--space-16) top-0 h-px" />
        <div className={isFullScreen ? "mx-auto w-full max-w-4xl" : "w-full"} data-chat-composer-shell="true">
          <ChatInput
            helperTextId={helperTextId}
            helperMode={!isEmbedded && !isFullScreen ? "focus" : "always"}
            inputRef={inputRef}
            maxTextareaHeight={isEmbedded ? 192 : isFullScreen ? 224 : 144}
            canStopStream={canStopStream}
            value={input}
            onChange={onInputChange}
            onSend={onSend}
            isSending={isSending}
            canSend={canSend}
            onArrowUp={() => {}}
            onStopStream={onStopStream}
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