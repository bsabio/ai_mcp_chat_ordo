import { expect, test, type Page, type Route } from "@playwright/test";

const ACTIVE_CONVERSATION_PAYLOAD = {
  conversation: {
    id: "conv_capability_rollout",
    userId: "usr_capability_rollout",
    title: "Capability rollout",
    status: "active",
    createdAt: "2026-04-11T12:00:00.000Z",
    updatedAt: "2026-04-11T12:05:00.000Z",
    convertedFrom: null,
    messageCount: 4,
    firstMessageAt: "2026-04-11T12:00:00.000Z",
    lastToolUsed: "list_journal_posts",
    sessionSource: "authenticated",
    promptVersion: null,
    routingSnapshot: { lane: "organization", confidence: 0.84 },
    referralSource: null,
  },
  messages: [
    {
      id: "msg_search_family",
      role: "assistant",
      content: "Corpus matches loaded.",
      createdAt: "2026-04-11T12:01:00.000Z",
      parts: [
        { type: "tool_call", name: "search_corpus", args: { query: "governance" } },
        {
          type: "tool_result",
          name: "search_corpus",
          result: {
            query: "governance",
            groundingState: "prefetched_section",
            followUp: "cite_canonical_paths",
            retrievalQuality: "strong",
            results: [
              {
                document: "1. Ordo Overview",
                documentId: "1",
                section: "Governance",
                sectionSlug: "governance",
                documentSlug: "ordo-overview",
                matchContext: "Governance principles and review cycles.",
                relevance: "high",
                book: "Ordo Overview",
                bookNumber: "1",
                chapter: "Governance",
                chapterSlug: "governance",
                bookSlug: "ordo-overview",
                canonicalPath: "/library/ordo-overview/governance",
                resolverPath: "/library/ordo-overview/governance",
                fallbackSearchPath: "/library?query=governance",
                fallbackSearchQuery: "governance",
              },
            ],
            prefetchedSection: {
              found: true,
              requestedDocumentSlug: "ordo-overview",
              requestedSectionSlug: "governance",
              title: "Governance",
              document: "1. Ordo Overview",
              documentId: "1",
              documentSlug: "ordo-overview",
              sectionSlug: "governance",
              canonicalPath: "/library/ordo-overview/governance",
              resolverPath: "/library/ordo-overview/governance",
              fallbackSearchPath: "/library?query=governance",
              fallbackSearchQuery: "governance",
              content: "Governance principles and review cycles.",
              contentTruncated: false,
              resolvedFromAlias: false,
              navigation: { previous: null, next: null },
              relatedSections: [],
            },
          },
        },
      ],
    },
    {
      id: "msg_theme_family",
      role: "assistant",
      content: "Preference saved.",
      createdAt: "2026-04-11T12:02:00.000Z",
      parts: [
        { type: "tool_call", name: "set_preference", args: { key: "preferred_name", value: "Keith" } },
        {
          type: "tool_result",
          name: "set_preference",
          result: JSON.stringify({
            action: "set_preference",
            key: "preferred_name",
            value: "Keith",
            message: 'Preference "preferred_name" set to "Keith".',
          }),
        },
      ],
    },
    {
      id: "msg_theme_adjust",
      role: "assistant",
      content: "UI updated.",
      createdAt: "2026-04-11T12:03:00.000Z",
      parts: [
        { type: "tool_call", name: "adjust_ui", args: { density: "compact", fontSize: "large" } },
        {
          type: "tool_result",
          name: "adjust_ui",
          result: "Success. UI adjusted: density=compact, fontSize=large.",
        },
      ],
    },
    {
      id: "msg_journal_family",
      role: "assistant",
      content: "Journal list loaded.",
      createdAt: "2026-04-11T12:04:00.000Z",
      parts: [
        { type: "tool_call", name: "list_journal_posts", args: { status: "draft" } },
        {
          type: "tool_result",
          name: "list_journal_posts",
          result: {
            action: "list_journal_posts",
            list_route: "/admin/journal",
            filters: { search: "", status: "draft", section: "all", limit: 25 },
            counts: { all: 2, draft: 2, review: 0, approved: 0, published: 0 },
            posts: [
              {
                id: "post_1",
                slug: "launch-plan",
                title: "Launch Plan",
                status: "draft",
                section: "essay",
                standfirst: "Executive summary for launch week.",
                hero_image_asset_id: null,
                preview_route: "/admin/journal/preview/launch-plan",
                detail_route: "/admin/journal/post_1",
                public_route: null,
              },
            ],
            summary: "Found 1 journal post matching the current admin filters.",
          },
        },
      ],
    },
  ],
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

  await page.route("**/api/conversations/active", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ACTIVE_CONVERSATION_PAYLOAD),
    });
  });

  await page.route("**/api/conversations/conv_capability_rollout", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ACTIVE_CONVERSATION_PAYLOAD),
    });
  });
}

test.describe("Chat capability family rollout", () => {
  test("renders widened custom family cards from an active conversation payload", async ({ page }) => {
    await stubConversationShell(page);

    await page.goto("/");

    await expect(page.locator('[data-capability-card="true"]')).toHaveCount(4);
    await expect(page.getByText("Strong grounding")).toBeVisible();
    await expect(page.getByText("Preference updated")).toBeVisible();
    await expect(page.getByText("UI adjustments")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Journal posts" })).toBeVisible();
  });
});