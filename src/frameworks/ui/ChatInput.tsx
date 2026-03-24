import React, { useEffect, useRef } from "react";
import MentionsMenu from "@/components/MentionsMenu";
import type { MentionItem } from "@/core/entities/mentions";

interface ChatInputProps {
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
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
  inputRef,
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
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = inputRef ?? internalTextareaRef;
  const hasInput = value.trim().length > 0;
  const helperTextId = React.useId();

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }

    element.style.height = "0px";
    const nextHeight = Math.min(element.scrollHeight, 224);
    element.style.height = `${Math.max(nextHeight, 44)}px`;
    element.style.overflowY = element.scrollHeight > 224 ? "auto" : "hidden";
  }, [textareaRef, value]);

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
        <div className="mb-3 flex flex-wrap gap-2">
          {pendingFiles.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-full border border-foreground/8 bg-background/82 px-3 py-1.5 text-[11px] font-medium text-foreground/72 shadow-[0_8px_16px_-18px_color-mix(in_srgb,var(--shadow-base)_18%,transparent)]"
            >
              <span className="max-w-30 truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => onFileRemove(i)}
                className="focus-ring rounded-full p-0.5 text-foreground/44 transition-colors hover:text-red-500"
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
        className="relative flex min-h-(--chat-composer-min-height) items-stretch gap-(--phi-1) overflow-hidden rounded-(--chat-composer-radius) border border-foreground/8 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--background)_80%,transparent)_0%,color-mix(in_oklab,var(--background)_94%,transparent)_100%)] shadow-[0_22px_48px_-38px_color-mix(in_srgb,var(--shadow-base)_18%,transparent)] backdrop-blur-[14px] transition-all duration-300 focus-within:border-foreground/12 focus-within:shadow-[0_24px_52px_-38px_color-mix(in_srgb,var(--shadow-base)_24%,transparent)] hover:border-foreground/10"
        style={{ padding: 'var(--input-padding)' }}
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
              className="focus-ring min-h-11 min-w-11 shrink-0 self-center rounded-full bg-transparent p-(--phi-2) text-foreground/28 transition-all hover:bg-background/80 hover:text-foreground/48 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Attach file"
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <div className="relative flex min-h-11 flex-1 items-center self-stretch rounded-[calc(var(--chat-composer-radius)-var(--phi-1))] bg-[color-mix(in_oklab,var(--surface)_72%,transparent)] px-(--phi-1) transition-shadow duration-300" data-chat-composer-field="true">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value, e.target.selectionStart ?? 0)}
            onKeyDown={handleKeyDown}
            placeholder="Paste the workflow, use case, or handoff you want to test..."
            aria-describedby={helperTextId}
            rows={1}
                  className="theme-body max-h-56 min-h-11 flex-1 resize-none overflow-y-auto bg-transparent px-(--hero-composer-field-padding-inline) py-(--hero-composer-field-padding-block) text-[1rem] font-normal leading-normal text-foreground outline-none placeholder:text-foreground/34"
          />
        </div>

        <button
          type="submit"
          disabled={!canSend}
          data-chat-send-state={hasInput ? "ready" : "idle"}
          className={[
            "focus-ring theme-label tier-micro flex min-h-10 shrink-0 items-center gap-2 rounded-full px-(--chat-composer-button-padding-inline) py-(--chat-composer-button-padding-block) font-semibold transition-all duration-300 hover:-translate-y-px active:translate-y-0 active:scale-95",
            hasInput
              ? "bg-foreground text-background shadow-[0_12px_20px_-16px_color-mix(in_srgb,var(--shadow-base)_24%,transparent)] hover:bg-foreground/92 hover:shadow-[0_14px_22px_-16px_color-mix(in_srgb,var(--shadow-base)_28%,transparent)]"
              : "bg-transparent text-foreground/20 shadow-none hover:text-foreground/32",
            !canSend && !hasInput ? "opacity-100" : "",
            !canSend && hasInput ? "disabled:bg-[color-mix(in_oklab,var(--surface-muted)_92%,var(--background))] disabled:text-foreground/42 disabled:shadow-none" : "",
          ].join(" ")}
          aria-label={isSending ? "Sending message" : "Send"}
        >
          {isSending ? (
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
            </span>
          ) : (
            "Send"
          )}
        </button>
      </form>

      <div
        id={helperTextId}
        className="mt-2 flex items-center justify-between gap-3 px-1 text-(length:--chat-composer-helper-font-size) leading-(--chat-composer-helper-line-height) text-foreground/34"
        data-chat-composer-helper="true"
      >
        <span>Enter to send. Shift+Enter for a line break.</span>
        <span className="text-right">Attach notes, screenshots, or briefs when context matters.</span>
      </div>
    </div>
  );
};
