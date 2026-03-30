import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError } from "@/core/use-cases/ConversationInteractor";
import { GET } from "@/app/api/chat/jobs/route";
import {
  createAuthenticatedSessionUser,
  createRouteRequest,
} from "../../../../../tests/helpers/workflow-route-fixture";

const {
  getSessionUserMock,
  listConversationJobSnapshotsMock,
  getConversationMock,
  getActiveForUserMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  listConversationJobSnapshotsMock: vi.fn(),
  getConversationMock: vi.fn(),
  getActiveForUserMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
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
    });
  });
});