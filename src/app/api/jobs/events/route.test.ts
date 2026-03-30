import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/jobs/events/route";
import {
  createAnonymousSessionUser,
  createAuthenticatedSessionUser,
} from "../../../../../tests/helpers/workflow-route-fixture";

const { getSessionUserMock, listUserEventsMock, findJobByIdMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  listUserEventsMock: vi.fn(),
  findJobByIdMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getJobQueueRepository: () => ({
    listUserEvents: listUserEventsMock,
    findJobById: findJobByIdMock,
  }),
}));

describe("GET /api/jobs/events", () => {
  beforeEach(() => {
    vi.stubEnv("JOB_EVENT_STREAM_MAX_DURATION_MS", "5");
    vi.stubEnv("JOB_EVENT_STREAM_POLL_INTERVAL_MS", "1");
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 for anonymous callers", async () => {
    getSessionUserMock.mockResolvedValue(createAnonymousSessionUser());

    const response = await GET(new NextRequest("http://localhost/api/jobs/events"));

    expect(response.status).toBe(401);
  });

  it("replays signed-in durable backlog using the user-scoped cursor", async () => {
    getSessionUserMock.mockResolvedValue(createAuthenticatedSessionUser({ id: "usr_owner" }));
    listUserEventsMock
      .mockResolvedValueOnce([
        {
          id: "evt_11",
          jobId: "job_1",
          conversationId: "conv_migrated",
          sequence: 11,
          eventType: "progress",
          payload: { progressPercent: 80, progressLabel: "Publishing" },
          createdAt: "2026-03-25T03:00:02.000Z",
        },
      ])
      .mockResolvedValue([]);
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

    const response = await GET(new NextRequest("http://localhost/api/jobs/events?afterSequence=10"));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(listUserEventsMock).toHaveBeenCalledWith("usr_owner", {
      afterSequence: 10,
      limit: 100,
    });
    expect(body).toContain("id: 11");
    expect(body).toContain('"type":"job_progress"');
    expect(body).toContain('"conversationId":"conv_migrated"');
  });
});