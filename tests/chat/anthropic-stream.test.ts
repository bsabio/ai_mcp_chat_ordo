import { describe, expect, it, vi } from "vitest";

import { runClaudeAgentLoopStream } from "@/lib/chat/anthropic-stream";

function createStreamDouble(finalMessage: () => Promise<{ stop_reason: string | null; content: Array<{ type: string }> }>, onText?: (emit: (text: string) => void) => void) {
  return {
    on: (event: string, handler: (text: string) => void) => {
      if (event === "text" && onText) {
        onText(handler);
      }
    },
    finalMessage,
  };
}

describe("runClaudeAgentLoopStream", () => {
  it("falls back to the next model when the first model is not found", async () => {
    const stream = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('404 {"type":"error","error":{"type":"not_found_error","message":"model:"}}');
      })
      .mockImplementationOnce(() => createStreamDouble(async () => ({ stop_reason: "end_turn", content: [] }), (emit) => emit("ok")));

    const result = await runClaudeAgentLoopStream({
      apiKey: "test-key",
      messages: [{ role: "user", content: "hello" }],
      callbacks: {},
      systemPrompt: "system",
      tools: [],
      toolExecutor: vi.fn(),
      client: { messages: { stream } } as never,
      modelCandidates: ["missing-model", "fallback-model"],
      retryAttempts: 1,
      retryDelayMs: 0,
    });

    expect(result.model).toBe("fallback-model");
    expect(result.assistantText).toBe("ok");
    expect(stream).toHaveBeenCalledTimes(2);
  });

  it("retries transient streaming failures before succeeding", async () => {
    const stream = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("503 temporarily unavailable");
      })
      .mockImplementationOnce(() => createStreamDouble(async () => ({ stop_reason: "end_turn", content: [] }), (emit) => emit("recovered")));

    const result = await runClaudeAgentLoopStream({
      apiKey: "test-key",
      messages: [{ role: "user", content: "hello" }],
      callbacks: {},
      systemPrompt: "system",
      tools: [],
      toolExecutor: vi.fn(),
      client: { messages: { stream } } as never,
      modelCandidates: ["stable-model"],
      retryAttempts: 2,
      retryDelayMs: 0,
    });

    expect(result.model).toBe("stable-model");
    expect(result.assistantText).toBe("recovered");
    expect(stream).toHaveBeenCalledTimes(2);
  });
});