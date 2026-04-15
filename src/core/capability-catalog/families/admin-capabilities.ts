import type { CapabilityDefinition } from "../capability-definition";
import { CATALOG_INPUT_SCHEMAS } from "../catalog-input-schemas";

export const ADMIN_PILOT_CAPABILITIES = {
  admin_web_search: {
    core: {
      name: "admin_web_search",
      label: "Admin Web Search",
      description:
        "Search the live web using OpenAI and return a sourced answer with citations. Use allowed_domains to target specific sites (e.g. en.wikipedia.org for Wikipedia searches). Admin only.",
      category: "content",
      roles: ["ADMIN"],
    },
    runtime: {
      executionMode: undefined,
      deferred: undefined,
    },
    presentation: {
      family: "search",
      cardKind: "search_result",
      executionMode: "inline",
    },
    promptHint: {
      roleDirectiveLines: {
        ADMIN: [
          "ADMIN-ONLY TOOL — Web Search:",
          "- **admin_web_search**: Search the live web and return a sourced answer with citations. Use allowed_domains to target specific sites (e.g., allowed_domains=['en.wikipedia.org'] for Wikipedia research). You MUST call this tool directly when the admin asks you to search the web.",
        ],
      },
    },
    schema: {
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query (max 2000 characters).",
          },
          allowed_domains: {
            type: "array",
            description: "Optional list of domains to restrict search results to (e.g. ['en.wikipedia.org']).",
            items: { type: "string" },
          },
          model: {
            type: "string",
            description: "OpenAI model to use (default: gpt-5). Must support the web_search tool.",
          },
        },
        required: ["query"],
      },
      outputHint: "Returns sourced answer with citations",
    },
    executorBinding: {
      bundleId: "admin",
      executorId: "admin_web_search",
      executionSurface: "shared",
    },
    validationBinding: {
      validatorId: "admin_web_search",
      mode: "sanitize",
    },
    localExecutionTargets: {
      mcpStdio: {
        processId: "admin-web-search",
        toolName: "admin_web_search",
      },
      mcpContainer: {
        processId: "admin-web-search",
        serviceName: "admin-web-search-mcp",
        toolName: "admin_web_search",
        healthcheckToolName: "admin_web_search",
      },
    },
    mcpExport: {
      exportable: true,
      sharedModule: "src/lib/capabilities/shared/web-search-tool",
      mcpDescription:
        "Core web search execution logic is shared between the app tool and the MCP export layer.",
    },
  },
} as const satisfies Record<string, CapabilityDefinition>;

export const ADMIN_OPERATIONS_CAPABILITIES = {
  admin_prioritize_leads: {
    core: {
      name: "admin_prioritize_leads",
      label: "Admin Prioritize Leads",
      description:
        "Retrieve and prioritize the current lead queue for administrative triage and follow-up.",
      category: "system",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.admin_prioritize_leads,
      outputHint: "Returns prioritized lead list with scores and recommended actions",
    },
    runtime: {},
    executorBinding: {
      bundleId: "admin",
      executorId: "admin_prioritize_leads",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "admin_prioritize_leads",
      mode: "parse",
    },
    localExecutionTargets: {
      mcpStdio: {
        processId: "operations",
        toolName: "admin_prioritize_leads",
      },
    },
    presentation: {
      family: "system",
      cardKind: "fallback",
      executionMode: "inline",
    },
    promptHint: {
      roleDirectiveLines: {
        ADMIN: [
          "- **admin_prioritize_leads**: Rank submitted leads that need founder attention and return the next revenue action. Use this first when the admin asks what to do first today, which lead matters most, or who needs founder follow-up now.",
        ],
      },
    },
    mcpExport: {
      exportable: true,
      sharedModule: "src/lib/capabilities/shared/admin-intelligence-tool",
      mcpDescription:
        "Shared admin lead-prioritization logic exported through the operations MCP sidecar.",
    },
  },

  admin_prioritize_offer: {
    core: {
      name: "admin_prioritize_offer",
      label: "Admin Prioritize Offer",
      description:
        "Analyze a lead's profile and recommend a tailored service offer from the available packages.",
      category: "system",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.admin_prioritize_offer,
    },
    runtime: {},
    executorBinding: {
      bundleId: "admin",
      executorId: "admin_prioritize_offer",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "admin_prioritize_offer",
      mode: "parse",
    },
    localExecutionTargets: {
      mcpStdio: {
        processId: "operations",
        toolName: "admin_prioritize_offer",
      },
    },
    presentation: {
      family: "system",
      cardKind: "fallback",
      executionMode: "inline",
    },
    promptHint: {
      roleDirectiveLines: {
        ADMIN: [
          "- **admin_prioritize_offer**: Choose the single offer or message that should be pushed first based on current funnel, anonymous-demand, and lead-queue signals. Use this first when the admin asks what to sell, what offer to push, or which message should drive revenue today.",
        ],
      },
    },
    mcpExport: {
      exportable: true,
      sharedModule: "src/lib/capabilities/shared/admin-intelligence-tool",
      mcpDescription:
        "Shared admin offer-prioritization logic exported through the operations MCP sidecar.",
    },
  },

  admin_triage_routing_risk: {
    core: {
      name: "admin_triage_routing_risk",
      label: "Admin Triage Routing Risk",
      description:
        "Analyze routing risk signals and recommend triage actions for conversations with uncertain intent.",
      category: "system",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.admin_triage_routing_risk,
    },
    runtime: {},
    executorBinding: {
      bundleId: "admin",
      executorId: "admin_triage_routing_risk",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "admin_triage_routing_risk",
      mode: "parse",
    },
    localExecutionTargets: {
      mcpStdio: {
        processId: "operations",
        toolName: "admin_triage_routing_risk",
      },
    },
    presentation: {
      family: "system",
      cardKind: "fallback",
      executionMode: "inline",
    },
    promptHint: {
      roleDirectiveLines: {
        ADMIN: [
          "- **admin_triage_routing_risk**: Identify the conversations most likely to hurt customer outcome because of routing uncertainty or overdue follow-up. Use this first when the admin asks about service risk, routing risk, or which customers need intervention now.",
        ],
      },
    },
    mcpExport: {
      exportable: true,
      sharedModule: "src/lib/capabilities/shared/admin-intelligence-tool",
      mcpDescription:
        "Shared admin routing-risk triage logic exported through the operations MCP sidecar.",
    },
  },
} as const satisfies Record<string, CapabilityDefinition>;