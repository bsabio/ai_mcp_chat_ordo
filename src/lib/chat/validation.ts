import Anthropic from "@anthropic-ai/sdk";
import { ChatMessage } from "@/lib/chat/types";

export function parseIncomingMessages(body: unknown): ChatMessage[] {
  const maybeMessages = (body as { messages?: ChatMessage[] })?.messages ?? [];

  if (!Array.isArray(maybeMessages) || maybeMessages.length === 0) {
    throw new Error("messages must be a non-empty array.");
  }

  return maybeMessages;
}

export function getLatestUserMessage(messages: ChatMessage[]): string {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content;

  if (!latestUserMessage) {
    throw new Error("No user message found.");
  }

  return latestUserMessage;
}

export function toAnthropicMessages(messages: ChatMessage[]): Anthropic.MessageParam[] {
  return messages
    .filter((message) => (message.role === "user" || message.role === "assistant") && message.content.trim())
    .map<Anthropic.MessageParam>((message) => ({
      role: message.role,
      content: message.content,
    }));
}
