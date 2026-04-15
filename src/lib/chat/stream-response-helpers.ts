import { NextResponse } from "next/server";

import type { createConversationRuntimeServices } from "@/lib/chat/conversation-root";
import type { RouteContext } from "@/lib/chat/http-facade";
import { logDegradation } from "@/lib/observability/logger";
import { REASON_CODES } from "@/lib/observability/reason-codes";
import { attachAssistantMessageToPromptTurn } from "@/lib/prompts/prompt-provenance-service";

export function sseChunk(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export function createSseResponse(
  context: RouteContext,
  stream: ReadableStream<Uint8Array>,
): NextResponse {
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "x-request-id": context.requestId,
    },
  });
}

export function createShortCircuitStreamResponse(
  context: RouteContext,
  conversationId: string,
  reply: string | null,
): NextResponse {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(sseChunk({ conversation_id: conversationId })));

      if (reply) {
        controller.enqueue(encoder.encode(sseChunk({ delta: reply })));
      }

      controller.close();
    },
  });

  return createSseResponse(context, stream);
}

export function toStreamErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("credit balance is too low")) {
    return "The configured Anthropic account has insufficient credits. Update the production AI key or billing, then retry.";
  }

  return message;
}

export async function attachPromptProvenanceRecord(
  conversationId: string,
  recordId: string | null | undefined,
  assistantMessageId: string | null | undefined,
): Promise<void> {
  if (!recordId || !assistantMessageId) {
    return;
  }

  try {
    await attachAssistantMessageToPromptTurn(recordId, assistantMessageId);
  } catch (error) {
    logDegradation(
      REASON_CODES.UNKNOWN_ROUTE_ERROR,
      "Prompt provenance assistant linkage failed",
      { conversationId, promptProvenanceRecordId: recordId, assistantMessageId },
      error,
    );
  }
}

export async function appendShortCircuitAssistantMessage(
  interactor: ReturnType<typeof createConversationRuntimeServices>["interactor"],
  conversationId: string,
  userId: string,
  text: string,
): Promise<void> {
  await interactor.appendMessage(
    {
      conversationId,
      role: "assistant",
      content: text,
      parts: [{ type: "text", text }],
    },
    userId,
  );
}