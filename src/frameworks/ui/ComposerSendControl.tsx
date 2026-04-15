import React from "react";

interface ComposerSendControlProps {
  canSend: boolean;
  hasContent: boolean;
  isSending: boolean;
  canStopStream: boolean;
  onStopStream?: () => void | Promise<unknown>;
}

export function ComposerSendControl({
  canSend,
  hasContent,
  isSending,
  canStopStream,
  onStopStream,
}: ComposerSendControlProps) {
  const showStopButton = canStopStream && typeof onStopStream === "function";

  const sendButtonClassName = [
    "ui-chat-send-button focus-ring flex min-h-11 shrink-0 items-center justify-center gap-(--space-2) self-center rounded-(--fva-shell-radius-control) px-(--chat-composer-button-padding-inline) py-(--chat-composer-button-padding-block) text-sm font-semibold transition-all duration-300 active:scale-95",
    hasContent ? "ui-chat-send-ready" : "ui-chat-send-idle",
    !canSend && hasContent ? "ui-chat-send-disabled" : "",
  ].join(" ");

  const stopButtonClassName =
    "ui-chat-stop-button focus-ring flex min-h-11 shrink-0 items-center justify-center gap-(--space-2) self-center rounded-(--fva-shell-radius-control) border border-[color:color-mix(in_srgb,var(--danger,#b42318)_26%,transparent)] bg-[color:color-mix(in_srgb,var(--danger,#b42318)_10%,var(--surface))] px-(--chat-composer-button-padding-inline) py-(--chat-composer-button-padding-block) text-sm font-semibold text-[color:var(--danger,#b42318)] transition-all duration-300 hover:bg-[color:color-mix(in_srgb,var(--danger,#b42318)_14%,var(--surface))] active:scale-95";

  if (showStopButton) {
    return (
      <button
        type="button"
        onClick={() => { void onStopStream?.(); }}
        className={stopButtonClassName}
        aria-label="Stop generation"
        data-chat-stop-state="active"
      >
        <span data-chat-stop-label="true">Stop</span>
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={!canSend}
      data-chat-send-state={hasContent ? "ready" : "idle"}
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
  );
}
