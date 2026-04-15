import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { projectCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-binding";
import type { CorpusRepository } from "@/core/use-cases/CorpusRepository";
import type { SearchHandler } from "@/core/search/ports/SearchHandler";
import {
  createRegisteredToolBundle,
  registerToolBundle,
  type ToolBundleRegistration,
} from "./bundle-registration";

interface CorpusToolRegistrationDeps {
  readonly corpusRepo: CorpusRepository;
  readonly searchHandler?: SearchHandler;
}

const CORPUS_TOOL_REGISTRATIONS = [
  {
    toolName: "get_checklist",
    createTool: ({ corpusRepo }) => projectCatalogBoundToolDescriptor("get_checklist", { corpusRepo }),
  },
  {
    toolName: "get_corpus_summary",
    createTool: ({ corpusRepo }) => projectCatalogBoundToolDescriptor("get_corpus_summary", { corpusRepo }),
  },
  {
    toolName: "get_section",
    createTool: ({ corpusRepo }) => projectCatalogBoundToolDescriptor("get_section", { corpusRepo }),
  },
  {
    toolName: "list_practitioners",
    createTool: ({ corpusRepo }) => projectCatalogBoundToolDescriptor("list_practitioners", { corpusRepo }),
  },
  {
    toolName: "search_corpus",
    createTool: ({ corpusRepo, searchHandler }) =>
      projectCatalogBoundToolDescriptor("search_corpus", { corpusRepo, searchHandler }),
  },
] as const satisfies readonly ToolBundleRegistration<
  "get_checklist" | "get_corpus_summary" | "get_section" | "list_practitioners" | "search_corpus",
  CorpusToolRegistrationDeps
>[];

export const CORPUS_BUNDLE = createRegisteredToolBundle(
  "corpus",
  "Corpus Tools",
  CORPUS_TOOL_REGISTRATIONS,
);

export function registerCorpusTools(
  registry: ToolRegistry,
  deps: { corpusRepo: CorpusRepository; handler?: SearchHandler },
): void {
  const { corpusRepo, handler } = deps;
  registerToolBundle(registry, CORPUS_TOOL_REGISTRATIONS, {
    corpusRepo,
    searchHandler: handler,
  });
}
