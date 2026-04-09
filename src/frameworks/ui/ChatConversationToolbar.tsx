"use client";

import React from "react";

interface ChatConversationToolbarProps {
  canCopyTranscript: boolean;
  canExportConversation: boolean;
  canImportConversation: boolean;
  isBusy?: boolean;
  onCopyTranscript?: () => void | Promise<unknown>;
  onExportConversation?: () => void | Promise<unknown>;
  onImportConversationFile?: (file: File) => void | Promise<unknown>;
}

export function ChatConversationToolbar({
  canCopyTranscript,
  canExportConversation,
  canImportConversation,
  isBusy = false,
  onCopyTranscript,
  onExportConversation,
  onImportConversationFile,
}: ChatConversationToolbarProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-(--space-2) px-(--space-2) pb-(--space-2) pt-(--space-2)"
      role="toolbar"
      aria-label="Conversation tools"
      data-chat-conversation-toolbar="true"
    >
      <button
        type="button"
        disabled={!canCopyTranscript || isBusy}
        onClick={() => void onCopyTranscript?.()}
        className="ui-chat-action-chip inline-flex items-center gap-(--space-2) rounded-full px-(--space-inset-compact) py-(--space-1) text-[0.78rem] font-semibold transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-45"
      >
        Copy transcript
      </button>

      <button
        type="button"
        disabled={!canExportConversation || isBusy}
        onClick={() => void onExportConversation?.()}
        className="ui-chat-action-chip inline-flex items-center gap-(--space-2) rounded-full px-(--space-inset-compact) py-(--space-1) text-[0.78rem] font-semibold transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-45"
      >
        Export JSON
      </button>

      <button
        type="button"
        disabled={!canImportConversation || isBusy}
        onClick={() => fileInputRef.current?.click()}
        className="ui-chat-action-chip inline-flex items-center gap-(--space-2) rounded-full px-(--space-inset-compact) py-(--space-1) text-[0.78rem] font-semibold transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-45"
      >
        Import JSON
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void onImportConversationFile?.(file);
          }
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}