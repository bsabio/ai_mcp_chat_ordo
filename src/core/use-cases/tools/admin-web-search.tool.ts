import type { ToolCommand } from "@/core/tool-registry/ToolCommand";
import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";

interface WebSearchInput {
  query: string;
  allowed_domains?: string[];
  model?: string;
}

class AdminWebSearchCommand implements ToolCommand<WebSearchInput, string> {
  async execute(): Promise<string> {
    return "Success. Web search results rendered in the chat UI.";
  }
}

export function createAdminWebSearchTool(): ToolDescriptor<WebSearchInput, string> {
  return {
    name: "admin_web_search",
    schema: {
      description:
        "Search the live web using OpenAI and return a sourced answer with citations. Use allowed_domains to target specific sites (e.g. en.wikipedia.org for Wikipedia searches). Admin only.",
      input_schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query (max 2000 characters).",
          },
          allowed_domains: {
            type: "array",
            description:
              "Optional list of domains to restrict search results to (e.g. ['en.wikipedia.org']).",
            items: { type: "string" },
          },
          model: {
            type: "string",
            description:
              "OpenAI model to use (default: gpt-5). Must support the web_search tool.",
          },
        },
        required: ["query"],
      },
    },
    command: new AdminWebSearchCommand(),
    roles: ["ADMIN"],
    category: "content",
  };
}
