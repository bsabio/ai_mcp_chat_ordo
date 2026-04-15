import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createMcpStdioHarness,
  parseJsonTextContent,
  sortToolNames,
  type McpStdioHarness,
} from "./stdio-harness";

const TEST_TIMEOUT_MS = 30_000;

describe("calculator MCP stdio transport", () => {
  let harness: McpStdioHarness | undefined;

  function getHarness(): McpStdioHarness {
    if (!harness) {
      throw new Error("MCP stdio harness was not initialized");
    }
    return harness;
  }

  beforeAll(async () => {
    harness = await createMcpStdioHarness("mcp/calculator-server.ts");
  }, TEST_TIMEOUT_MS);

  afterAll(async () => {
    await harness?.close();
  }, TEST_TIMEOUT_MS);

  it("lists exactly the calculator tool over the real stdio transport", async () => {
    const tools = await getHarness().listTools();

    expect(sortToolNames(tools)).toEqual(["calculator"]);
    expect(tools[0]).toMatchObject({
      name: "calculator",
      inputSchema: {
        required: ["operation", "a", "b"],
        additionalProperties: false,
      },
    });
  }, TEST_TIMEOUT_MS);

  it("round-trips a valid calculator request through stdio", async () => {
    const result = await getHarness().callTool("calculator", {
      operation: "multiply",
      a: 7,
      b: 8,
    });

    expect(
      parseJsonTextContent<{
        operation: string;
        a: number;
        b: number;
        result: number;
      }>(result),
    ).toEqual({
      operation: "multiply",
      a: 7,
      b: 8,
      result: 56,
    });
  }, TEST_TIMEOUT_MS);

  it("surfaces unknown tool failures at the protocol boundary", async () => {
    await expect(getHarness().callTool("not-a-real-tool")).rejects.toThrow(/Unknown tool: not-a-real-tool/);
  }, TEST_TIMEOUT_MS);
});