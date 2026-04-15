import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/jobs/[jobId]/route";
import {
  createAnonymousSessionUser,
  createAuthenticatedSessionUser,
  createRouteRequest,
} from "../../../../../tests/helpers/workflow-route-fixture";

const {
  getSessionUserMock,
  findJobByIdMock,
  findLatestRenderableEventForJobMock,
  cancelJobMock,
  appendEventMock,
  createJobMock,
  findActiveJobByDedupeKeyMock,
  updateJobStatusMock,
  getConversationMock,
  getJobSnapshotMock,
  getDescriptorMock,
  projectMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  findJobByIdMock: vi.fn(),
  findLatestRenderableEventForJobMock: vi.fn(),
  cancelJobMock: vi.fn(),
  appendEventMock: vi.fn(),
  createJobMock: vi.fn(),
  findActiveJobByDedupeKeyMock: vi.fn(),
  updateJobStatusMock: vi.fn(),
  getConversationMock: vi.fn(),
  getJobSnapshotMock: vi.fn(),
  getDescriptorMock: vi.fn(),
  projectMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getJobQueueRepository: () => ({
    findJobById: findJobByIdMock,
    findLatestRenderableEventForJob: findLatestRenderableEventForJobMock,
    cancelJob: cancelJobMock,
    appendEvent: appendEventMock,
    createJob: createJobMock,
    findActiveJobByDedupeKey: findActiveJobByDedupeKeyMock,
    updateJobStatus: updateJobStatusMock,
  }),
  getJobStatusQuery: () => ({
    getJobSnapshot: getJobSnapshotMock,
  }),
}));

vi.mock("@/lib/chat/tool-composition-root", () => ({
  getToolComposition: () => ({
    registry: { getDescriptor: getDescriptorMock },
    executor: vi.fn(),
  }),
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  createConversationRouteServices: () => ({
    interactor: {
      get: getConversationMock,
    },
  }),
}));

vi.mock("@/lib/jobs/deferred-job-projector-root", () => ({
  createDeferredJobConversationProjector: () => ({
    project: projectMock,
  }),
}));

describe("/api/jobs/[jobId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConversationMock.mockResolvedValue({ conversation: { id: "conv_jobs" }, messages: [] });
    appendEventMock.mockResolvedValue({ sequence: 12 });
    projectMock.mockResolvedValue(undefined);
    findLatestRenderableEventForJobMock.mockResolvedValue(null);
    findActiveJobByDedupeKeyMock.mockResolvedValue(null);
    updateJobStatusMock.mockResolvedValue({ id: "job_1" });
    getDescriptorMock.mockReturnValue({
      executionMode: "deferred",
      deferred: { dedupeStrategy: "per-conversation-payload" },
    });
  });

  it("returns 401 for anonymous callers", async () => {
    getSessionUserMock.mockResolvedValue(createAnonymousSessionUser());

    const response = await GET(createRouteRequest("/api/jobs/job_1"), {
      params: Promise.resolve({ jobId: "job_1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns a migrated anonymous job for the signed-in owner", async () => {
    getSessionUserMock.mockResolvedValue(createAuthenticatedSessionUser({ id: "usr_owner" }));
    getJobSnapshotMock.mockResolvedValue({
      jobId: "job_1",
      conversationId: "conv_migrated",
      toolName: "publish_content",
      status: "running",
      progressPercent: 80,
      progressLabel: "Publishing",
      part: {
        jobId: "job_1",
        status: "running",
        progressLabel: "Publishing",
      },
    });
    getConversationMock.mockResolvedValue({ conversation: { id: "conv_migrated" }, messages: [] });

    const response = await GET(createRouteRequest("/api/jobs/job_1"), {
      params: Promise.resolve({ jobId: "job_1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getConversationMock).toHaveBeenCalledWith("conv_migrated", "usr_owner");
    expect(payload.job).toMatchObject({
      jobId: "job_1",
      status: "running",
      progressLabel: "Publishing",
    });
  });

  it("replays failed jobs with explicit lineage metadata", async () => {
    getSessionUserMock.mockResolvedValue(createAuthenticatedSessionUser({ id: "usr_owner" }));
    findJobByIdMock.mockResolvedValue({
      id: "job_failed",
      conversationId: "conv_jobs",
      userId: null,
      toolName: "publish_content",
      status: "failed",
      priority: 100,
      dedupeKey: null,
      initiatorType: "anonymous_session",
      requestPayload: { post_id: "post_1" },
    });
    createJobMock.mockResolvedValue({
      id: "job_retry",
      conversationId: "conv_jobs",
      userId: "usr_owner",
      toolName: "publish_content",
      status: "queued",
      recoveryMode: "rerun",
      replayedFromJobId: "job_failed",
    });

    const response = await POST(createRouteRequest("/api/jobs/job_failed", "POST", { action: "retry" }), {
      params: Promise.resolve({ jobId: "job_failed" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(createJobMock).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: "conv_jobs",
      userId: "usr_owner",
      toolName: "publish_content",
      recoveryMode: "rerun",
      replayedFromJobId: "job_failed",
    }));
    expect(updateJobStatusMock).toHaveBeenCalledWith("job_failed", {
      status: "failed",
      supersededByJobId: "job_retry",
    });
    expect(appendEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "queued",
      payload: expect.objectContaining({
        replayedFromJobId: "job_failed",
        recoveryMode: "rerun",
      }),
    }));
    expect(body.replay).toEqual({
      outcome: "queued",
      sourceJobId: "job_failed",
      targetJobId: "job_retry",
      dedupeKey: expect.any(String),
    });
    expect(body.eventSequence).toBe(12);
  });

  it("returns an explicit dedupe replay outcome when equivalent active work already exists", async () => {
    getSessionUserMock.mockResolvedValue(createAuthenticatedSessionUser({ id: "usr_owner" }));
    findJobByIdMock.mockResolvedValue({
      id: "job_failed",
      conversationId: "conv_jobs",
      userId: "usr_owner",
      toolName: "publish_content",
      status: "failed",
      priority: 100,
      dedupeKey: null,
      initiatorType: "user",
      requestPayload: { post_id: "post_1" },
    });
    findActiveJobByDedupeKeyMock.mockResolvedValue({
      id: "job_active",
      conversationId: "conv_jobs",
      userId: "usr_owner",
      toolName: "publish_content",
      status: "running",
    });

    const response = await POST(createRouteRequest("/api/jobs/job_failed", "POST", { action: "retry" }), {
      params: Promise.resolve({ jobId: "job_failed" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(createJobMock).not.toHaveBeenCalled();
    expect(updateJobStatusMock).toHaveBeenCalledWith("job_failed", {
      status: "failed",
      supersededByJobId: "job_active",
    });
    expect(body.deduped).toBe(true);
    expect(body.replay).toEqual({
      outcome: "deduped",
      sourceJobId: "job_failed",
      targetJobId: "job_active",
      dedupeKey: expect.any(String),
    });
  });
});