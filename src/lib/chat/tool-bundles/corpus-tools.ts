import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import type { CorpusRepository } from "@/core/use-cases/CorpusRepository";
import type { SearchHandler } from "@/core/search/ports/SearchHandler";
import { createSearchCorpusTool } from "@/core/use-cases/tools/search-corpus.tool";
import { createGetSectionTool } from "@/core/use-cases/tools/get-section.tool";
import { createGetCorpusSummaryTool } from "@/core/use-cases/tools/get-corpus-summary.tool";
import { createGetChecklistTool } from "@/core/use-cases/tools/get-checklist.tool";
import { createListPractitionersTool } from "@/core/use-cases/tools/list-practitioners.tool";

export function registerCorpusTools(
  registry: ToolRegistry,
  deps: { corpusRepo: CorpusRepository; handler?: SearchHandler },
): void {
  const { corpusRepo, handler } = deps;
  registry.register(createSearchCorpusTool(corpusRepo, handler));
  registry.register(createGetSectionTool(corpusRepo));
  registry.register(createGetCorpusSummaryTool(corpusRepo));
  registry.register(createGetChecklistTool(corpusRepo));
  registry.register(createListPractitionersTool(corpusRepo));
}
