import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { BlogPostDataMapper } from "@/adapters/BlogPostDataMapper";
import { JobQueueDataMapper } from "@/adapters/JobQueueDataMapper";
import { ensureSchema } from "@/lib/db/schema";

function createTempDbPath() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "studio-ordo-worker-"));
  return {
    tempDir,
    dbPath: path.join(tempDir, "worker-process.db"),
  };
}

describe("deferred job worker process", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reclaims an expired publish job in a separate worker process using a persistent SQLite file", async () => {
    const { tempDir, dbPath } = createTempDbPath();
    tempDirs.push(tempDir);

    const db = new Database(dbPath);
    db.pragma("foreign_keys = ON");
    ensureSchema(db);
    db.prepare(`INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`)
      .run("usr_admin", "admin@example.com", "Admin");
    db.prepare(
      `INSERT INTO conversations (id, user_id, title, status, session_source)
       VALUES (?, ?, 'Worker restart', 'active', 'authenticated')`,
    ).run("conv_restart", "usr_admin");

    const blogRepo = new BlogPostDataMapper(db);
    const jobRepo = new JobQueueDataMapper(db);
    const draft = await blogRepo.create({
      slug: "worker-restart-post",
      title: "Worker Restart Post",
      description: "Persistent draft",
      content: "## Restart\n\nThis draft is published after a worker restart.",
      createdByUserId: "usr_admin",
    });

    const job = await jobRepo.createJob({
      conversationId: "conv_restart",
      userId: "usr_admin",
      toolName: "publish_content",
      requestPayload: { post_id: draft.id },
    });
    await jobRepo.updateJobStatus(job.id, {
      status: "running",
      claimedBy: "worker_crashed",
      leaseExpiresAt: "2026-03-25T02:00:00.000Z",
      incrementAttemptCount: true,
    });
    db.close();

    const tsxCli = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
    const child = spawnSync(
      process.execPath,
      [tsxCli, "scripts/process-deferred-jobs.ts"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          STUDIO_ORDO_DB_PATH: dbPath,
          DEFERRED_JOB_WORKER_ID: "worker_restart_process",
          DEFERRED_JOB_RUN_ONCE: "1",
        },
        encoding: "utf8",
      },
    );

    expect(child.status).toBe(0);
    expect(child.stdout).toContain("[deferred-jobs] processed");
    expect(child.stdout).toContain("publish_content");

    const reopenedDb = new Database(dbPath);
    reopenedDb.pragma("foreign_keys = ON");
    const reopenedBlogRepo = new BlogPostDataMapper(reopenedDb);
    const reopenedJobRepo = new JobQueueDataMapper(reopenedDb);

    const persistedJob = await reopenedJobRepo.findJobById(job.id);
    expect(persistedJob).toMatchObject({
      id: job.id,
      status: "succeeded",
      attemptCount: 2,
      claimedBy: null,
    });

    const persistedPost = await reopenedBlogRepo.findById(draft.id);
    expect(persistedPost).toMatchObject({
      id: draft.id,
      status: "published",
      publishedByUserId: "usr_admin",
    });

    const events = await reopenedJobRepo.listConversationEvents("conv_restart");
    expect(events.map((event) => event.eventType)).toEqual(["started", "result"]);
    reopenedDb.close();
  });
});