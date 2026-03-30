import { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { composeMiddleware, type ToolExecuteFn } from "@/core/tool-registry/ToolMiddleware";
import { LoggingMiddleware } from "@/core/tool-registry/LoggingMiddleware";
import { RbacGuardMiddleware } from "@/core/tool-registry/RbacGuardMiddleware";
import { RoleAwareSearchFormatter } from "@/core/tool-registry/ToolResultFormatter";
import { getCorpusRepository } from "@/adapters/RepositoryFactory";
import type { CorpusRepository } from "@/core/use-cases/CorpusRepository";
import type { SearchHandler } from "@/core/search/ports/SearchHandler";
import { getSearchHandler } from "./search-pipeline";
import { getInstanceTools } from "@/lib/config/instance";
import { getEmbeddingPipelineFactory, getBookPipeline, getCorpusPipeline } from "./embedding-module";
import { registerCalculatorTools } from "./tool-bundles/calculator-tools";
import { registerThemeTools } from "./tool-bundles/theme-tools";
import { registerCorpusTools } from "./tool-bundles/corpus-tools";
import { registerConversationTools } from "./tool-bundles/conversation-tools";
import { registerAdminTools } from "./tool-bundles/admin-tools";
import { registerBlogTools } from "./tool-bundles/blog-tools";
import { registerProfileTools } from "./tool-bundles/profile-tools";
import { registerJobTools } from "./tool-bundles/job-tools";
import { registerNavigationTools } from "./tool-bundles/navigation-tools";

export function createToolRegistry(corpusRepo: CorpusRepository, handler?: SearchHandler): ToolRegistry {
  const reg = new ToolRegistry(new RoleAwareSearchFormatter());
  registerCalculatorTools(reg);
  registerThemeTools(reg);
  registerProfileTools(reg);
  registerCorpusTools(reg, { corpusRepo, handler });
  registerConversationTools(reg);
  registerAdminTools(reg);
  registerBlogTools(reg);
  registerJobTools(reg);
  registerNavigationTools(reg);
  const toolConfig = getInstanceTools();
  const allNames = reg.getToolNames();
  if (toolConfig.enabled) for (const n of allNames) { if (!toolConfig.enabled.includes(n)) reg.unregister(n); }
  if (toolConfig.disabled) for (const n of toolConfig.disabled) reg.unregister(n);
  return reg;
}

export interface ToolCompositionResult { readonly registry: ToolRegistry; readonly executor: ToolExecuteFn }
let cached: ToolCompositionResult | null = null;

export function getToolComposition(): ToolCompositionResult {
  if (!cached) {
    const registry = createToolRegistry(getCorpusRepository(), getSearchHandler());
    const executor = composeMiddleware(
      [new LoggingMiddleware(), new RbacGuardMiddleware(registry)],
      registry.execute.bind(registry),
    );
    cached = Object.freeze({ registry, executor });
  }
  return cached;
}

/** @internal — test-only. */
export function _resetToolComposition(): void { cached = null; }

export { getEmbeddingPipelineFactory, getBookPipeline, getCorpusPipeline, getSearchHandler };
