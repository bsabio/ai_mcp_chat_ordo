import { expect, test, type Page, type Route } from "@playwright/test";

test.describe("Chat progress strip", () => {
  test.use({ viewport: { width: 390, height: 844 } });

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
  }

  test("shows attention-first items, mobile overflow, and whole-job retry", async ({ page }) => {
    let retryPosted = false;

    const buildPayload = (retried: boolean) => ({
      conversation: {
        id: "conv_progress_strip",
        userId: "usr_admin",
        title: "Deferred work",
        status: "active",
        createdAt: "2026-04-08T12:00:00.000Z",
        updatedAt: "2026-04-08T12:05:00.000Z",
        convertedFrom: null,
        messageCount: 4,
        firstMessageAt: "2026-04-08T12:00:00.000Z",
        lastToolUsed: "publish_content",
        sessionSource: "authenticated",
        promptVersion: null,
        routingSnapshot: { lane: "organization", confidence: 0.86 },
        referralSource: null,
      },
      messages: [
        {
          id: "msg_publish_failed",
          role: "assistant",
          content: "",
          createdAt: "2026-04-08T12:04:00.000Z",
          parts: [
            {
              type: "job_status",
              jobId: "job_publish_failed",
              toolName: "publish_content",
              label: "Publish Content",
              title: "Deferred Queue Post",
              status: retried ? "running" : "failed",
              summary: retried ? "Publishing resumed." : "Publishing needs another run.",
              progressLabel: retried ? "Retrying publish" : undefined,
              progressPercent: retried ? 8 : undefined,
              updatedAt: "2026-04-08T12:04:00.000Z",
            },
          ],
        },
        {
          id: "msg_draft_running",
          role: "assistant",
          content: "",
          createdAt: "2026-04-08T12:03:00.000Z",
          parts: [
            {
              type: "job_status",
              jobId: "job_draft_running",
              toolName: "draft_content",
              label: "Draft Content",
              title: "AI Governance Playbook",
              status: "running",
              progressLabel: "Reviewing article",
              progressPercent: 42,
              updatedAt: "2026-04-08T12:03:00.000Z",
            },
          ],
        },
        {
          id: "msg_image_running",
          role: "assistant",
          content: "",
          createdAt: "2026-04-08T12:02:00.000Z",
          parts: [
            {
              type: "job_status",
              jobId: "job_image_running",
              toolName: "generate_blog_image",
              label: "Generate Blog Image",
              title: "AI Governance Playbook",
              status: "running",
              progressLabel: "Rendering",
              progressPercent: 20,
              updatedAt: "2026-04-08T12:02:00.000Z",
            },
          ],
        },
        {
          id: "msg_qa_queued",
          role: "assistant",
          content: "",
          createdAt: "2026-04-08T12:01:00.000Z",
          parts: [
            {
              type: "job_status",
              jobId: "job_qa_queued",
              toolName: "qa_blog_article",
              label: "QA Blog Article",
              title: "AI Governance Playbook",
              status: "queued",
              updatedAt: "2026-04-08T12:01:00.000Z",
            },
          ],
        },
      ],
    });

    await stubConversationShell(page);

    await page.route("**/api/conversations/active", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildPayload(retryPosted)),
      });
    });

    await page.route("**/api/conversations/conv_progress_strip", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildPayload(retryPosted)),
      });
    });

    await page.route("**/api/chat/jobs/job_publish_failed", async (route: Route) => {
      retryPosted = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ job: { conversationId: "conv_progress_strip" } }),
      });
    });

    await page.goto("/");

    await expect(page.locator('[data-chat-progress-strip="true"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish Content: Needs attention" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Draft Content: Reviewing article 42%" })).toBeVisible();
    await expect(page.getByRole("button", { name: "More active work (2)" })).toBeVisible();

    await page.getByRole("button", { name: "More active work (2)" }).click();
    await expect(page.getByRole("dialog", { name: "More active work" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate Blog Image Rendering 20%" })).toBeVisible();
    await expect(page.getByRole("button", { name: "QA Blog Article Queued" })).toBeVisible();

    await page.getByRole("button", { name: "Publish Content: Needs attention" }).click();
    await expect(page.getByRole("dialog", { name: "Publish Content progress details" })).toContainText("Publishing needs another run.");

    const retryRequest = page.waitForRequest("**/api/chat/jobs/job_publish_failed");
    await page.getByRole("button", { name: "Retry whole job" }).click();
    await retryRequest;

    await expect(page.getByRole("button", { name: "Publish Content: Retrying publish 8%" })).toBeVisible();
  });

  test("stays hidden when only completed jobs remain", async ({ page }) => {
    await stubConversationShell(page);

    await page.route("**/api/conversations/active", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          conversation: {
            id: "conv_completed",
            userId: "usr_admin",
            title: "Completed work",
            status: "active",
            createdAt: "2026-04-08T12:00:00.000Z",
            updatedAt: "2026-04-08T12:05:00.000Z",
            convertedFrom: null,
            messageCount: 1,
            firstMessageAt: "2026-04-08T12:00:00.000Z",
            lastToolUsed: "publish_content",
            sessionSource: "authenticated",
            promptVersion: null,
            routingSnapshot: { lane: "organization", confidence: 0.86 },
            referralSource: null,
          },
          messages: [
            {
              id: "msg_publish_done",
              role: "assistant",
              content: "",
              createdAt: "2026-04-08T12:04:00.000Z",
              parts: [
                {
                  type: "job_status",
                  jobId: "job_publish_done",
                  toolName: "publish_content",
                  label: "Publish Content",
                  title: "Deferred Queue Post",
                  status: "succeeded",
                  summary: "Published successfully.",
                  updatedAt: "2026-04-08T12:04:00.000Z",
                },
              ],
            },
          ],
        }),
      });
    });

    await page.goto("/");

    await expect(page.locator('[data-chat-progress-strip="true"]')).toHaveCount(0);
  });
});