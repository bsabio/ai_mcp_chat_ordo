import type Anthropic from "@anthropic-ai/sdk";

import type { ConversationRoutingSnapshot } from "@/core/entities/conversation-routing";
import type { RoleName } from "@/core/entities/user";
import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";

import { isHighConfidenceLane } from "./routing-consumers";

const NAVIGATION_CONTEXT_TOOLS = [
  "get_current_page",
  "inspect_runtime_context",
  "list_available_pages",
  "navigate_to_page",
] as const;

const CORPUS_DISCOVERY_TOOLS = [
  "search_corpus",
  "get_corpus_summary",
  "get_section",
  "get_checklist",
  "list_practitioners",
] as const;

const MEMBER_STATE_TOOLS = [
  "search_my_conversations",
  "get_my_profile",
  "update_my_profile",
  "get_my_referral_qr",
  "get_my_affiliate_summary",
  "list_my_referral_activity",
  "get_my_job_status",
  "list_my_jobs",
  "set_preference",
] as const;

const ADMIN_OPERATIONS_TOOLS = [
  "admin_search",
  "admin_web_search",
  "admin_prioritize_leads",
  "admin_prioritize_offer",
  "admin_triage_routing_risk",
  "get_admin_affiliate_summary",
  "list_admin_referral_exceptions",
] as const;

const ADMIN_QUEUE_TOOLS = [
  "get_deferred_job_status",
  "list_deferred_jobs",
] as const;

const ADMIN_EDITORIAL_READ_TOOLS = [
  "get_journal_workflow_summary",
  "list_journal_posts",
  "get_journal_post",
  "list_journal_revisions",
] as const;

const DEVELOPMENT_OUTPUT_TOOLS = [
  "calculator",
  "generate_audio",
  "generate_chart",
  "generate_graph",
  "compose_media",
] as const;

const ADMIN_LANE_ALLOWLISTS = {
  organization: [
    ...NAVIGATION_CONTEXT_TOOLS,
    ...CORPUS_DISCOVERY_TOOLS,
    ...ADMIN_OPERATIONS_TOOLS,
    ...ADMIN_QUEUE_TOOLS,
    ...ADMIN_EDITORIAL_READ_TOOLS,
    "search_my_conversations",
  ],
  individual: [
    ...NAVIGATION_CONTEXT_TOOLS,
    ...CORPUS_DISCOVERY_TOOLS,
    ...MEMBER_STATE_TOOLS,
  ],
  development: [
    ...NAVIGATION_CONTEXT_TOOLS,
    ...CORPUS_DISCOVERY_TOOLS,
    ...MEMBER_STATE_TOOLS,
    ...ADMIN_QUEUE_TOOLS,
    ...ADMIN_EDITORIAL_READ_TOOLS,
    ...DEVELOPMENT_OUTPUT_TOOLS,
  ],
} as const;

export interface RequestScopedToolSelection {
  tools: Anthropic.Tool[];
  allowedToolNames: string[];
  prefiltered: boolean;
}

export function getRequestScopedToolSelection(
  registry: ToolRegistry,
  role: RoleName,
  snapshot: ConversationRoutingSnapshot,
): RequestScopedToolSelection {
  const tools = registry.getSchemasForRole(role) as Anthropic.Tool[];
  const fullToolNames = tools.map((tool) => tool.name);

  if (role !== "ADMIN" || !isHighConfidenceLane(snapshot) || snapshot.lane === "uncertain") {
    return {
      tools,
      allowedToolNames: fullToolNames,
      prefiltered: false,
    };
  }

  const allowlist = new Set<string>(ADMIN_LANE_ALLOWLISTS[snapshot.lane]);
  const filteredTools = tools.filter((tool) => allowlist.has(tool.name));

  if (filteredTools.length === 0 || filteredTools.length === tools.length) {
    return {
      tools,
      allowedToolNames: fullToolNames,
      prefiltered: false,
    };
  }

  return {
    tools: filteredTools,
    allowedToolNames: filteredTools.map((tool) => tool.name),
    prefiltered: true,
  };
}