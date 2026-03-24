import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { CorpusRepository } from "../CorpusRepository";
import { GetCorpusSummaryCommand } from "./CorpusTools";
import { getCorpusSummaryDescription } from "@/lib/corpus-vocabulary";

export function createGetCorpusSummaryTool(repo: CorpusRepository): ToolDescriptor {
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