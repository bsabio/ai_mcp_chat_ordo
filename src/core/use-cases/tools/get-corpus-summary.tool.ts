import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { CorpusCompatibleRepository } from "../CorpusRepository";
import { GetCorpusSummaryCommand } from "./CorpusTools";
import { getCorpusSummaryDescription } from "@/lib/corpus-config";

export function createGetCorpusSummaryTool(repo: CorpusCompatibleRepository): ToolDescriptor {
  return {
    name: "get_corpus_summary",
    schema: {
      description: getCorpusSummaryDescription(),
      input_schema: {
        type: "object",
        properties: {},
      },
    },
    command: new GetCorpusSummaryCommand(repo),
    roles: "ALL",
    category: "content",
  };
}