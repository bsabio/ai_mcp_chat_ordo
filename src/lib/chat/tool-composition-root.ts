import { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { createToolExecutionHookRunner, type ToolExecuteFn } from "@/core/tool-registry/ToolMiddleware";
import { LoggingMiddleware } from "@/core/tool-registry/LoggingMiddleware";
import { RbacGuardMiddleware } from "@/core/tool-registry/RbacGuardMiddleware";
import { ToolCapabilityMiddleware } from "@/core/tool-registry/ToolCapabilityMiddleware";
import { RoleAwareSearchFormatter } from "@/core/tool-registry/ToolResultFormatter";
import { getCorpusRepository } from "@/adapters/RepositoryFactory";
import type { CorpusRepository } from "@/core/use-cases/CorpusRepository";
import type { SearchHandler } from "@/core/search/ports/SearchHandler";
import type { ToolBundleDescriptor } from "@/core/tool-registry/ToolBundleDescriptor";
import { getSearchHandler } from "./search-pipeline";
import { getInstanceTools } from "@/lib/config/instance";
import { getEmbeddingPipelineFactory, getBookPipeline, getCorpusPipeline } from "./embedding-module";
import { registerCalculatorTools, CALCULATOR_BUNDLE } from "./tool-bundles/calculator-tools";
import { registerThemeTools, THEME_BUNDLE } from "./tool-bundles/theme-tools";
import { registerCorpusTools, CORPUS_BUNDLE } from "./tool-bundles/corpus-tools";
import { registerConversationTools, CONVERSATION_BUNDLE } from "./tool-bundles/conversation-tools";
import { registerAdminTools, ADMIN_BUNDLE } from "./tool-bundles/admin-tools";
import { registerBlogTools, BLOG_BUNDLE } from "./tool-bundles/blog-tools";
import { registerProfileTools, PROFILE_BUNDLE } from "./tool-bundles/profile-tools";
import { registerJobTools, JOB_BUNDLE } from "./tool-bundles/job-tools";
import { registerNavigationTools, NAVIGATION_BUNDLE } from "./tool-bundles/navigation-tools";
import { registerAffiliateAnalyticsTools, AFFILIATE_BUNDLE } from "./tool-bundles/affiliate-tools";
import { registerMediaTools, MEDIA_BUNDLE } from "./tool-bundles/media-tools";

interface ToolBundleRegistrationDeps {
  readonly corpusRepo: CorpusRepository;
  readonly handler?: SearchHandler;
}

interface ToolBundleRegistration {
  readonly bundle: ToolBundleDescriptor;
  readonly register: (
    registry: ToolRegistry,
    deps: ToolBundleRegistrationDeps,
  ) => void;
}

const TOOL_BUNDLE_REGISTRATIONS = [
  { bundle: ADMIN_BUNDLE, register: (registry) => registerAdminTools(registry) },
  { bundle: AFFILIATE_BUNDLE, register: (registry) => registerAffiliateAnalyticsTools(registry) },
  { bundle: BLOG_BUNDLE, register: (registry) => registerBlogTools(registry) },
  { bundle: CALCULATOR_BUNDLE, register: (registry) => registerCalculatorTools(registry) },
  { bundle: CONVERSATION_BUNDLE, register: (registry) => registerConversationTools(registry) },
  {
    bundle: CORPUS_BUNDLE,
    register: (registry, deps) =>
      registerCorpusTools(registry, { corpusRepo: deps.corpusRepo, handler: deps.handler }),
  },
  { bundle: JOB_BUNDLE, register: (registry) => registerJobTools(registry) },
  { bundle: MEDIA_BUNDLE, register: (registry) => registerMediaTools(registry) },
  { bundle: NAVIGATION_BUNDLE, register: (registry) => registerNavigationTools(registry) },
  { bundle: PROFILE_BUNDLE, register: (registry) => registerProfileTools(registry) },
  { bundle: THEME_BUNDLE, register: (registry) => registerThemeTools(registry) },
] as const satisfies readonly ToolBundleRegistration[];

/** Sorted registry of all tool bundles. Add new bundles here. */
export const TOOL_BUNDLE_REGISTRY: readonly ToolBundleDescriptor[] = Object.freeze(
  TOOL_BUNDLE_REGISTRATIONS.map(({ bundle }) => bundle),
);

function registerToolBundles(
  registry: ToolRegistry,
  deps: ToolBundleRegistrationDeps,
): void {
  for (const registration of TOOL_BUNDLE_REGISTRATIONS) {
    registration.register(registry, deps);
  }
}

export function createToolRegistry(corpusRepo: CorpusRepository, handler?: SearchHandler): ToolRegistry {
  const reg = new ToolRegistry(new RoleAwareSearchFormatter());
  reg.setBundles(TOOL_BUNDLE_REGISTRY);
  registerToolBundles(reg, { corpusRepo, handler });
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
    const hooks = [new LoggingMiddleware(), new ToolCapabilityMiddleware(registry), new RbacGuardMiddleware(registry)];
    const executor = createToolExecutionHookRunner(hooks, registry.execute.bind(registry));
    cached = Object.freeze({ registry, executor });
  }
  return cached;
}

/** @internal — test-only. */
export function _resetToolComposition(): void { cached = null; }

export { applyPolicyLayers } from "@/core/tool-registry/ToolPolicyPipeline";
export type { ToolPolicy, ToolPolicyLayer, ToolPolicyPrecedence } from "@/core/tool-registry/ToolPolicyPipeline";
export { getEmbeddingPipelineFactory, getBookPipeline, getCorpusPipeline, getSearchHandler };
