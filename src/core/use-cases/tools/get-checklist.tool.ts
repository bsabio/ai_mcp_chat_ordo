import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { CorpusRepository } from "../CorpusRepository";
import { GetChecklistCommand } from "./CorpusTools";

export function createGetChecklistTool(repo: CorpusRepository): ToolDescriptor {
  return {
    name: "get_checklist",
    schema: {
      description: "Get chapter checklists.",
      input_schema: {
        type: "object",
        properties: {
          book_slug: { type: "string", description: "Optional specific book." },
        },
      },
    },
    command: new GetChecklistCommand(repo),
    roles: ["AUTHENTICATED", "STAFF", "ADMIN"],
    category: "content",
  };
}
