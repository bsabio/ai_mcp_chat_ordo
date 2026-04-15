import Database from "better-sqlite3";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { JobQueueDataMapper } from "../../src/adapters/JobQueueDataMapper";
import { backdateRegisterFormStart, finishRegisterNavigation } from "./helpers/public-form";

test.describe.configure({ timeout: 90_000 });

const PLAYWRIGHT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:34123";

function resolveBrowserDbPath(): string {
  const configuredPath = process.env.STUDIO_ORDO_DB_PATH?.trim();
  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(process.cwd(), configuredPath);
  }

  return path.join(process.cwd(), ".data", "local.db");
}

function openBrowserDb(): Database.Database {
  const db = new Database(resolveBrowserDbPath());
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  return db;
}

function lookupUserIdByEmail(email: string): string | null {
  const db = openBrowserDb();

  try {
    const row = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string } | undefined;
    return row?.id ?? null;
  } finally {
    db.close();
  }
}

async function waitForUserIdByEmail(email: string): Promise<string> {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    const userId = lookupUserIdByEmail(email);
    if (userId) {
      return userId;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for registered user ${email}`);
}

async function seedQueuedDraftJob(userId: string, seedKey: string) {
  const conversationId = `conv_worker_live_${seedKey}`;
  const postTitle = `Worker-backed Queue Post ${seedKey}`;
  const db = openBrowserDb();
  const repo = new JobQueueDataMapper(db);

  try {
    db.prepare(
      `INSERT INTO conversations (id, user_id, title, status, session_source)
       VALUES (?, ?, ?, 'active', 'authenticated')`,
    ).run(conversationId, userId, "Worker-backed draft proof");

    const job = await repo.createJob({
      conversationId,
      userId,
      toolName: "draft_content",
      requestPayload: {
        title: postTitle,
        content: `# ${postTitle}\n\nThis draft was completed by the live deferred worker.`,
      },
    });

    return { conversationId, jobId: job.id, postTitle };
  } finally {
    db.close();
  }
}

test("processes a real queued draft job through the live worker and surfaces the terminal state in the browser", async ({ page }) => {
  await page.route("**/api/preferences", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          preferences: [{ key: "push_notifications", value: "disabled" }],
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ preferences: [] }),
    });
  });

  await backdateRegisterFormStart(page);
  await page.goto("/register");

  const seedKey = Date.now().toString(36);
  const uniqueEmail = `worker-live-${Date.now()}@example.com`;
  await page.getByLabel("Name").fill("Worker Live User");
  await page.getByLabel("Email").fill(uniqueEmail);
  await page.getByLabel("Password").fill("JobsPass123");
  await page.getByRole("button", { name: "Create Account" }).click();

  const userId = await waitForUserIdByEmail(uniqueEmail);
  await finishRegisterNavigation(page);
  const seeded = await seedQueuedDraftJob(userId, seedKey);

  await page.goto(`/jobs?jobId=${seeded.jobId}`);

  const jobCard = page.getByTestId(`job-card-${seeded.jobId}`);
  await expect(page.getByText("Live updates connected.")).toBeVisible();
  await expect(jobCard).toBeVisible();
  await expect(jobCard).toContainText("draft_content");
  await expect(jobCard).toContainText(seeded.postTitle);
  await expect(jobCard).toContainText("Succeeded", { timeout: 15_000 });
  await expect(jobCard).toContainText(`Draft journal article \"${seeded.postTitle}\" ready`, { timeout: 15_000 });
  await expect(page.getByRole("link", { name: "Open artifact" })).toBeVisible();

  await page.goto(`/?conversationId=${seeded.conversationId}`);

  const transcriptResult = page.getByRole("region", { name: "Draft Content result" }).first();
  await expect(transcriptResult).toBeVisible({ timeout: 15_000 });
  await expect(transcriptResult).toContainText(seeded.postTitle);
});