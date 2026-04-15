import type { Message } from "@/core/entities/conversation";
import { buildMessageContextText } from "@/lib/chat/message-attachments";
import { CHAT_CONFIG } from "@/lib/chat/chat-config";

export type ContextMessage = { role: "user" | "assistant"; content: string };

export type ContextWindowGuardStatus = "ok" | "warn" | "block";

export type ContextWindowGuardReason =
  | "message_count_near_limit"
  | "character_count_near_limit"
  | "messages_trimmed"
  | "characters_trimmed"
  | "latest_message_too_large";

export interface ContextWindowGuard {
  status: ContextWindowGuardStatus;
  reasons: ContextWindowGuardReason[];
  rawMessageCount: number;
  rawCharacterCount: number;
  finalMessageCount: number;
  finalCharacterCount: number;
  warnMessageCount: number;
  warnCharacterCount: number;
  maxMessageCount: number;
  maxCharacterCount: number;
}

function countCharacters(messages: ContextMessage[]): number {
  return messages.reduce((sum, message) => sum + message.content.length, 0);
}

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

function buildContextWindowGuard(
  normalized: ContextMessage[],
  trimmed: ContextMessage[],
): ContextWindowGuard {
  const rawMessageCount = normalized.length;
  const rawCharacterCount = countCharacters(normalized);
  const finalMessageCount = trimmed.length;
  const finalCharacterCount = countCharacters(trimmed);
  const reasons: ContextWindowGuardReason[] = [];

  if (rawMessageCount >= CHAT_CONFIG.warnContextMessages) {
    reasons.push("message_count_near_limit");
  }

  if (rawCharacterCount >= CHAT_CONFIG.warnContextCharacters) {
    reasons.push("character_count_near_limit");
  }

  if (finalMessageCount < rawMessageCount) {
    reasons.push("messages_trimmed");
  }

  if (finalCharacterCount < rawCharacterCount) {
    reasons.push("characters_trimmed");
  }

  if (finalCharacterCount > CHAT_CONFIG.maxContextCharacters) {
    reasons.push("latest_message_too_large");
  }

  const status = reasons.includes("latest_message_too_large")
    ? "block"
    : reasons.length > 0
      ? "warn"
      : "ok";

  return {
    status,
    reasons,
    rawMessageCount,
    rawCharacterCount,
    finalMessageCount,
    finalCharacterCount,
    warnMessageCount: CHAT_CONFIG.warnContextMessages,
    warnCharacterCount: CHAT_CONFIG.warnContextCharacters,
    maxMessageCount: CHAT_CONFIG.maxContextMessages,
    maxCharacterCount: CHAT_CONFIG.maxContextCharacters,
  };
}

export function buildContextWindowGuardPrompt(
  guard: ContextWindowGuard,
): string | null {
  if (guard.status !== "warn") {
    return null;
  }

  const lines = [
    "",
    "[Context window guard]",
    "The active conversation window is near capacity. Keep the response concise and avoid re-quoting long prior passages unless they are necessary.",
    `Window metrics: raw ${guard.rawMessageCount}/${guard.maxMessageCount} messages and ${guard.rawCharacterCount}/${guard.maxCharacterCount} chars before trimming; active ${guard.finalMessageCount} messages and ${guard.finalCharacterCount} chars after trimming.`,
  ];

  if (guard.reasons.includes("messages_trimmed") || guard.reasons.includes("characters_trimmed")) {
    lines.push("Older turns have already been trimmed from the live prompt window. Use the supplied conversation summary when present instead of assuming the full transcript is still in view.");
  } else {
    lines.push("No trimming has happened yet, but the live prompt window is close enough to its budget that additional turns may trigger compaction soon.");
  }

  return lines.join("\n");
}

export function buildGuardedContextWindow(
  rawMessages: ContextMessage[],
): {
  contextMessages: ContextMessage[];
  guard: ContextWindowGuard;
} {
  const normalized = normalizeAlternation(rawMessages);
  const contextMessages = trimToLimits(normalized);

  return {
    contextMessages,
    guard: buildContextWindowGuard(normalized, contextMessages),
  };
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
  guard: ContextWindowGuard;
} {
  // Find the most recent summary message (role=system with a summary part)
  let lastSummaryIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "system" && (msg.parts ?? []).some((p) => p.type === "summary" || p.type === "meta_summary")) {
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

  const { contextMessages, guard } = buildGuardedContextWindow(raw);

  return { contextMessages, hasSummary, summaryText, guard };
}
