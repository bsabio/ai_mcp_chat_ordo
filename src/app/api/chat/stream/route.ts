import { NextRequest, NextResponse } from "next/server";
import { getAnthropicApiKey } from "@/lib/config/env";
import { getModelCandidates, looksLikeMath, SYSTEM_PROMPT } from "@/lib/chat/policy";
import { SseTextParser } from "@/lib/chat/sse-parser";
import { createAbortTimeout, safeCancelReader } from "@/lib/chat/disposability";
import { errorJson, runRouteTemplate, successText } from "@/lib/chat/http-facade";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function toAnthropicMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => (message.role === "user" || message.role === "assistant") && message.content.trim())
    .map((message) => ({ role: message.role, content: message.content }));
}

async function createAnthropicStream(
  apiKey: string,
  payload: { messages: { role: "user" | "assistant"; content: string }[]; model: string },
  timeoutMs = 15_000,
) {
  const { controller, clear } = createAbortTimeout(timeoutMs);

  try {
    return await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: payload.model,
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: payload.messages,
        stream: true,
      }),
    });
  } finally {
    clear();
  }
}

export async function POST(request: NextRequest) {
  return runRouteTemplate({
    route: "/api/chat/stream",
    request,
    execute: async (context) => {
      const apiKey = getAnthropicApiKey();

      const body = (await request.json()) as { messages?: ChatMessage[] };
      const incomingMessages = body.messages ?? [];

      if (!Array.isArray(incomingMessages) || incomingMessages.length === 0) {
        return errorJson(context, "messages must be a non-empty array.", 400);
      }

      const latestUserMessage = [...incomingMessages]
        .reverse()
        .find((message) => message.role === "user")?.content;

      if (!latestUserMessage) {
        return errorJson(context, "No user message found.", 400);
      }

      if (looksLikeMath(latestUserMessage)) {
        const mathResponse = await fetch(new URL("/api/chat", request.url), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: incomingMessages }),
        });

        const mathPayload = (await mathResponse.json()) as { reply?: string; error?: string };
        if (!mathResponse.ok) {
          return errorJson(context, mathPayload.error || "Math request failed.", 500);
        }

        return successText(context, mathPayload.reply || "");
      }

      const conversation = toAnthropicMessages(incomingMessages);
      const models = getModelCandidates();

      let upstreamResponse: Response | null = null;
      let lastErrorBody = "";

      for (const model of models) {
        const candidateResponse = await createAnthropicStream(apiKey, { messages: conversation, model });
        if (candidateResponse.ok) {
          upstreamResponse = candidateResponse;
          break;
        }

        const failureBody = await candidateResponse.text();
        lastErrorBody = failureBody;
        if (!failureBody.toLowerCase().includes("not_found_error")) {
          return errorJson(context, failureBody || "Claude request failed.", 500);
        }
      }

      if (!upstreamResponse || !upstreamResponse.body) {
        return errorJson(
          context,
          lastErrorBody ||
            "No valid Anthropic model found. Set ANTHROPIC_MODEL/API__ANTHROPIC_MODEL to a valid model alias.",
          500,
        );
      }

      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      const reader = upstreamResponse.body.getReader();
      const parser = new SseTextParser();
      const streamAbortController = new AbortController();

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            while (true) {
              if (streamAbortController.signal.aborted) {
                break;
              }

              const { value, done } = await reader.read();
              if (done) {
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              const parsedTexts = parser.feed(chunk);

              for (const text of parsedTexts) {
                if (text) {
                  controller.enqueue(encoder.encode(text));
                }
              }
            }

            return;
          } finally {
            await safeCancelReader(reader);
            controller.close();
          }
        },
        async cancel() {
          streamAbortController.abort();
          await safeCancelReader(reader);
        },
      });

      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "x-request-id": context.requestId,
        },
      });
    },
  });
}
