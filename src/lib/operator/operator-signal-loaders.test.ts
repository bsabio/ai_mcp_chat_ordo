import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConversationInteractorMock } from "../../../tests/helpers/conversation-interactor-fixture";

import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";

const {
  getActiveForUserMock,
  listMock,
  conversationAnalyticsMock,
  getDbMock,
  prepareMock,
  leadQueueSummaryGetMock,
  leadQueueRowsAllMock,
  anonymousOpportunityRowsAllMock,
  recurringThemeRowsAllMock,
  consultationRequestRowsAllMock,
  customerContinuityDealRowsAllMock,
  customerContinuityTrainingPathRowsAllMock,
  trainingPathQueueRowsAllMock,
  dealQueueRowsAllMock,
  getDiagnosticsReportMock,
  getHealthSweepReportMock,
  getEnvValidationReportMock,
  getReleaseManifestReportMock,
} = vi.hoisted(() => ({
  getActiveForUserMock: vi.fn(),
  listMock: vi.fn(),
  conversationAnalyticsMock: vi.fn(),
  prepareMock: vi.fn(),
  leadQueueSummaryGetMock: vi.fn(),
  leadQueueRowsAllMock: vi.fn(),
  anonymousOpportunityRowsAllMock: vi.fn(),
  recurringThemeRowsAllMock: vi.fn(),
  consultationRequestRowsAllMock: vi.fn(),
  customerContinuityDealRowsAllMock: vi.fn(),
  customerContinuityTrainingPathRowsAllMock: vi.fn(),
  trainingPathQueueRowsAllMock: vi.fn(),
  dealQueueRowsAllMock: vi.fn(),
  getDiagnosticsReportMock: vi.fn(),
  getHealthSweepReportMock: vi.fn(),
  getEnvValidationReportMock: vi.fn(),
  getReleaseManifestReportMock: vi.fn(),
  getDbMock: vi.fn(() => ({ mocked: true, prepare: prepareMock })),
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  getConversationInteractor: () =>
    createConversationInteractorMock({
      getActiveForUser: getActiveForUserMock,
      list: listMock,
    }),
}));

vi.mock("@/lib/db", () => ({
  getDb: getDbMock,
}));

vi.mock("@mcp/analytics-tool", () => ({
  conversationAnalytics: conversationAnalyticsMock,
}));

vi.mock("@/lib/admin/processes", () => ({
  getDiagnosticsReport: getDiagnosticsReportMock,
  getHealthSweepReport: getHealthSweepReportMock,
  getEnvValidationReport: getEnvValidationReportMock,
  getReleaseManifestReport: getReleaseManifestReportMock,
}));

import {
  loadAnonymousOpportunitiesBlock,
  loadConsultationRequestQueueBlock,
  loadConversationWorkspaceBlock,
  loadCustomerWorkflowContinuityBlock,
  loadDealQueueBlock,
  loadFunnelRecommendationsBlock,
  loadLeadQueueBlock,
  loadRecentConversationsBlock,
  loadRecurringPainThemesBlock,
  loadRoutingReviewBlock,
  loadSystemHealthBlock,
  loadTrainingPathQueueBlock,
} from "./operator-signal-loaders";

describe("operator-signal-loaders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prepareMock.mockImplementation((sql: string) => {
      if (sql.includes("dr.problem_summary")) {
        return { all: customerContinuityDealRowsAllMock };
      }

      if (sql.includes("tpr.customer_summary")) {
        return { all: customerContinuityTrainingPathRowsAllMock };
      }

      if (sql.includes("COUNT(*) AS submitted_lead_count")) {
        return { get: leadQueueSummaryGetMock };
      }

      if (sql.includes("FROM lead_records lr")) {
        return { all: leadQueueRowsAllMock };
      }

      if (sql.includes("user_id LIKE 'anon_%'")) {
        return { all: anonymousOpportunityRowsAllMock };
      }

      if (sql.includes("AS summary_text")) {
        return { all: recurringThemeRowsAllMock };
      }

      if (sql.includes("FROM consultation_requests cr")) {
        return { all: consultationRequestRowsAllMock };
      }

      if (sql.includes("FROM training_path_records tpr")) {
        return { all: trainingPathQueueRowsAllMock };
      }

      if (sql.includes("FROM deal_records dr")) {
        return { all: dealQueueRowsAllMock };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    });
    leadQueueSummaryGetMock.mockReturnValue({
      submitted_lead_count: 2,
      new_lead_count: 1,
      contacted_lead_count: 1,
      qualified_lead_count: 0,
      deferred_lead_count: 0,
    });
    leadQueueRowsAllMock.mockReturnValue([
      {
        id: "lead_1",
        conversation_id: "conv_lead_1",
        conversation_title: "Proposal workflow advisory",
        lane: "organization",
        name: "Alex Rivera",
        email: "alex@example.com",
        organization: "Northwind Labs",
        role_or_title: "COO",
        training_goal: null,
        problem_summary: "Needs help reducing proposal turnaround time.",
        recommended_next_action: "Offer a founder intake call.",
        capture_status: "submitted",
        triage_state: "new",
        founder_note: "Founder wants to confirm procurement timing.",
        last_contacted_at: "2026-03-18T11:15:00.000Z",
        submitted_at: "2026-03-18T10:30:00.000Z",
        updated_at: "2026-03-18T10:35:00.000Z",
        lane_confidence: 0.92,
        triaged_at: null,
      },
    ]);
    anonymousOpportunityRowsAllMock.mockReturnValue([
      {
        id: "conv_anon_1",
        title: "Anonymous ops redesign",
        lane: "organization",
        lane_confidence: 0.88,
        message_count: 7,
        detected_need_summary: "Needs help redesigning an internal approvals workflow.",
        recommended_next_step: "Offer a scoped discovery call.",
        updated_at: "2026-03-18T11:00:00.000Z",
        session_source: "anonymous_cookie",
      },
      {
        id: "conv_anon_dev_1",
        title: "Anonymous automation build",
        lane: "development",
        lane_confidence: 0.76,
        message_count: 5,
        detected_need_summary: "Needs a delivery partner to implement an internal automation workflow.",
        recommended_next_step: "Offer a technical scoping call.",
        updated_at: "2026-03-18T10:45:00.000Z",
        session_source: "anonymous_cookie",
      },
    ]);
    consultationRequestRowsAllMock.mockReturnValue([]);
    customerContinuityDealRowsAllMock.mockReturnValue([
      {
        id: "deal_visible_1",
        conversation_id: "conv_visible_deal_1",
        title: "Approved workflow redesign",
        problem_summary: "Founder-approved deal follow-up is ready.",
        organization_name: "Northwind Labs",
        status: "estimate_ready",
        next_action: "Review the approved deal and respond when ready.",
      },
      {
        id: "deal_hidden_1",
        conversation_id: "conv_hidden_deal_1",
        title: "Draft workflow redesign",
        problem_summary: "Still founder-only.",
        organization_name: "Northwind Labs",
        status: "draft",
        next_action: "Founder still needs to review.",
      },
    ]);
    customerContinuityTrainingPathRowsAllMock.mockReturnValue([
      {
        id: "training_visible_1",
        conversation_id: "conv_visible_training_1",
        current_role_or_background: "Product designer",
        primary_goal: "Transition into AI operator work",
        recommended_path: "apprenticeship_screening",
        customer_summary: "Founder recommends an apprenticeship screening conversation.",
        status: "recommended",
        next_action: "Review the approved recommendation and continue in conversation if you need clarification.",
      },
      {
        id: "training_hidden_1",
        conversation_id: "conv_hidden_training_1",
        current_role_or_background: "Operations manager",
        primary_goal: "Needs founder review",
        recommended_path: "mentorship_sprint",
        customer_summary: "Not visible yet.",
        status: "draft",
        next_action: "Founder still needs to approve.",
      },
    ]);
    trainingPathQueueRowsAllMock.mockReturnValue([
      {
        id: "training_1",
        conversation_id: "conv_training_1",
        current_role_or_background: "Product designer",
        primary_goal: "Transition into AI operator work",
        technical_depth: "career_transition",
        recommended_path: "apprenticeship_screening",
        apprenticeship_interest: "maybe",
        status: "draft",
        next_action: "Review fit and prepare the apprenticeship screening follow-up.",
        updated_at: "2026-03-18T11:25:00.000Z",
      },
      {
        id: "training_2",
        conversation_id: "conv_training_2",
        current_role_or_background: "Operations manager",
        primary_goal: "Improve applied agent practice",
        technical_depth: "intermediate",
        recommended_path: "mentorship_sprint",
        apprenticeship_interest: "no",
        status: "recommended",
        next_action: "Send mentorship recommendation.",
        updated_at: "2026-03-18T10:15:00.000Z",
      },
    ]);
    dealQueueRowsAllMock.mockReturnValue([
      {
        id: "deal_1",
        conversation_id: "conv_deal_1",
        title: "Workflow redesign advisory",
        lane: "organization",
        organization_name: "Northwind Labs",
        status: "draft",
        estimated_price: 6000,
        next_action: "Prepare founder scope review.",
        customer_response_note: null,
        updated_at: "2026-03-18T11:20:00.000Z",
      },
      {
        id: "deal_2",
        conversation_id: "conv_deal_2",
        title: "Automation delivery engagement",
        lane: "development",
        organization_name: "Fabrikam",
        status: "agreed",
        estimated_price: 18000,
        next_action: "Confirm kickoff date.",
        customer_response_note: "Approved pending procurement.",
        updated_at: "2026-03-18T10:20:00.000Z",
      },
    ]);
    recurringThemeRowsAllMock.mockReturnValue([
      {
        conversation_id: "conv_theme_1",
        conversation_title: "Proposal friction",
        updated_at: "2026-03-18T11:10:00.000Z",
        summary_text: "Proposal turnaround is slowing down approvals.",
      },
      {
        conversation_id: "conv_theme_2",
        conversation_title: "Approval delays",
        updated_at: "2026-03-18T11:09:00.000Z",
        summary_text: "Proposal turnaround is slowing down approvals.",
      },
    ]);
    conversationAnalyticsMock.mockImplementation(async (_deps, args: { metric: string }) => {
      if (args.metric === "routing_review") {
        return {
          summary: {
            recently_changed_count: 1,
            uncertain_count: 2,
            follow_up_ready_count: 1,
          },
          recently_changed: [
            {
              conversation_id: "conv_changed",
              title: "Routing updated",
              user_id: "usr_auth",
              from_lane: "uncertain",
              to_lane: "organization",
              lane_confidence: 0.84,
              recommended_next_step: "Offer discovery call",
              changed_at: "2026-03-18T10:00:00.000Z",
            },
          ],
          uncertain_conversations: [
            {
              conversation_id: "conv_uncertain",
              title: "Needs review",
              user_id: "usr_auth",
              status: "active",
              lane: "uncertain",
              lane_confidence: 0.41,
              recommended_next_step: null,
              detected_need_summary: "Mixed signals",
              lane_last_analyzed_at: "2026-03-18T09:58:00.000Z",
              updated_at: "2026-03-18T09:58:00.000Z",
            },
          ],
          follow_up_ready: [
            {
              conversation_id: "conv_ready",
              title: "Advisory candidate",
              user_id: "usr_auth",
              status: "active",
              lane: "organization",
              lane_confidence: 0.89,
              recommended_next_step: "Offer intake call",
              detected_need_summary: "Workflow redesign need",
              lane_last_analyzed_at: "2026-03-18T09:59:00.000Z",
              updated_at: "2026-03-18T09:59:00.000Z",
            },
          ],
        };
      }

      if (args.metric === "overview") {
        return {
          uncertain_conversations: 2,
        };
      }

      if (args.metric === "funnel") {
        return {
          stages: [
            { name: "anonymous_sessions", count: 10, drop_off_rate: 0 },
            { name: "first_message", count: 8, drop_off_rate: 0.2 },
            { name: "five_plus_messages", count: 4, drop_off_rate: 0.5 },
            { name: "registration", count: 1, drop_off_rate: 0.75 },
            { name: "continued_authenticated_usage", count: 1, drop_off_rate: 0 },
          ],
        };
      }

      if (args.metric === "drop_off") {
        return {
          anonymous: [
            {
              conversation_id: "conv_drop_1",
              title: "Anonymous drop-off",
              inactive_hours: 72,
              last_message_preview: "We need help with proposal operations",
              tools_before_drop_off: ["web_search"],
            },
          ],
        };
      }

      throw new Error(`Unexpected analytics metric in test: ${args.metric}`);
    });
    getDiagnosticsReportMock.mockReturnValue({
      status: "ok",
      generatedAt: "2026-03-18T12:00:00.000Z",
      appName: "studio-ordo",
      appVersion: "0.1.0",
      nodeVersion: "v25.1.0",
      nodeEnv: "test",
      anthropicModel: "claude-haiku-4-5",
      releaseManifestPresent: true,
      metrics: {
        mode: "externalized",
        details: "Route metrics are emitted as structured logs with event=metric.route.",
      },
    });
    getHealthSweepReportMock.mockReturnValue({
      status: "ok",
      generatedAt: "2026-03-18T12:00:00.000Z",
      liveness: {
        status: "ok",
        checks: {
          config: "ok",
          model: "ok",
        },
      },
      readiness: {
        status: "ok",
        checks: {
          config: "ok",
          model: "ok",
        },
      },
    });
    getEnvValidationReportMock.mockReturnValue({
      status: "ok",
      message: "Environment validation passed.",
    });
    getReleaseManifestReportMock.mockReturnValue({
      present: true,
      manifest: {
        appName: "studio-ordo",
        version: "0.1.0",
        gitSha: "477b3a7",
        gitBranch: "main",
        builtAt: "2026-03-02T22:13:20.749Z",
        nodeVersion: "v25.1.0",
      },
    });
  });

  it("loads the active conversation workspace block for a signed-in user", async () => {
    getActiveForUserMock.mockResolvedValue({
      conversation: {
        id: "conv_1",
        userId: "usr_auth",
        title: "Active thread",
        status: "active",
        createdAt: "2026-03-18T08:00:00.000Z",
        updatedAt: "2026-03-18T09:00:00.000Z",
        convertedFrom: null,
        messageCount: 7,
        firstMessageAt: null,
        lastToolUsed: null,
        sessionSource: "authenticated",
        promptVersion: null,
        routingSnapshot: createConversationRoutingSnapshot({ lane: "organization", confidence: 0.81 }),
      },
      messages: [],
    });

    const payload = await loadConversationWorkspaceBlock({ id: "usr_auth", roles: ["AUTHENTICATED"] });

    expect(getActiveForUserMock).toHaveBeenCalledWith("usr_auth");
    expect(payload.blockId).toBe("conversation_workspace");
    expect(payload.state).toBe("ready");
    expect(payload.data.conversation?.id).toBe("conv_1");
    expect(payload.data.resumeHref).toBe("/");
  });

  it("returns an empty workspace block when there is no active conversation", async () => {
    getActiveForUserMock.mockResolvedValue(null);

    const payload = await loadConversationWorkspaceBlock({ id: "usr_auth", roles: ["AUTHENTICATED"] });

    expect(payload.state).toBe("empty");
    expect(payload.data.conversation).toBeNull();
  });

  it("loads recent conversations for a signed-in user", async () => {
    listMock.mockResolvedValue([
      {
        id: "conv_a",
        title: "Discovery call prep",
        updatedAt: "2026-03-18T10:00:00.000Z",
        messageCount: 12,
      },
    ]);

    const payload = await loadRecentConversationsBlock({ id: "usr_auth", roles: ["STAFF"] });

    expect(listMock).toHaveBeenCalledWith("usr_auth");
    expect(payload.blockId).toBe("recent_conversations");
    expect(payload.state).toBe("ready");
    expect(payload.data.conversations[0]).toMatchObject({
      id: "conv_a",
      href: "/?conversationId=conv_a",
    });
  });

  it("returns an empty recent-conversations block when there is no history", async () => {
    listMock.mockResolvedValue([]);

    const payload = await loadRecentConversationsBlock({ id: "usr_auth", roles: ["AUTHENTICATED"] });

    expect(payload.state).toBe("empty");
    expect(payload.data.conversations).toEqual([]);
  });

  it("rejects anonymous users", async () => {
    await expect(
      loadConversationWorkspaceBlock({ id: "usr_anonymous", roles: ["ANONYMOUS"] }),
    ).rejects.toThrow("Operator loaders require a signed-in user.");
  });

  it("loads routing review queues for admins with reopen links", async () => {
    const payload = await loadRoutingReviewBlock({ id: "usr_admin", roles: ["ADMIN"] });

    expect(getDbMock).toHaveBeenCalled();
    expect(conversationAnalyticsMock).toHaveBeenCalledWith(
      { db: expect.objectContaining({ mocked: true }) },
      { metric: "routing_review", time_range: "30d", limit: 5 },
    );
    expect(payload.blockId).toBe("routing_review");
    expect(payload.state).toBe("ready");
    expect(payload.data.recentlyChanged[0]).toMatchObject({
      conversationId: "conv_changed",
      href: "/?conversationId=conv_changed",
    });
    expect(payload.data.uncertainConversations[0]).toMatchObject({
      conversationId: "conv_uncertain",
      href: "/?conversationId=conv_uncertain",
    });
  });

  it("loads submitted leads for admins", async () => {
    const payload = await loadLeadQueueBlock({ id: "usr_admin", roles: ["ADMIN"] });

    expect(payload.blockId).toBe("lead_queue");
    expect(payload.state).toBe("ready");
    expect(payload.data.summary).toEqual({
      submittedLeadCount: 2,
      newLeadCount: 1,
      contactedLeadCount: 1,
      qualifiedLeadCount: 0,
      deferredLeadCount: 0,
    });
    expect(payload.data.leads[0]).toMatchObject({
      id: "lead_1",
      conversationId: "conv_lead_1",
      href: "/?conversationId=conv_lead_1",
      name: "Alex Rivera",
      priorityLabel: "hot",
    });
  });

  it("returns an empty lead queue when no submitted leads exist", async () => {
    leadQueueSummaryGetMock.mockReturnValue({
      submitted_lead_count: 0,
      new_lead_count: 0,
      contacted_lead_count: 0,
      qualified_lead_count: 0,
      deferred_lead_count: 0,
    });
    leadQueueRowsAllMock.mockReturnValue([]);

    const payload = await loadLeadQueueBlock({ id: "usr_admin", roles: ["ADMIN"] });

    expect(payload.state).toBe("empty");
    expect(payload.data.leads).toEqual([]);
    expect(payload.data.emptyReason).toMatch(/no submitted contact captures/i);
  });

  it("loads a truthful system health block for admins", async () => {
    const payload = await loadSystemHealthBlock({ id: "usr_admin", roles: ["ADMIN"] });

    expect(payload.blockId).toBe("system_health");
    expect(payload.state).toBe("ready");
    expect(payload.data.summary.overallStatus).toBe("ok");
    expect(payload.data.release).toMatchObject({
      appName: "studio-ordo",
      version: "0.1.0",
      gitSha: "477b3a7",
    });
  });

  it("loads anonymous opportunities for admins", async () => {
    const payload = await loadAnonymousOpportunitiesBlock({ id: "usr_admin", roles: ["ADMIN"] });

    expect(payload.blockId).toBe("anonymous_opportunities");
    expect(payload.state).toBe("ready");
    expect(payload.data.summary).toEqual({
      opportunityCount: 2,
      organizationCount: 1,
      individualCount: 0,
      developmentCount: 1,
    });
    expect(payload.data.opportunities[0]).toMatchObject({
      conversationId: "conv_anon_1",
      href: "/?conversationId=conv_anon_1",
      opportunityScore: expect.any(Number),
    });
    expect(payload.data.opportunities[1]).toMatchObject({
      conversationId: "conv_anon_dev_1",
      lane: "development",
    });
  });

  it("assigns a friction reason mentioning development for a development-lane opportunity", async () => {
    anonymousOpportunityRowsAllMock.mockReturnValue([
      {
        id: "conv_dev_low",
        title: "Dev conversation",
        lane: "development",
        lane_confidence: 0.75,
        message_count: 4,
        detected_need_summary: "Needs automation.",
        recommended_next_step: "Offer scoping call.",
        updated_at: new Date().toISOString(),
        session_source: "anonymous_cookie",
      },
    ]);

    const payload = await loadAnonymousOpportunitiesBlock({ id: "usr_admin", roles: ["ADMIN"] });

    expect(payload.data.opportunities[0].likelyFrictionReason).toMatch(/development/i);
  });

  it("assigns a friction reason mentioning uncertain routing for an uncertain-lane opportunity", async () => {
    anonymousOpportunityRowsAllMock.mockReturnValue([
      {
        id: "conv_uncertain",
        title: "Uncertain conversation",
        lane: "uncertain",
        lane_confidence: 0.35,
        message_count: 4,
        detected_need_summary: null,
        recommended_next_step: null,
        updated_at: new Date().toISOString(),
        session_source: "anonymous_cookie",
      },
    ]);

    const payload = await loadAnonymousOpportunitiesBlock({ id: "usr_admin", roles: ["ADMIN"] });

    expect(payload.data.opportunities[0].likelyFrictionReason).toMatch(/uncertain/i);
  });

  it("returns the correct anonymous opportunity shape including likelyFrictionReason", async () => {
    const payload = await loadAnonymousOpportunitiesBlock({ id: "usr_admin", roles: ["ADMIN"] });

    for (const opportunity of payload.data.opportunities) {
      expect(opportunity).toEqual(
        expect.objectContaining({
          conversationId: expect.any(String),
          href: expect.any(String),
          title: expect.any(String),
          lane: expect.any(String),
          laneConfidence: expect.any(Number),
          messageCount: expect.any(Number),
          updatedAt: expect.any(String),
          sessionSource: expect.any(String),
          opportunityScore: expect.any(Number),
          likelyFrictionReason: expect.toSatisfy(
            (value: unknown) => value === null || typeof value === "string",
          ),
        }),
      );
    }
  });

  it("loads pending consultation requests for admins", async () => {
    consultationRequestRowsAllMock.mockReturnValue([
      {
        id: "cr_1",
        conversation_id: "conv_cr_1",
        conversation_title: "Advisory scoping",
        lane: "organization",
        status: "pending",
        request_summary: "Need to scope a workflow redesign.",
        founder_note: null,
        message_count: 8,
        created_at: "2026-03-18T14:00:00.000Z",
      },
      {
        id: "cr_2",
        conversation_id: "conv_cr_2",
        conversation_title: "Reviewed automation request",
        lane: "development",
        status: "reviewed",
        request_summary: "Need help reviewing implementation scope.",
        founder_note: "Looks promising.",
        message_count: 5,
        created_at: "2026-03-18T13:00:00.000Z",
      },
    ]);

    const payload = await loadConsultationRequestQueueBlock({ id: "usr_admin", roles: ["ADMIN"] });

    expect(payload.blockId).toBe("consultation_requests");
    expect(payload.state).toBe("ready");
    expect(payload.data.summary.pendingCount).toBe(1);
    expect(payload.data.summary.reviewedCount).toBe(1);
    expect(payload.data.requests[0]).toMatchObject({
      id: "cr_1",
      conversationId: "conv_cr_1",
      href: "/?conversationId=conv_cr_1",
      conversationTitle: "Advisory scoping",
      lane: "organization",
      status: "pending",
      requestSummary: "Need to scope a workflow redesign.",
    });
    expect(payload.data.requests[1]).toMatchObject({
      id: "cr_2",
      status: "reviewed",
      founderNote: "Looks promising.",
    });
  });

  it("returns an empty consultation request queue when no pending requests exist", async () => {
    consultationRequestRowsAllMock.mockReturnValue([]);

    const payload = await loadConsultationRequestQueueBlock({ id: "usr_admin", roles: ["ADMIN"] });

    expect(payload.state).toBe("empty");
    expect(payload.data.requests).toEqual([]);
    expect(payload.data.emptyReason).toMatch(/no pending or reviewed consultation requests/i);
  });

  it("loads founder deal queue data for admins", async () => {
    const payload = await loadDealQueueBlock({ id: "usr_admin", roles: ["ADMIN"] });

    expect(payload.blockId).toBe("deal_queue");
    expect(payload.state).toBe("ready");
    expect(payload.data.summary).toEqual({
      draftCount: 1,
      qualifiedCount: 0,
      agreedCount: 1,
      declinedCount: 0,
    });
    expect(payload.data.deals[0]).toMatchObject({
      id: "deal_1",
      conversationId: "conv_deal_1",
      href: "/?conversationId=conv_deal_1",
      estimatedPrice: 6000,
    });
  });

  it("loads approved customer continuity items for signed-in users", async () => {
    const payload = await loadCustomerWorkflowContinuityBlock({ id: "usr_auth", roles: ["AUTHENTICATED"] });

    expect(payload.blockId).toBe("customer_workflow_continuity");
    expect(payload.state).toBe("ready");
    expect(payload.data.summary).toEqual({
      nowCount: 2,
      nextCount: 0,
      approvedDealCount: 1,
      approvedTrainingPathCount: 1,
    });
    expect(payload.data.items).toEqual([
      expect.objectContaining({
        kind: "deal",
        id: "deal_visible_1",
        href: "/?conversationId=conv_visible_deal_1",
        detailHref: "/api/deals/deal_visible_1",
      }),
      expect.objectContaining({
        kind: "training_path",
        id: "training_visible_1",
        href: "/?conversationId=conv_visible_training_1",
        detailHref: "/api/training-paths/training_visible_1",
      }),
    ]);
  });

  it("returns an empty customer continuity block when no approved records exist", async () => {
    customerContinuityDealRowsAllMock.mockReturnValue([
      {
        id: "deal_hidden_1",
        conversation_id: "conv_hidden_deal_1",
        title: "Draft workflow redesign",
        problem_summary: "Still founder-only.",
        organization_name: "Northwind Labs",
        status: "draft",
        next_action: "Founder still needs to review.",
      },
    ]);
    customerContinuityTrainingPathRowsAllMock.mockReturnValue([
      {
        id: "training_hidden_1",
        conversation_id: "conv_hidden_training_1",
        current_role_or_background: "Operations manager",
        primary_goal: "Needs founder review",
        recommended_path: "mentorship_sprint",
        customer_summary: "Not visible yet.",
        status: "draft",
        next_action: "Founder still needs to approve.",
      },
    ]);

    const payload = await loadCustomerWorkflowContinuityBlock({ id: "usr_auth", roles: ["AUTHENTICATED"] });

    expect(payload.state).toBe("empty");
    expect(payload.data.items).toEqual([]);
    expect(payload.data.emptyReason).toMatch(/founder-reviewed next steps/i);
  });

  it("loads founder training-path queue data for admins", async () => {
    const payload = await loadTrainingPathQueueBlock({ id: "usr_admin", roles: ["ADMIN"] });

    expect(payload.blockId).toBe("training_path_queue");
    expect(payload.state).toBe("ready");
    expect(payload.data.summary).toEqual({
      draftCount: 1,
      recommendedCount: 1,
      apprenticeshipCandidateCount: 1,
      followUpNowCount: 1,
    });
    expect(payload.data.trainingPaths[0]).toMatchObject({
      id: "training_1",
      conversationId: "conv_training_1",
      href: "/?conversationId=conv_training_1",
      recommendedPath: "apprenticeship_screening",
    });
  });

  it("returns an empty training-path queue when no founder-managed records exist", async () => {
    trainingPathQueueRowsAllMock.mockReturnValue([]);

    const payload = await loadTrainingPathQueueBlock({ id: "usr_admin", roles: ["ADMIN"] });

    expect(payload.state).toBe("empty");
    expect(payload.data.trainingPaths).toEqual([]);
    expect(payload.data.emptyReason).toMatch(/no founder-managed training paths/i);
  });

  it("returns an empty deal queue when no founder-managed deals exist", async () => {
    dealQueueRowsAllMock.mockReturnValue([]);

    const payload = await loadDealQueueBlock({ id: "usr_admin", roles: ["ADMIN"] });

    expect(payload.state).toBe("empty");
    expect(payload.data.deals).toEqual([]);
    expect(payload.data.emptyReason).toMatch(/no founder-managed deals/i);
  });

  it("loads recurring pain themes for admins from repeated summaries", async () => {
    const payload = await loadRecurringPainThemesBlock({ id: "usr_admin", roles: ["ADMIN"] });

    expect(payload.blockId).toBe("recurring_pain_themes");
    expect(payload.state).toBe("ready");
    expect(payload.data.themes[0]).toMatchObject({
      occurrenceCount: 2,
    });
  });

  it("loads funnel recommendations for admins from current analytics signals", async () => {
    const payload = await loadFunnelRecommendationsBlock({ id: "usr_admin", roles: ["ADMIN"] });

    expect(payload.blockId).toBe("funnel_recommendations");
    expect(payload.state).toBe("ready");
    expect(payload.data.summary).toMatchObject({
      recommendationCount: 4,
      anonymousDropOffCount: 1,
      uncertainConversationCount: 2,
      newLeadCount: 1,
    });
    expect(payload.data.recommendations[0].title).toMatch(/anonymous conversations/i);
  });

  it("fails closed for non-admin operator loader requests", async () => {
    await expect(loadRoutingReviewBlock({ id: "usr_staff", roles: ["STAFF"] })).rejects.toThrow(
      "Admin operator loaders require an administrator.",
    );
    await expect(loadSystemHealthBlock({ id: "usr_staff", roles: ["STAFF"] })).rejects.toThrow(
      "Admin operator loaders require an administrator.",
    );
    await expect(loadAnonymousOpportunitiesBlock({ id: "usr_staff", roles: ["STAFF"] })).rejects.toThrow(
      "Admin operator loaders require an administrator.",
    );
    await expect(loadRecurringPainThemesBlock({ id: "usr_staff", roles: ["STAFF"] })).rejects.toThrow(
      "Admin operator loaders require an administrator.",
    );
    await expect(loadFunnelRecommendationsBlock({ id: "usr_staff", roles: ["STAFF"] })).rejects.toThrow(
      "Admin operator loaders require an administrator.",
    );
    await expect(loadConsultationRequestQueueBlock({ id: "usr_staff", roles: ["STAFF"] })).rejects.toThrow(
      "Admin operator loaders require an administrator.",
    );
    await expect(loadTrainingPathQueueBlock({ id: "usr_staff", roles: ["STAFF"] })).rejects.toThrow(
      "Admin operator loaders require an administrator.",
    );
    await expect(loadDealQueueBlock({ id: "usr_staff", roles: ["STAFF"] })).rejects.toThrow(
      "Admin operator loaders require an administrator.",
    );
  });
});