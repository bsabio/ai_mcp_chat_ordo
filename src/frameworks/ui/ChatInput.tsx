import React, { useEffect, useRef } from "react";
import MentionsMenu from "@/components/MentionsMenu";
import type { MentionItem } from "@/core/entities/mentions";

interface ChatInputProps {
  helperTextId: string;
  helperMode?: "always" | "focus";
  canStopStream?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  maxTextareaHeight?: number;
  onStopStream?: () => void | Promise<unknown>;
  placeholderText?: string;
  value: string;
  onChange: (val: string, selectionStart: number) => void;
  onSend: () => void;
  isSending: boolean;
  canSend: boolean;
  onArrowUp: () => void;

  // Mentions
  activeTrigger: string | null;
  suggestions: MentionItem[];
  mentionIndex: number;
  onMentionIndexChange: (index: number) => void;
  onSuggestionSelect: (item: MentionItem) => void;

  // Files
  pendingFiles: File[];
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileRemove: (index: number) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  helperTextId,
  helperMode = "always",
  canStopStream = false,
  inputRef,
  maxTextareaHeight = 224,
  onStopStream,
  placeholderText = "Ask Studio Ordo...",
  value,
  onChange,
  onSend,
  isSending,
  canSend,
  onArrowUp,
  activeTrigger,
  suggestions,
  mentionIndex,
  onMentionIndexChange,
  onSuggestionSelect,
  pendingFiles,
  onFileSelect,
  onFileRemove,
}) => {
  const helperText = "Enter to send. Shift+Enter for line breaks.";
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = inputRef ?? internalTextareaRef;
  const hasInput = value.trim().length > 0;
  const showStopButton = canStopStream && typeof onStopStream === "function";
  const sendButtonClassName = [
    "ui-chat-send-button focus-ring flex min-h-11 shrink-0 items-center justify-center gap-(--space-2) self-center rounded-(--fva-shell-radius-control) px-(--chat-composer-button-padding-inline) py-(--chat-composer-button-padding-block) text-sm font-semibold transition-all duration-300 active:scale-95",
    hasInput ? "ui-chat-send-ready" : "ui-chat-send-idle",
    !canSend && hasInput ? "ui-chat-send-disabled" : "",
  ].join(" ");
  const stopButtonClassName = [
    "ui-chat-stop-button focus-ring flex min-h-11 shrink-0 items-center justify-center gap-(--space-2) self-center rounded-(--fva-shell-radius-control) border border-[color:color-mix(in_srgb,var(--danger,#b42318)_26%,transparent)] bg-[color:color-mix(in_srgb,var(--danger,#b42318)_10%,var(--surface))] px-(--chat-composer-button-padding-inline) py-(--chat-composer-button-padding-block) text-sm font-semibold text-[color:var(--danger,#b42318)] transition-all duration-300 hover:bg-[color:color-mix(in_srgb,var(--danger,#b42318)_14%,var(--surface))] active:scale-95",
  ].join(" ");

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }

    element.style.height = "0px";
    const nextHeight = Math.min(element.scrollHeight, maxTextareaHeight);
    element.style.height = `${Math.max(nextHeight, 44)}px`;
    element.style.overflowY = element.scrollHeight > maxTextareaHeight ? "auto" : "hidden";
  }, [maxTextareaHeight, textareaRef, value]);

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

  const handleEditLastMessage = (e: React.KeyboardEvent): boolean => {
    if (e.key === "ArrowUp" && value === "" && !isSending) {
      e.preventDefault();
      onArrowUp();
      return true;
    }
    return false;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (handleMentionsNavigation(e)) return;
    if (handleMessageSubmit(e)) return;
    handleEditLastMessage(e);
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* File Previews */}
      {pendingFiles.length > 0 && (
        <div className="mb-(--space-3) flex flex-wrap gap-(--space-2)">
          {pendingFiles.map((file, i) => (
            <div
              key={i}
              className="ui-chat-file-pill flex items-center gap-(--space-2) rounded-full px-(--space-3) py-(--space-2) text-[11px] font-medium"
            >
              <span className="max-w-30 truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => onFileRemove(i)}
                className="focus-ring rounded-full p-(--space-1) text-foreground/56 transition-colors hover:text-red-500"
                aria-label={`Remove ${file.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="ui-chat-composer-frame ui-chat-composer-frame-hover relative flex min-h-(--chat-composer-min-height) items-stretch gap-(--space-2) overflow-hidden rounded-(--chat-composer-radius) transition-all duration-300 hover:border-foreground/10 focus-within:ui-chat-composer-frame-focus"
        data-chat-composer-form="true"
        data-chat-composer-state={hasInput ? "ready" : "idle"}
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
            aria-describedby={helperTextId}
            rows={1}
            className="theme-body max-h-56 min-h-11 flex-1 resize-none overflow-y-auto bg-transparent px-(--chat-composer-field-padding-inline) py-(--chat-composer-field-padding-block) text-[1rem] font-normal leading-normal text-foreground outline-none placeholder:text-foreground/52"
          />
        </div>

        {showStopButton ? (
          <button
            type="button"
            onClick={() => {
              void onStopStream?.();
            }}
            className={stopButtonClassName}
            aria-label="Stop generation"
            data-chat-stop-state="active"
          >
            <span data-chat-stop-label="true">Stop</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            data-chat-send-state={hasInput ? "ready" : "idle"}
            className={sendButtonClassName}
            aria-label={isSending ? "Sending message" : "Send"}
          >
            {isSending ? (
              <span className="flex gap-(--space-1)">
                <span className="w-(--space-2) h-(--space-2) bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-(--space-2) h-(--space-2) bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-(--space-2) h-(--space-2) bg-current rounded-full animate-bounce" />
              </span>
            ) : (
              <>
                <span data-chat-send-label="true">Send</span>
                <span data-chat-send-icon="true" aria-hidden="true" className="hidden">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h13" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </span>
              </>
            )}
          </button>
        )}
      </form>

      <div
        id={helperTextId}
        className="ui-chat-helper-copy mt-(--space-1) flex flex-wrap items-center justify-start gap-x-(--space-2) gap-y-(--space-1) px-(--space-1) text-(length:--chat-composer-helper-font-size) leading-(--chat-composer-helper-line-height)"
        data-chat-composer-helper="true"
        data-chat-helper-mode={helperMode}
      >
        <span>{helperText}</span>
      </div>
    </div>
  );
};
