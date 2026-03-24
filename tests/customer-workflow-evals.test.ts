import { beforeEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";

import { ConsultationRequestDataMapper } from "@/adapters/ConsultationRequestDataMapper";
import { ConversationDataMapper } from "@/adapters/ConversationDataMapper";
import { ConversationEventDataMapper } from "@/adapters/ConversationEventDataMapper";
import { DealRecordDataMapper } from "@/adapters/DealRecordDataMapper";
import { LeadRecordDataMapper } from "@/adapters/LeadRecordDataMapper";
import { TrainingPathRecordDataMapper } from "@/adapters/TrainingPathRecordDataMapper";
import { ConversationEventRecorder } from "@/core/use-cases/ConversationEventRecorder";
import { CreateDealFromWorkflowInteractor } from "@/core/use-cases/CreateDealFromWorkflowInteractor";
import { CreateTrainingPathFromWorkflowInteractor } from "@/core/use-cases/CreateTrainingPathFromWorkflowInteractor";
import type { User } from "@/core/entities/user";
import {
  loadOperatorAnonymousOpportunities,
  loadOperatorConsultationRequests,
  loadOperatorCustomerWorkflowContinuity,
  loadOperatorDealQueue,
  loadOperatorFunnelRecommendations,
  loadOperatorLeadQueue,
  loadOperatorTrainingPathQueue,
} from "@/lib/operator/operator-signal-loaders";
import { ensureSchema } from "@/lib/db/schema";

import { evaluateCustomerWorkflowScenario } from "./helpers/customerWorkflowEvalHarness";

const { getDbMock, conversationAnalyticsMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  conversationAnalyticsMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getDb: getDbMock,
}));

vi.mock("@mcp/analytics-tool", () => ({
  conversationAnalytics: conversationAnalyticsMock,
}));

let activeDb: Database.Database;

function freshDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  ensureSchema(db);
  return db;
}

function seedUser(db: Database.Database, id: string) {
  db.prepare(`INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`).run(id, `${id}@example.com`, id);
}

async function seedConversation(options: {
  db: Database.Database;
  id: string;
  userId: string;
  title: string;
  lane: "organization" | "individual" | "development" | "uncertain";
}) {
  const repo = new ConversationDataMapper(options.db);
  await repo.create({
    id: options.id,
    userId: options.userId,
    title: options.title,
    sessionSource: options.userId.startsWith("anon_") ? "anonymous_cookie" : "authenticated",
  });
  await repo.updateRoutingSnapshot(options.id, {
    lane: options.lane,
    confidence: 0.86,
    recommendedNextStep: "Continue founder follow-up.",
    detectedNeedSummary: options.title,
    lastAnalyzedAt: "2026-03-19T12:00:00.000Z",
  });
  options.db.prepare(
    `UPDATE conversations SET message_count = 6, updated_at = '2026-03-19T12:00:00.000Z' WHERE id = ?`,
  ).run(options.id);
}

async function createQualifiedLead(options: {
  db: Database.Database;
  conversationId: string;
  lane: "development" | "individual";
  name: string;
  email: string;
  organization: string | null;
  roleOrTitle: string | null;
  trainingGoal: string | null;
  problemSummary: string;
  recommendedNextAction: string;
  qualification: {
    technicalEnvironment?: string | null;
    budgetSignal?: "confirmed" | "likely" | "unclear" | "none" | null;
    trainingFit?: "beginner" | "intermediate" | "advanced" | "career_transition" | "unknown" | null;
  };
}) {
  const leadRepo = new LeadRecordDataMapper(options.db);
  const lead = await leadRepo.submitCapture({
    conversationId: options.conversationId,
    lane: options.lane,
    name: options.name,
    email: options.email,
    organization: options.organization,
    roleOrTitle: options.roleOrTitle,
    trainingGoal: options.trainingGoal,
    problemSummary: options.problemSummary,
    recommendedNextAction: options.recommendedNextAction,
  });

  await leadRepo.updateQualification(lead.id, {
    technicalEnvironment: options.qualification.technicalEnvironment,
    budgetSignal: options.qualification.budgetSignal,
    trainingFit: options.qualification.trainingFit,
  });

  const qualified = await leadRepo.updateTriageState(lead.id, "qualified", {
    founderNote: "Founder reviewed and approved.",
  });

  return qualified!;
}

async function createReviewedConsultationRequest(options: {
  db: Database.Database;
  conversationId: string;
  userId: string;
  lane: "organization" | "individual";
  requestSummary: string;
  founderNote?: string | null;
}) {
  const repo = new ConsultationRequestDataMapper(options.db);
  const created = await repo.create({
    conversationId: options.conversationId,
    userId: options.userId,
    lane: options.lane,
    requestSummary: options.requestSummary,
  });

  return repo.updateStatus(created.id, "reviewed", {
    founderNote: options.founderNote ?? "Reviewed by founder.",
  });
}

function listEventTypes(db: Database.Database, conversationId: string): string[] {
  return (db.prepare(
    `SELECT event_type FROM conversation_events WHERE conversation_id = ? ORDER BY created_at ASC`,
  ).all(conversationId) as Array<{ event_type: string }>).map((row) => row.event_type);
}

describe("customer workflow eval harness", () => {
  beforeEach(() => {
    activeDb = freshDb();
    getDbMock.mockImplementation(() => activeDb);
    conversationAnalyticsMock.mockImplementation(async (_deps, args: { metric: string }) => {
      if (args.metric === "overview") {
        return { uncertain_conversations: 1 };
      }

      if (args.metric === "funnel") {
        return {
          stages: [
            { name: "anonymous_sessions", count: 10, drop_off_rate: 0 },
            { name: "first_message", count: 8, drop_off_rate: 0.2 },
            { name: "five_plus_messages", count: 4, drop_off_rate: 0.5 },
            { name: "registration", count: 1, drop_off_rate: 0.75 },
          ],
        };
      }

      if (args.metric === "drop_off") {
        return {
          anonymous: [
            {
              conversation_id: "conv_anon_1",
              title: "Anonymous opportunity",
              inactive_hours: 72,
              last_message_preview: "Need help with approvals",
              tools_before_drop_off: [],
            },
          ],
        };
      }

      throw new Error(`Unexpected analytics metric: ${args.metric}`);
    });
  });

  it("passes the organization buyer workflow eval scenario", async () => {
    seedUser(activeDb, "usr_org");
    await seedConversation({
      db: activeDb,
      id: "conv_org_1",
      userId: "usr_org",
      title: "Organization buyer wants workflow redesign",
      lane: "organization",
    });

    const consultationRequest = await createReviewedConsultationRequest({
      db: activeDb,
      conversationId: "conv_org_1",
      userId: "usr_org",
      lane: "organization",
      requestSummary: "Need help redesigning our approvals workflow.",
      founderNote: "Strong advisory fit.",
    });

    const dealInteractor = new CreateDealFromWorkflowInteractor(
      new DealRecordDataMapper(activeDb),
      new ConsultationRequestDataMapper(activeDb),
      new LeadRecordDataMapper(activeDb),
      new ConversationDataMapper(activeDb),
      new ConversationEventRecorder(new ConversationEventDataMapper(activeDb)),
    );
    const deal = await dealInteractor.createFromConsultationRequest("admin_1", consultationRequest!.id);

    const report = evaluateCustomerWorkflowScenario({
      scenario: "organization-buyer",
      checks: [
        {
          id: "consultation-reviewed",
          label: "consultation request is founder-reviewed before conversion",
          passed: consultationRequest?.status === "reviewed",
        },
        {
          id: "deal-created",
          label: "organization workflow creates a draft deal",
          passed: deal.lane === "organization" && deal.status === "draft",
        },
        {
          id: "deal-event-recorded",
          label: "deal creation records a workflow event",
          passed: listEventTypes(activeDb, "conv_org_1").includes("deal_created"),
        },
      ],
    });

    expect(report.passed, JSON.stringify(report.checks, null, 2)).toBe(true);
  });

  it("passes the individual learner workflow eval scenario", async () => {
    seedUser(activeDb, "usr_individual");
    await seedConversation({
      db: activeDb,
      id: "conv_ind_1",
      userId: "usr_individual",
      title: "Individual learner wants a serious operator path",
      lane: "individual",
    });

    const lead = await createQualifiedLead({
      db: activeDb,
      conversationId: "conv_ind_1",
      lane: "individual",
      name: "Avery Stone",
      email: "avery@example.com",
      organization: null,
      roleOrTitle: "Product designer",
      trainingGoal: "Transition into AI operator work",
      problemSummary: "Needs a serious training path into operator work.",
      recommendedNextAction: "Recommend an apprenticeship screening conversation.",
      qualification: {
        trainingFit: "career_transition",
      },
    });

    const trainingInteractor = new CreateTrainingPathFromWorkflowInteractor(
      new TrainingPathRecordDataMapper(activeDb),
      new ConsultationRequestDataMapper(activeDb),
      new LeadRecordDataMapper(activeDb),
      new ConversationDataMapper(activeDb),
      new ConversationEventRecorder(new ConversationEventDataMapper(activeDb)),
    );
    const trainingPath = await trainingInteractor.createFromQualifiedLead("admin_1", lead.id);

    const report = evaluateCustomerWorkflowScenario({
      scenario: "individual-learner",
      checks: [
        {
          id: "lead-qualified",
          label: "individual lead is qualified before conversion",
          passed: lead.triageState === "qualified",
        },
        {
          id: "training-path-created",
          label: "individual workflow creates a draft training-path record",
          passed: trainingPath.lane === "individual" && trainingPath.status === "draft",
        },
        {
          id: "recommendation-derived",
          label: "training recommendation is concrete enough for founder follow-up",
          passed: trainingPath.recommendedPath === "apprenticeship_screening",
        },
        {
          id: "training-event-recorded",
          label: "training-path recommendation records a workflow event",
          passed: listEventTypes(activeDb, "conv_ind_1").includes("training_path_recommended"),
        },
      ],
    });

    expect(report.passed, JSON.stringify(report.checks, null, 2)).toBe(true);
  });

  it("passes the development prospect workflow eval scenario", async () => {
    seedUser(activeDb, "usr_dev");
    await seedConversation({
      db: activeDb,
      id: "conv_dev_1",
      userId: "usr_dev",
      title: "Development prospect wants build support",
      lane: "development",
    });

    const lead = await createQualifiedLead({
      db: activeDb,
      conversationId: "conv_dev_1",
      lane: "development",
      name: "Alex Rivera",
      email: "alex@example.com",
      organization: "Northwind Labs",
      roleOrTitle: "COO",
      trainingGoal: null,
      problemSummary: "Need a delivery partner to automate approvals.",
      recommendedNextAction: "Prepare a technical scoping call.",
      qualification: {
        technicalEnvironment: "Legacy approval workflow in Airtable",
        budgetSignal: "likely",
      },
    });

    const dealInteractor = new CreateDealFromWorkflowInteractor(
      new DealRecordDataMapper(activeDb),
      new ConsultationRequestDataMapper(activeDb),
      new LeadRecordDataMapper(activeDb),
      new ConversationDataMapper(activeDb),
      new ConversationEventRecorder(new ConversationEventDataMapper(activeDb)),
    );
    const deal = await dealInteractor.createFromQualifiedLead("admin_1", lead.id);

    const report = evaluateCustomerWorkflowScenario({
      scenario: "development-prospect",
      checks: [
        {
          id: "lead-qualified",
          label: "development lead is qualified before conversion",
          passed: lead.triageState === "qualified",
        },
        {
          id: "deal-created",
          label: "development workflow creates a draft deal",
          passed: deal.lane === "development" && deal.status === "draft",
        },
        {
          id: "delivery-service-type",
          label: "development workflow preserves delivery-oriented scoping",
          passed: deal.recommendedServiceType === "delivery",
        },
      ],
    });

    expect(report.passed, JSON.stringify(report.checks, null, 2)).toBe(true);
  });

  it("passes the customer continuity workflow eval scenario", async () => {
    seedUser(activeDb, "usr_customer");
    await seedConversation({
      db: activeDb,
      id: "conv_customer_1",
      userId: "usr_customer",
      title: "Customer wants workflow redesign help",
      lane: "organization",
    });

    const consultationRequest = await createReviewedConsultationRequest({
      db: activeDb,
      conversationId: "conv_customer_1",
      userId: "usr_customer",
      lane: "organization",
      requestSummary: "Need help redesigning our approvals workflow.",
      founderNote: "Founder reviewed and wants to issue a scoped recommendation.",
    });

    const dealRepo = new DealRecordDataMapper(activeDb);
    const dealInteractor = new CreateDealFromWorkflowInteractor(
      dealRepo,
      new ConsultationRequestDataMapper(activeDb),
      new LeadRecordDataMapper(activeDb),
      new ConversationDataMapper(activeDb),
      new ConversationEventRecorder(new ConversationEventDataMapper(activeDb)),
    );
    const deal = await dealInteractor.createFromConsultationRequest("admin_1", consultationRequest!.id);

    const beforeApproval = await loadOperatorCustomerWorkflowContinuity({ id: "usr_customer", roles: ["AUTHENTICATED"] });

    await dealRepo.updateStatus(deal.id, "estimate_ready", {
      founderNote: "Founder approved the customer-facing deal.",
    });

    const afterApproval = await loadOperatorCustomerWorkflowContinuity({ id: "usr_customer", roles: ["AUTHENTICATED"] });
    const approvedItem = afterApproval.data.items.find((item) => item.kind === "deal");

    const report = evaluateCustomerWorkflowScenario({
      scenario: "customer-continuity",
      checks: [
        {
          id: "hidden-until-approved",
          label: "customer continuity stays empty until founder approval",
          passed: beforeApproval.data.items.length === 0,
        },
        {
          id: "visible-after-approval",
          label: "customer continuity shows the approved next step after founder approval",
          passed: afterApproval.data.items.length === 1 && approvedItem?.status === "estimate_ready",
        },
        {
          id: "customer-safe-payload",
          label: "customer continuity payload excludes founder-only fields",
          passed: approvedItem !== undefined && !("founderNote" in approvedItem),
        },
      ],
    });

    expect(report.passed, JSON.stringify(report.checks, null, 2)).toBe(true);
  });

  it("passes the founder dashboard workflow eval scenario", async () => {
    seedUser(activeDb, "usr_admin");
    seedUser(activeDb, "usr_buyer");
    seedUser(activeDb, "usr_learner");
    seedUser(activeDb, "anon_1");

    await seedConversation({
      db: activeDb,
      id: "conv_lead_admin",
      userId: "usr_buyer",
      title: "Org lead",
      lane: "organization",
    });
    await seedConversation({
      db: activeDb,
      id: "conv_consult_admin",
      userId: "usr_buyer",
      title: "Consultation request",
      lane: "organization",
    });
    await seedConversation({
      db: activeDb,
      id: "conv_training_admin",
      userId: "usr_learner",
      title: "Training path",
      lane: "individual",
    });
    await seedConversation({
      db: activeDb,
      id: "conv_deal_admin",
      userId: "usr_buyer",
      title: "Deal record",
      lane: "organization",
    });
    await seedConversation({
      db: activeDb,
      id: "conv_anon_1",
      userId: "anon_1",
      title: "Anonymous opportunity",
      lane: "organization",
    });
    activeDb.prepare(
      `UPDATE conversations
       SET converted_from = NULL,
           message_count = 7,
           lane_confidence = 0.88,
           recommended_next_step = 'Offer a scoped discovery call.',
           detected_need_summary = 'Needs help redesigning an internal approvals workflow.',
           updated_at = '2026-03-19T12:00:00.000Z'
       WHERE id = 'conv_anon_1'`,
    ).run();

    const leadRepo = new LeadRecordDataMapper(activeDb);
    const submittedLead = await leadRepo.submitCapture({
      conversationId: "conv_lead_admin",
      lane: "organization",
      name: "Buyer One",
      email: "buyer@example.com",
      organization: "Northwind Labs",
      roleOrTitle: "COO",
      trainingGoal: null,
      problemSummary: "Needs workflow redesign.",
      recommendedNextAction: "Offer a founder intake call.",
    });

    const trainingLead = await createQualifiedLead({
      db: activeDb,
      conversationId: "conv_training_admin",
      lane: "individual",
      name: "Avery Stone",
      email: "avery@example.com",
      organization: null,
      roleOrTitle: "Product designer",
      trainingGoal: "Transition into AI operator work",
      problemSummary: "Needs a serious training path into operator work.",
      recommendedNextAction: "Recommend an apprenticeship screening conversation.",
      qualification: {
        trainingFit: "career_transition",
      },
    });

    const consultationRepo = new ConsultationRequestDataMapper(activeDb);
    await consultationRepo.create({
      conversationId: "conv_consult_admin",
      userId: "usr_buyer",
      lane: "organization",
      requestSummary: "Need to scope a workflow redesign.",
    });

    const trainingPathRepo = new TrainingPathRecordDataMapper(activeDb);
    await trainingPathRepo.create({
      conversationId: "conv_training_admin",
      leadRecordId: trainingLead.id,
      consultationRequestId: null,
      userId: "usr_learner",
      currentRoleOrBackground: "Product designer",
      technicalDepth: "career_transition",
      primaryGoal: "Transition into AI operator work",
      preferredFormat: null,
      apprenticeshipInterest: "maybe",
      recommendedPath: "apprenticeship_screening",
      fitRationale: "Strong career transition signal.",
      customerSummary: "Recommend a screening conversation.",
      status: "draft",
      nextAction: "Review fit and prepare the apprenticeship screening follow-up.",
      founderNote: null,
    });

    const dealRepo = new DealRecordDataMapper(activeDb);
    await dealRepo.create({
      conversationId: "conv_deal_admin",
      consultationRequestId: null,
      leadRecordId: submittedLead.id,
      userId: "usr_buyer",
      lane: "organization",
      title: "Workflow redesign advisory",
      organizationName: "Northwind Labs",
      problemSummary: "Need help redesigning approvals.",
      proposedScope: "",
      recommendedServiceType: "advisory",
      estimatedHours: null,
      estimatedTrainingDays: null,
      estimatedPrice: 6000,
      status: "draft",
      nextAction: "Prepare founder scope review.",
      assumptions: null,
      openQuestions: null,
      founderNote: null,
      customerResponseNote: null,
    });

    const adminUser: Pick<User, "id" | "roles"> = { id: "usr_admin", roles: ["ADMIN"] };
    const [leadQueue, consultationQueue, trainingPathQueue, dealQueue, anonymousQueue, funnelRecommendations] = await Promise.all([
      loadOperatorLeadQueue(adminUser),
      loadOperatorConsultationRequests(adminUser),
      loadOperatorTrainingPathQueue(adminUser),
      loadOperatorDealQueue(adminUser),
      loadOperatorAnonymousOpportunities(adminUser),
      loadOperatorFunnelRecommendations(adminUser),
    ]);

    const report = evaluateCustomerWorkflowScenario({
      scenario: "founder-operator-review",
      checks: [
        {
          id: "now",
          label: "NOW signals include active lead or funnel work",
          passed: leadQueue.data.summary.submittedLeadCount > 0 || funnelRecommendations.data.summary.recommendationCount > 0,
        },
        {
          id: "next",
          label: "NEXT signals include consultation, training-path, or deal follow-up",
          passed:
            consultationQueue.data.requests.length > 0
            && trainingPathQueue.data.trainingPaths.length > 0
            && dealQueue.data.deals.length > 0,
        },
        {
          id: "wait",
          label: "WAIT signals still preserve anonymous opportunities without dropping them",
          passed: anonymousQueue.data.opportunities.length > 0,
        },
      ],
    });

    expect(report.passed, JSON.stringify(report.checks, null, 2)).toBe(true);
  });
});