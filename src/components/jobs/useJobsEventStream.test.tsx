import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useJobsEventStream } from "@/components/jobs/useJobsEventStream";

const onEventMock = vi.fn();
const onReconciledMock = vi.fn();
const fetchMock = vi.fn();

class MockEventSource {
  static instances: MockEventSource[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public readonly url: string) {
    MockEventSource.instances.push(this);
  }

  close() {
    return undefined;
  }
}

function Harness({ selectedJobId = "job_1", initialAfterSequence = 7 }: { selectedJobId?: string | null; initialAfterSequence?: number }) {
  const syncState = useJobsEventStream({
    initialAfterSequence,
    selectedJobId,
    onEvent: onEventMock,
    onReconciled: onReconciledMock,
  });

  return <div data-testid="sync-state">{syncState}</div>;
}

describe("useJobsEventStream", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("EventSource", MockEventSource as unknown as typeof EventSource);
    MockEventSource.instances = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("opens the signed-in jobs stream with the current cursor and forwards live events", async () => {
    render(<Harness initialAfterSequence={7} />);

    const source = MockEventSource.instances[0];
    expect(source?.url).toBe("/api/jobs/events?afterSequence=7");

    act(() => {
      source?.onopen?.();
      source?.onmessage?.({
        data: JSON.stringify({
          type: "job_progress",
          jobId: "job_1",
          conversationId: "conv_jobs",
          sequence: 8,
          toolName: "produce_blog_article",
          label: "Produce Blog Article",
          progressPercent: 66,
          progressLabel: "Reviewing article",
        }),
      } as MessageEvent<string>);
    });

    expect(onEventMock).toHaveBeenCalledWith(expect.objectContaining({
      type: "job_progress",
      sequence: 8,
    }));
    expect(screen.getByTestId("sync-state")).toHaveTextContent("live");
  });

  it("falls back to periodic reconcile when EventSource is unavailable", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobs: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobs: [] }),
      } as Response);

    render(<Harness selectedJobId={null} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("sync-state")).toHaveTextContent("fallback");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/jobs?limit=50", expect.any(Object));
    expect(onReconciledMock).toHaveBeenCalledWith(expect.objectContaining({ jobs: [] }));
  });
});