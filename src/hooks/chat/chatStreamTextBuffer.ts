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

export function createChatStreamTextBuffer({
  assistantIndex,
  dispatch,
}: ChatStreamTextBufferOptions): ChatStreamTextBuffer {
  let pendingTextDelta = "";
  let pendingTextFlushHandle: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (!pendingTextDelta) {
      return;
    }

    dispatch({ type: "APPEND_TEXT", index: assistantIndex, delta: pendingTextDelta });
    pendingTextDelta = "";
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
      flush();
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