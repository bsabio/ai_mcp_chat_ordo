import { describe, expect, it, vi } from "vitest";

import type { JobEvent, JobRequest } from "@/core/entities/job";
import type { JobQueueRepository } from "@/core/use-cases/JobQueueRepository";

const { appendRuntimeAuditLogMock } = vi.hoisted(() => ({
  appendRuntimeAuditLogMock: vi.fn(async () => undefined),
}));

vi.mock("@/lib/observability/runtime-audit-log", () => ({
  appendRuntimeAuditLog: appendRuntimeAuditLogMock,
}));

import {
  enqueueComposeMediaDeferredJob,
  InvalidComposeMediaDeferredJobError,
} from "./compose-media-deferred-job";

function createJobRequest(overrides: Partial<JobRequest> = {}): JobRequest {
  return {
    id: "job_media_1",
    conversationId: "conv_media_1",
    userId: "user_1",
    toolName: "compose_media",
    status: "queued",
    priority: 5,
    dedupeKey: "compose_media:plan_media_1",
    initiatorType: "user",
    requestPayload: {
      plan: {
        id: "plan_media_1",
        conversationId: "conv_media_1",
        visualClips: [{ assetId: "asset_visual_1", kind: "video" }],
        audioClips: [],
        subtitlePolicy: "none",
        waveformPolicy: "none",
        outputFormat: "mp4",
      },
    },
    resultPayload: null,
    errorMessage: null,
    progressPercent: null,
    progressLabel: null,
    attemptCount: 0,
    leaseExpiresAt: null,
    claimedBy: null,
    failureClass: null,
    nextRetryAt: null,
    recoveryMode: "rerun",
    lastCheckpointId: null,
    replayedFromJobId: null,
    supersededByJobId: null,
    createdAt: "2026-04-13T12:00:00.000Z",
    startedAt: null,
    completedAt: null,
    updatedAt: "2026-04-13T12:00:00.000Z",
    ...overrides,
  };
}

function createJobEvent(overrides: Partial<JobEvent> = {}): JobEvent {
  return {
    id: "evt_media_1",
    jobId: "job_media_1",
    conversationId: "conv_media_1",
    sequence: 1,
    eventType: "queued",
    payload: { toolName: "compose_media" },
    createdAt: "2026-04-13T12:00:00.000Z",
    ...overrides,
  };
}

function createRepositoryMock(overrides: Partial<JobQueueRepository> = {}): JobQueueRepository {
  return {
    createJob: vi.fn(async () => createJobRequest()),
    findJobById: vi.fn(async () => null),
    findLatestEventForJob: vi.fn(async () => null),
    findLatestRenderableEventForJob: vi.fn(async () => null),
    findActiveJobByDedupeKey: vi.fn(async () => null),
    listJobsByConversation: vi.fn(async () => []),
    listJobsByUser: vi.fn(async () => []),
    appendEvent: vi.fn(async () => createJobEvent()),
    requeueExpiredRunningJobs: vi.fn(async () => []),
    listConversationEvents: vi.fn(async () => []),
    listUserEvents: vi.fn(async () => []),
    listEventsForUserJob: vi.fn(async () => []),
    claimNextQueuedJob: vi.fn(async () => null),
    transferJobsToUser: vi.fn(async () => []),
    updateJobStatus: vi.fn(async () => { throw new Error("unused"); }),
    cancelJob: vi.fn(async () => { throw new Error("unused"); }),
    ...overrides,
  } as unknown as JobQueueRepository;
}

describe("compose-media-deferred-job", () => {
  beforeEach(() => {
    appendRuntimeAuditLogMock.mockClear();
  });

  it("creates a queued compose_media deferred job payload with a renderable event", async () => {
    const repository = createRepositoryMock();

    const result = await enqueueComposeMediaDeferredJob({
      repository,
      conversationId: "conv_media_1",
      userId: "user_1",
      plan: {
        id: "plan_media_1",
        conversationId: "conv_media_1",
        visualClips: [{ assetId: "asset_visual_1", kind: "video" }],
        audioClips: [],
        subtitlePolicy: "none",
        waveformPolicy: "none",
        outputFormat: "mp4",
      },
    });

    expect(repository.findActiveJobByDedupeKey).toHaveBeenCalledWith("conv_media_1", "compose_media:plan_media_1");
    expect(repository.createJob).toHaveBeenCalledTimes(1);
    expect(repository.appendEvent).toHaveBeenCalledTimes(1);
    expect(appendRuntimeAuditLogMock).toHaveBeenCalledWith(
      "deferred_job",
      "enqueued",
      expect.objectContaining({
        jobId: "job_media_1",
        planId: "plan_media_1",
        dedupeKey: "compose_media:plan_media_1",
        deduplicated: false,
        status: "queued",
      }),
    );
    expect(result.deduplicated).toBe(false);
    expect(result.payload).toMatchObject({
      deferred_job: {
        jobId: "job_media_1",
        toolName: "compose_media",
        status: "queued",
        lifecyclePhase: "compose_queued_deferred",
        resultEnvelope: expect.objectContaining({
          toolName: "compose_media",
          executionMode: "deferred",
        }),
      },
    });
  });

  it("reuses an existing active compose_media job and returns a deduplicated deferred payload", async () => {
    const existingJob = createJobRequest({
      id: "job_media_existing",
      status: "running",
      progressPercent: 42,
      progressLabel: "Uploading composition artifact",
      attemptCount: 1,
      startedAt: "2026-04-13T12:00:01.000Z",
      updatedAt: "2026-04-13T12:00:10.000Z",
    });
    const repository = createRepositoryMock({
      findActiveJobByDedupeKey: vi.fn(async () => existingJob),
      findLatestRenderableEventForJob: vi.fn(async () => createJobEvent({
        id: "evt_media_existing",
        jobId: "job_media_existing",
        sequence: 4,
        eventType: "progress",
        payload: {
          progressPercent: 42,
          progressLabel: "Uploading composition artifact",
        },
        createdAt: "2026-04-13T12:00:10.000Z",
      })),
    });

    const result = await enqueueComposeMediaDeferredJob({
      repository,
      conversationId: "conv_media_1",
      userId: "user_1",
      plan: {
        id: "plan_media_1",
        conversationId: "conv_media_1",
        visualClips: [{ assetId: "asset_visual_1", kind: "video" }],
        audioClips: [],
        subtitlePolicy: "none",
        waveformPolicy: "none",
        outputFormat: "mp4",
      },
    });

    expect(repository.createJob).not.toHaveBeenCalled();
    expect(repository.appendEvent).not.toHaveBeenCalled();
    expect(appendRuntimeAuditLogMock).toHaveBeenCalledWith(
      "deferred_job",
      "enqueue_deduplicated",
      expect.objectContaining({
        jobId: "job_media_existing",
        planId: "plan_media_1",
        deduplicated: true,
        status: "running",
      }),
    );
    expect(result.deduplicated).toBe(true);
    expect(result.payload).toMatchObject({
      deferred_job: {
        jobId: "job_media_existing",
        toolName: "compose_media",
        status: "running",
        lifecyclePhase: "compose_running_deferred",
        deduped: true,
      },
    });
  });

  it("rejects invalid compose_media plans before touching the queue", async () => {
    const repository = createRepositoryMock();

    await expect(
      enqueueComposeMediaDeferredJob({
        repository,
        conversationId: "conv_media_1",
        userId: "user_1",
        plan: {},
      }),
    ).rejects.toBeInstanceOf(InvalidComposeMediaDeferredJobError);

    expect(repository.findActiveJobByDedupeKey).not.toHaveBeenCalled();
    expect(repository.createJob).not.toHaveBeenCalled();
    expect(appendRuntimeAuditLogMock).not.toHaveBeenCalled();
  });
});