import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionUserMock,
  findJobByIdMock,
  listEventsForJobMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  findJobByIdMock: vi.fn(),
  listEventsForJobMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getJobQueueDataMapper: () => ({
    findJobById: findJobByIdMock,
    listEventsForJob: listEventsForJobMock,
  }),
}));

import { GET } from "@/app/api/admin/jobs/[jobId]/export/route";

describe("/api/admin/jobs/[jobId]/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin callers", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "usr_member",
      email: "member@example.com",
      name: "Member",
      roles: ["AUTHENTICATED"],
    });

    const response = await GET(new Request("https://studioordo.test/api/admin/jobs/job_1/export") as never, {
      params: Promise.resolve({ jobId: "job_1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: expect.stringContaining("restricted to administrators") });
  });

  it("returns a job log export for admins", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "usr_admin",
      email: "admin@example.com",
      name: "Admin",
      roles: ["ADMIN"],
    });
    findJobByIdMock.mockResolvedValue({
      id: "job_1",
      toolName: "publish_content",
      conversationId: "conv_1",
      userId: "usr_owner",
      status: "failed",
      priority: 80,
      dedupeKey: "post_1_publish",
      initiatorType: "user",
      attemptCount: 3,
      claimedBy: null,
      leaseExpiresAt: null,
      failureClass: "transient",
      nextRetryAt: null,
      recoveryMode: "rerun",
      replayedFromJobId: null,
      supersededByJobId: "job_2",
      createdAt: "2026-04-08T12:00:00.000Z",
      startedAt: "2026-04-08T12:01:00.000Z",
      completedAt: "2026-04-08T12:03:00.000Z",
      updatedAt: "2026-04-08T12:03:00.000Z",
      requestPayload: { post_id: "post_1" },
      resultPayload: null,
      errorMessage: "Missing publish target.",
    });
    listEventsForJobMock.mockResolvedValue([
      {
        id: "evt_1",
        sequence: 4,
        eventType: "failed",
        payload: { errorMessage: "Missing publish target." },
        createdAt: "2026-04-08T12:03:00.000Z",
      },
    ]);

    const response = await GET(new Request("https://studioordo.test/api/admin/jobs/job_1/export") as never, {
      params: Promise.resolve({ jobId: "job_1" }),
    });
    const body = await response.text();
    const payload = JSON.parse(body) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toContain("job-job_1-log.json");
    expect(payload.job).toMatchObject({
      id: "job_1",
      label: "Publish Content",
      executionPrincipal: "system_worker",
      artifactPolicy: "open_artifact",
    });
    expect(payload.events).toEqual([
      expect.objectContaining({ eventType: "failed", sequence: 4 }),
    ]);
  });

  it("fails closed for unregistered job capabilities", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "usr_admin",
      email: "admin@example.com",
      name: "Admin",
      roles: ["ADMIN"],
    });
    findJobByIdMock.mockResolvedValue({
      id: "job_hidden",
      toolName: "legacy_hidden_tool",
    });

    const response = await GET(new Request("https://studioordo.test/api/admin/jobs/job_hidden/export") as never, {
      params: Promise.resolve({ jobId: "job_hidden" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({ error: "Job not found." });
  });
});