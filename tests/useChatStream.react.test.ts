// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useChatStream } from "@/hooks/useChatStream";

function createTextStream(chunks: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

describe("useChatStream", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("streams assistant chunks incrementally", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(createTextStream(["Hel", "lo"]), {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        }),
      ) as never,
    );

    const { result } = renderHook(() => useChatStream());

    act(() => {
      result.current.setInput("hello");
    });

    await act(async () => {
      await result.current.sendMessage({ preventDefault: vi.fn() });
    });

    await waitFor(() => {
      expect(result.current.messages[0]).toEqual({ role: "user", content: "hello" });
      expect(result.current.messages[1]).toEqual({ role: "assistant", content: "Hello" });
    });
  });

  it("replaces pending assistant with error message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "Network fail" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      ) as never,
    );

    const { result } = renderHook(() => useChatStream());

    act(() => {
      result.current.setInput("hello");
    });

    await act(async () => {
      await result.current.sendMessage({ preventDefault: vi.fn() });
    });

    await waitFor(() => {
      expect(result.current.messages).toEqual([
        { role: "user", content: "hello" },
        { role: "assistant", content: "Network fail" },
      ]);
    });
  });

  it("sets fallback message when stream is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(createTextStream([]), {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        }),
      ) as never,
    );

    const { result } = renderHook(() => useChatStream());

    act(() => {
      result.current.setInput("hello");
    });

    await act(async () => {
      await result.current.sendMessage({ preventDefault: vi.fn() });
    });

    await waitFor(() => {
      expect(result.current.messages[1]).toEqual({ role: "assistant", content: "No reply returned." });
    });
  });
});
