import { expect, test, type Page, type Route } from "@playwright/test";

function buildConversationResponse() {
  return {
    conversation: {
      id: "conv_nav_e2e",
      userId: "anon_123",
      title: "Navigation thread",
      status: "active",
      createdAt: "2026-04-05T20:00:00.000Z",
      updatedAt: "2026-04-05T20:00:03.000Z",
      convertedFrom: null,
      messageCount: 2,
      firstMessageAt: "2026-04-05T20:00:00.000Z",
      lastToolUsed: "navigate_to_page",
      sessionSource: "anonymous_cookie",
      promptVersion: null,
      routingSnapshot: null,
    },
    messages: [
      {
        id: "msg_nav_user",
        role: "user",
        content: "Take me to the library.",
        parts: [{ type: "text", text: "Take me to the library." }],
        createdAt: "2026-04-05T20:00:00.000Z",
      },
      {
        id: "msg_nav_assistant",
        role: "assistant",
        content: "Done — you're headed to the [Library](?route=/library).",
        parts: [
          { type: "text", text: "Done — you're headed to the [Library](?route=/library)." },
          { type: "tool_call", name: "navigate_to_page", args: { path: "/library" } },
          {
            type: "tool_result",
            name: "navigate_to_page",
            result: {
              path: "/library",
              label: "Library",
              description: "Browse the library and structured reference material.",
              __actions__: [{ type: "navigate", path: "/library" }],
            },
          },
        ],
        createdAt: "2026-04-05T20:00:03.000Z",
      },
    ],
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

test.describe("Chat navigation forwarding", () => {
  test("navigates to the library from a direct chat request without clicking a route link", async ({ page }) => {
    await stubAnonymousChatBoot(page);

    await page.route("**/api/conversations/conv_nav_e2e", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildConversationResponse()),
      });
    });

    await page.route("**/api/chat/stream", async (route: Route) => {
      const requestBody = route.request().postDataJSON() as { messages?: Array<{ content?: string }> };
      const lastMessage = requestBody.messages?.at(-1)?.content ?? "";

      expect(lastMessage).toContain("Take me to the library");

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: [
          'data: {"conversation_id":"conv_nav_e2e"}',
          'data: {"tool_call":{"name":"navigate_to_page","args":{"path":"/library"}}}',
          'data: {"tool_result":{"name":"navigate_to_page","result":{"path":"/library","label":"Library","description":"Browse the library and structured reference material.","__actions__":[{"type":"navigate","path":"/library"}]}}}',
          'data: {"delta":"Done — you\'re headed to the [Library](?route=/library)."}',
          "",
        ].join("\n"),
      });
    });

    await page.goto("/");

    const textarea = page.getByLabel("Message");
    await expect(textarea).toBeVisible();

    await textarea.fill("Take me to the library.");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page).toHaveURL(/\/library$/);
    await expect(page.getByRole("heading", { name: "Structured reference for the operator system." })).toBeVisible();
  });
});