import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/chat/events/route";

const {
  getMock,
  getActiveForUserMock,
  resolveUserIdMock,
  listConversationEventsMock,
  findJobByIdMock,
} = vi.hoisted(() => ({
  getMock: vi.fn(),
  getActiveForUserMock: vi.fn(),
  resolveUserIdMock: vi.fn(),
  listConversationEventsMock: vi.fn(),
  findJobByIdMock: vi.fn(),
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  createConversationRouteServices: () => ({
    interactor: {
      get: getMock,
      getActiveForUser: getActiveForUserMock,
    },
  }),
}));

vi.mock("@/lib/chat/resolve-user", () => ({
  resolveUserId: resolveUserIdMock,
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getJobQueueRepository: () => ({
    listConversationEvents: listConversationEventsMock,
    findJobById: findJobByIdMock,
  }),
}));

describe("GET /api/chat/events", () => {
  beforeEach(() => {
    vi.stubEnv("JOB_EVENT_STREAM_MAX_DURATION_MS", "5");
    vi.stubEnv("JOB_EVENT_STREAM_POLL_INTERVAL_MS", "1");
    resolveUserIdMock.mockResolvedValue({ userId: "usr_test" });
    getMock.mockResolvedValue({ conversation: { id: "conv_jobs" }, messages: [] });
    getActiveForUserMock.mockResolvedValue(null);
    findJobByIdMock.mockResolvedValue({
      id: "job_1",
      conversationId: "conv_jobs",
      userId: "usr_test",
      toolName: "draft_content",
      status: "succeeded",
      priority: 100,
      dedupeKey: null,
      initiatorType: "user",
      requestPayload: {},
      resultPayload: { summary: "Draft ready." },
      errorMessage: null,
      progressPercent: 100,
      progressLabel: "Complete",
      attemptCount: 1,
      leaseExpiresAt: null,
      claimedBy: null,
      createdAt: "2026-03-25T03:00:00.000Z",
      startedAt: "2026-03-25T03:00:01.000Z",
      completedAt: "2026-03-25T03:00:02.000Z",
      updatedAt: "2026-03-25T03:00:02.000Z",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("replays durable backlog from the requested sequence", async () => {
    listConversationEventsMock
      .mockResolvedValueOnce([
        {
          id: "evt_4",
          jobId: "job_1",
          conversationId: "conv_jobs",
          sequence: 4,
          eventType: "progress",
          payload: { progressPercent: 60, progressLabel: "Drafting" },
          createdAt: "2026-03-25T03:00:01.500Z",
        },
        {
          id: "evt_5",
          jobId: "job_1",
          conversationId: "conv_jobs",
          sequence: 5,
          eventType: "result",
          payload: { result: { summary: "Draft ready." } },
          createdAt: "2026-03-25T03:00:02.000Z",
        },
      ])
      .mockResolvedValue([]);

    const response = await GET(
      new NextRequest("http://localhost/api/chat/events?conversationId=conv_jobs&afterSequence=3"),
    );

    const body = await response.text();

    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(getMock).toHaveBeenCalledWith("conv_jobs", "usr_test");
    expect(body).toContain("id: 4");
    expect(body).toContain('"type":"job_progress"');
    expect(body).toContain('"progressPercent":60');
    expect(body).toContain("id: 5");
    expect(body).toContain('"type":"job_completed"');
    expect(body).toContain('"summary":"Draft ready."');
  });

  it("falls back to the active conversation when conversationId is omitted", async () => {
    getActiveForUserMock.mockResolvedValue({ conversation: { id: "conv_active" }, messages: [] });
    listConversationEventsMock.mockResolvedValue([]);

    const response = await GET(new NextRequest("http://localhost/api/chat/events"));
    await response.text();

    expect(getActiveForUserMock).toHaveBeenCalledWith("usr_test");
    expect(response.status).toBe(200);
  });

  it("maps canceled job events to job_canceled SSE payloads", async () => {
    listConversationEventsMock
      .mockResolvedValueOnce([
        {
          id: "evt_6",
          jobId: "job_1",
          conversationId: "conv_jobs",
          sequence: 6,
          eventType: "canceled",
          payload: {},
          createdAt: "2026-03-25T03:00:03.000Z",
        },
      ])
      .mockResolvedValue([]);

    const response = await GET(
      new NextRequest("http://localhost/api/chat/events?conversationId=conv_jobs"),
    );

    const body = await response.text();

    expect(body).toContain('"type":"job_canceled"');
    expect(body).toContain('"jobId":"job_1"');
  });
});