import {
  ConversationIdStrategy,
  ErrorStrategy,
  JobCanceledStrategy,
  JobCompletedStrategy,
  JobFailedStrategy,
  JobProgressStrategy,
  JobQueuedStrategy,
  JobStartedStrategy,
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
    new JobQueuedStrategy(),
    new JobStartedStrategy(),
    new JobProgressStrategy(),
    new JobCompletedStrategy(),
    new JobCanceledStrategy(),
    new JobFailedStrategy(),
  ]);
}