import path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const TSX_BINARY = path.join(
  PROJECT_ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx",
);

type McpToolList = Awaited<ReturnType<Client["listTools"]>>["tools"];
type McpCallToolResult = Awaited<ReturnType<Client["callTool"]>>;

function createSpawnEnv(overrides?: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries({
      ...Object.fromEntries(
        Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
      ),
      ...(overrides ?? {}),
    }).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

export interface McpStdioHarness {
  listTools(): Promise<McpToolList>;
  callTool(name: string, args?: Record<string, unknown>): Promise<McpCallToolResult>;
  readStderr(): string;
  close(): Promise<void>;
}

function isTextContentBlock(value: unknown): value is { type: "text"; text: string } {
  return typeof value === "object"
    && value !== null
    && "type" in value
    && value.type === "text"
    && "text" in value
    && typeof value.text === "string";
}

export async function createMcpStdioHarness(
  entrypoint: string,
  options?: { env?: Record<string, string> },
): Promise<McpStdioHarness> {
  const transport = new StdioClientTransport({
    command: TSX_BINARY,
    args: [entrypoint],
    cwd: PROJECT_ROOT,
    env: createSpawnEnv(options?.env),
    stderr: "pipe",
  });
  const stderrChunks: string[] = [];

  transport.stderr?.on("data", (chunk) => {
    stderrChunks.push(String(chunk));
  });

  const client = new Client(
    { name: "ordo-mcp-stdio-test", version: "1.0.0" },
    { capabilities: {} },
  );

  try {
    await client.connect(transport);
  } catch (error) {
    const stderrOutput = stderrChunks.join("").trim();
    if (stderrOutput.length > 0) {
      throw new Error(`Failed to connect to ${entrypoint}: ${stderrOutput}`);
    }
    throw error;
  }

  return {
    listTools: async () => {
      const result = await client.listTools();
      return result.tools;
    },
    callTool: (name, args) => client.callTool({ name, arguments: args }),
    readStderr: () => stderrChunks.join(""),
    close: async () => {
      await client.close();
    },
  };
}

export function parseJsonTextContent<T>(result: McpCallToolResult): T {
  const content = (result as { content?: unknown }).content;

  if (!Array.isArray(content)) {
    throw new Error("Expected MCP tool result content to be an array.");
  }

  const textBlock = content.find(isTextContentBlock);

  if (!textBlock || typeof textBlock.text !== "string") {
    throw new Error("Expected text content in MCP tool result.");
  }

  return JSON.parse(textBlock.text) as T;
}

export function sortToolNames(tools: McpToolList): string[] {
  return tools.map((tool) => tool.name).sort((left, right) => left.localeCompare(right));
}