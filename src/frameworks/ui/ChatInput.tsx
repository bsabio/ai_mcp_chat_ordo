import React, { useEffect, useRef } from "react";
import MentionsMenu from "@/components/MentionsMenu";
import type { MentionItem } from "@/core/entities/mentions";
import { ComposerFilePills } from "./ComposerFilePills";
import { ComposerSendControl } from "./ComposerSendControl";

interface ChatInputProps {
  canStopStream?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  maxTextareaHeight?: number;
  onStopStream?: () => void | Promise<unknown>;
  placeholderText?: string;
  sendError?: string | null;
  value: string;
  onChange: (val: string, selectionStart: number) => void;
  onSend: () => void;
  isSending: boolean;
  canSend: boolean;

  // Mentions
  activeTrigger: string | null;
  suggestions: MentionItem[];
  mentionIndex: number;
  onMentionIndexChange: (index: number) => void;
  onSuggestionSelect: (item: MentionItem) => void;

  // Files
  pendingFiles: File[];
  onFileDrop: (event: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileRemove: (index: number) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  canStopStream = false,
  inputRef,
  maxTextareaHeight = 224,
  onStopStream,
  placeholderText = "Ask Studio Ordo...",
  sendError = null,
  value,
  onChange,
  onSend,
  isSending,
  canSend,
  activeTrigger,
  suggestions,
  mentionIndex,
  onMentionIndexChange,
  onSuggestionSelect,
  pendingFiles,
  onFileDrop,
  onFileSelect,
  onFileRemove,
}) => {
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousHeightRef = useRef(0);
  const dragDepthRef = useRef(0);
  const textareaRef = inputRef ?? internalTextareaRef;
  const hasContent = value.trim().length > 0 || pendingFiles.length > 0;

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    if (isSending && value === "") return;

    element.style.height = "0px";
    const nextHeight = Math.max(Math.min(element.scrollHeight, maxTextareaHeight), 44);

    if (nextHeight !== previousHeightRef.current) {
      element.style.height = `${nextHeight}px`;
      element.style.overflowY = element.scrollHeight > maxTextareaHeight ? "auto" : "hidden";
      previousHeightRef.current = nextHeight;
    } else {
      element.style.height = `${nextHeight}px`;
    }
  }, [isSending, maxTextareaHeight, textareaRef, value]);

  const handleMentionsNavigation = (e: React.KeyboardEvent): boolean => {
    if (!activeTrigger || suggestions.length === 0) return false;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      onMentionIndexChange((mentionIndex + 1) % suggestions.length);
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      onMentionIndexChange(
        (mentionIndex - 1 + suggestions.length) % suggestions.length,
      );
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const item = suggestions[mentionIndex];
      if (item) onSuggestionSelect(item);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onChange(value, 0);
      return true;
    }
    return false;
  };

  const handleMessageSubmit = (e: React.KeyboardEvent): boolean => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSend();
      return true;
    }
    return false;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (handleMentionsNavigation(e)) return;
    handleMessageSubmit(e);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <ComposerFilePills files={pendingFiles} onRemove={onFileRemove} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepthRef.current += 1;
          e.currentTarget.setAttribute("data-chat-composer-dragover", "true");
        }}
        onDragLeave={() => {
          dragDepthRef.current -= 1;
          if (dragDepthRef.current === 0) {
            const form = document.querySelector("[data-chat-composer-form]");
            form?.removeAttribute("data-chat-composer-dragover");
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          dragDepthRef.current = 0;
          e.currentTarget.removeAttribute("data-chat-composer-dragover");
          onFileDrop(e);
        }}
        className="ui-chat-composer-frame ui-chat-composer-frame-hover relative flex min-h-(--chat-composer-min-height) items-stretch gap-(--space-2) overflow-hidden rounded-(--chat-composer-radius) transition-all duration-300 hover:border-foreground/10 focus-within:ui-chat-composer-frame-focus"
        data-chat-composer-form="true"
        data-chat-composer-state={hasContent ? "ready" : "idle"}
        data-chat-composer-error={sendError ? "true" : undefined}
      >
        {activeTrigger && suggestions.length > 0 && (
          <MentionsMenu
            suggestions={suggestions}
            activeIndex={mentionIndex}
            onSelect={onSuggestionSelect}
          />
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          className="hidden"
          multiple
          accept="application/pdf,text/plain,image/jpeg,image/png,image/gif,image/webp"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          className="ui-chat-attach-button ui-chat-attach-button-surface focus-ring min-h-11 min-w-11 shrink-0 self-center rounded-(--fva-shell-radius-control) p-(--space-2) active:scale-95 disabled:cursor-not-allowed"
          aria-label="Attach file"
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <div className="ui-chat-composer-field relative flex min-h-11 flex-1 items-center self-stretch rounded-(--fva-shell-radius-composer-field) px-(--space-1) transition-shadow duration-300" data-chat-composer-field="true">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value, e.target.selectionStart ?? 0)}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            rows={1}
            enterKeyHint="send"
            aria-label="Message"
            role={activeTrigger && suggestions.length > 0 ? "combobox" : undefined}
            aria-expanded={activeTrigger && suggestions.length > 0 ? true : undefined}
            aria-haspopup={activeTrigger && suggestions.length > 0 ? "listbox" : undefined}
            aria-activedescendant={
              activeTrigger && suggestions.length > 0
                ? `mention-option-${mentionIndex}`
                : undefined
            }
            className="theme-body max-h-56 min-h-11 flex-1 resize-none overflow-y-auto bg-transparent px-(--chat-composer-field-padding-inline) py-(--chat-composer-field-padding-block) text-[1rem] font-normal leading-normal text-foreground outline-none placeholder:text-foreground/52"
          />
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
            data-chat-mention-live="true"
          >
            {activeTrigger && suggestions.length > 0
              ? `${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"} available`
              : ""}
          </div>
        </div>

        <ComposerSendControl
          canSend={canSend}
          hasContent={hasContent}
          isSending={isSending}
          canStopStream={canStopStream ?? false}
          onStopStream={onStopStream}
        />
      </form>
      {sendError && (
        <div role="alert" className="sr-only">{sendError}</div>
      )}
    </div>
  );
};
