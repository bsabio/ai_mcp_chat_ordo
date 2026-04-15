import { describe, expect, expectTypeOf, it } from "vitest";

import {
  createAdminWebSearchErrorPayload,
  DEFAULT_ADMIN_WEB_SEARCH_MODEL,
  isAdminWebSearchPayload,
  toAdminWebSearchPayload,
  type AdminWebSearchErrorPayload,
  type AdminWebSearchPayload,
  type AdminWebSearchSuccessPayload,
  type WebSearchErrorData,
  type WebSearchResultData,
} from "./admin-web-search-payload";

describe("admin-web-search-payload", () => {
  it("builds a normalized success payload", () => {
    const payload = toAdminWebSearchPayload(
      {
        query: "  ordo architecture  ",
        allowed_domains: [" example.com ", "", "docs.example.com"],
      },
      {
        answer: "A sourced answer.",
        citations: [
          {
            url: "https://example.com/article",
            title: "Example Article",
            start_index: 0,
            end_index: 6,
          },
        ],
        sources: ["https://example.com/article"],
        model: "gpt-5.4",
      },
    );

    expect(payload).toEqual({
      action: "admin_web_search",
      query: "  ordo architecture  ",
      allowed_domains: ["example.com", "docs.example.com"],
      answer: "A sourced answer.",
      citations: [
        {
          url: "https://example.com/article",
          title: "Example Article",
          start_index: 0,
          end_index: 6,
        },
      ],
      sources: ["https://example.com/article"],
      model: "gpt-5.4",
    });
    expect(isAdminWebSearchPayload(payload)).toBe(true);
  });

  it("builds an error payload with the default model", () => {
    const payload = createAdminWebSearchErrorPayload(
      {
        query: "ordo architecture",
        allowed_domains: [" example.com ", "   "],
      },
      "Rate limited",
      429,
    );

    expect(payload).toEqual({
      action: "admin_web_search",
      query: "ordo architecture",
      allowed_domains: ["example.com"],
      model: DEFAULT_ADMIN_WEB_SEARCH_MODEL,
      error: "Rate limited",
      code: 429,
    });
    expect(isAdminWebSearchPayload(payload)).toBe(true);
  });

  it("preserves overload narrowing for success, error, and union call sites", () => {
    const successResult: WebSearchResultData = {
      answer: "A sourced answer.",
      citations: [],
      sources: [],
      model: "gpt-5.4",
    };
    const errorResult: WebSearchErrorData = {
      error: "Rate limited",
      code: 429,
    };
    const unionResult: WebSearchResultData | WebSearchErrorData =
      Math.random() > 0.5 ? successResult : errorResult;

    const successPayload = toAdminWebSearchPayload({ query: "ordo" }, successResult);
    const errorPayload = toAdminWebSearchPayload({ query: "ordo" }, errorResult);
    const unionPayload = toAdminWebSearchPayload({ query: "ordo" }, unionResult);

    expectTypeOf(successPayload).toEqualTypeOf<AdminWebSearchSuccessPayload>();
    expectTypeOf(errorPayload).toEqualTypeOf<AdminWebSearchErrorPayload>();
    expectTypeOf(unionPayload).toEqualTypeOf<AdminWebSearchPayload>();

    expect(successPayload.action).toBe("admin_web_search");
    expect(errorPayload.action).toBe("admin_web_search");
    expect(unionPayload.action).toBe("admin_web_search");
  });
});