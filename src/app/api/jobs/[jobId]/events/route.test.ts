import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/jobs/[jobId]/events/route";
import {
  createAuthenticatedSessionUser,
  createRouteRequest,
} from "../../../../../../tests/helpers/workflow-route-fixture";

const { getSessionUserMock, findJobByIdMock, listEventsForUserJobMock, getConversationMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  findJobByIdMock: vi.fn(),
  listEventsForUserJobMock: vi.fn(),
  getConversationMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getJobQueueRepository: () => ({
    findJobById: findJobByIdMock,
    listEventsForUserJob: listEventsForUserJobMock,
  }),
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  createConversationRouteServices: () => ({
    interactor: {
      get: getConversationMock,
    },
  }),
}));

describe("GET /api/jobs/[jobId]/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns durable normalized history for the selected job", async () => {
    getSessionUserMock.mockResolvedValue(createAuthenticatedSessionUser({ id: "usr_owner" }));
    findJobByIdMock.mockResolvedValue({
      id: "job_1",
      conversationId: "conv_migrated",
      userId: null,
      toolName: "publish_content",
      status: "running",
      priority: 100,
      dedupeKey: null,
      initiatorType: "anonymous_session",
      requestPayload: { postId: "post_1" },
      resultPayload: null,
      errorMessage: null,
      progressPercent: 80,
      progressLabel: "Publishing",
      attemptCount: 1,
      leaseExpiresAt: null,
      claimedBy: "worker_1",
      createdAt: "2026-03-25T03:00:00.000Z",
      startedAt: "2026-03-25T03:00:01.000Z",
      completedAt: null,
      updatedAt: "2026-03-25T03:00:02.000Z",
    });
    listEventsForUserJobMock.mockResolvedValue([
      {
        id: "evt_1",
        jobId: "job_1",
        conversationId: "conv_migrated",
        sequence: 1,
        eventType: "queued",
        payload: {},
        createdAt: "2026-03-25T03:00:00.000Z",
      },
      {
        id: "evt_2",
        jobId: "job_1",
        conversationId: "conv_migrated",
        sequence: 2,
        eventType: "progress",
        payload: { progressPercent: 80, progressLabel: "Publishing" },
        createdAt: "2026-03-25T03:00:02.000Z",
      },
    ]);
    getConversationMock.mockResolvedValue({ conversation: { id: "conv_migrated" }, messages: [] });

    const response = await GET(createRouteRequest("/api/jobs/job_1/events?limit=5"), {
      params: Promise.resolve({ jobId: "job_1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(listEventsForUserJobMock).toHaveBeenCalledWith("usr_owner", "job_1", { limit: 5 });
    expect(payload.events).toHaveLength(2);
    expect(payload.events[1].part).toMatchObject({
      jobId: "job_1",
      status: "running",
      progressLabel: "Publishing",
    });
  });
});