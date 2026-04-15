import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createMcpStdioHarness,
  parseJsonTextContent,
  sortToolNames,
  type McpStdioHarness,
} from "./stdio-harness";

const TEST_TIMEOUT_MS = 30_000;

describe("admin web search MCP stdio transport", () => {
  let harness: McpStdioHarness | undefined;

  function getHarness(): McpStdioHarness {
    if (!harness) {
      throw new Error("MCP stdio harness was not initialized");
    }
    return harness;
  }

  beforeAll(async () => {
    harness = await createMcpStdioHarness("mcp/admin-web-search-server.ts", {
      env: {
        ORDO_MCP_ADMIN_WEB_SEARCH_RESULT_FIXTURE: JSON.stringify({
          answer: "Fresh answer",
          citations: [
            {
              url: "https://example.com/story",
              title: "Example Story",
              start_index: 0,
              end_index: 12,
            },
          ],
          sources: ["https://example.com/story"],
          model: "gpt-5",
        }),
      },
    });
  }, TEST_TIMEOUT_MS);

  afterAll(async () => {
    await harness?.close();
  }, TEST_TIMEOUT_MS);

  it("exposes only admin_web_search at the protocol layer", async () => {
    const tools = await getHarness().listTools();

    expect(sortToolNames(tools)).toEqual(["admin_web_search"]);
  }, TEST_TIMEOUT_MS);

  it("round-trips a deterministic search payload through stdio", async () => {
    const result = await getHarness().callTool("admin_web_search", {
      query: "latest referral guidance",
      allowed_domains: ["example.com"],
    });
    const payload = parseJsonTextContent<{
      action: string;
      query: string;
      allowed_domains?: string[];
      answer: string;
      sources: string[];
      model: string;
    }>(result);

    expect(payload).toMatchObject({
      action: "admin_web_search",
      query: "latest referral guidance",
      allowed_domains: ["example.com"],
      answer: "Fresh answer",
      sources: ["https://example.com/story"],
      model: "gpt-5",
    });
  }, TEST_TIMEOUT_MS);

  it("returns the canonical validation payload for invalid input", async () => {
    const result = await getHarness().callTool("admin_web_search", {});
    const payload = parseJsonTextContent<{
      action: string;
      query: string;
      error: string;
      model: string;
    }>(result);

    expect(payload).toEqual({
      action: "admin_web_search",
      query: "",
      error: "query is required and must be non-empty",
      model: "gpt-5",
    });
  }, TEST_TIMEOUT_MS);
});