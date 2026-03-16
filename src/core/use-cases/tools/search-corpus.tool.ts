import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { CorpusRepository } from "../CorpusRepository";
import type { SearchHandler } from "@/core/search/ports/SearchHandler";
import { SearchCorpusCommand } from "./CorpusTools";
import { getCorpusSearchDescription } from "@/lib/corpus-config";

export function createSearchCorpusTool(repo: CorpusRepository, searchHandler?: SearchHandler): ToolDescriptor {
  return {
    name: "search_corpus",
    schema: {
      description: getCorpusSearchDescription(),
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query." },
          max_results: { type: "number", description: "Max results (1-15)." },
        },
        required: ["query"],
      },
    },
    command: new SearchCorpusCommand(repo, searchHandler),
    roles: "ALL",
    category: "content",
  };
}