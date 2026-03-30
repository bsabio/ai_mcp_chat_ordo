import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { createAdminWebSearchTool } from "@/core/use-cases/tools/admin-web-search.tool";
import { createAdminPrioritizeLeadsTool } from "@/core/use-cases/tools/admin-prioritize-leads.tool";
import { createAdminPrioritizeOfferTool } from "@/core/use-cases/tools/admin-prioritize-offer.tool";
import { createAdminTriageRoutingRiskTool } from "@/core/use-cases/tools/admin-triage-routing-risk.tool";
import {
  loadOperatorLeadQueue,
  loadOperatorFunnelRecommendations,
  loadOperatorAnonymousOpportunities,
  loadOperatorRoutingReview,
} from "@/lib/operator/operator-signal-loaders";

export function registerAdminTools(registry: ToolRegistry): void {
  registry.register(createAdminWebSearchTool());
  registry.register(createAdminPrioritizeLeadsTool(loadOperatorLeadQueue));
  registry.register(
    createAdminPrioritizeOfferTool(loadOperatorFunnelRecommendations, loadOperatorAnonymousOpportunities, loadOperatorLeadQueue),
  );
  registry.register(createAdminTriageRoutingRiskTool(loadOperatorRoutingReview));
}
