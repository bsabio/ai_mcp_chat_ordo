"use client";

import React from "react";

export interface ChatConversationDataMenuProps {
  canCopyTranscript: boolean;
  canExportConversation: boolean;
  canImportConversation: boolean;
  isBusy?: boolean;
  onCopyTranscript?: () => void | Promise<unknown>;
  onExportConversation?: () => void | Promise<unknown>;
  onImportConversationFile?: (file: File) => void | Promise<unknown>;
}

export function ChatConversationDataMenu({
  canCopyTranscript,
  canExportConversation,
  canImportConversation,
  isBusy = false,
  onCopyTranscript,
  onExportConversation,
  onImportConversationFile,
}: ChatConversationDataMenuProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const closeMenu = React.useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  React.useEffect(() => {
    if (!open) {
      return undefined;
    }

    const firstAction = panelRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
    firstAction?.focus();

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      closeMenu();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      data-chat-conversation-data-menu="true"
    >
      <button
        ref={triggerRef}
        type="button"
        className="ui-chat-conversation-menu-trigger focus-ring"
        aria-label="Open conversation data menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <span>Data</span>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M5 7.5 10 12.5l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
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
            closeMenu(false);
          }
          event.currentTarget.value = "";
        }}
      />

      {open ? (
        <div
          ref={panelRef}
          className="ui-chat-conversation-menu-panel"
          role="menu"
          aria-label="Conversation data"
        >
          <button
            type="button"
            role="menuitem"
            disabled={!canCopyTranscript || isBusy}
            className="ui-chat-conversation-menu-item focus-ring"
            onClick={() => {
              void onCopyTranscript?.();
              closeMenu(false);
            }}
          >
            Copy transcript
          </button>

          <button
            type="button"
            role="menuitem"
            disabled={!canExportConversation || isBusy}
            className="ui-chat-conversation-menu-item focus-ring"
            onClick={() => {
              void onExportConversation?.();
              closeMenu(false);
            }}
          >
            Export JSON
          </button>

          <button
            type="button"
            role="menuitem"
            disabled={!canImportConversation || isBusy}
            className="ui-chat-conversation-menu-item focus-ring"
            onClick={() => fileInputRef.current?.click()}
          >
            Import JSON
          </button>
        </div>
      ) : null}
    </div>
  );
}