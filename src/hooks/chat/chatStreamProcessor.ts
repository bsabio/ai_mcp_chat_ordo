import {
  ConversationIdStrategy,
  ErrorStrategy,
  StreamProcessor,
  TextDeltaStrategy,
  ToolCallStrategy,
  ToolResultStrategy,
} from "@/lib/chat/StreamStrategy";

export function createChatStreamProcessor(): StreamProcessor {
  return new StreamProcessor([
    new TextDeltaStrategy(),
    new ToolCallStrategy(),
    new ToolResultStrategy(),
    new ErrorStrategy(),
    new ConversationIdStrategy(),
  ]);
}