import {
  ConversationIdStrategy,
  ErrorStrategy,
  GenerationInterruptedStrategy,
  GenerationStoppedStrategy,
  JobCanceledStrategy,
  JobCompletedStrategy,
  JobFailedStrategy,
  JobProgressStrategy,
  JobQueuedStrategy,
  JobStartedStrategy,
  StreamIdStrategy,
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
    new GenerationStoppedStrategy(),
    new GenerationInterruptedStrategy(),
    new ErrorStrategy(),
    new StreamIdStrategy(),
    new ConversationIdStrategy(),
    new JobQueuedStrategy(),
    new JobStartedStrategy(),
    new JobProgressStrategy(),
    new JobCompletedStrategy(),
    new JobCanceledStrategy(),
    new JobFailedStrategy(),
  ]);
}