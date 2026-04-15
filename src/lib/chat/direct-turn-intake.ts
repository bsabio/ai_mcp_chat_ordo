import { z } from "zod";

import { ValidationError } from "@/core/common/errors";
import { logDegradation } from "@/lib/observability/logger";
import {
  getLatestUserMessage,
  type ChatMessage,
} from "@/lib/chat/validation";

const DirectChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(100_000),
      }),
    )
    .min(1),
});

export type DirectChatRequest = z.infer<typeof DirectChatRequestSchema>;

export type ParsedDirectChatRequest = {
  incomingMessages: ChatMessage[];
  latestUserText: string;
};

function formatDirectChatValidationError(raw: unknown): string {
  const maybeMessages = (raw as { messages?: unknown[] })?.messages;

  if (!Array.isArray(maybeMessages) || maybeMessages.length === 0) {
    return "messages must be a non-empty array.";
  }

  return "messages must include non-empty user or assistant content.";
}

export function validateAndParseDirectChatRequest(
  raw: unknown,
): ParsedDirectChatRequest {
  const parseResult = DirectChatRequestSchema.safeParse(raw);

  if (!parseResult.success) {
    const errorMsg = formatDirectChatValidationError(raw);
    logDegradation(
      "DIRECT_CHAT_VALIDATION_FAILED",
      "Direct chat request failed schema validation",
      { errorMsg },
    );
    throw new ValidationError(errorMsg);
  }

  const incomingMessages = parseResult.data.messages;

  return {
    incomingMessages,
    latestUserText: getLatestUserMessage(incomingMessages),
  };
}