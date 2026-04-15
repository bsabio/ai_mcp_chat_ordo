import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError } from "@/core/use-cases/ConversationInteractor";
import { GET, POST } from "@/app/api/chat/jobs/route";
import {
  createAuthenticatedSessionUser,
  createRouteRequest,
} from "../../../../../tests/helpers/workflow-route-fixture";

const {
  appendEventMock,
  createJobMock,
  findActiveJobByDedupeKeyMock,
  findLatestRenderableEventForJobMock,
  getSessionUserMock,
  listConversationJobSnapshotsMock,
  getConversationMock,
  getActiveForUserMock,
} = vi.hoisted(() => ({
  appendEventMock: vi.fn(),
  createJobMock: vi.fn(),
  findActiveJobByDedupeKeyMock: vi.fn(),
  findLatestRenderableEventForJobMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  listConversationJobSnapshotsMock: vi.fn(),
  getConversationMock: vi.fn(),
  getActiveForUserMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getJobQueueRepository: () => ({
    appendEvent: appendEventMock,
    createJob: createJobMock,
    findActiveJobByDedupeKey: findActiveJobByDedupeKeyMock,
    findLatestRenderableEventForJob: findLatestRenderableEventForJobMock,
  }),
  getJobStatusQuery: () => ({
    listConversationJobSnapshots: listConversationJobSnapshotsMock,
  }),
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  createConversationRouteServices: () => ({
    interactor: {
      get: getConversationMock,
      getActiveForUser: getActiveForUserMock,
    },
  }),
}));

describe("GET /api/chat/jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue(createAuthenticatedSessionUser({ id: "usr_owner" }));
    getConversationMock.mockResolvedValue({ conversation: { id: "conv_existing" } });
    findActiveJobByDedupeKeyMock.mockResolvedValue(null);
    findLatestRenderableEventForJobMock.mockResolvedValue(null);
    createJobMock.mockResolvedValue({
      id: "job_media_1",
      conversationId: "conv_existing",
      userId: "usr_owner",
      toolName: "compose_media",
      status: "queued",
      priority: 5,
      dedupeKey: "compose_media:plan_media_1",
      initiatorType: "user",
      requestPayload: {
        plan: {
          id: "plan_media_1",
          conversationId: "conv_existing",
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
    });
    appendEventMock.mockResolvedValue({
      id: "evt_media_1",
      jobId: "job_media_1",
      conversationId: "conv_existing",
      sequence: 1,
      eventType: "queued",
      payload: { toolName: "compose_media" },
      createdAt: "2026-04-13T12:00:00.000Z",
    });
  });

  it("returns an empty snapshot when the requested conversation does not exist", async () => {
    getConversationMock.mockRejectedValue(new NotFoundError("Conversation not found"));
    listConversationJobSnapshotsMock.mockResolvedValue([]);

    const response = await GET(createRouteRequest("/api/chat/jobs?conversationId=conv_missing"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.jobs).toEqual([]);
    expect(listConversationJobSnapshotsMock).toHaveBeenCalledWith("conv_missing", {
      statuses: undefined,
      limit: 25,
    });
  });

  it("returns job snapshots for an existing requested conversation", async () => {
    getConversationMock.mockResolvedValue({ conversation: { id: "conv_existing" } });
    listConversationJobSnapshotsMock.mockResolvedValue([
      {
        messageId: "jobmsg_job_1",
        part: {
          type: "job_status",
          jobId: "job_1",
          toolName: "produce_blog_article",
          label: "Produce Blog Article",
          title: "Launch plan",
          status: "running",
          progressPercent: 42,
          progressLabel: "Reviewing article",
          resultEnvelope: {
            schemaVersion: 1,
            toolName: "produce_blog_article",
            family: "editorial",
            cardKind: "editorial_workflow",
            executionMode: "deferred",
            inputSnapshot: { brief: "Launch plan" },
            summary: { title: "Launch plan" },
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
          updatedAt: "2026-03-25T03:00:07.000Z",
        },
      },
    ]);

    const response = await GET(createRouteRequest("/api/chat/jobs?conversationId=conv_existing&limit=12"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getConversationMock).toHaveBeenCalledWith("conv_existing", "usr_owner");
    expect(listConversationJobSnapshotsMock).toHaveBeenCalledWith("conv_existing", {
      statuses: undefined,
      limit: 12,
    });
    expect(payload.jobs[0].part).toMatchObject({
      jobId: "job_1",
      status: "running",
      progressLabel: "Reviewing article",
      resultEnvelope: expect.anything(),
    });
  });

  it("enqueues a compose_media deferred job through the shared route surface", async () => {
    const response = await POST(createRouteRequest(
      "/api/chat/jobs",
      "POST",
      {
        toolName: "compose_media",
        conversationId: "conv_existing",
        plan: {
          id: "plan_media_1",
          conversationId: "conv_existing",
          visualClips: [{ assetId: "asset_visual_1", kind: "video" }],
          audioClips: [],
          subtitlePolicy: "none",
          waveformPolicy: "none",
          outputFormat: "mp4",
        },
      },
      { "Content-Type": "application/json" },
    ));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(findActiveJobByDedupeKeyMock).toHaveBeenCalledWith("conv_existing", "compose_media:plan_media_1");
    expect(createJobMock).toHaveBeenCalledTimes(1);
    expect(appendEventMock).toHaveBeenCalledTimes(1);
    expect(payload).toMatchObject({
      ok: true,
      jobId: "job_media_1",
      deduplicated: false,
    });
  });

  it("returns the existing compose_media job when the route deduplicates an active plan", async () => {
    findActiveJobByDedupeKeyMock.mockResolvedValue({
      id: "job_media_existing",
      conversationId: "conv_existing",
      userId: "usr_owner",
      toolName: "compose_media",
      status: "queued",
      priority: 5,
      dedupeKey: "compose_media:plan_media_1",
      initiatorType: "user",
      requestPayload: {
        plan: {
          id: "plan_media_1",
          conversationId: "conv_existing",
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
    });
    findLatestRenderableEventForJobMock.mockResolvedValue({
      id: "evt_media_existing",
      jobId: "job_media_existing",
      conversationId: "conv_existing",
      sequence: 3,
      eventType: "queued",
      payload: { toolName: "compose_media" },
      createdAt: "2026-04-13T12:00:00.000Z",
    });

    const response = await POST(createRouteRequest(
      "/api/chat/jobs",
      "POST",
      {
        toolName: "compose_media",
        conversationId: "conv_existing",
        plan: {
          id: "plan_media_1",
          conversationId: "conv_existing",
          visualClips: [{ assetId: "asset_visual_1", kind: "video" }],
          audioClips: [],
          subtitlePolicy: "none",
          waveformPolicy: "none",
          outputFormat: "mp4",
        },
      },
      { "Content-Type": "application/json" },
    ));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(createJobMock).not.toHaveBeenCalled();
    expect(appendEventMock).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      ok: true,
      jobId: "job_media_existing",
      deduplicated: true,
    });
  });
});