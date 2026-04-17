import { describe, expect, it } from "vitest";

import { planBrowserCapabilityRuntimeCycle } from "@/lib/media/browser-runtime/browser-capability-runtime";
import type { BrowserRuntimeCandidate } from "@/lib/media/browser-runtime/job-snapshots";

function createCandidate(
  overrides: Partial<BrowserRuntimeCandidate> = {},
): BrowserRuntimeCandidate {
  return {
    jobId: "browser:msg_1:generate_audio:1",
    messageId: "msg_1",
    toolName: "generate_audio",
    args: {},
    payload: {
      action: "generate_audio",
      title: "Audio",
      text: "Hello",
      assetId: null,
      provider: "openai-speech",
      generationStatus: "client_fetch_pending",
      estimatedDurationSeconds: 2,
      estimatedGenerationSeconds: 1,
    },
    resultIndex: 1,
    ...overrides,
  };
}

describe("planBrowserCapabilityRuntimeCycle", () => {
  it("reconciles persisted running work to fallback when recovery policy requires the server", () => {
    const candidate = createCandidate({
      snapshot: {
        type: "job_status",
        jobId: "browser:msg_1:generate_audio:1",
        toolName: "generate_audio",
        label: "Generate Audio",
        status: "running",
      },
    });

    const plan = planBrowserCapabilityRuntimeCycle({
      candidates: [candidate],
      activeJobIds: new Set<string>(),
      persistedEntries: [
        {
          jobId: candidate.jobId,
          toolName: candidate.toolName,
          conversationId: "conv_1",
          status: "running",
          updatedAt: "2026-04-15T10:00:00.000Z",
        },
      ],
    });

    expect(plan.reconcile).toEqual([
      expect.objectContaining({
        candidate,
        runtimeStatus: "fallback_required",
      }),
    ]);
    expect(plan.start).toHaveLength(0);
  });

  it("reconciles persisted queued work to interrupted for fail-only browser capabilities", () => {
    const candidate = createCandidate({
      jobId: "browser:msg_2:generate_chart:1",
      messageId: "msg_2",
      toolName: "generate_chart",
      snapshot: {
        type: "job_status",
        jobId: "browser:msg_2:generate_chart:1",
        toolName: "generate_chart",
        label: "Generate Chart",
        status: "queued",
      },
    });

    const plan = planBrowserCapabilityRuntimeCycle({
      candidates: [candidate],
      activeJobIds: new Set<string>(),
      persistedEntries: [
        {
          jobId: candidate.jobId,
          toolName: candidate.toolName,
          conversationId: "conv_1",
          status: "queued",
          updatedAt: "2026-04-15T10:00:00.000Z",
        },
      ],
    });

    expect(plan.reconcile).toEqual([
      expect.objectContaining({
        candidate,
        runtimeStatus: "interrupted",
      }),
    ]);
  });

  it("admits one active run, queues the next two, and overflows the rest", () => {
    const first = createCandidate({ jobId: "browser:msg_1:generate_audio:1" });
    const second = createCandidate({
      jobId: "browser:msg_2:generate_chart:1",
      messageId: "msg_2",
      toolName: "generate_chart",
    });
    const third = createCandidate({
      jobId: "browser:msg_3:generate_graph:1",
      messageId: "msg_3",
      toolName: "generate_graph",
    });
    const fourth = createCandidate({
      jobId: "browser:msg_4:compose_media:1",
      messageId: "msg_4",
      toolName: "compose_media",
      payload: {
        id: "plan_4",
        visualClips: [],
        audioClips: [],
        subtitlePolicy: "none",
        waveformPolicy: "none",
        outputFormat: "mp4",
      },
    });

    const plan = planBrowserCapabilityRuntimeCycle({
      candidates: [first, second, third, fourth],
      activeJobIds: new Set<string>(),
      persistedEntries: [],
    });

    expect(plan.start).toEqual([first]);
    expect(plan.queue).toEqual([second, third]);
    expect(plan.overflow).toEqual([
      expect.objectContaining({
        candidate: fourth,
        runtimeStatus: "fallback_required",
      }),
    ]);
  });
});