import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatStreamAdapter } from "./ChatStreamAdapter";

vi.mock("@/lib/observability/logger", () => ({
  logDegradation: vi.fn(),
}));

function createSseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();

  return new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  }), {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
    },
  });
}

describe("ChatStreamAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses the final buffered SSE event when the stream ends without a trailing newline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createSseResponse([
      'data: {"conversation_id":"conv_1"}\n\n',
      'data: {"delta":"8."}',
    ])));

    const adapter = new ChatStreamAdapter();
    const stream = await adapter.fetchStream([{ role: "user", content: "What is 4+4?" }], {
      conversationId: "conv_1",
      currentPathname: "/",
      attachments: [],
    });

    const events = [];
    for await (const event of stream.events()) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: "conversation_id", id: "conv_1" },
      { type: "text", delta: "8." },
      { type: "done" },
    ]);
  });
});