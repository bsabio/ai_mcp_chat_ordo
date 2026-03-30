import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useChatJobEvents } from "@/hooks/chat/useChatJobEvents";
import type { ChatAction } from "@/hooks/chat/chatState";

const fetchMock = vi.fn();
const dispatchMock = vi.fn<(action: ChatAction) => void>();

class MockEventSource {
  static instances: MockEventSource[] = [];

  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public readonly url: string) {
    MockEventSource.instances.push(this);
  }

  close() {
    return undefined;
  }
}

function Harness({ conversationId }: { conversationId: string | null }) {
  useChatJobEvents({ conversationId, dispatch: dispatchMock });
  return null;
}

describe("useChatJobEvents", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("EventSource", MockEventSource as unknown as typeof EventSource);
    fetchMock.mockReset();
    dispatchMock.mockReset();
    MockEventSource.instances = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("backs off snapshot reconciliation after a missing conversation response", async () => {
    fetchMock.mockResolvedValue({
      status: 404,
      ok: false,
      json: async () => ({ error: "Conversation not found" }),
    });

    render(<Harness conversationId="conv_missing" />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const source = MockEventSource.instances[0];

    act(() => {
      source?.onerror?.();
      window.dispatchEvent(new Event("focus"));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});