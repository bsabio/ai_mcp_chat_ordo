import type Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "@/lib/chat/types";
import { ValidationError } from "@/core/common/errors";

export type { ChatMessage } from "@/lib/chat/types";

export function parseIncomingMessages(body: unknown): ChatMessage[] {
  const maybeMessages = (body as { messages?: ChatMessage[] })?.messages ?? [];

  if (!Array.isArray(maybeMessages) || maybeMessages.length === 0) {
    throw new ValidationError("messages must be a non-empty array.");
  }

  return maybeMessages;
}

export function findLatestUserMessage(messages: ChatMessage[]): string | null {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user")?.content.trim();

  return latestUserMessage && latestUserMessage.length > 0
    ? latestUserMessage
    : null;
}

export function getLatestUserMessage(messages: ChatMessage[]): string {
  const latestUserMessage = findLatestUserMessage(messages);

  if (!latestUserMessage) {
    throw new ValidationError("No user message found.");
  }

  return latestUserMessage;
}

export function toAnthropicMessages(
  messages: ChatMessage[],
): Anthropic.MessageParam[] {
  return messages
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        message.content.trim(),
    )
    .map<Anthropic.MessageParam>((message) => ({
      role: message.role,
      content: message.content,
    }));
}
