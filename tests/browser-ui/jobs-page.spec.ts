import { expect, test } from "@playwright/test";

test.describe("Jobs page", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("renders active and recent jobs from the signed-in jobs feed", async ({ page }) => {
    await page.addInitScript(() => {
      class MockEventSource {
        static instances: MockEventSource[] = [];

        url: string;
        onmessage: ((event: { data: string }) => void) | null = null;
        onerror: (() => void) | null = null;
        readyState = 1;

        constructor(url: string | URL) {
          this.url = String(url);
          MockEventSource.instances.push(this);
        }

        close() {
          this.readyState = 2;
        }

        dispatch(payload: unknown) {
          this.onmessage?.({ data: JSON.stringify(payload) });
        }
      }

      Object.defineProperty(window, "EventSource", {
        configurable: true,
        writable: true,
        value: MockEventSource,
      });

      Object.defineProperty(window, "__dispatchJobsEvent", {
        configurable: true,
        writable: true,
        value: (payload: unknown) => {
          for (const instance of MockEventSource.instances) {
            if (instance.url.includes("/api/jobs/events")) {
              instance.dispatch(payload);
            }
          }
        },
      });
    });

    const runningJobSnapshot = {
      messageId: "jobmsg_job_running_1",
      conversationId: "conv_jobs_running",
      part: {
        type: "job_status",
        jobId: "job_running_1",
        toolName: "produce_blog_article",
        label: "Produce Blog Article",
        title: "AI Governance Playbook",
        subtitle: "Audience: Operations leaders",
        status: "running",
        progressLabel: "Generating outline",
        progressPercent: 18,
        updatedAt: "2026-03-25T03:00:05.000Z",
      },
    };

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

    await page.route("**/api/jobs?limit=50", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [
            runningJobSnapshot,
            {
              messageId: "jobmsg_job_done_1",
              conversationId: "conv_jobs_done",
              part: {
                type: "job_status",
                jobId: "job_done_1",
                toolName: "publish_content",
                label: "Publish Content",
                title: "Publish draft post_1",
                status: "succeeded",
                summary: 'Published "Deferred Queue Post" at /journal/deferred-queue-post.',
                resultPayload: {
                  slug: "deferred-queue-post",
                  title: "Deferred Queue Post",
                  status: "published",
                },
                updatedAt: "2026-03-25T03:00:10.000Z",
              },
            },
          ],
        }),
      });
    });

    await page.route("**/api/jobs/job_running_1/events?limit=100", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          events: [
            {
              id: "evt_running_1",
              jobId: "job_running_1",
              conversationId: "conv_jobs_running",
              sequence: 8,
              eventType: "progress",
              createdAt: "2026-03-25T03:00:07.000Z",
              part: {
                type: "job_status",
                jobId: "job_running_1",
                toolName: "produce_blog_article",
                label: "Produce Blog Article",
                title: "AI Governance Playbook",
                status: "running",
                progressLabel: "Reviewing article",
                progressPercent: 42,
                updatedAt: "2026-03-25T03:00:07.000Z",
              },
            },
          ],
        }),
      });
    });

    await page.route("**/api/jobs/job_done_1/events?limit=100", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          events: [
            {
              id: "evt_done_1",
              jobId: "job_done_1",
              conversationId: "conv_jobs_done",
              sequence: 10,
              eventType: "result",
              createdAt: "2026-03-25T03:00:10.000Z",
              part: {
                type: "job_status",
                jobId: "job_done_1",
                toolName: "publish_content",
                label: "Publish Content",
                title: "Publish draft post_1",
                status: "succeeded",
                summary: 'Published "Deferred Queue Post" at /journal/deferred-queue-post.',
                resultPayload: {
                  slug: "deferred-queue-post",
                  title: "Deferred Queue Post",
                  status: "published",
                },
                updatedAt: "2026-03-25T03:00:10.000Z",
              },
            },
          ],
        }),
      });
    });

    await page.goto("/register");

    const uniqueEmail = `jobs-page-${Date.now()}@example.com`;
    await page.getByLabel("Name").fill("Jobs Page User");
    await page.getByLabel("Email").fill(uniqueEmail);
    await page.getByLabel("Password").fill("JobsPass123");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page).toHaveURL(/\/$/);

    await page.getByRole("button", { name: "Jobs Page User" }).click();
    await page.getByRole("link", { name: "Jobs", exact: true }).click();

    const activeJobCard = page.getByRole("button", { name: /Produce Blog Article.*AI Governance Playbook/i });
    const recentJobCard = page.getByRole("button", { name: /Publish Content.*Publish draft post_1/i });

    await expect(page).toHaveURL(/\/jobs$/);
    await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible();
    await expect(page.getByText("Active jobs")).toBeVisible();
    await expect(page.getByText("Recent jobs")).toBeVisible();
    await expect(activeJobCard).toBeVisible();
    await expect(recentJobCard).toBeVisible();
    await expect(activeJobCard).toContainText("Generating outline");
    await expect(activeJobCard).toContainText("18%");

    await page.evaluate((payload) => {
      const dispatcher = (
        window as typeof window & { __dispatchJobsEvent?: (eventPayload: unknown) => void }
      ).__dispatchJobsEvent;
      dispatcher?.(payload);
    }, {
      type: "job_progress",
      jobId: "job_running_1",
      conversationId: "conv_jobs_running",
      sequence: 8,
      toolName: "produce_blog_article",
      label: "Produce Blog Article",
      title: "AI Governance Playbook",
      subtitle: "Audience: Operations leaders",
      progressLabel: "Reviewing article",
      progressPercent: 42,
      updatedAt: "2026-03-25T03:00:07.000Z",
    });

    await expect(activeJobCard).toContainText("Reviewing article", { timeout: 5000 });
    await expect(activeJobCard).toContainText("42%", { timeout: 5000 });

    await activeJobCard.click();
    await expect(page.getByText("Sequence 8")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open conversation" })).toHaveAttribute(
      "href",
      "/?conversationId=conv_jobs_running",
    );

    await recentJobCard.click();
    await expect(page.getByRole("link", { name: "Open artifact" })).toHaveAttribute(
      "href",
      "/journal/deferred-queue-post",
    );

    await page.reload();

    await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible();
    await expect(activeJobCard).toBeVisible();
    await expect(page.getByText("Sequence 8")).toBeVisible();
  });
});