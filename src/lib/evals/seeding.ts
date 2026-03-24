import type { EvalScenario } from "./domain";
import { getEvalScenarioById } from "./scenarios";
import type {
  EvalWorkspace,
  EvalWorkspaceConversationEventSeed,
  EvalWorkspaceConsultationRequestSeed,
  EvalWorkspaceConversationSeed,
  EvalWorkspaceDealSeed,
  EvalWorkspaceLeadSeed,
  EvalWorkspaceTrainingPathSeed,
  EvalWorkspaceUserSeed,
} from "./workspace";

export interface DeterministicEvalToolFixture {
  id: string;
  toolId: string;
  args: Record<string, unknown>;
  expectedResult?: unknown;
}

export interface DeterministicEvalSeedPack {
  scenarioId: string;
  seedSetId: string;
  refs: {
    primaryConversationId?: string;
    anonymousUserId?: string;
    authenticatedUserId?: string;
    toolFixtureId?: string;
  };
  users: EvalWorkspaceUserSeed[];
  conversations: EvalWorkspaceConversationSeed[];
  conversationEvents: EvalWorkspaceConversationEventSeed[];
  leads: EvalWorkspaceLeadSeed[];
  consultationRequests: EvalWorkspaceConsultationRequestSeed[];
  deals: EvalWorkspaceDealSeed[];
  trainingPaths: EvalWorkspaceTrainingPathSeed[];
  toolFixtures: DeterministicEvalToolFixture[];
}

function buildAuthConversation(seed: {
  id: string;
  userId: string;
  title: string;
  lane: "organization" | "individual" | "development" | "uncertain";
  confidence: number;
  recommendedNextStep: string;
  detectedNeedSummary: string;
  messages: Array<{ id: string; role: "user" | "assistant" | "system"; content: string; createdAt: string }>;
}): EvalWorkspaceConversationSeed {
  return {
    id: seed.id,
    userId: seed.userId,
    title: seed.title,
    sessionSource: "authenticated",
    lane: seed.lane,
    confidence: seed.confidence,
    recommendedNextStep: seed.recommendedNextStep,
    detectedNeedSummary: seed.detectedNeedSummary,
    lastAnalyzedAt: "2026-03-20T09:00:00.000Z",
    createdAt: "2026-03-20T09:00:00.000Z",
    updatedAt: "2026-03-20T09:10:00.000Z",
    messages: seed.messages,
  };
}

export interface InflatedDeterministicEvalSeedPack {
  pack: DeterministicEvalSeedPack;
  refs: DeterministicEvalSeedPack["refs"];
  toolFixtures: Map<string, DeterministicEvalToolFixture>;
}

function assertDeterministicScenario(scenario: EvalScenario): void {
  if (scenario.layer !== "deterministic") {
    throw new Error(`Scenario ${scenario.id} is ${scenario.layer}; deterministic seed packs only support deterministic scenarios.`);
  }
}

function buildAnonymousConversation(seed: {
  id: string;
  userId: string;
  title: string;
  recommendedNextStep: string;
  detectedNeedSummary: string;
  messages: Array<{ id: string; role: "user" | "assistant" | "system"; content: string; createdAt: string }>;
}): EvalWorkspaceConversationSeed {
  return {
    id: seed.id,
    userId: seed.userId,
    title: seed.title,
    sessionSource: "anonymous_cookie",
    lane: "organization",
    confidence: 0.89,
    recommendedNextStep: seed.recommendedNextStep,
    detectedNeedSummary: seed.detectedNeedSummary,
    lastAnalyzedAt: "2026-03-20T09:00:00.000Z",
    createdAt: "2026-03-20T09:00:00.000Z",
    updatedAt: "2026-03-20T09:10:00.000Z",
    messages: seed.messages,
  };
}

export function resolveDeterministicSeedPack(scenarioId: string): DeterministicEvalSeedPack {
  const scenario = getEvalScenarioById(scenarioId);
  assertDeterministicScenario(scenario);

  switch (scenarioId) {
    case "anonymous-high-intent-dropout":
      return {
        scenarioId,
        seedSetId: "seed-anon-dropout-v1",
        refs: {
          primaryConversationId: "conv_eval_anon_dropout",
          anonymousUserId: "anon_eval_dropout",
        },
        users: [
          { id: "anon_eval_dropout", email: "anon.dropout@example.com", name: "Anonymous Dropout" },
        ],
        conversations: [
          buildAnonymousConversation({
            id: "conv_eval_anon_dropout",
            userId: "anon_eval_dropout",
            title: "Anonymous operator asks about redesigning approvals",
            recommendedNextStep: "Invite signup before proposing deeper workflow guidance.",
            detectedNeedSummary: "High-intent approvals workflow redesign request.",
            messages: [
              {
                id: "msg_eval_anon_dropout_1",
                role: "user",
                content: "We need help redesigning how approvals work across three teams.",
                createdAt: "2026-03-20T09:01:00.000Z",
              },
              {
                id: "msg_eval_anon_dropout_2",
                role: "assistant",
                content: "I can help think through the workflow and identify where founder follow-up would matter.",
                createdAt: "2026-03-20T09:02:00.000Z",
              },
            ],
          }),
        ],
        conversationEvents: [
          {
            id: "evt_eval_anon_dropout_1",
            conversationId: "conv_eval_anon_dropout",
            type: "anonymous_high_intent_detected",
            metadata: { lane: "organization", confidence: 0.89 },
            createdAt: "2026-03-20T09:02:30.000Z",
          },
        ],
        leads: [],
        consultationRequests: [],
        deals: [],
        trainingPaths: [],
        toolFixtures: [],
      };
    case "anonymous-signup-continuity":
      return {
        scenarioId,
        seedSetId: "seed-anon-signup-v1",
        refs: {
          primaryConversationId: "conv_eval_signup_continuity",
          anonymousUserId: "anon_eval_signup",
          authenticatedUserId: "usr_eval_signup",
        },
        users: [
          { id: "anon_eval_signup", email: "anon.signup@example.com", name: "Anonymous Signup" },
          { id: "usr_eval_signup", email: "signed.up@example.com", name: "Signed Up User" },
        ],
        conversations: [
          {
            id: "conv_eval_signup_continuity",
            userId: "anon_eval_signup",
            title: "Anonymous learner continues after signup",
            sessionSource: "anonymous_cookie",
            lane: "individual",
            confidence: 0.81,
            recommendedNextStep: "Preserve context and continue the training conversation after signup.",
            detectedNeedSummary: "Learner wants a serious operator path.",
            lastAnalyzedAt: "2026-03-20T10:00:00.000Z",
            createdAt: "2026-03-20T10:00:00.000Z",
            updatedAt: "2026-03-20T10:08:00.000Z",
            messages: [
              {
                id: "msg_eval_signup_1",
                role: "user",
                content: "I want to transition into operator work and need a real path.",
                createdAt: "2026-03-20T10:01:00.000Z",
              },
              {
                id: "msg_eval_signup_2",
                role: "assistant",
                content: "We can keep this conversation intact if you decide to sign up.",
                createdAt: "2026-03-20T10:02:00.000Z",
              },
            ],
          },
        ],
          conversationEvents: [
            {
              id: "evt_eval_signup_1",
              conversationId: "conv_eval_signup_continuity",
              type: "signup_prompted",
              metadata: { lane: "individual" },
              createdAt: "2026-03-20T10:03:00.000Z",
            },
          ],
        leads: [],
        consultationRequests: [],
        deals: [],
        trainingPaths: [],
        toolFixtures: [],
      };
    case "misclassification-reroute":
      return {
        scenarioId,
        seedSetId: "seed-reroute-v1",
        refs: {
          primaryConversationId: "conv_eval_reroute",
          authenticatedUserId: "usr_eval_reroute",
        },
        users: [
          { id: "usr_eval_reroute", email: "reroute@example.com", name: "Reroute Prospect" },
        ],
        conversations: [
          {
            id: "conv_eval_reroute",
            userId: "usr_eval_reroute",
            title: "Prospect starts unclear but reveals implementation needs",
            sessionSource: "authenticated",
            lane: "uncertain",
            confidence: 0.42,
            recommendedNextStep: "Continue discovery before selecting a lane.",
            detectedNeedSummary: "Prospect mentions several possible needs without clear routing.",
            lastAnalyzedAt: "2026-03-20T11:00:00.000Z",
            createdAt: "2026-03-20T11:00:00.000Z",
            updatedAt: "2026-03-20T11:03:00.000Z",
            messages: [
              {
                id: "msg_eval_reroute_1",
                role: "user",
                content: "We may need training, or maybe someone to help ship the system itself.",
                createdAt: "2026-03-20T11:01:00.000Z",
              },
            ],
          },
        ],
          conversationEvents: [
            {
              id: "evt_eval_reroute_1",
              conversationId: "conv_eval_reroute",
              type: "routing_review_requested",
              metadata: { lane: "uncertain" },
              createdAt: "2026-03-20T11:02:00.000Z",
            },
          ],
        leads: [],
        consultationRequests: [],
        deals: [],
        trainingPaths: [],
        toolFixtures: [],
      };
    case "mcp-tool-avoidance":
      return {
        scenarioId,
        seedSetId: "seed-tool-avoidance-v1",
        refs: {
          primaryConversationId: "conv_eval_tool_avoidance",
          authenticatedUserId: "usr_eval_tool_avoidance",
        },
        users: [
          { id: "usr_eval_tool_avoidance", email: "avoid@example.com", name: "Tool Avoidance User" },
        ],
        conversations: [
          {
            id: "conv_eval_tool_avoidance",
            userId: "usr_eval_tool_avoidance",
            title: "Simple explanatory question that does not need a tool",
            sessionSource: "authenticated",
            lane: "uncertain",
            confidence: 0.76,
            recommendedNextStep: "Answer directly without a tool.",
            detectedNeedSummary: "User needs a concise direct explanation.",
            lastAnalyzedAt: "2026-03-20T12:00:00.000Z",
            createdAt: "2026-03-20T12:00:00.000Z",
            updatedAt: "2026-03-20T12:02:00.000Z",
            messages: [
              {
                id: "msg_eval_tool_avoid_1",
                role: "user",
                content: "What does founder review mean in this workflow?",
                createdAt: "2026-03-20T12:01:00.000Z",
              },
              {
                id: "msg_eval_tool_avoid_2",
                role: "assistant",
                content: "Founder review means a human decision point before any customer-visible next step is approved.",
                createdAt: "2026-03-20T12:02:00.000Z",
              },
            ],
          },
        ],
          conversationEvents: [],
        leads: [],
        consultationRequests: [],
        deals: [],
        trainingPaths: [],
        toolFixtures: [],
      };
    case "mcp-calculator-must-use":
      return {
        scenarioId,
        seedSetId: "seed-calculator-must-use-v1",
        refs: {
          primaryConversationId: "conv_eval_calculator",
          authenticatedUserId: "usr_eval_calculator",
          toolFixtureId: "tool_fixture_calculator_1",
        },
        users: [
          { id: "usr_eval_calculator", email: "calculator@example.com", name: "Calculator User" },
        ],
        conversations: [
          {
            id: "conv_eval_calculator",
            userId: "usr_eval_calculator",
            title: "Arithmetic request that requires calculator use",
            sessionSource: "authenticated",
            lane: "uncertain",
            confidence: 0.72,
            recommendedNextStep: "Use the calculator tool before answering.",
            detectedNeedSummary: "User asked for a precise arithmetic result.",
            lastAnalyzedAt: "2026-03-20T13:00:00.000Z",
            createdAt: "2026-03-20T13:00:00.000Z",
            updatedAt: "2026-03-20T13:01:00.000Z",
            messages: [
              {
                id: "msg_eval_calc_1",
                role: "user",
                content: "What is 14 multiplied by 3?",
                createdAt: "2026-03-20T13:01:00.000Z",
              },
            ],
          },
        ],
          conversationEvents: [],
        leads: [],
        consultationRequests: [],
        deals: [],
        trainingPaths: [],
        toolFixtures: [
          {
            id: "tool_fixture_calculator_1",
            toolId: "calculator",
            args: {
              operation: "multiply",
              a: 14,
              b: 3,
            },
            expectedResult: 42,
          },
        ],
      };
    case "organization-buyer-deterministic":
      return {
        scenarioId,
        seedSetId: "seed-org-buyer-deterministic-v1",
        refs: {
          primaryConversationId: "conv_eval_org_buyer",
          authenticatedUserId: "usr_eval_org_buyer",
        },
        users: [
          { id: "usr_eval_org_buyer", email: "org.buyer@example.com", name: "Organization Buyer" },
        ],
        conversations: [
          buildAuthConversation({
            id: "conv_eval_org_buyer",
            userId: "usr_eval_org_buyer",
            title: "Organization buyer requests a founder-ready next step",
            lane: "organization",
            confidence: 0.94,
            recommendedNextStep: "Review consultation and prepare a founder-approved estimate.",
            detectedNeedSummary: "Team workflow redesign with budget and urgency signal.",
            messages: [
              {
                id: "msg_eval_org_buyer_1",
                role: "user",
                content: "We need an approvals workflow redesign across three teams and can move this quarter.",
                createdAt: "2026-03-20T14:01:00.000Z",
              },
              {
                id: "msg_eval_org_buyer_2",
                role: "assistant",
                content: "This looks like an organization workflow engagement that should move into founder review.",
                createdAt: "2026-03-20T14:02:00.000Z",
              },
            ],
          }),
        ],
        conversationEvents: [
          {
            id: "evt_eval_org_buyer_1",
            conversationId: "conv_eval_org_buyer",
            type: "organization_lane_confirmed",
            metadata: { confidence: 0.94 },
            createdAt: "2026-03-20T14:02:30.000Z",
          },
        ],
        leads: [
          {
            conversationId: "conv_eval_org_buyer",
            lane: "organization",
            name: "Pat Buyer",
            email: "pat.buyer@example.com",
            organization: "Northstar Ops",
            roleOrTitle: "Operations Director",
            trainingGoal: null,
            problemSummary: "Needs a cross-team approvals workflow redesign.",
            recommendedNextAction: "Review consultation and prepare estimate-ready next step.",
            qualification: {
              authorityLevel: "decision_maker",
              urgency: "this_quarter",
              budgetSignal: "confirmed",
              technicalEnvironment: "Notion, Slack, and internal approvals tooling",
            },
            triageState: "qualified",
            founderNote: "Good fit for an advisory workflow package.",
          },
        ],
        consultationRequests: [
          {
            conversationId: "conv_eval_org_buyer",
            userId: "usr_eval_org_buyer",
            lane: "organization",
            requestSummary: "Need a founder review and next-step recommendation for the workflow redesign.",
            status: "reviewed",
            founderNote: "Ready to convert into a scoped deal.",
          },
        ],
        deals: [],
        trainingPaths: [],
        toolFixtures: [],
      };
    case "individual-learner-deterministic":
      return {
        scenarioId,
        seedSetId: "seed-individual-learner-deterministic-v1",
        refs: {
          primaryConversationId: "conv_eval_individual_learner",
          authenticatedUserId: "usr_eval_individual_learner",
        },
        users: [
          { id: "usr_eval_individual_learner", email: "learner@example.com", name: "Individual Learner" },
        ],
        conversations: [
          buildAuthConversation({
            id: "conv_eval_individual_learner",
            userId: "usr_eval_individual_learner",
            title: "Learner asks for a founder-approved training recommendation",
            lane: "individual",
            confidence: 0.91,
            recommendedNextStep: "Prepare a founder-approved training path recommendation.",
            detectedNeedSummary: "Career-transition learner with strong operator intent.",
            messages: [
              {
                id: "msg_eval_individual_1",
                role: "user",
                content: "I want a real path into operator work and I am open to apprenticeship screening if it fits.",
                createdAt: "2026-03-20T15:01:00.000Z",
              },
              {
                id: "msg_eval_individual_2",
                role: "assistant",
                content: "This looks like a strong individual training-path candidate with apprenticeship ambiguity.",
                createdAt: "2026-03-20T15:02:00.000Z",
              },
            ],
          }),
        ],
        conversationEvents: [
          {
            id: "evt_eval_individual_1",
            conversationId: "conv_eval_individual_learner",
            type: "training_fit_confirmed",
            metadata: { trainingFit: "career_transition" },
            createdAt: "2026-03-20T15:02:30.000Z",
          },
        ],
        leads: [
          {
            conversationId: "conv_eval_individual_learner",
            lane: "individual",
            name: "Jordan Learner",
            email: "jordan.learner@example.com",
            organization: null,
            roleOrTitle: "Product Designer",
            trainingGoal: "Transition into operator work with real practice and mentorship.",
            problemSummary: "Needs a serious operator path with founder guidance.",
            recommendedNextAction: "Recommend apprenticeship screening.",
            qualification: {
              trainingFit: "career_transition",
              urgency: "this_quarter",
              budgetSignal: "likely",
            },
            triageState: "qualified",
            founderNote: "High-signal learner with strong apprenticeship interest.",
          },
        ],
        consultationRequests: [],
        deals: [],
        trainingPaths: [],
        toolFixtures: [],
      };
    default:
      throw new Error(`No deterministic seed pack is defined for scenario: ${scenarioId}`);
  }
}

export async function inflateDeterministicSeedPack(
  workspace: EvalWorkspace,
  pack: DeterministicEvalSeedPack,
): Promise<InflatedDeterministicEvalSeedPack> {
  for (const user of pack.users) {
    await workspace.seedUser(user);
  }

  for (const conversation of pack.conversations) {
    await workspace.seedConversation(conversation);
  }

  for (const event of pack.conversationEvents) {
    await workspace.seedConversationEvent(event);
  }

  for (const lead of pack.leads) {
    await workspace.seedLead(lead);
  }

  for (const request of pack.consultationRequests) {
    await workspace.seedConsultationRequest(request);
  }

  for (const deal of pack.deals) {
    await workspace.seedDeal(deal);
  }

  for (const trainingPath of pack.trainingPaths) {
    await workspace.seedTrainingPath(trainingPath);
  }

  return {
    pack,
    refs: pack.refs,
    toolFixtures: new Map(pack.toolFixtures.map((fixture) => [fixture.id, fixture])),
  };
}