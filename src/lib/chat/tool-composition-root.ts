import { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { composeMiddleware, type ToolExecuteFn } from "@/core/tool-registry/ToolMiddleware";
import { LoggingMiddleware } from "@/core/tool-registry/LoggingMiddleware";
import { RbacGuardMiddleware } from "@/core/tool-registry/RbacGuardMiddleware";
import { RoleAwareSearchFormatter } from "@/core/tool-registry/ToolResultFormatter";
import { getCorpusRepository, getBlogPostRepository } from "@/adapters/RepositoryFactory";
import type { CorpusRepository } from "@/core/use-cases/CorpusRepository";

import { LocalEmbedder } from "@/adapters/LocalEmbedder";
import { SQLiteVectorStore } from "@/adapters/SQLiteVectorStore";
import type { SearchHandler } from "@/core/search/ports/SearchHandler";
import { getDb } from "@/lib/db";
import { UserPreferencesDataMapper } from "@/adapters/UserPreferencesDataMapper";

import { getSearchHandler } from "./search-pipeline";
import { getEmbeddingPipelineFactory, getBookPipeline, getCorpusPipeline } from "./embedding-module";

import { calculatorTool } from "@/core/use-cases/tools/calculator.tool";
import { setThemeTool } from "@/core/use-cases/tools/set-theme.tool";
import { createAdjustUiTool } from "@/core/use-cases/tools/adjust-ui.tool";
import { navigateTool } from "@/core/use-cases/tools/navigate.tool";
import { generateChartTool } from "@/core/use-cases/tools/generate-chart.tool";
import { generateGraphTool } from "@/core/use-cases/tools/generate-graph.tool";
import { generateAudioTool } from "@/core/use-cases/tools/generate-audio.tool";
import { createSearchCorpusTool } from "@/core/use-cases/tools/search-corpus.tool";
import { createGetSectionTool } from "@/core/use-cases/tools/get-section.tool";
import { createGetChecklistTool } from "@/core/use-cases/tools/get-checklist.tool";
import { createListPractitionersTool } from "@/core/use-cases/tools/list-practitioners.tool";
import { createGetCorpusSummaryTool } from "@/core/use-cases/tools/get-corpus-summary.tool";
import { createAdminWebSearchTool } from "@/core/use-cases/tools/admin-web-search.tool";
import { createAdminPrioritizeLeadsTool } from "@/core/use-cases/tools/admin-prioritize-leads.tool";
import { createAdminPrioritizeOfferTool } from "@/core/use-cases/tools/admin-prioritize-offer.tool";
import { createAdminTriageRoutingRiskTool } from "@/core/use-cases/tools/admin-triage-routing-risk.tool";
import { createDraftContentTool, createPublishContentTool } from "@/core/use-cases/tools/admin-content.tool";
import { createSearchMyConversationsTool } from "@/core/use-cases/tools/search-my-conversations.tool";
import { createSetPreferenceTool } from "@/core/use-cases/tools/set-preference.tool";
import {
  createGetMyProfileTool,
  createGetMyReferralQrTool,
  createUpdateMyProfileTool,
} from "@/core/use-cases/tools/user-profile.tool";
import { getInstanceTools } from "@/lib/config/instance";
import { createProfileService } from "@/lib/profile/profile-service";
import {
  loadOperatorLeadQueue,
  loadOperatorFunnelRecommendations,
  loadOperatorAnonymousOpportunities,
  loadOperatorRoutingReview,
} from "@/lib/operator/operator-signal-loaders";

export function createToolRegistry(corpusRepo: CorpusRepository, handler?: SearchHandler): ToolRegistry {
  const reg = new ToolRegistry(new RoleAwareSearchFormatter());
  const db = getDb();
  const prefsRepo = new UserPreferencesDataMapper(db);

  // Stateless tools (no deps)
  reg.register(calculatorTool);
  reg.register(setThemeTool);
  reg.register(createAdjustUiTool(prefsRepo));
  reg.register(navigateTool);
  reg.register(generateChartTool);
  reg.register(generateGraphTool);
  reg.register(generateAudioTool);
  reg.register(createSetPreferenceTool(prefsRepo));

  const profileService = createProfileService();
  reg.register(createGetMyProfileTool(profileService));
  reg.register(createUpdateMyProfileTool(profileService));
  reg.register(createGetMyReferralQrTool(profileService));

  // Canonical corpus tools
  reg.register(createSearchCorpusTool(corpusRepo, handler));
  reg.register(createGetSectionTool(corpusRepo));
  reg.register(createGetCorpusSummaryTool(corpusRepo));

  reg.register(createGetChecklistTool(corpusRepo));
  reg.register(createListPractitionersTool(corpusRepo));

  // Conversation search (authenticated+ only)
  const vectorStore = new SQLiteVectorStore(db);
  const embedder = new LocalEmbedder();
  reg.register(createSearchMyConversationsTool(vectorStore, embedder));

  // Admin-only: web search (UI component does the real work via /api/web-search)
  reg.register(createAdminWebSearchTool());
  reg.register(createAdminPrioritizeLeadsTool(loadOperatorLeadQueue));
  reg.register(createAdminPrioritizeOfferTool(loadOperatorFunnelRecommendations, loadOperatorAnonymousOpportunities, loadOperatorLeadQueue));
  reg.register(createAdminTriageRoutingRiskTool(loadOperatorRoutingReview));

  // Admin-only: blog content pipeline
  const blogRepo = getBlogPostRepository();
  reg.register(createDraftContentTool(blogRepo));
  reg.register(createPublishContentTool(blogRepo));

  // Apply tools.json filtering
  const toolConfig = getInstanceTools();
  const allNames = reg.getToolNames();
  if (toolConfig.enabled) {
    for (const name of allNames) {
      if (!toolConfig.enabled.includes(name)) {
        reg.unregister(name);
      }
    }
  }
  if (toolConfig.disabled) {
    for (const name of toolConfig.disabled) {
      reg.unregister(name);
    }
  }

  return reg;
}

export function getToolRegistry(): ToolRegistry {
  return createToolRegistry(getCorpusRepository(), getSearchHandler());
}

export function getToolExecutor(): ToolExecuteFn {
  const reg = getToolRegistry();
  return composeMiddleware(
    [new LoggingMiddleware(), new RbacGuardMiddleware(reg)],
    reg.execute.bind(reg),
  );
}

// Re-export for backward compatibility
export { getEmbeddingPipelineFactory, getBookPipeline, getCorpusPipeline, getSearchHandler };
