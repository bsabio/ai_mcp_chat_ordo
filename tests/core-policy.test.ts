import { describe, expect, it } from "vitest";
import { ChatPolicyInteractor } from "@/core/use-cases/ChatPolicyInteractor";
import { ROLE_DIRECTIVES } from "@/core/entities/role-directives";
import { DefaultingSystemPromptRepository } from "@/core/use-cases/DefaultingSystemPromptRepository";
import { getToolRegistry } from "@/lib/chat/tool-composition-root";
import { createAdminWebSearchTool } from "@/core/use-cases/tools/admin-web-search.tool";
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
import type { SystemPromptRepository } from "@/core/use-cases/SystemPromptRepository";

// Minimal in-memory stub that always returns null (forces fallback)
const nullRepo: SystemPromptRepository = {
  getActive: async () => null,
  listVersions: async () => [],
  getByVersion: async () => null,
  createVersion: async () => { throw new Error("not implemented"); },
  activate: async () => {},
};

describe("ChatPolicyInteractor", () => {
  const basePrompt = "You are an advisor.";
  const directives: Record<string, string> = {
    ANONYMOUS: "\nDEMO MODE",
    AUTHENTICATED: "\nregistered member",
    STAFF: "\nstaff member",
    ADMIN: "\nSYSTEM ADMINISTRATOR",
  };
  const repo = new DefaultingSystemPromptRepository(nullRepo, basePrompt, directives);
  const interactor = new ChatPolicyInteractor(repo);

  it("ANONYMOUS prompt includes DEMO mode framing", async () => {
    const prompt = await interactor.execute({ role: "ANONYMOUS" });
    expect(prompt).toContain(basePrompt);
    expect(prompt).toContain("DEMO MODE");
  });

  it("ADMIN prompt includes system administrator framing", async () => {
    const prompt = await interactor.execute({ role: "ADMIN" });
    expect(prompt).toContain(basePrompt);
    expect(prompt).toContain("SYSTEM ADMINISTRATOR");
  });

  it("real admin fallback directive includes operator tool guidance", () => {
    expect(ROLE_DIRECTIVES.ADMIN).toContain("admin_prioritize_leads");
    expect(ROLE_DIRECTIVES.ADMIN).toContain("admin_prioritize_offer");
    expect(ROLE_DIRECTIVES.ADMIN).toContain("admin_triage_routing_risk");
    expect(ROLE_DIRECTIVES.ADMIN).toContain("exactly three headings: NOW, NEXT, WAIT");
  });

  it("AUTHENTICATED prompt includes registered member framing", async () => {
    const prompt = await interactor.execute({ role: "AUTHENTICATED" });
    expect(prompt).toContain("registered member");
  });

  it("STAFF prompt includes staff framing", async () => {
    const prompt = await interactor.execute({ role: "STAFF" });
    expect(prompt).toContain("staff member");
  });
});

describe("ToolRegistry RBAC", () => {
  const registry = getToolRegistry();
  const createLeadQueuePayload = (): OperatorSignalPayload<OperatorLeadQueueData> => ({
    blockId: "lead_queue",
    state: "empty",
    data: {
      summary: {
        submittedLeadCount: 0,
        newLeadCount: 0,
        contactedLeadCount: 0,
        qualifiedLeadCount: 0,
        deferredLeadCount: 0,
      },
      leads: [],
      emptyReason: null,
    },
  });
  const createFunnelPayload = (): OperatorSignalPayload<OperatorFunnelRecommendationsData> => ({
    blockId: "funnel_recommendations",
    state: "empty",
    data: {
      summary: {
        recommendationCount: 0,
        anonymousDropOffCount: 0,
        uncertainConversationCount: 0,
        newLeadCount: 0,
      },
      recommendations: [],
      emptyReason: null,
    },
  });
  const createAnonymousPayload = (): OperatorSignalPayload<OperatorAnonymousOpportunitiesData> => ({
    blockId: "anonymous_opportunities",
    state: "empty",
    data: {
      summary: {
        opportunityCount: 0,
        organizationCount: 0,
        individualCount: 0,
        developmentCount: 0,
      },
      opportunities: [],
      emptyReason: null,
    },
  });
  const createRoutingPayload = (): OperatorSignalPayload<OperatorRoutingReviewData> => ({
    blockId: "routing_review",
    state: "empty",
    data: {
      summary: {
        recentlyChangedCount: 0,
        uncertainCount: 0,
        followUpReadyCount: 0,
      },
      recentlyChanged: [],
      uncertainConversations: [],
      followUpReady: [],
    },
  });

  it("ANONYMOUS gets exactly 6 tool schemas", () => {
    const schemas = registry.getSchemasForRole("ANONYMOUS");
    expect(schemas).toHaveLength(6);
    const names = schemas.map((s) => s.name);
    expect(names).toContain("calculator");
    expect(names).toContain("search_corpus");
    expect(names).toContain("get_corpus_summary");
    expect(names).toContain("set_theme");
    expect(names).toContain("navigate");
    expect(names).toContain("adjust_ui");
  });

  it("ANONYMOUS cannot execute restricted tools", () => {
    expect(registry.canExecute("get_section", "ANONYMOUS")).toBe(false);
    expect(registry.canExecute("get_checklist", "ANONYMOUS")).toBe(false);
    expect(registry.canExecute("generate_audio", "ANONYMOUS")).toBe(false);
    expect(registry.canExecute("generate_chart", "ANONYMOUS")).toBe(false);
    expect(registry.canExecute("list_practitioners", "ANONYMOUS")).toBe(false);
  });

  it("AUTHENTICATED gets all 13 tool schemas", () => {
    const schemas = registry.getSchemasForRole("AUTHENTICATED");
    expect(schemas).toHaveLength(13);
  });

  it("STAFF gets all 13 tool schemas", () => {
    const schemas = registry.getSchemasForRole("STAFF");
    expect(schemas).toHaveLength(13);
  });

  it("ADMIN gets 19 tool schemas (13 base + 6 admin-only tools)", () => {
    const schemas = registry.getSchemasForRole("ADMIN");
    expect(schemas).toHaveLength(19);
    const names = schemas.map((s) => s.name);
    expect(names).toContain("admin_web_search");
    expect(names).toContain("admin_prioritize_leads");
    expect(names).toContain("admin_prioritize_offer");
    expect(names).toContain("admin_triage_routing_risk");
    expect(names).toContain("draft_content");
    expect(names).toContain("publish_content");
  });

  it("ADMIN gets admin_web_search descriptor with correct RBAC", () => {
    const descriptor = createAdminWebSearchTool();
    expect(descriptor.name).toBe("admin_web_search");
    expect(descriptor.roles).toEqual(["ADMIN"]);
    expect(descriptor.category).toBe("content");
    expect(descriptor.schema.input_schema.required).toEqual(["query"]);
  });

  it("ADMIN gets admin_prioritize_leads descriptor with correct RBAC", () => {
    const mockLoader: Parameters<typeof createAdminPrioritizeLeadsTool>[0] = async () => createLeadQueuePayload();
    const descriptor = createAdminPrioritizeLeadsTool(mockLoader);
    expect(descriptor.name).toBe("admin_prioritize_leads");
    expect(descriptor.roles).toEqual(["ADMIN"]);
    expect(descriptor.category).toBe("system");
  });

  it("ADMIN gets admin_prioritize_offer descriptor with correct RBAC", () => {
    const funnelLoader: Parameters<typeof createAdminPrioritizeOfferTool>[0] = async () => createFunnelPayload();
    const anonymousLoader: Parameters<typeof createAdminPrioritizeOfferTool>[1] = async () => createAnonymousPayload();
    const leadLoader: Parameters<typeof createAdminPrioritizeOfferTool>[2] = async () => createLeadQueuePayload();
    const descriptor = createAdminPrioritizeOfferTool(
      funnelLoader,
      anonymousLoader,
      leadLoader,
    );
    expect(descriptor.name).toBe("admin_prioritize_offer");
    expect(descriptor.roles).toEqual(["ADMIN"]);
    expect(descriptor.category).toBe("system");
  });

  it("ADMIN gets admin_triage_routing_risk descriptor with correct RBAC", () => {
    const mockLoader: Parameters<typeof createAdminTriageRoutingRiskTool>[0] = async () => createRoutingPayload();
    const descriptor = createAdminTriageRoutingRiskTool(mockLoader);
    expect(descriptor.name).toBe("admin_triage_routing_risk");
    expect(descriptor.roles).toEqual(["ADMIN"]);
    expect(descriptor.category).toBe("system");
  });
});
