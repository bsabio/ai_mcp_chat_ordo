import { CATALOG_INPUT_SCHEMAS } from "@/core/capability-catalog/catalog-input-schemas";
import { executeAdminSearch, sanitizeAdminSearchInput } from "@/core/use-cases/tools/admin-search.tool";
import { createAdminPrioritizeLeadsTool } from "@/core/use-cases/tools/admin-prioritize-leads.tool";
import { createAdminPrioritizeOfferTool } from "@/core/use-cases/tools/admin-prioritize-offer.tool";
import { createAdminTriageRoutingRiskTool } from "@/core/use-cases/tools/admin-triage-routing-risk.tool";
import type {
  OperatorAnonymousOpportunitiesData,
  OperatorFunnelRecommendationsData,
  OperatorLeadQueueData,
  OperatorRoutingReviewData,
  OperatorSignalPayload,
} from "@/lib/operator/operator-signal-loaders";

type AdminUser = { id: string; roles: ["ADMIN"] };

interface SharedExecutionContext {
  userId?: string;
  role?: string;
}

type SharedArgs<T> = T & {
  __executionContext?: SharedExecutionContext;
};

type LeadQueueLoader = (user: AdminUser) => Promise<OperatorSignalPayload<OperatorLeadQueueData>>;
type FunnelLoader = (user: AdminUser) => Promise<OperatorSignalPayload<OperatorFunnelRecommendationsData>>;
type OpportunityLoader = (user: AdminUser) => Promise<OperatorSignalPayload<OperatorAnonymousOpportunitiesData>>;
type RoutingReviewLoader = (user: AdminUser) => Promise<OperatorSignalPayload<OperatorRoutingReviewData>>;

export interface AdminIntelligenceToolDeps {
  loadLeadQueue: LeadQueueLoader;
  loadFunnelRecommendations: FunnelLoader;
  loadAnonymousOpportunities: OpportunityLoader;
  loadRoutingReview: RoutingReviewLoader;
}

interface AdminPrioritizeLeadsInput {
  max_results?: number;
}

interface AdminPrioritizeOfferInput {
  max_results?: number;
}

interface AdminTriageRoutingRiskInput {
  max_results?: number;
}

function toExecutionContext(args: { __executionContext?: SharedExecutionContext }) {
  const userId = args.__executionContext?.userId;
  if (!userId) {
    return undefined;
  }

  return {
    userId,
    role: "ADMIN" as const,
  };
}

function stripContext<T extends object>(args: SharedArgs<T>): T {
  const { __executionContext: _ignored, ...input } = args;
  return input as T;
}

export async function adminPrioritizeLeads(
  deps: AdminIntelligenceToolDeps,
  args: SharedArgs<AdminPrioritizeLeadsInput>,
): Promise<Record<string, unknown>> {
  const descriptor = createAdminPrioritizeLeadsTool(deps.loadLeadQueue);
  return descriptor.command.execute(stripContext(args), toExecutionContext(args));
}

export async function adminSearch(
  _deps: AdminIntelligenceToolDeps,
  args: SharedArgs<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  return (await executeAdminSearch(
    sanitizeAdminSearchInput(stripContext(args)),
  )) as unknown as Record<string, unknown>;
}

export async function adminPrioritizeOffer(
  deps: AdminIntelligenceToolDeps,
  args: SharedArgs<AdminPrioritizeOfferInput>,
): Promise<Record<string, unknown>> {
  const descriptor = createAdminPrioritizeOfferTool(
    deps.loadFunnelRecommendations,
    deps.loadAnonymousOpportunities,
    deps.loadLeadQueue,
  );
  return descriptor.command.execute(stripContext(args), toExecutionContext(args));
}

export async function adminTriageRoutingRisk(
  deps: AdminIntelligenceToolDeps,
  args: SharedArgs<AdminTriageRoutingRiskInput>,
): Promise<Record<string, unknown>> {
  const descriptor = createAdminTriageRoutingRiskTool(deps.loadRoutingReview);
  return descriptor.command.execute(stripContext(args), toExecutionContext(args));
}

export function getAdminIntelligenceToolSchemas() {
  return [
    {
      name: "admin_search",
      description:
        "Search across users, conversations, leads, and referrals for administrative lookups. Admin only.",
      inputSchema: CATALOG_INPUT_SCHEMAS.admin_search,
    },
    {
      name: "admin_prioritize_leads",
      description:
        "Rank submitted leads that need founder attention and return the next revenue action. Admin only.",
      inputSchema: CATALOG_INPUT_SCHEMAS.admin_prioritize_leads,
    },
    {
      name: "admin_prioritize_offer",
      description:
        "Choose the single offer or message that should be pushed first based on current funnel, anonymous-demand, and lead-queue signals. Admin only.",
      inputSchema: CATALOG_INPUT_SCHEMAS.admin_prioritize_offer,
    },
    {
      name: "admin_triage_routing_risk",
      description:
        "Identify the conversations most likely to hurt customer outcome because of routing uncertainty or overdue follow-up. Admin only.",
      inputSchema: CATALOG_INPUT_SCHEMAS.admin_triage_routing_risk,
    },
  ] as const;
}
