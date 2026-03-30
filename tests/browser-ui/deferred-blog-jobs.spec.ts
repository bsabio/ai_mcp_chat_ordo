import { expect, test } from "@playwright/test";

type ActiveConversationMode = "none" | "draft-complete" | "publish-complete" | "produce-complete" | "produce-running";

function buildConversationPayload(mode: ActiveConversationMode) {
  if (mode === "none") {
    return { status: 404, body: { error: "No active conversation" } };
  }

  const message = mode === "draft-complete"
    ? {
        id: "job_job_draft_1",
        role: "assistant",
        content: "",
        parts: [
          {
            type: "job_status",
            jobId: "job_draft_1",
            toolName: "draft_content",
            label: "Draft Content",
            status: "succeeded",
            summary: 'Draft "Deferred Queue Post" ready at /blog/deferred-queue-post.',
            resultPayload: {
              id: "post_1",
              slug: "deferred-queue-post",
              title: "Deferred Queue Post",
              status: "draft",
            },
            updatedAt: "2026-03-25T03:00:02.000Z",
          },
        ],
        createdAt: "2026-03-25T03:00:02.000Z",
      }
    : mode === "publish-complete"
      ? {
        id: "job_job_publish_1",
        role: "assistant",
        content: "",
        parts: [
          {
            type: "job_status",
            jobId: "job_publish_1",
            toolName: "publish_content",
            label: "Publish Content",
            status: "succeeded",
            summary: 'Published "Deferred Queue Post" at /journal/deferred-queue-post.',
            resultPayload: {
              id: "post_1",
              slug: "deferred-queue-post",
              title: "Deferred Queue Post",
              status: "published",
            },
            updatedAt: "2026-03-25T03:00:04.000Z",
          },
        ],
        createdAt: "2026-03-25T03:00:04.000Z",
      }
      : mode === "produce-running"
        ? {
        id: "job_job_produce_running_1",
        role: "assistant",
        content: "",
        parts: [
          {
            type: "job_status",
            jobId: "job_produce_running_1",
            toolName: "produce_blog_article",
            label: "Produce Blog Article",
            title: "AI Governance Playbook",
            subtitle: "Queued from the default worker runtime",
            status: "running",
            summary: "Produce Blog Article is still running.",
            progressLabel: "Generating outline",
            progressPercent: 18,
            updatedAt: "2026-03-25T03:00:05.000Z",
          },
        ],
        createdAt: "2026-03-25T03:00:05.000Z",
      }
      : {
        id: "job_job_produce_1",
        role: "assistant",
        content: "",
        parts: [
          {
            type: "job_status",
            jobId: "job_produce_1",
            toolName: "produce_blog_article",
            label: "Produce Blog Article",
            status: "succeeded",
            summary: 'Produced draft "AI Governance Playbook" at /blog/ai-governance-playbook with hero asset asset_hero_1.',
            resultPayload: {
              id: "post_hero_1",
              slug: "ai-governance-playbook",
              title: "AI Governance Playbook",
              status: "draft",
              imageAssetId: "asset_hero_1",
              stages: [
                "compose_blog_article",
                "qa_blog_article",
                "resolve_blog_article_qa",
                "generate_blog_image_prompt",
                "generate_blog_image",
                "draft_content",
              ],
              summary: 'Produced draft "AI Governance Playbook" at /blog/ai-governance-playbook with hero asset asset_hero_1.',
            },
            updatedAt: "2026-03-25T03:00:06.000Z",
          },
        ],
        createdAt: "2026-03-25T03:00:06.000Z",
      };

  const lastToolUsed = mode === "draft-complete"
    ? "draft_content"
    : mode === "publish-complete"
      ? "publish_content"
      : mode === "produce-running"
        ? "produce_blog_article"
      : "produce_blog_article";

  return {
    status: 200,
    body: {
      conversation: {
        id: "conv_blog_e2e",
        userId: "usr_admin",
        title: "Deferred blog",
        status: "active",
        createdAt: "2026-03-25T03:00:00.000Z",
        updatedAt: "2026-03-25T03:00:04.000Z",
        convertedFrom: null,
        messageCount: 1,
        firstMessageAt: "2026-03-25T03:00:00.000Z",
        lastToolUsed,
        sessionSource: "authenticated",
        promptVersion: null,
        routingSnapshot: {
          lane: "organization",
          confidence: 0.88,
          recommendedNextStep: "Publish approved content",
        },
        referralSource: null,
      },
      messages: [message],
    },
  };
}

test.describe("Deferred blog jobs", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("shows queued and completed draft state, survives reload, and reaches the published post route", async ({ page }) => {
    let activeConversationMode: ActiveConversationMode = "none";
    const draftStatus = page.getByLabel("Draft Content status").first();
    const publishStatus = page.getByLabel("Publish Content status").first();

    await page.route("**/api/preferences", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ preferences: [{ key: "push_notifications", value: "enabled" }] }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ preferences: [] }),
      });
    });

    await page.route("**/api/conversations/active", async (route) => {
      const payload = buildConversationPayload(activeConversationMode);
      await route.fulfill({
        status: payload.status,
        contentType: "application/json",
        body: JSON.stringify(payload.body),
      });
    });

    await page.route("**/api/chat/stream", async (route) => {
      const requestBody = route.request().postDataJSON() as { messages?: Array<{ content?: string }> };
      const lastMessage = requestBody.messages?.at(-1)?.content ?? "";

      if (lastMessage.includes("Publish the draft post with id post_1")) {
        activeConversationMode = "publish-complete";
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: [
            'data: {"conversation_id":"conv_blog_e2e"}',
            'data: {"type":"job_queued","jobId":"job_publish_1","conversationId":"conv_blog_e2e","sequence":3,"toolName":"publish_content","label":"Publish Content","updatedAt":"2026-03-25T03:00:03.000Z"}',
            'data: {"type":"job_completed","jobId":"job_publish_1","conversationId":"conv_blog_e2e","sequence":4,"toolName":"publish_content","label":"Publish Content","summary":"Published \\\"Deferred Queue Post\\\" at /journal/deferred-queue-post.","resultPayload":{"id":"post_1","slug":"deferred-queue-post","title":"Deferred Queue Post","status":"published"},"updatedAt":"2026-03-25T03:00:04.000Z"}',
            "",
          ].join("\n"),
        });
        return;
      }

      activeConversationMode = "draft-complete";
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: [
          'data: {"conversation_id":"conv_blog_e2e"}',
          'data: {"type":"job_queued","jobId":"job_draft_1","conversationId":"conv_blog_e2e","sequence":1,"toolName":"draft_content","label":"Draft Content","updatedAt":"2026-03-25T03:00:01.000Z"}',
          'data: {"type":"job_completed","jobId":"job_draft_1","conversationId":"conv_blog_e2e","sequence":2,"toolName":"draft_content","label":"Draft Content","summary":"Draft \\\"Deferred Queue Post\\\" ready at /blog/deferred-queue-post.","resultPayload":{"id":"post_1","slug":"deferred-queue-post","title":"Deferred Queue Post","status":"draft"},"updatedAt":"2026-03-25T03:00:02.000Z"}',
          "",
        ].join("\n"),
      });
    });

    await page.route("**/api/chat/events**", async (route) => {
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

    await page.route("**/journal/deferred-queue-post*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `<!doctype html><html><body><main><h1>Deferred Queue Post</h1><p>Published page</p></main></body></html>`,
      });
    });

    await page.goto("/");

    const textarea = page.getByPlaceholder("Paste the workflow, brief, or handoff...");
    await expect(textarea).toBeVisible();
    await textarea.fill("Draft a blog post about deferred queue reliability.");
    await page.getByRole("button", { name: "Send", exact: true }).click();

    await expect(draftStatus).toBeVisible();
    await expect(draftStatus).toContainText("Succeeded", { timeout: 5000 });
    await expect(draftStatus).toContainText('Draft "Deferred Queue Post" ready at /blog/deferred-queue-post.');
    await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();

    await page.reload();
    await expect(draftStatus).toContainText("Succeeded");

    await page.getByRole("button", { name: "Publish" }).click();
    await page.getByRole("button", { name: "Send", exact: true }).click();

    await expect(publishStatus).toBeVisible();
    await expect(publishStatus).toContainText("Succeeded", { timeout: 5000 });
    await expect(page.getByRole("button", { name: "Open published post" })).toBeVisible();

    await page.getByRole("button", { name: "Open published post" }).click();
    await expect(page).toHaveURL(/\/journal\/deferred-queue-post/);
    await page.goto("/journal/deferred-queue-post");
    await expect(page.getByRole("heading", { name: "Deferred Queue Post" })).toBeVisible();
  });

  test("shows queued and completed article-production state, survives reload, and opens the produced draft and hero image", async ({ page }) => {
    let activeConversationMode: ActiveConversationMode = "none";
    const produceStatus = page.getByLabel("Produce Blog Article status").first();

    await page.route("**/api/preferences", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ preferences: [{ key: "push_notifications", value: "enabled" }] }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ preferences: [] }),
      });
    });

    await page.route("**/api/conversations/active", async (route) => {
      const payload = buildConversationPayload(activeConversationMode);
      await route.fulfill({
        status: payload.status,
        contentType: "application/json",
        body: JSON.stringify(payload.body),
      });
    });

    await page.route("**/api/chat/stream", async (route) => {
      activeConversationMode = "produce-complete";
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: [
          'data: {"conversation_id":"conv_blog_e2e"}',
          'data: {"type":"job_queued","jobId":"job_produce_1","conversationId":"conv_blog_e2e","sequence":1,"toolName":"produce_blog_article","label":"Produce Blog Article","updatedAt":"2026-03-25T03:00:05.000Z"}',
          'data: {"type":"job_completed","jobId":"job_produce_1","conversationId":"conv_blog_e2e","sequence":2,"toolName":"produce_blog_article","label":"Produce Blog Article","summary":"Produced draft \\\"AI Governance Playbook\\\" at /blog/ai-governance-playbook with hero asset asset_hero_1.","resultPayload":{"id":"post_hero_1","slug":"ai-governance-playbook","title":"AI Governance Playbook","status":"draft","imageAssetId":"asset_hero_1","stages":["compose_blog_article","qa_blog_article","resolve_blog_article_qa","generate_blog_image_prompt","generate_blog_image","draft_content"],"summary":"Produced draft \\\"AI Governance Playbook\\\" at /blog/ai-governance-playbook with hero asset asset_hero_1."},"updatedAt":"2026-03-25T03:00:06.000Z"}',
          "",
        ].join("\n"),
      });
    });

    await page.route("**/api/chat/events**", async (route) => {
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

    await page.route("**/admin/journal/preview/ai-governance-playbook*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `<!doctype html><html><body><main><h1>AI Governance Playbook</h1><p>Draft page</p></main></body></html>`,
      });
    });

    await page.route("**/api/blog/assets/asset_hero_1*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "hero-image-binary-placeholder",
      });
    });

    await page.goto("/");

    const textarea = page.getByPlaceholder("Paste the workflow, brief, or handoff...");
    await expect(textarea).toBeVisible();
    await textarea.fill("Produce a blog article about AI governance controls for enterprise teams.");
    await page.getByRole("button", { name: "Send", exact: true }).click();

    await expect(produceStatus).toBeVisible();
    await expect(produceStatus).toContainText("Succeeded", { timeout: 5000 });
    await expect(produceStatus).toContainText('Produced draft "AI Governance Playbook" at /blog/ai-governance-playbook with hero asset asset_hero_1.');
    await expect(page.getByRole("button", { name: "Open draft" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open hero image" })).toBeVisible();

    await page.reload();
    await expect(produceStatus).toContainText("Succeeded");

    await page.getByRole("button", { name: "Open draft" }).click();
    await expect(page).toHaveURL(/\/admin\/journal\/preview\/ai-governance-playbook/);
    await page.goto("/");
    await expect(produceStatus).toContainText("Succeeded");

    await page.getByRole("button", { name: "Open hero image" }).click();
    await expect(page).toHaveURL(/\/api\/blog\/assets\/asset_hero_1/);
  });

  test("keeps an explicit job-id status check visible even when the follow-up stream has no assistant prose", async ({ page }) => {
    const produceStatus = page.getByLabel("Produce Blog Article status").first();

    await page.route("**/api/preferences", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ preferences: [{ key: "push_notifications", value: "enabled" }] }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ preferences: [] }),
      });
    });

    await page.route("**/api/conversations/active", async (route) => {
      const payload = buildConversationPayload("produce-running");
      await route.fulfill({
        status: payload.status,
        contentType: "application/json",
        body: JSON.stringify(payload.body),
      });
    });

    await page.route("**/api/chat/stream", async (route) => {
      const requestBody = route.request().postDataJSON() as { messages?: Array<{ content?: string }> };
      const lastMessage = requestBody.messages?.at(-1)?.content ?? "";

      if (!lastMessage.includes("Check the status of job job_produce_running_1")) {
        await route.abort();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: [
          'data: {"conversation_id":"conv_blog_e2e"}',
          'data: {"type":"job_progress","jobId":"job_produce_running_1","conversationId":"conv_blog_e2e","sequence":7,"toolName":"produce_blog_article","label":"Produce Blog Article","title":"AI Governance Playbook","subtitle":"Queued from the default worker runtime","status":"running","summary":"Produce Blog Article is still running.","progressLabel":"Reviewing article","progressPercent":42,"updatedAt":"2026-03-25T03:00:07.000Z"}',
          "",
        ].join("\n"),
      });
    });

    await page.route("**/api/chat/events**", async (route) => {
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

    await page.route("**/api/chat/jobs**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [
            {
              messageId: "jobmsg_job_produce_running_1",
              part: {
                type: "job_status",
                jobId: "job_produce_running_1",
                toolName: "produce_blog_article",
                label: "Produce Blog Article",
                title: "AI Governance Playbook",
                subtitle: "Queued from the default worker runtime",
                status: "running",
                summary: "Produce Blog Article is still running.",
                progressLabel: "Generating outline",
                progressPercent: 18,
                updatedAt: "2026-03-25T03:00:05.000Z",
              },
            },
          ],
        }),
      });
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(750);

    await expect(produceStatus).toContainText("AI Governance Playbook");
    await expect(produceStatus).toContainText("Queued from the default worker runtime");
    await expect(produceStatus).toContainText("Generating outline");
    await expect(produceStatus).toContainText("18%");

    const textarea = page.getByPlaceholder("Paste the workflow, brief, or handoff...");
    await expect(textarea).toBeVisible();
    await textarea.fill("Check the status of job job_produce_running_1");
    await page.getByRole("button", { name: "Send", exact: true }).click();

    await expect(page.getByText("Check the status of job job_produce_running_1")).toBeVisible();
    await expect(produceStatus).toContainText("Running", { timeout: 5000 });
    await expect(produceStatus).toContainText("Reviewing article", { timeout: 5000 });
    await expect(produceStatus).toContainText("42%");
  });
});