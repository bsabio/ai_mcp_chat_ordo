import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolCommand } from "@/core/tool-registry/ToolCommand";
import {
  type AdminSearchResult,
  searchAdminEntities,
} from "@/lib/admin/search/admin-search";

interface AdminSearchInput {
  query: string;
  entityTypes?: string[];
}

interface AdminSearchOutput {
  results: AdminSearchResult[];
  totalCount: number;
}

class AdminSearchCommand implements ToolCommand<AdminSearchInput, AdminSearchOutput> {
  async execute(input: AdminSearchInput): Promise<AdminSearchOutput> {
    if (!input.query || input.query.trim().length < 2) {
      return { results: [], totalCount: 0 };
    }

    const results = await searchAdminEntities(input.query, {
      entityTypes: input.entityTypes,
    });

    return { results, totalCount: results.length };
  }
}

export const adminSearchTool: ToolDescriptor<AdminSearchInput, AdminSearchOutput> = {
  name: "admin_search",
  schema: {
    description:
      "Search across all admin entities (users, leads, consultations, deals, training, conversations, jobs, prompts, journal posts). Returns matching results with links to detail pages. Admin only.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (minimum 2 characters).",
        },
        entityTypes: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional filter to search only specific entity types. Valid values: user, lead, consultation, deal, training, conversation, job, prompt, journal.",
        },
      },
      required: ["query"],
    },
  },
  command: new AdminSearchCommand(),
  roles: ["ADMIN"],
  category: "system",
};
