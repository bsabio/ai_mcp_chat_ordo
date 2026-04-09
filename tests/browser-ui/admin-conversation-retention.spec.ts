import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { expect, test, type Page, type Route } from "@playwright/test";

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

async function stubShellRequests(page: Page) {
  await page.route("**/api/preferences", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ preferences: [] }),
    });
  });

  await page.route("**/api/conversations/active", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ conversationId: null }),
    });
  });
}

function seedAdminSessionAndConversation(conversationId: string, sessionToken: string) {
  const db = openBrowserDb();

  try {
    db.prepare(
      `INSERT OR REPLACE INTO sessions (id, user_id, created_at, expires_at)
       VALUES (?, 'usr_admin', datetime('now'), datetime('now', '+7 days'))`,
    ).run(sessionToken);

    db.prepare(`DELETE FROM messages WHERE conversation_id = ?`).run(conversationId);
    db.prepare(`DELETE FROM conversations WHERE id = ?`).run(conversationId);

    db.prepare(
      `INSERT INTO conversations (
        id,
        user_id,
        title,
        status,
        session_source,
        deleted_at,
        deleted_by_user_id,
        delete_reason,
        purge_after,
        updated_at
      ) VALUES (?, 'usr_admin', 'Governed retention review', 'archived', 'authenticated', ?, 'usr_admin', 'user_removed', ?, ?)`,
    ).run(
      conversationId,
      '2026-04-01T00:00:00.000Z',
      '2099-04-30T00:00:00.000Z',
      '2026-04-08T12:00:00.000Z',
    );

    db.prepare(
      `INSERT INTO messages (id, conversation_id, role, content, parts, created_at, token_estimate)
       VALUES (?, ?, 'user', 'Retention review request', ?, '2026-04-01T00:00:00.000Z', 5)`,
    ).run(
      `msg_${conversationId}`,
      conversationId,
      JSON.stringify([{ type: 'text', text: 'Retention review request' }]),
    );

    db.prepare(`UPDATE conversations SET message_count = 1 WHERE id = ?`).run(conversationId);
  } finally {
    db.close();
  }
}

test.describe.configure({ timeout: 45_000 });

test("admin detail exposes export and clearly blocks ordinary purge before purgeAfter", async ({ page }) => {
  const conversationId = `conv_admin_retention_${Date.now()}`;
  const sessionToken = `admin-retention-${Date.now()}`;
  seedAdminSessionAndConversation(conversationId, sessionToken);
  await stubShellRequests(page);

  await page.context().addCookies([
    {
      name: "lms_session_token",
      value: sessionToken,
      url: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:34123",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto(`/admin/conversations/${conversationId}`);

  await expect(page.getByRole("heading", { name: "Governed retention review" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export JSON" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Purge blocked" })).toBeVisible();
  await expect(page.getByText(/Purge is blocked until/i)).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`conversation-${conversationId}.json`);
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  expect(fs.readFileSync(downloadPath as string, "utf8")).toContain('"version": 1');
});