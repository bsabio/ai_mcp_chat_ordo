import { describe, expect, it } from "vitest";

import type { JobEvent, JobRequest } from "@/core/entities/job";
import { buildJobStatusSnapshot } from "@/lib/jobs/job-read-model";

function buildJob(overrides: Partial<JobRequest> = {}): JobRequest {
  return {
    id: "job_1",
    conversationId: "conv_1",
    userId: "usr_1",
    toolName: "produce_blog_article",
    status: "running",
    priority: 100,
    dedupeKey: null,
    initiatorType: "user",
    requestPayload: {
      brief: "Inherited migration brief",
      audience: "Queue recovery operators",
    },
    resultPayload: null,
    errorMessage: null,
    progressPercent: 12,
    progressLabel: "Awaiting sign-in recovery",
    attemptCount: 1,
    leaseExpiresAt: null,
    claimedBy: null,
    failureClass: null,
    nextRetryAt: null,
    recoveryMode: "rerun",
    lastCheckpointId: null,
    replayedFromJobId: null,
    supersededByJobId: null,
    createdAt: "2026-03-25T03:00:00.000Z",
    startedAt: "2026-03-25T03:00:01.000Z",
    completedAt: null,
    updatedAt: "2026-03-25T03:00:02.000Z",
    ...overrides,
  };
}

function buildEvent(overrides: Partial<JobEvent> = {}): JobEvent {
  return {
    id: "jobevt_1",
    jobId: "job_1",
    conversationId: "conv_1",
    sequence: 9,
    eventType: "ownership_transferred",
    payload: {
      summary: "Job ownership transferred from the anonymous session to the signed-in account.",
      previousUserId: "anon_seed",
      nextUserId: "usr_1",
    },
    createdAt: "2026-03-25T03:00:03.000Z",
    ...overrides,
  };
}

describe("buildJobStatusSnapshot", () => {
  it("uses the durable job state for audit-only events", () => {
    const snapshot = buildJobStatusSnapshot(buildJob(), buildEvent());

    expect(snapshot.part.status).toBe("running");
    expect(snapshot.part.progressLabel).toBe("Awaiting sign-in recovery");
    expect(snapshot.part.progressPercent).toBe(12);
    expect(snapshot.part.summary).toBeUndefined();
  });
});