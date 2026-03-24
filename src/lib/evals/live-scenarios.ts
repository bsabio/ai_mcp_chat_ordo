import type Anthropic from "@anthropic-ai/sdk";

import type { RoleName } from "@/core/entities/user";
import type { DeterministicEvalSeedPack } from "./seeding";

export interface LiveEvalScenarioFixture {
  scenarioId: string;
  role: RoleName;
  userId: string;
  seedPack: DeterministicEvalSeedPack;
  promptMessages: Anthropic.MessageParam[];
}

function buildAnonymousConversation(seed: {
  id: string;
  userId: string;
  title: string;
  recommendedNextStep: string;
  detectedNeedSummary: string;
  messages: Array<{ id: string; role: "user" | "assistant" | "system"; content: string; createdAt: string }>;
}) {
  return {
    id: seed.id,
    userId: seed.userId,
    title: seed.title,
    sessionSource: "anonymous_cookie",
    lane: "organization" as const,
    confidence: 0.89,
    recommendedNextStep: seed.recommendedNextStep,
    detectedNeedSummary: seed.detectedNeedSummary,
    lastAnalyzedAt: "2026-03-20T09:00:00.000Z",
    createdAt: "2026-03-20T09:00:00.000Z",
    updatedAt: "2026-03-20T09:10:00.000Z",
    messages: seed.messages,
  };
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
}) {
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

const LIVE_SCENARIO_FIXTURES: Record<string, LiveEvalScenarioFixture> = {
  "live-anonymous-high-intent-loss": {
    scenarioId: "live-anonymous-high-intent-loss",
    role: "ANONYMOUS",
    userId: "anon_eval_live_dropout",
    seedPack: {
      scenarioId: "live-anonymous-high-intent-loss",
      seedSetId: "seed-live-anon-dropout-v1",
      refs: {
        primaryConversationId: "conv_eval_live_anon_dropout",
        anonymousUserId: "anon_eval_live_dropout",
      },
      users: [
        { id: "anon_eval_live_dropout", email: "live.dropout@example.com", name: "Live Anonymous Dropout" },
      ],
      conversations: [
        buildAnonymousConversation({
          id: "conv_eval_live_anon_dropout",
          userId: "anon_eval_live_dropout",
          title: "Anonymous operator asks for a next step but does not sign up",
          recommendedNextStep: "Encourage signup before recommending a founder-reviewed path.",
          detectedNeedSummary: "High-intent workflow redesign request without account creation.",
          messages: [
            {
              id: "msg_eval_live_anon_dropout_1",
              role: "user",
              content: "We need help redesigning our approvals workflow across multiple teams.",
              createdAt: "2026-03-20T09:01:00.000Z",
            },
            {
              id: "msg_eval_live_anon_dropout_2",
              role: "assistant",
              content: "I can help clarify the likely path and where founder review would matter.",
              createdAt: "2026-03-20T09:02:00.000Z",
            },
          ],
        }),
      ],
      conversationEvents: [
        {
          id: "evt_eval_live_anon_dropout_1",
          conversationId: "conv_eval_live_anon_dropout",
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
    },
    promptMessages: [
      { role: "user", content: "What should happen next if I am not ready to sign up yet?" },
    ],
  },
  "live-anonymous-signup-continuity": {
    scenarioId: "live-anonymous-signup-continuity",
    role: "AUTHENTICATED",
    userId: "usr_eval_live_signup",
    seedPack: {
      scenarioId: "live-anonymous-signup-continuity",
      seedSetId: "seed-live-anon-signup-v1",
      refs: {
        primaryConversationId: "conv_eval_live_signup_continuity",
        anonymousUserId: "anon_eval_live_signup",
        authenticatedUserId: "usr_eval_live_signup",
      },
      users: [
        { id: "anon_eval_live_signup", email: "anon.live.signup@example.com", name: "Anon Live Signup" },
        { id: "usr_eval_live_signup", email: "signed.live@example.com", name: "Signed Live User" },
      ],
      conversations: [
        {
          id: "conv_eval_live_signup_continuity",
          userId: "anon_eval_live_signup",
          title: "Anonymous learner continues after signup in a live eval",
          sessionSource: "anonymous_cookie",
          lane: "individual",
          confidence: 0.84,
          recommendedNextStep: "Preserve the conversation and continue with a training-path recommendation after signup.",
          detectedNeedSummary: "Learner wants a serious operator path.",
          lastAnalyzedAt: "2026-03-20T10:00:00.000Z",
          createdAt: "2026-03-20T10:00:00.000Z",
          updatedAt: "2026-03-20T10:08:00.000Z",
          messages: [
            {
              id: "msg_eval_live_signup_1",
              role: "user",
              content: "I want a real path into operator work.",
              createdAt: "2026-03-20T10:01:00.000Z",
            },
            {
              id: "msg_eval_live_signup_2",
              role: "assistant",
              content: "We can keep the conversation intact if you create an account.",
              createdAt: "2026-03-20T10:02:00.000Z",
            },
          ],
        },
      ],
      conversationEvents: [
        {
          id: "evt_eval_live_signup_1",
          conversationId: "conv_eval_live_signup_continuity",
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
    },
    promptMessages: [
      { role: "user", content: "I signed up. What should my next step be now that we kept the conversation?" },
    ],
  },
  "organization-buyer-funnel": {
    scenarioId: "organization-buyer-funnel",
    role: "AUTHENTICATED",
    userId: "usr_eval_live_org_buyer",
    seedPack: {
      scenarioId: "organization-buyer-funnel",
      seedSetId: "seed-live-org-buyer-v1",
      refs: {
        primaryConversationId: "conv_eval_live_org_buyer",
        authenticatedUserId: "usr_eval_live_org_buyer",
      },
      users: [
        { id: "usr_eval_live_org_buyer", email: "org.live@example.com", name: "Live Organization Buyer" },
      ],
      conversations: [
        buildAuthConversation({
          id: "conv_eval_live_org_buyer",
          userId: "usr_eval_live_org_buyer",
          title: "Live organization buyer funnel",
          lane: "organization",
          confidence: 0.95,
          recommendedNextStep: "Prepare a founder-reviewed estimate-ready next step.",
          detectedNeedSummary: "Operations buyer with budget and urgency signal.",
          messages: [
            {
              id: "msg_eval_live_org_buyer_1",
              role: "user",
              content: "We need help redesigning our team approvals process this quarter.",
              createdAt: "2026-03-20T14:01:00.000Z",
            },
          ],
        }),
      ],
      conversationEvents: [],
      leads: [
        {
          conversationId: "conv_eval_live_org_buyer",
          lane: "organization",
          name: "Pat Live Buyer",
          email: "pat.live@example.com",
          organization: "Northstar Ops",
          roleOrTitle: "Operations Director",
          trainingGoal: null,
          problemSummary: "Needs a workflow redesign for approvals.",
          recommendedNextAction: "Prepare a founder-reviewed estimate.",
          qualification: {
            authorityLevel: "decision_maker",
            urgency: "this_quarter",
            budgetSignal: "confirmed",
            technicalEnvironment: "Slack and Notion",
          },
          triageState: "qualified",
          founderNote: "Strong org buyer signal.",
        },
      ],
      consultationRequests: [
        {
          conversationId: "conv_eval_live_org_buyer",
          userId: "usr_eval_live_org_buyer",
          lane: "organization",
          requestSummary: "Need the founder-reviewed next step for our workflow redesign.",
          status: "reviewed",
          founderNote: "Ready to scope.",
        },
      ],
      deals: [],
      trainingPaths: [],
      toolFixtures: [],
    },
    promptMessages: [
      { role: "user", content: "Please recommend the next step and whether we are ready for a founder-approved estimate." },
    ],
  },
  "individual-learner-funnel": {
    scenarioId: "individual-learner-funnel",
    role: "AUTHENTICATED",
    userId: "usr_eval_live_individual",
    seedPack: {
      scenarioId: "individual-learner-funnel",
      seedSetId: "seed-live-individual-v1",
      refs: {
        primaryConversationId: "conv_eval_live_individual",
        authenticatedUserId: "usr_eval_live_individual",
      },
      users: [
        { id: "usr_eval_live_individual", email: "individual.live@example.com", name: "Live Individual Learner" },
      ],
      conversations: [
        buildAuthConversation({
          id: "conv_eval_live_individual",
          userId: "usr_eval_live_individual",
          title: "Live individual learner funnel",
          lane: "individual",
          confidence: 0.92,
          recommendedNextStep: "Prepare a founder-approved training recommendation.",
          detectedNeedSummary: "Career-transition learner with apprenticeship ambiguity.",
          messages: [
            {
              id: "msg_eval_live_individual_1",
              role: "user",
              content: "I want a real operator path and I am open to apprenticeship screening if that is the right fit.",
              createdAt: "2026-03-20T15:01:00.000Z",
            },
          ],
        }),
      ],
      conversationEvents: [],
      leads: [
        {
          conversationId: "conv_eval_live_individual",
          lane: "individual",
          name: "Jordan Live Learner",
          email: "jordan.live@example.com",
          organization: null,
          roleOrTitle: "Designer",
          trainingGoal: "Transition into operator work",
          problemSummary: "Needs a structured operator path.",
          recommendedNextAction: "Recommend apprenticeship screening.",
          qualification: {
            trainingFit: "career_transition",
            urgency: "this_quarter",
            budgetSignal: "likely",
          },
          triageState: "qualified",
          founderNote: "Strong learner signal.",
        },
      ],
      consultationRequests: [],
      deals: [],
      trainingPaths: [],
      toolFixtures: [],
    },
    promptMessages: [
      { role: "user", content: "Please recommend the next founder-approved training step for me." },
    ],
  },
  "development-prospect-funnel": {
    scenarioId: "development-prospect-funnel",
    role: "AUTHENTICATED",
    userId: "usr_eval_live_development",
    seedPack: {
      scenarioId: "development-prospect-funnel",
      seedSetId: "seed-live-development-v1",
      refs: {
        primaryConversationId: "conv_eval_live_development",
        authenticatedUserId: "usr_eval_live_development",
      },
      users: [
        { id: "usr_eval_live_development", email: "development.live@example.com", name: "Live Development Prospect" },
      ],
      conversations: [
        buildAuthConversation({
          id: "conv_eval_live_development",
          userId: "usr_eval_live_development",
          title: "Live development prospect funnel",
          lane: "development",
          confidence: 0.9,
          recommendedNextStep: "Prepare a scoping-ready founder follow-up.",
          detectedNeedSummary: "Prospect needs implementation and scoping support.",
          messages: [
            {
              id: "msg_eval_live_development_1",
              role: "user",
              content: "We need someone to help implement and scope the system itself.",
              createdAt: "2026-03-20T16:01:00.000Z",
            },
          ],
        }),
      ],
      conversationEvents: [],
      leads: [
        {
          conversationId: "conv_eval_live_development",
          lane: "development",
          name: "Dana Builder",
          email: "dana.builder@example.com",
          organization: "Builder Labs",
          roleOrTitle: "Engineering Lead",
          trainingGoal: null,
          problemSummary: "Needs implementation and scoping support.",
          recommendedNextAction: "Prepare a founder-reviewed scope and estimate.",
          qualification: {
            authorityLevel: "decision_maker",
            urgency: "immediate",
            budgetSignal: "confirmed",
            technicalEnvironment: "Next.js, Postgres, Anthropic tools",
          },
          triageState: "qualified",
          founderNote: "Good fit for development delivery.",
        },
      ],
      consultationRequests: [],
      deals: [],
      trainingPaths: [],
      toolFixtures: [],
    },
    promptMessages: [
      { role: "user", content: "Please recommend the next scoping-ready founder-approved step for this implementation request." },
    ],
  },
  "mcp-tool-choice-and-recovery": {
    scenarioId: "mcp-tool-choice-and-recovery",
    role: "AUTHENTICATED",
    userId: "usr_eval_live_tool_recovery",
    seedPack: {
      scenarioId: "mcp-tool-choice-and-recovery",
      seedSetId: "seed-live-tool-recovery-v1",
      refs: {
        primaryConversationId: "conv_eval_live_tool_recovery",
        authenticatedUserId: "usr_eval_live_tool_recovery",
      },
      users: [
        { id: "usr_eval_live_tool_recovery", email: "tool.recovery@example.com", name: "Tool Recovery User" },
      ],
      conversations: [
        buildAuthConversation({
          id: "conv_eval_live_tool_recovery",
          userId: "usr_eval_live_tool_recovery",
          title: "Live MCP tool choice and recovery",
          lane: "uncertain",
          confidence: 0.71,
          recommendedNextStep: "Use the appropriate tool and recover coherently if it fails.",
          detectedNeedSummary: "Tool-heavy task with possible failure handling.",
          messages: [
            {
              id: "msg_eval_live_tool_recovery_1",
              role: "user",
              content: "Please add 4 and 5, and recover cleanly if the calculator fails once.",
              createdAt: "2026-03-20T17:01:00.000Z",
            },
          ],
        }),
      ],
      conversationEvents: [],
      leads: [],
      consultationRequests: [],
      deals: [],
      trainingPaths: [],
      toolFixtures: [
        {
          id: "tool_fixture_live_tool_recovery_1",
          toolId: "calculator",
          args: {
            operation: "add",
            a: 4,
            b: 5,
          },
          expectedResult: 9,
        },
      ],
    },
    promptMessages: [
      { role: "user", content: "Use the calculator tool with 4 and 5, retry once if it fails, and then give me the final total clearly." },
    ],
  },
  "mcp-multi-tool-synthesis": {
    scenarioId: "mcp-multi-tool-synthesis",
    role: "AUTHENTICATED",
    userId: "usr_eval_live_multi_tool",
    seedPack: {
      scenarioId: "mcp-multi-tool-synthesis",
      seedSetId: "seed-live-multi-tool-v1",
      refs: {
        primaryConversationId: "conv_eval_live_multi_tool",
        authenticatedUserId: "usr_eval_live_multi_tool",
      },
      users: [
        { id: "usr_eval_live_multi_tool", email: "multi.tool@example.com", name: "Multi Tool User" },
      ],
      conversations: [
        buildAuthConversation({
          id: "conv_eval_live_multi_tool",
          userId: "usr_eval_live_multi_tool",
          title: "Live MCP multi-tool synthesis",
          lane: "uncertain",
          confidence: 0.73,
          recommendedNextStep: "Combine multiple tools into one coherent answer.",
          detectedNeedSummary: "Task requires more than one tool result.",
          messages: [
            {
              id: "msg_eval_live_multi_tool_1",
              role: "user",
              content: "Use multiple tools if needed and combine the results into one answer.",
              createdAt: "2026-03-20T18:01:00.000Z",
            },
          ],
        }),
      ],
      conversationEvents: [],
      leads: [],
      consultationRequests: [],
      deals: [],
      trainingPaths: [],
      toolFixtures: [],
    },
    promptMessages: [
      { role: "user", content: "Combine the relevant tool outputs and give me one final answer." },
    ],
  },
};

export function resolveLiveEvalScenarioFixture(scenarioId: string): LiveEvalScenarioFixture {
  const fixture = LIVE_SCENARIO_FIXTURES[scenarioId];

  if (!fixture) {
    throw new Error(`No live eval fixture is defined for scenario: ${scenarioId}`);
  }

  return fixture;
}
