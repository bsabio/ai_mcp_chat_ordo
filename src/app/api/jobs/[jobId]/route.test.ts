import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/jobs/[jobId]/route";
import {
  createAnonymousSessionUser,
  createAuthenticatedSessionUser,
  createRouteRequest,
} from "../../../../../tests/helpers/workflow-route-fixture";

const { getSessionUserMock, findJobByIdMock, findLatestEventForJobMock, getConversationMock, getJobSnapshotMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  findJobByIdMock: vi.fn(),
  findLatestEventForJobMock: vi.fn(),
  getConversationMock: vi.fn(),
  getJobSnapshotMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getJobQueueRepository: () => ({
    findJobById: findJobByIdMock,
    findLatestEventForJob: findLatestEventForJobMock,
  }),
  getJobStatusQuery: () => ({
    getJobSnapshot: getJobSnapshotMock,
  }),
}));

vi.mock("@/lib/chat/tool-composition-root", () => ({
  getToolComposition: () => ({
    registry: { getDescriptor: vi.fn() },
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

describe("GET /api/jobs/[jobId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});