import { expect, test, type Page, type Route } from "@playwright/test";

test.describe.configure({ timeout: 45_000 });

type StopHarnessState = {
  activeController: ReadableStreamDefaultController<Uint8Array> | null;
  stopCallCount: number;
  streamCallCount: number;
};

type InterruptedHarnessState = {
  streamCallCount: number;
};

declare global {
  interface Window {
    __chatInterruptedTest?: InterruptedHarnessState;
    __chatStopTest?: StopHarnessState;
  }
}

async function waitForNextPaint(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  }));
}

type ActiveConversationResponse = {
  status: number;
  body: unknown;
};

function buildConversationResponse(conversationId: string, title: string, messages: Array<Record<string, unknown>>) {
  return {
    conversation: {
      id: conversationId,
      userId: "anon_123",
      title,
      status: "active",
      createdAt: "2026-04-08T10:00:00.000Z",
      updatedAt: "2026-04-08T10:00:05.000Z",
      convertedFrom: null,
      messageCount: messages.length,
      firstMessageAt: "2026-04-08T10:00:00.000Z",
      lastToolUsed: null,
      sessionSource: "anonymous_cookie",
      promptVersion: null,
      routingSnapshot: null,
    },
    messages,
  };
}

function buildUserMessage(id: string, content: string, createdAt: string) {
  return {
    id,
    role: "user",
    content,
    parts: [{ type: "text", text: content }],
    createdAt,
  };
}

function buildAssistantMessage(
  id: string,
  content: string,
  parts: Array<Record<string, unknown>>,
  createdAt: string,
) {
  return {
    id,
    role: "assistant",
    content,
    parts,
    createdAt,
  };
}

async function stubAnonymousChatBoot(
  page: Page,
  resolveActiveConversation: () => ActiveConversationResponse,
) {
  await page.route("**/api/preferences", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ preferences: [] }),
    });
  });

  await page.route("**/api/conversations/active", async (route: Route) => {
    const payload = resolveActiveConversation();
    await route.fulfill({
      status: payload.status,
      contentType: "application/json",
      body: JSON.stringify(payload.body),
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

async function installStopStreamHarness(page: Page) {
  await page.addInitScript(() => {
    const globalWindow = window as Window & typeof globalThis;
    const encoder = new TextEncoder();
    const originalFetch = window.fetch.bind(window);

    const writeEvent = (
      controller: ReadableStreamDefaultController<Uint8Array>,
      payload: unknown,
    ) => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
    };

    const state: StopHarnessState = {
      activeController: null,
      stopCallCount: 0,
      streamCallCount: 0,
    };
    globalWindow.__chatStopTest = state;

    window.fetch = async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url, window.location.origin);

      if (url.pathname === "/api/chat/stream" && request.method === "POST") {
        state.streamCallCount += 1;

        return new Response(
          new ReadableStream({
            start(controller) {
              state.activeController = controller;
              writeEvent(controller, { conversation_id: "conv_stop_e2e" });
              writeEvent(controller, { stream_id: "stream_stop_e2e" });
              writeEvent(controller, { delta: "Partial answer before stop." });
              writeEvent(controller, {
                type: "job_queued",
                jobId: "job_keep_1",
                conversationId: "conv_stop_e2e",
                sequence: 1,
                toolName: "draft_content",
                label: "Draft Content",
                updatedAt: "2026-04-08T10:00:03.000Z",
              });
            },
            cancel() {
              state.activeController = null;
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          },
        );
      }

      if (url.pathname === "/api/chat/streams/stream_stop_e2e/stop" && request.method === "POST") {
        state.stopCallCount += 1;

        const controller = state.activeController;
        if (controller) {
          writeEvent(controller, {
            type: "generation_stopped",
            actor: "user",
            reason: "Stopped by user.",
            partialContentRetained: true,
            recordedAt: "2026-04-08T10:00:05.000Z",
          });
          controller.close();
          state.activeController = null;
        }

        return new Response(
          JSON.stringify({
            ok: true,
            stopped: true,
            streamId: "stream_stop_e2e",
            conversationId: "conv_stop_e2e",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }

      return originalFetch(input, init);
    };
  });
}

async function installInterruptedRecoveryHarness(page: Page) {
  await page.addInitScript(() => {
    const globalWindow = window as Window & typeof globalThis;
    const encoder = new TextEncoder();
    const originalFetch = window.fetch.bind(window);
    const storageKey = "__chatInterruptedStreamCallCount";

    const createEventStreamResponse = (payloads: unknown[]) => new Response(
      new ReadableStream({
        start(controller) {
          for (const payload of payloads) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          }
          controller.close();
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      },
    );

    const state: InterruptedHarnessState = {
      streamCallCount: Number.parseInt(sessionStorage.getItem(storageKey) ?? "0", 10) || 0,
    };
    globalWindow.__chatInterruptedTest = state;

    window.fetch = async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url, window.location.origin);

      if (url.pathname === "/api/chat/stream" && request.method === "POST") {
        state.streamCallCount += 1;
        sessionStorage.setItem(storageKey, String(state.streamCallCount));

        if (state.streamCallCount === 1) {
          return createEventStreamResponse([
            { conversation_id: "conv_interrupt_e2e" },
            { stream_id: "stream_interrupt_e2e" },
            { delta: "Partial interrupted answer." },
            {
              type: "generation_interrupted",
              actor: "system",
              reason: "Connection lost.",
              partialContentRetained: true,
              recordedAt: "2026-04-08T11:00:04.000Z",
            },
          ]);
        }

        return createEventStreamResponse([
          { conversation_id: "conv_interrupt_e2e" },
          { stream_id: "stream_retry_e2e" },
          { delta: "Recovered after reload." },
        ]);
      }

      return originalFetch(input, init);
    };
  });
}

test.describe("Chat stop generation", () => {
  test("stops a live response, keeps partial output, and leaves queued jobs intact", async ({ page }) => {
    await installStopStreamHarness(page);
    await stubAnonymousChatBoot(page, () => ({
      status: 404,
      body: { error: "No active conversation" },
    }));

    await page.goto("/");

    const textarea = page.getByPlaceholder("Ask Studio Ordo...");
    await expect(textarea).toBeVisible();

    await textarea.fill("Draft the next steps for the queue handoff.");
    await page.getByRole("button", { name: "Send", exact: true }).click();

    const queuedJobStatus = page.getByLabel("Draft Content status").first();
    await expect(page.getByRole("button", { name: "Stop generation" })).toBeVisible();
    await expect(page.getByText("Partial answer before stop.", { exact: false })).toBeVisible();
    await expect(queuedJobStatus).toContainText("Queued");

    await page.getByRole("button", { name: "Stop generation" }).click();

    await expect(page.getByText("Response stopped")).toBeVisible();
    await expect(page.getByText("Stopped by user.")).toBeVisible();
    await expect(page.getByText("Partial answer before stop.", { exact: false })).toBeVisible();
    await expect(queuedJobStatus).toContainText("Queued");
    await expect(page.getByRole("button", { name: "Stop generation" })).toHaveCount(0);

    await expect.poll(async () => page.evaluate(() => window.__chatStopTest?.stopCallCount ?? 0)).toBe(1);
  });

  test("restores interrupted sends after reload and retries without duplicating the assistant turn", async ({ page }) => {
    await installInterruptedRecoveryHarness(page);

    let restoreInterruptedConversation = false;

    await stubAnonymousChatBoot(page, () => {
      if (!restoreInterruptedConversation) {
        return {
          status: 404,
          body: { error: "No active conversation" },
        };
      }

      return {
        status: 200,
        body: buildConversationResponse("conv_interrupt_e2e", "Interrupted thread", [
          buildUserMessage(
            "msg_user_interrupt_1",
            "Recover this after interruption.",
            "2026-04-08T11:00:00.000Z",
          ),
          buildAssistantMessage(
            "msg_assistant_interrupt_1",
            "Partial interrupted answer.",
            [
              { type: "text", text: "Partial interrupted answer." },
              {
                type: "generation_status",
                status: "interrupted",
                actor: "system",
                reason: "Connection lost.",
                partialContentRetained: true,
                recordedAt: "2026-04-08T11:00:04.000Z",
              },
            ],
            "2026-04-08T11:00:04.000Z",
          ),
        ]),
      };
    });

    await page.goto("/");

    const textarea = page.getByPlaceholder("Ask Studio Ordo...");
    await expect(textarea).toBeVisible();

    await textarea.fill("Recover this after interruption.");
    await page.getByRole("button", { name: "Send", exact: true }).click();

    await expect(page.getByText("Partial interrupted answer.", { exact: false })).toBeVisible();
    await expect(page.getByText("Response interrupted")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();

    restoreInterruptedConversation = true;
    await page.reload();

    await expect(page.getByText("Partial interrupted answer.", { exact: false })).toBeVisible();
    await expect(page.getByText("Response interrupted")).toBeVisible();
    await expect(page.getByText("Connection lost.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();

    await waitForNextPaint(page);

    await page.getByRole("button", { name: "Retry" }).click();

    await expect.poll(async () => page.evaluate(() => window.__chatInterruptedTest?.streamCallCount ?? 0)).toBe(2);

    await expect(page.getByText("Recovered after reload.", { exact: false })).toBeVisible();
    await expect(page.getByText("Partial interrupted answer.", { exact: false })).toHaveCount(0);
    await expect(page.getByText("Response interrupted")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);
    await expect(
      page.locator('[data-chat-message-role="assistant"]', { hasText: "Recovered after reload." }),
    ).toHaveCount(1);

  });
});