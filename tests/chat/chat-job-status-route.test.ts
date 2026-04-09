import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as getJob } from "@/app/api/chat/jobs/[jobId]/route";
import { GET as listJobs } from "@/app/api/chat/jobs/route";

const {
  getJobSnapshotMock,
  listConversationJobSnapshotsMock,
  getMock,
  getActiveForUserMock,
  resolveUserIdMock,
} = vi.hoisted(() => ({
  getJobSnapshotMock: vi.fn(),
  listConversationJobSnapshotsMock: vi.fn(),
  getMock: vi.fn(),
  getActiveForUserMock: vi.fn(),
  resolveUserIdMock: vi.fn(),
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getJobStatusQuery: () => ({
    getJobSnapshot: getJobSnapshotMock,
    listConversationJobSnapshots: listConversationJobSnapshotsMock,
  }),
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

describe("deferred job status routes", () => {
  beforeEach(() => {
    resolveUserIdMock.mockResolvedValue({ userId: "usr_test" });
    getMock.mockResolvedValue({ conversation: { id: "conv_jobs" }, messages: [] });
    getActiveForUserMock.mockResolvedValue({ conversation: { id: "conv_jobs" }, messages: [] });
  });

  it("returns a normalized snapshot for a single deferred job", async () => {
    getJobSnapshotMock.mockResolvedValue({
      messageId: "jobmsg_job_1",
      conversationId: "conv_jobs",
      part: {
        type: "job_status",
        jobId: "job_1",
        toolName: "produce_blog_article",
        label: "Produce Blog Article",
        status: "running",
        progressLabel: "Drafting",
        updatedAt: "2026-03-25T03:00:00.000Z",
      },
    });

    const response = await getJob(new NextRequest("http://localhost/api/chat/jobs/job_1"), {
      params: Promise.resolve({ jobId: "job_1" }),
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.job.messageId).toBe("jobmsg_job_1");
    expect(body.job.part).toMatchObject({
      jobId: "job_1",
      toolName: "produce_blog_article",
      status: "running",
      progressLabel: "Drafting",
    });
  });

  it("lists conversation job snapshots and defaults to the active conversation", async () => {
    listConversationJobSnapshotsMock.mockResolvedValue([
      {
        messageId: "jobmsg_job_1",
        conversationId: "conv_jobs",
        part: {
          type: "job_status",
          jobId: "job_1",
          toolName: "draft_content",
          label: "Draft Content",
          status: "running",
          updatedAt: "2026-03-25T03:00:00.000Z",
        },
      },
    ]);

    const response = await listJobs(new NextRequest("http://localhost/api/chat/jobs?activeOnly=true&limit=5"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getActiveForUserMock).toHaveBeenCalledWith("usr_test");
    expect(listConversationJobSnapshotsMock).toHaveBeenCalledWith("conv_jobs", {
      statuses: ["queued", "running"],
      limit: 5,
    });
    expect(body.jobs).toHaveLength(1);
    expect(body.jobs[0].part).toMatchObject({ jobId: "job_1", status: "running" });
  });
});