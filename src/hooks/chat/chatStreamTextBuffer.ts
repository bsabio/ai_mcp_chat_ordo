import type { Dispatch } from "react";

import type { ChatAction } from "./chatState";

interface ChatStreamTextBufferOptions {
  assistantIndex: number;
  dispatch: Dispatch<ChatAction>;
}

export interface ChatStreamTextBuffer {
  append: (delta: string) => void;
  flush: () => void;
  flushBeforeNonTextEvent: () => void;
  dispose: () => void;
}

function splitRenderableMarkdownTail(text: string): {
  flushableText: string;
  pendingTail: string;
} {
  const incompleteSuffix = text.match(/(\[\[[^\]]*$|\[\[[^\]]+\]$|\[[^\]]*$|\[[^\]]+\]\([^)]*$|\*\*[^*]*$|`[^`]*$)$/);

  if (!incompleteSuffix || incompleteSuffix.index == null) {
    return { flushableText: text, pendingTail: "" };
  }

  return {
    flushableText: text.slice(0, incompleteSuffix.index),
    pendingTail: text.slice(incompleteSuffix.index),
  };
}

export function createChatStreamTextBuffer({
  assistantIndex,
  dispatch,
}: ChatStreamTextBufferOptions): ChatStreamTextBuffer {
  let pendingTextDelta = "";
  let pendingTextFlushHandle: ReturnType<typeof setTimeout> | null = null;

  const dispatchTextDelta = (delta: string) => {
    if (!delta) {
      return;
    }

    dispatch({ type: "APPEND_TEXT", index: assistantIndex, delta });
  };

  const flush = () => {
    if (!pendingTextDelta) {
      return;
    }

    dispatchTextDelta(pendingTextDelta);
    pendingTextDelta = "";
  };

  const flushRenderablePrefix = () => {
    if (!pendingTextDelta) {
      return;
    }

    const { flushableText, pendingTail } = splitRenderableMarkdownTail(pendingTextDelta);
    dispatchTextDelta(flushableText);
    pendingTextDelta = pendingTail;
  };

  const cancelPendingFlush = () => {
    if (pendingTextFlushHandle != null) {
      clearTimeout(pendingTextFlushHandle);
      pendingTextFlushHandle = null;
    }
  };

  const schedulePendingFlush = () => {
    if (pendingTextFlushHandle != null) {
      return;
    }

    pendingTextFlushHandle = setTimeout(() => {
      pendingTextFlushHandle = null;
      flushRenderablePrefix();
    }, 0);
  };

  return {
    append(delta) {
      pendingTextDelta += delta;
      schedulePendingFlush();
    },
    flush,
    flushBeforeNonTextEvent() {
      cancelPendingFlush();
      flush();
    },
    dispose() {
      cancelPendingFlush();
      flush();
    },
  };
}