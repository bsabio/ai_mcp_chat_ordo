import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { JobQueueDataMapper } from "@/adapters/JobQueueDataMapper";
import { ensureSchema } from "@/lib/db/schema";

function createDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  ensureSchema(db);
  return db;
}

function seedUser(db: Database.Database, userId: string) {
  db.prepare(`INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`)
    .run(userId, `${userId}@example.com`, userId);
}

function seedConversation(
  db: Database.Database,
  conversationId: string,
  userId: string,
  options?: { convertedFrom?: string | null; sessionSource?: string },
) {
  db.prepare(
    `INSERT INTO conversations (id, user_id, title, converted_from, status, session_source)
     VALUES (?, ?, ?, ?, 'active', ?)`,
  ).run(
    conversationId,
    userId,
    conversationId,
    options?.convertedFrom ?? null,
    options?.sessionSource ?? "authenticated",
  );
}

describe("Sprint 1 user-scoped job visibility", () => {
  let db: Database.Database;
  let repo: JobQueueDataMapper;

  beforeEach(() => {
    db = createDb();
    seedUser(db, "usr_owner");
    seedUser(db, "usr_other");
    seedUser(db, "anon_seed");

    seedConversation(db, "conv_owned", "usr_owner");
    seedConversation(db, "conv_migrated", "usr_owner", {
      convertedFrom: "anon_seed",
      sessionSource: "authenticated",
    });
    seedConversation(db, "conv_other", "usr_other");

    repo = new JobQueueDataMapper(db);
  });

  it("lists jobs for the signed-in owner across directly owned and migrated conversations", async () => {
    const ownedJob = await repo.createJob({
      conversationId: "conv_owned",
      userId: "usr_owner",
      toolName: "draft_content",
      requestPayload: { title: "Owned" },
    });
    const migratedJob = await repo.createJob({
      conversationId: "conv_migrated",
      userId: null,
      toolName: "publish_content",
      initiatorType: "anonymous_session",
      requestPayload: { postId: "post_1" },
    });
    await repo.createJob({
      conversationId: "conv_other",
      userId: "usr_other",
      toolName: "generate_image",
      requestPayload: { prompt: "Other" },
    });

    const jobs = await repo.listJobsByUser("usr_owner", { limit: 10 });

    expect(jobs.map((job) => job.id)).toEqual(expect.arrayContaining([ownedJob.id, migratedJob.id]));
    expect(jobs.every((job) => job.conversationId !== "conv_other")).toBe(true);
  });

  it("streams only the signed-in user's events with a durable user-scoped cursor", async () => {
    const ownedJob = await repo.createJob({
      conversationId: "conv_owned",
      userId: "usr_owner",
      toolName: "draft_content",
      requestPayload: { title: "Owned" },
    });
    const migratedJob = await repo.createJob({
      conversationId: "conv_migrated",
      userId: null,
      toolName: "publish_content",
      initiatorType: "anonymous_session",
      requestPayload: { postId: "post_1" },
    });
    const otherJob = await repo.createJob({
      conversationId: "conv_other",
      userId: "usr_other",
      toolName: "generate_image",
      requestPayload: { prompt: "Other" },
    });

    const first = await repo.appendEvent({ jobId: ownedJob.id, conversationId: "conv_owned", eventType: "queued" });
    const second = await repo.appendEvent({ jobId: migratedJob.id, conversationId: "conv_migrated", eventType: "started" });
    await repo.appendEvent({ jobId: otherJob.id, conversationId: "conv_other", eventType: "queued" });

    const events = await repo.listUserEvents("usr_owner", { afterSequence: 0, limit: 10 });
    const replay = await repo.listUserEvents("usr_owner", { afterSequence: events[0]?.sequence ?? 0, limit: 10 });

    expect(events).toHaveLength(2);
    expect(events.map((event) => event.jobId)).toEqual([ownedJob.id, migratedJob.id]);
    expect(events[0]?.sequence).toBeLessThan(events[1]?.sequence ?? 0);
    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(1);
    expect(replay.map((event) => event.jobId)).toEqual([migratedJob.id]);
  });

  it("returns durable event history only for jobs visible to the signed-in owner", async () => {
    const migratedJob = await repo.createJob({
      conversationId: "conv_migrated",
      userId: null,
      toolName: "publish_content",
      initiatorType: "anonymous_session",
      requestPayload: { postId: "post_1" },
    });
    const otherJob = await repo.createJob({
      conversationId: "conv_other",
      userId: "usr_other",
      toolName: "generate_image",
      requestPayload: { prompt: "Other" },
    });

    await repo.appendEvent({ jobId: migratedJob.id, conversationId: "conv_migrated", eventType: "queued" });
    await repo.appendEvent({ jobId: migratedJob.id, conversationId: "conv_migrated", eventType: "progress", payload: { progressLabel: "Publishing", progressPercent: 80 } });
    await repo.appendEvent({ jobId: otherJob.id, conversationId: "conv_other", eventType: "queued" });

    const visibleHistory = await repo.listEventsForUserJob("usr_owner", migratedJob.id, { limit: 10 });
    const hiddenHistory = await repo.listEventsForUserJob("usr_owner", otherJob.id, { limit: 10 });

    expect(visibleHistory.map((event) => event.eventType)).toEqual(["queued", "progress"]);
    expect(hiddenHistory).toEqual([]);
  });
});