import type { Message } from "@/core/entities/conversation";
import { buildMessageContextText } from "@/lib/chat/message-attachments";
import { CHAT_CONFIG } from "@/lib/chat/chat-config";

type ContextMessage = { role: "user" | "assistant"; content: string };

/**
 * Merge consecutive messages with the same role into a single message.
 *
 * Anthropic requires strict user/assistant alternation.  Consecutive
 * same-role messages can appear when a stream fails before persisting
 * the assistant reply and the user sends follow-ups.
 */
export function normalizeAlternation(
  messages: ContextMessage[],
): ContextMessage[] {
  if (messages.length === 0) return [];

  const merged: ContextMessage[] = [{ ...messages[0] }];
  for (let i = 1; i < messages.length; i++) {
    const prev = merged[merged.length - 1];
    if (messages[i].role === prev.role) {
      prev.content = prev.content + "\n\n" + messages[i].content;
    } else {
      merged.push({ ...messages[i] });
    }
  }
  return merged;
}

/**
 * Trim the message list from the front so it stays within the
 * configured message-count and character budgets.
 * Always keeps at least the most recent message.
 */
function trimToLimits(messages: ContextMessage[]): ContextMessage[] {
  const maxMessages = CHAT_CONFIG.maxContextMessages;
  const maxChars = CHAT_CONFIG.maxContextCharacters;

  let trimmed = messages.length > maxMessages
    ? messages.slice(messages.length - maxMessages)
    : messages;

  let totalChars = trimmed.reduce((sum, m) => sum + m.content.length, 0);
  while (totalChars > maxChars && trimmed.length > 1) {
    totalChars -= trimmed[0].content.length;
    trimmed = trimmed.slice(1);
  }

  // Ensure the window starts with a user message (Anthropic requirement)
  while (trimmed.length > 1 && trimmed[0].role !== "user") {
    trimmed = trimmed.slice(1);
  }

  return trimmed;
}

/**
 * Builds a bounded context window for LLM calls.
 *
 * Strategy (spec §8.5):
 *   [most recent summary message, if any (as a system message)]
 *   [all messages created after the summary]
 *   [current user message — already included in messages]
 *
 * Also returns whether a summary was included, so the caller can
 * append the trust signal to the system prompt.
 */
export function buildContextWindow(messages: Message[]): {
  contextMessages: ContextMessage[];
  hasSummary: boolean;
  summaryText: string | null;
} {
  // Find the most recent summary message (role=system with a summary part)
  let lastSummaryIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "system" && msg.parts.some((p) => p.type === "summary" || p.type === "meta_summary")) {
      lastSummaryIndex = i;
      break;
    }
  }

  let raw: ContextMessage[];
  let hasSummary: boolean;
  let summaryText: string | null;

  if (lastSummaryIndex === -1) {
    // No summary — send all non-system messages
    raw = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: buildMessageContextText(m.content, m.parts),
      }));
    hasSummary = false;
    summaryText = null;
  } else {
    const summaryMessage = messages[lastSummaryIndex];
    const messagesAfterSummary = messages
      .slice(lastSummaryIndex + 1)
      .filter((m) => m.role !== "system");

    raw = messagesAfterSummary.map((m) => ({
      role: m.role as "user" | "assistant",
      content: buildMessageContextText(m.content, m.parts),
    }));
    hasSummary = true;
    summaryText = summaryMessage.content;
  }

  // Normalize alternation (merge consecutive same-role messages)
  const normalized = normalizeAlternation(raw);

  // Enforce size limits
  const trimmed = trimToLimits(normalized);

  return { contextMessages: trimmed, hasSummary, summaryText };
}
