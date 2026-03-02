import Anthropic from "@anthropic-ai/sdk";
import { ChatProvider } from "@/lib/chat/anthropic-client";
import { ToolChoice } from "@/lib/chat/types";

type CreateMessageArgs = {
  messages: Anthropic.MessageParam[];
  toolChoice: ToolChoice;
};

export function withProviderTiming(
  provider: ChatProvider,
  onComplete: (outcome: { durationMs: number; isError: boolean }) => void,
): ChatProvider {
  return {
    async createMessage(args: CreateMessageArgs) {
      const startedAt = Date.now();
      try {
        const response = await provider.createMessage(args);
        onComplete({ durationMs: Date.now() - startedAt, isError: false });
        return response;
      } catch (error) {
        onComplete({ durationMs: Date.now() - startedAt, isError: true });
        throw error;
      }
    },
  };
}

export function withProviderErrorMapping(provider: ChatProvider): ChatProvider {
  return {
    async createMessage(args: CreateMessageArgs) {
      try {
        return await provider.createMessage(args);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected provider error.";
        throw new Error(message);
      }
    },
  };
}
