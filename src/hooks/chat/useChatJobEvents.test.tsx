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

  it("preserves normalized job parts from live SSE events", async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ jobs: [] }),
    });

    render(<Harness conversationId="conv_live" />);

    await act(async () => {
      await Promise.resolve();
    });

    const source = MockEventSource.instances[0];

    act(() => {
      source?.onmessage?.({
        data: JSON.stringify({
          type: "job_progress",
          messageId: "jobmsg_job_1",
          jobId: "job_1",
          conversationId: "conv_live",
          sequence: 8,
          toolName: "produce_blog_article",
          label: "Produce Blog Article",
          progressPercent: 42,
          progressLabel: "Reviewing article",
          part: {
            type: "job_status",
            jobId: "job_1",
            toolName: "produce_blog_article",
            label: "Produce Blog Article",
            status: "running",
            sequence: 8,
            progressPercent: 42,
            progressLabel: "Reviewing article",
            resultEnvelope: {
              schemaVersion: 1,
              toolName: "produce_blog_article",
              family: "editorial",
              cardKind: "editorial_workflow",
              executionMode: "deferred",
              inputSnapshot: { brief: "Launch Plan" },
              summary: { title: "Launch Plan" },
              progress: {
                percent: 42,
                label: "Reviewing article",
                phases: [
                  { key: "qa_blog_article", label: "Reviewing article", status: "active", percent: 60 },
                ],
                activePhaseKey: "qa_blog_article",
              },
              payload: null,
            },
          },
        }),
      } as MessageEvent<string>);
    });

    expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({
      type: "UPSERT_JOB_STATUS",
      part: expect.objectContaining({
        resultEnvelope: expect.objectContaining({ toolName: "produce_blog_article" }),
      }),
    }));
  });

  it("rehydrates a larger deferred-job snapshot set for busy conversations", async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        jobs: Array.from({ length: 20 }, (_, index) => ({
          messageId: `jobmsg_job_${index + 1}`,
          part: {
            type: "job_status",
            jobId: `job_${index + 1}`,
            toolName: "produce_blog_article",
            label: "Produce Blog Article",
            status: index < 3 ? "running" : "succeeded",
            sequence: index + 1,
          },
        })),
      }),
    });

    render(<Harness conversationId="conv_busy" />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat/jobs?conversationId=conv_busy&limit=50",
      expect.any(Object),
    );
    expect(dispatchMock).toHaveBeenCalledTimes(20);
  });
});