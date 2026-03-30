import Database from "better-sqlite3";
import { describe, expect, it, beforeEach } from "vitest";
import { ensureSchema } from "@/lib/db/schema";
import { JobQueueDataMapper } from "@/adapters/JobQueueDataMapper";

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

describe("JobQueueDataMapper", () => {
  let db: Database.Database;
  let repo: JobQueueDataMapper;

  beforeEach(() => {
    db = createDb();
    seedConversation(db);
    repo = new JobQueueDataMapper(db);
  });

  it("creates anonymous-origin jobs with nullable user id", async () => {
    const job = await repo.createJob({
      conversationId: "conv_jobs",
      userId: null,
      toolName: "draft_content",
      initiatorType: "anonymous_session",
      requestPayload: { title: "Queued draft" },
    });

    expect(job.status).toBe("queued");
    expect(job.userId).toBeNull();
    expect(job.initiatorType).toBe("anonymous_session");
    expect(job.requestPayload).toEqual({ title: "Queued draft" });
  });

  it("assigns monotonic conversation-scoped event sequences across jobs", async () => {
    const firstJob = await repo.createJob({
      conversationId: "conv_jobs",
      userId: "usr_test",
      toolName: "draft_content",
      requestPayload: { title: "One" },
    });
    const secondJob = await repo.createJob({
      conversationId: "conv_jobs",
      userId: "usr_test",
      toolName: "generate_image",
      requestPayload: { prompt: "Two" },
    });

    const eventOne = await repo.appendEvent({ jobId: firstJob.id, conversationId: "conv_jobs", eventType: "queued" });
    const eventTwo = await repo.appendEvent({ jobId: secondJob.id, conversationId: "conv_jobs", eventType: "queued" });
    const eventThree = await repo.appendEvent({ jobId: firstJob.id, conversationId: "conv_jobs", eventType: "progress", payload: { percent: 25 } });

    expect([eventOne.sequence, eventTwo.sequence, eventThree.sequence]).toEqual([1, 2, 3]);
  });

  it("lists conversation events after a stable cursor", async () => {
    const job = await repo.createJob({
      conversationId: "conv_jobs",
      userId: "usr_test",
      toolName: "draft_content",
      requestPayload: { title: "Cursor" },
    });

    await repo.appendEvent({ jobId: job.id, conversationId: "conv_jobs", eventType: "queued" });
    await repo.appendEvent({ jobId: job.id, conversationId: "conv_jobs", eventType: "started" });
    await repo.appendEvent({ jobId: job.id, conversationId: "conv_jobs", eventType: "progress", payload: { percent: 50 } });

    const events = await repo.listConversationEvents("conv_jobs", { afterSequence: 1 });
    expect(events.map((event) => event.sequence)).toEqual([2, 3]);
    expect(events.map((event) => event.eventType)).toEqual(["started", "progress"]);
  });

  it("claims the highest-priority queued job and marks it running", async () => {
    await repo.createJob({
      conversationId: "conv_jobs",
      userId: "usr_test",
      toolName: "draft_content",
      priority: 200,
      requestPayload: { title: "Low" },
    });
    const highPriority = await repo.createJob({
      conversationId: "conv_jobs",
      userId: "usr_test",
      toolName: "draft_content",
      priority: 10,
      requestPayload: { title: "High" },
    });

    const claimed = await repo.claimNextQueuedJob({
      workerId: "worker_1",
      leaseExpiresAt: "2030-01-01T00:00:00.000Z",
      now: "2026-03-25T00:00:00.000Z",
    });

    expect(claimed?.id).toBe(highPriority.id);
    expect(claimed?.status).toBe("running");
    expect(claimed?.claimedBy).toBe("worker_1");
    expect(claimed?.attemptCount).toBe(1);
  });

  it("updates status payloads and finds active deduped jobs", async () => {
    const job = await repo.createJob({
      conversationId: "conv_jobs",
      userId: "usr_test",
      toolName: "draft_content",
      dedupeKey: "conv_jobs:draft_content:hello",
      requestPayload: { title: "Hello" },
    });

    const active = await repo.findActiveJobByDedupeKey("conv_jobs", "conv_jobs:draft_content:hello");
    expect(active?.id).toBe(job.id);

    const updated = await repo.updateJobStatus(job.id, {
      status: "succeeded",
      resultPayload: { postId: "blog_123" },
      progressPercent: 100,
      progressLabel: "Done",
      completedAt: "2026-03-25T01:00:00.000Z",
      leaseExpiresAt: null,
      claimedBy: null,
    });

    expect(updated.status).toBe("succeeded");
    expect(updated.resultPayload).toEqual({ postId: "blog_123" });
    expect(updated.progressLabel).toBe("Done");

    const terminal = await repo.findActiveJobByDedupeKey("conv_jobs", "conv_jobs:draft_content:hello");
    expect(terminal).toBeNull();
  });

  it("preserves existing result and progress fields during partial status updates", async () => {
    const job = await repo.createJob({
      conversationId: "conv_jobs",
      userId: "usr_test",
      toolName: "draft_content",
      requestPayload: { title: "Preserve" },
    });

    await repo.updateJobStatus(job.id, {
      status: "running",
      resultPayload: { stage: "drafted" },
      progressPercent: 40,
      progressLabel: "Drafted",
      claimedBy: "worker_1",
      leaseExpiresAt: "2026-03-25T02:00:00.000Z",
    });

    const updated = await repo.updateJobStatus(job.id, {
      status: "running",
      progressPercent: 60,
    });

    expect(updated.resultPayload).toEqual({ stage: "drafted" });
    expect(updated.progressPercent).toBe(60);
    expect(updated.progressLabel).toBe("Drafted");
    expect(updated.claimedBy).toBe("worker_1");
    expect(updated.leaseExpiresAt).toBe("2026-03-25T02:00:00.000Z");
  });

  it("lists jobs by conversation and resolves the latest event for a job", async () => {
    const firstJob = await repo.createJob({
      conversationId: "conv_jobs",
      userId: "usr_test",
      toolName: "draft_content",
      requestPayload: { title: "First" },
    });
    const secondJob = await repo.createJob({
      conversationId: "conv_jobs",
      userId: "usr_test",
      toolName: "publish_content",
      requestPayload: { post_id: "post_1" },
    });

    await repo.appendEvent({ jobId: firstJob.id, conversationId: "conv_jobs", eventType: "queued" });
    await repo.appendEvent({ jobId: secondJob.id, conversationId: "conv_jobs", eventType: "queued" });
    const latest = await repo.appendEvent({
      jobId: secondJob.id,
      conversationId: "conv_jobs",
      eventType: "progress",
      payload: { progressLabel: "Publishing", progressPercent: 80 },
    });

    const listed = await repo.listJobsByConversation("conv_jobs", { limit: 10 });
    const latestEvent = await repo.findLatestEventForJob(secondJob.id);

    expect(listed.map((job) => job.id)).toEqual(expect.arrayContaining([firstJob.id, secondJob.id]));
    expect(latestEvent?.id).toBe(latest.id);
    expect(latestEvent?.eventType).toBe("progress");
  });
});