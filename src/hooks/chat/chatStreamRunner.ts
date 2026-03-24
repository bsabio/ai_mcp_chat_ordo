import type { StreamEvent } from "@/core/entities/chat-stream";
import type { StreamProcessor } from "@/lib/chat/StreamStrategy";

import type { ChatStreamDispatcher } from "./chatStreamDispatch";
import type { ChatStreamTextBuffer } from "./chatStreamTextBuffer";

interface ChatStreamEventSource {
  events: () => AsyncIterable<StreamEvent>;
}

interface RunChatStreamOptions {
  stream: ChatStreamEventSource;
  textBuffer: ChatStreamTextBuffer;
  streamDispatch: ChatStreamDispatcher;
  streamProcessor: StreamProcessor;
  assistantIndex: number;
}

export async function runChatStream({
  stream,
  textBuffer,
  streamDispatch,
  streamProcessor,
  assistantIndex,
}: RunChatStreamOptions): Promise<string | null> {
  for await (const event of stream.events()) {
    if (event.type === "text") {
      textBuffer.append(event.delta);
      continue;
    }

    textBuffer.flushBeforeNonTextEvent();
    streamProcessor.process(event, {
      dispatch: streamDispatch.dispatchStreamAction,
      assistantIndex,
    });
  }

  textBuffer.dispose();

  return streamDispatch.getResolvedConversationId();
}