import { useCallback, type Dispatch } from "react";

import type { AttachmentPart } from "@/lib/chat/message-attachments";
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
  dispatch: Dispatch<ChatAction>;
  setConversationId: (conversationId: string | null) => void;
}

export function useChatStreamRuntime({
  conversationId,
  dispatch,
  setConversationId,
}: UseChatStreamRuntimeOptions) {
  return useCallback(
    async (
      historyForBackend: Array<{ role: string; content: string }>,
      assistantIndex: number,
      attachments: AttachmentPart[],
      taskOriginHandoff?: TaskOriginHandoff,
    ): Promise<string | null> => {
      const stream = await streamAdapter.fetchStream(historyForBackend, {
        conversationId: conversationId || undefined,
        attachments,
        taskOriginHandoff,
      });
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
    [conversationId, dispatch, setConversationId],
  );
}