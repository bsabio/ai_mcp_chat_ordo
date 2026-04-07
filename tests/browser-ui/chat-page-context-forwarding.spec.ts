import { expect, test, type Page, type Route } from "@playwright/test";

function createConversationResponse(messages: Array<Record<string, unknown>>) {
  return {
    conversation: {
      id: "conv_page_context_e2e",
      userId: "anon_123",
      title: "Page context thread",
      status: "active",
      createdAt: "2026-04-06T18:00:00.000Z",
      updatedAt: "2026-04-06T18:00:03.000Z",
      convertedFrom: null,
      messageCount: messages.length,
      firstMessageAt: "2026-04-06T18:00:00.000Z",
      lastToolUsed: null,
      sessionSource: "anonymous_cookie",
      promptVersion: null,
      routingSnapshot: null,
    },
    messages,
  };
}

async function stubAnonymousChatBoot(page: Page) {
  await page.route("**/api/preferences", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ preferences: [] }),
    });
  });

  await page.route("**/api/conversations/active", async (route: Route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "No active conversation" }),
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

test.describe("Chat page context forwarding", () => {
  test("sends the current pathname after navigating from library to register in the same session", async ({ page }) => {
    await stubAnonymousChatBoot(page);

    const persistedMessages: Array<Record<string, unknown>> = [];
    let streamCallCount = 0;

    await page.route("**/api/conversations/conv_page_context_e2e", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(createConversationResponse(persistedMessages)),
      });
    });

    await page.route("**/api/chat/stream", async (route: Route) => {
      streamCallCount += 1;

      const requestBody = route.request().postDataJSON() as {
        currentPathname?: string;
        currentPageSnapshot?: {
          pathname?: string;
          mainHeading?: string | null;
          contentExcerpt?: string | null;
        };
        messages?: Array<{ content?: string }>;
      };
      const userMessage = requestBody.messages?.at(-1)?.content ?? "";

      if (streamCallCount === 1) {
        expect(requestBody.currentPathname).toBe("/library");
        expect(requestBody.currentPageSnapshot?.pathname).toBe("/library");
        expect(requestBody.currentPageSnapshot?.mainHeading).toBe("Books, chapters, and reusable reference material.");
        expect(requestBody.currentPageSnapshot?.contentExcerpt).toContain("The library is organized as books");
        expect(userMessage).toContain("What page am I on");

        persistedMessages.push(
          {
            id: "msg_library_user",
            role: "user",
            content: userMessage,
            parts: [{ type: "text", text: userMessage }],
            createdAt: "2026-04-06T18:00:00.000Z",
          },
          {
            id: "msg_library_assistant",
            role: "assistant",
            content: "You are on the Library page (/library).",
            parts: [{ type: "text", text: "You are on the Library page (/library)." }],
            createdAt: "2026-04-06T18:00:01.000Z",
          },
        );

        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: [
            'data: {"conversation_id":"conv_page_context_e2e"}',
            'data: {"delta":"You are on the Library page (/library)."}',
            "",
          ].join("\n"),
        });
        return;
      }

      expect(streamCallCount).toBe(2);
      expect(requestBody.currentPathname).toBe("/register");
      expect(requestBody.currentPageSnapshot?.pathname).toBe("/register");
      expect(requestBody.currentPageSnapshot?.mainHeading).toBe("Create Account");
      expect(requestBody.currentPageSnapshot?.contentExcerpt).toContain("Save conversations, unlock richer tools");
      expect(userMessage).toContain("Tell me about the page");

      persistedMessages.push(
        {
          id: "msg_register_user",
          role: "user",
          content: userMessage,
          parts: [{ type: "text", text: userMessage }],
          createdAt: "2026-04-06T18:00:02.000Z",
        },
        {
          id: "msg_register_assistant",
          role: "assistant",
          content: "You are on the Register page (/register), where visitors can create a Studio Ordo account.",
          parts: [
            {
              type: "text",
              text: "You are on the Register page (/register), where visitors can create a Studio Ordo account.",
            },
          ],
          createdAt: "2026-04-06T18:00:03.000Z",
        },
      );

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: [
          'data: {"conversation_id":"conv_page_context_e2e"}',
          'data: {"delta":"You are on the Register page (/register), where visitors can create a Studio Ordo account."}',
          "",
        ].join("\n"),
      });
    });

    await page.goto("/library");

    await expect(page.getByRole("button", { name: "Open Studio Ordo chat" })).toBeVisible();
    await page.getByRole("button", { name: "Open Studio Ordo chat" }).click();

    const floatingShell = page.locator('[data-chat-floating-shell="true"]');
    await expect(floatingShell).toBeVisible();

    const textarea = floatingShell.getByPlaceholder("Ask Studio Ordo...");
    await expect(textarea).toBeVisible();

    await textarea.fill("What page am I on?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("You are on the Library page (/library).", { exact: false })).toBeVisible();

    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Register" }).click();
    await expect(page).toHaveURL(/\/register$/);

    await textarea.fill("Tell me about the page.");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(
      page.getByText("You are on the Register page (/register), where visitors can create a Studio Ordo account.", {
        exact: false,
      }),
    ).toBeVisible();
  });
});