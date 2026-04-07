import { useCallback, type Dispatch } from "react";

import type { AttachmentPart } from "@/lib/chat/message-attachments";
import type { CurrentPageSnapshot } from "@/lib/chat/current-page-context";
import type { TaskOriginHandoff } from "@/lib/chat/task-origin-handoff";

import { getChatStreamAdapter } from "./chatStreamAdapter";
import { createChatStreamDispatcher } from "./chatStreamDispatch";
import { createChatStreamProcessor } from "./chatStreamProcessor";
import { runChatStream } from "./chatStreamRunner";
import { createChatStreamTextBuffer } from "./chatStreamTextBuffer";
import type { ChatAction } from "./chatState";

const streamAdapter = getChatStreamAdapter();
const streamProcessor = createChatStreamProcessor();

interface UseChatStreamRuntimeOptions {
  conversationId: string | null;
  currentPathname: string;
  dispatch: Dispatch<ChatAction>;
  setConversationId: (conversationId: string | null) => void;
}

export function useChatStreamRuntime({
  conversationId,
  currentPathname,
  dispatch,
  setConversationId,
}: UseChatStreamRuntimeOptions) {
  return useCallback(
    async (
      historyForBackend: Array<{ role: string; content: string }>,
      assistantIndex: number,
      attachments: AttachmentPart[],
      taskOriginHandoff?: TaskOriginHandoff,
      currentPageSnapshot?: CurrentPageSnapshot,
    ): Promise<string | null> => {
      const streamOptions = {
        conversationId: conversationId || undefined,
        currentPathname,
        attachments,
        taskOriginHandoff,
        ...(currentPageSnapshot ? { currentPageSnapshot } : {}),
      };
      const stream = await streamAdapter.fetchStream(historyForBackend, streamOptions);
      const textBuffer = createChatStreamTextBuffer({ assistantIndex, dispatch });
      const streamDispatch = createChatStreamDispatcher({
        initialConversationId: conversationId,
        dispatch,
        setConversationId,
      });

      return runChatStream({
        stream,
        textBuffer,
        streamDispatch,
        streamProcessor,
        assistantIndex,
      });
    },
    [conversationId, currentPathname, dispatch, setConversationId],
  );
}