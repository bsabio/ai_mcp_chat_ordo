import type { Message } from "@/core/entities/conversation";
import { buildMessageContextText } from "@/lib/chat/message-attachments";

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
  contextMessages: Array<{ role: "user" | "assistant"; content: string }>;
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

  if (lastSummaryIndex === -1) {
    // No summary — send all non-system messages
    return {
      contextMessages: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: buildMessageContextText(m.content, m.parts),
        })),
      hasSummary: false,
      summaryText: null,
    };
  }

  const summaryMessage = messages[lastSummaryIndex];
  const messagesAfterSummary = messages
    .slice(lastSummaryIndex + 1)
    .filter((m) => m.role !== "system");

  return {
    contextMessages: messagesAfterSummary.map((m) => ({
      role: m.role as "user" | "assistant",
      content: buildMessageContextText(m.content, m.parts),
    })),
    hasSummary: true,
    summaryText: summaryMessage.content,
  };
}
