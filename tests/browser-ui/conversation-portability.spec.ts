import fs from "node:fs";

import { expect, test, type Page, type Route } from "@playwright/test";

test.describe.configure({ timeout: 45_000 });

const EXPORT_PAYLOAD = {
  version: 1,
  exportedAt: "2026-04-08T12:00:00.000Z",
  conversation: {
    id: "conv_portability_e2e",
    title: "Portability thread",
    status: "archived",
    createdAt: "2026-04-08T10:00:00.000Z",
    updatedAt: "2026-04-08T10:01:00.000Z",
    messageCount: 2,
    sessionSource: "anonymous_cookie",
    promptVersion: null,
    routingSnapshot: { lane: "organization", confidence: 0.86 },
    referralSource: null,
  },
  messages: [
    {
      id: "msg_user_export_1",
      role: "user",
      content: "Export this conversation for the record.",
      parts: [{ type: "text", text: "Export this conversation for the record." }],
      createdAt: "2026-04-08T10:00:10.000Z",
      tokenEstimate: 9,
      attachmentManifestIds: [],
    },
    {
      id: "msg_assistant_export_1",
      role: "assistant",
      content: "Drafted export summary.",
      parts: [{ type: "text", text: "Drafted export summary." }],
      createdAt: "2026-04-08T10:00:12.000Z",
      tokenEstimate: 5,
      attachmentManifestIds: [],
    },
  ],
  attachmentManifest: [],
  jobReferences: [],
};

async function stubConversationShell(page: Page) {
  await page.route("**/api/preferences", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ preferences: [] }),
    });
  });

  await page.route("**/api/referral/visit", async (route: Route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "No referral visit" }),
    });
  });

  await page.route("**/api/conversations/active", async (route: Route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "No active conversation" }),
    });
  });

  await page.route("**/api/chat/events**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
      body: "",
    });
  });

  await page.route("**/api/chat/stream", async (route: Route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
      body: [
        `data: ${JSON.stringify({ conversation_id: "conv_portability_e2e" })}`,
        `data: ${JSON.stringify({ stream_id: "stream_portability_e2e" })}`,
        `data: ${JSON.stringify({ delta: "Drafted export summary." })}`,
        "",
      ].join("\n"),
    });
  });

  await page.route("**/api/conversations/conv_portability_e2e/export", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "content-disposition": 'attachment; filename="conversation-conv_portability_e2e.json"',
      },
      body: `${JSON.stringify(EXPORT_PAYLOAD, null, 2)}\n`,
    });
  });

  await page.route("**/api/conversations/import", async (route: Route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        conversation: {
          id: "conv_imported_portability",
          userId: "anon_123",
          title: "Imported portability thread",
          status: "archived",
          createdAt: "2026-04-08T12:05:00.000Z",
          updatedAt: "2026-04-08T12:05:00.000Z",
          convertedFrom: null,
          messageCount: 2,
          firstMessageAt: "2026-04-08T12:05:00.000Z",
          lastToolUsed: null,
          sessionSource: "anonymous_cookie",
          promptVersion: null,
          routingSnapshot: { lane: "organization", confidence: 0.86 },
          referralSource: null,
          importedAt: "2026-04-08T12:05:00.000Z",
          importSourceConversationId: "conv_portability_e2e",
          importedFromExportedAt: "2026-04-08T12:00:00.000Z",
        },
        messages: [
          {
            id: "msg_import_user_1",
            role: "user",
            content: "Imported question",
            parts: [{ type: "text", text: "Imported question" }],
            createdAt: "2026-04-08T12:05:00.000Z",
          },
          {
            id: "msg_import_assistant_1",
            role: "assistant",
            content: "Imported attachment summary.",
            parts: [
              { type: "text", text: "Imported attachment summary." },
              {
                type: "imported_attachment",
                fileName: "handoff.pdf",
                mimeType: "application/pdf",
                fileSize: 2048,
                availability: "unavailable",
                note: "The original attachment is unavailable in this workspace and could not be restored.",
              },
            ],
            createdAt: "2026-04-08T12:05:02.000Z",
          },
        ],
      }),
    });
  });
}

async function openConversationDataMenu(page: Page) {
  await page.getByRole("button", { name: "Open conversation data menu" }).click();
  await expect(page.getByRole("menu", { name: "Conversation data" })).toBeVisible();
}

test("copy transcript, export JSON, and import degraded attachment state from the chat shell", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await stubConversationShell(page);

  await page.goto("/");

  const textarea = page.getByPlaceholder("Ask Studio Ordo...");
  await expect(textarea).toBeVisible();

  await textarea.fill("Export this conversation for the record.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText("Drafted export summary.")).toBeVisible();

  await openConversationDataMenu(page);
  await page.getByRole("menuitem", { name: "Copy transcript" }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("Drafted export summary.");

  await openConversationDataMenu(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Export JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("conversation-conv_portability_e2e.json");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  expect(fs.readFileSync(downloadPath as string, "utf8")).toContain('"version": 1');

  await openConversationDataMenu(page);
  await page.locator('[data-chat-conversation-data-menu="true"] input[type="file"]').setInputFiles({
    name: "conversation-import.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(EXPORT_PAYLOAD), "utf8"),
  });

  await expect(page.getByText("Imported attachment summary.")).toBeVisible();
  await expect(page.getByText("The original attachment is unavailable in this workspace and could not be restored.")).toBeVisible();
  await expect(page.locator('[data-chat-imported-attachment="unavailable"]')).toBeVisible();
});