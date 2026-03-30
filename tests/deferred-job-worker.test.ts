import Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationDataMapper } from "@/adapters/ConversationDataMapper";
import { ensureSchema } from "@/lib/db/schema";
import { JobQueueDataMapper } from "@/adapters/JobQueueDataMapper";
import { MessageDataMapper } from "@/adapters/MessageDataMapper";
import { DeferredJobWorker } from "@/lib/jobs/deferred-job-worker";
import { DeferredJobConversationProjector } from "@/lib/jobs/deferred-job-conversation-projector";

function createDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  ensureSchema(db);
  return db;
}

function seedConversation(db: Database.Database, userId = "usr_test", conversationId = "conv_jobs") {
  db.prepare(`INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`)
    .run(userId, `${userId}@example.com`, userId);
  db.prepare(
    `INSERT INTO conversations (id, user_id, title, status, session_source)
     VALUES (?, ?, 'Jobs', 'active', 'authenticated')`,
  ).run(conversationId, userId);
}

describe("DeferredJobWorker", () => {
  let db: Database.Database;
  let repo: JobQueueDataMapper;
  let projector: DeferredJobConversationProjector;
  let messageRepo: MessageDataMapper;

  beforeEach(() => {
    db = createDb();
    seedConversation(db);
    repo = new JobQueueDataMapper(db);
    messageRepo = new MessageDataMapper(db);
    projector = new DeferredJobConversationProjector(
      new ConversationDataMapper(db),
      messageRepo,
    );
  });

  it("processes a queued job, emits started/progress/result events, and marks it succeeded", async () => {
    const job = await repo.createJob({
      conversationId: "conv_jobs",
      userId: "usr_test",
      toolName: "draft_content",
      requestPayload: { title: "Worker" },
    });

    const worker = new DeferredJobWorker(repo, {
      draft_content: async (claimedJob, { reportProgress }) => {
        expect(claimedJob.id).toBe(job.id);
        await reportProgress({ progressPercent: 50, progressLabel: "Drafting" });
        return { postId: "blog_123" };
      },
    }, projector);

    const result = await worker.runNext({
      workerId: "worker_1",
      now: new Date("2026-03-25T03:00:00.000Z"),
      leaseDurationMs: 60_000,
    });

    expect(result.outcome).toBe("succeeded");
    expect(result.result).toEqual({ postId: "blog_123" });

    const persisted = await repo.findJobById(job.id);
    expect(persisted?.status).toBe("succeeded");
    expect(persisted?.resultPayload).toEqual({ postId: "blog_123" });
    expect(persisted?.claimedBy).toBeNull();

    const events = await repo.listConversationEvents("conv_jobs");
    expect(events.map((event) => event.eventType)).toEqual(["started", "progress", "result"]);

    const messages = await messageRepo.listByConversation("conv_jobs");
    expect(messages).toHaveLength(1);
    expect(messages[0]?.parts).toEqual([
      expect.objectContaining({
        type: "job_status",
        jobId: job.id,
        status: "succeeded",
      }),
    ]);
  });

  it("requeues expired running jobs before claiming the next available queued job", async () => {
    const expired = await repo.createJob({
      conversationId: "conv_jobs",
      userId: "usr_test",
      toolName: "draft_content",
      requestPayload: { title: "Expired" },
    });
    await repo.updateJobStatus(expired.id, {
      status: "running",
      claimedBy: "worker_old",
      leaseExpiresAt: "2026-03-25T02:00:00.000Z",
      incrementAttemptCount: true,
    });

    const fresh = await repo.createJob({
      conversationId: "conv_jobs",
      userId: "usr_test",
      toolName: "generate_image",
      priority: 50,
      requestPayload: { prompt: "Fresh" },
    });

    const worker = new DeferredJobWorker(repo, {
      draft_content: async () => ({ ok: true }),
      generate_image: async () => ({ assetId: "asset_1" }),
    }, projector);

    const result = await worker.runNext({
      workerId: "worker_new",
      now: new Date("2026-03-25T03:00:00.000Z"),
    });

    expect(result.reclaimedExpiredCount).toBe(1);
    expect(result.job?.id).toBe(fresh.id);

    const reclaimedExpired = await repo.findJobById(expired.id);
    expect(reclaimedExpired?.status).toBe("queued");
    expect(reclaimedExpired?.claimedBy).toBeNull();

    const reclaimedFresh = await repo.findJobById(fresh.id);
    expect(reclaimedFresh?.status).toBe("succeeded");
  });

  it("recovers an expired claimed publish job after a worker restart and completes it", async () => {
    const expired = await repo.createJob({
      conversationId: "conv_jobs",
      userId: "usr_test",
      toolName: "publish_content",
      requestPayload: { post_id: "post_123" },
    });
    await repo.updateJobStatus(expired.id, {
      status: "running",
      claimedBy: "worker_crashed",
      leaseExpiresAt: "2026-03-25T02:00:00.000Z",
      incrementAttemptCount: true,
    });

    const worker = new DeferredJobWorker(repo, {
      publish_content: async () => ({
        id: "post_123",
        slug: "queued-publish-post",
        title: "Queued Publish Post",
        status: "published",
        publishedAt: "2026-03-25T03:00:02.000Z",
      }),
    }, projector);

    const result = await worker.runNext({
      workerId: "worker_restarted",
      now: new Date("2026-03-25T03:00:00.000Z"),
    });

    expect(result.outcome).toBe("succeeded");
    expect(result.reclaimedExpiredCount).toBe(1);
    expect(result.job?.id).toBe(expired.id);

    const persisted = await repo.findJobById(expired.id);
    expect(persisted?.status).toBe("succeeded");
    expect(persisted?.attemptCount).toBe(2);
    expect(persisted?.claimedBy).toBeNull();

    const events = await repo.listConversationEvents("conv_jobs");
    expect(events.map((event) => event.eventType)).toEqual(["started", "result"]);
  });

  it("marks the job failed when no handler is registered", async () => {
    const job = await repo.createJob({
      conversationId: "conv_jobs",
      userId: "usr_test",
      toolName: "missing_handler",
      requestPayload: {},
    });

    const worker = new DeferredJobWorker(repo, {}, projector);
    const result = await worker.runNext({ workerId: "worker_1" });

    expect(result.outcome).toBe("failed");
    expect(result.errorMessage).toContain("No deferred job handler");

    const persisted = await repo.findJobById(job.id);
    expect(persisted?.status).toBe("failed");
  });

  it("marks the job failed when the handler throws", async () => {
    const job = await repo.createJob({
      conversationId: "conv_jobs",
      userId: "usr_test",
      toolName: "draft_content",
      requestPayload: {},
    });

    const worker = new DeferredJobWorker(repo, {
      draft_content: vi.fn(async () => {
        throw new Error("provider offline");
      }),
    }, projector);

    const result = await worker.runNext({ workerId: "worker_1" });

    expect(result.outcome).toBe("failed");
    expect(result.errorMessage).toBe("provider offline");

    const persisted = await repo.findJobById(job.id);
    expect(persisted?.status).toBe("failed");

    const events = await repo.listConversationEvents("conv_jobs");
    expect(events.at(-1)?.eventType).toBe("failed");
  });

  it("returns idle when no queued jobs are available", async () => {
    const worker = new DeferredJobWorker(repo, {}, projector);
    const result = await worker.runNext({ workerId: "worker_1" });

    expect(result.outcome).toBe("idle");
    expect(result.job).toBeNull();
  });

  it("does not overwrite a canceled running job with a late success result", async () => {
    const job = await repo.createJob({
      conversationId: "conv_jobs",
      userId: "usr_test",
      toolName: "draft_content",
      requestPayload: {},
    });

    const worker = new DeferredJobWorker(repo, {
      draft_content: async () => {
        await repo.cancelJob(job.id, "2026-03-25T03:00:01.000Z");
        return { postId: "blog_123" };
      },
    }, projector);

    const result = await worker.runNext({ workerId: "worker_1" });

    expect(result.outcome).toBe("canceled");

    const persisted = await repo.findJobById(job.id);
    expect(persisted?.status).toBe("canceled");
    expect(persisted?.resultPayload).toBeNull();
  });

  it("appends notification_sent after terminal delivery succeeds", async () => {
    await repo.createJob({
      conversationId: "conv_jobs",
      userId: "usr_test",
      toolName: "draft_content",
      requestPayload: { title: "Worker" },
    });

    const worker = new DeferredJobWorker(
      repo,
      {
        draft_content: async () => ({ postId: "blog_123" }),
      },
      projector,
      {
        notify: vi.fn(async () => true),
      },
    );

    const result = await worker.runNext({ workerId: "worker_1" });

    expect(result.outcome).toBe("succeeded");

    const events = await repo.listConversationEvents("conv_jobs");
    expect(events.map((event) => event.eventType)).toEqual(["started", "result", "notification_sent"]);
  });
});