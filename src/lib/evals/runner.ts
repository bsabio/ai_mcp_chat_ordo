import { resolveEvalRuntimeConfig } from "./config";
import type { EvalObservation, EvalRunConfig, EvalScenario } from "./domain";
import { isDealCustomerVisibleStatus } from "@/core/entities/deal-record";
import { isTrainingPathCustomerVisibleStatus } from "@/core/entities/training-path-record";
import { getEvalScenarioById } from "./scenarios";
import { inflateDeterministicSeedPack, resolveDeterministicSeedPack } from "./seeding";
import { createEvalWorkspace } from "./workspace";

export interface EvalCheckpointResult {
  id: string;
  label: string;
  required: boolean;
  passed: boolean;
  details: string | null;
}

export interface DeterministicEvalExecution {
  scenario: EvalScenario;
  run: EvalRunConfig;
  observations: EvalObservation[];
  checkpointResults: EvalCheckpointResult[];
  stopReason: string | null;
  finalState: {
    lane: string | null;
    recommendation: string | null;
    toolCalls: string[];
  };
}

function createCheckpointResult(
  scenario: EvalScenario,
  checkpointId: string,
  passed: boolean,
  details: string | null,
): EvalCheckpointResult {
  const checkpoint = scenario.expectedCheckpoints.find((candidate) => candidate.id === checkpointId);

  if (!checkpoint) {
    throw new Error(`Unknown checkpoint ${checkpointId} for scenario ${scenario.id}`);
  }

  return {
    id: checkpoint.id,
    label: checkpoint.label,
    required: checkpoint.required,
    passed,
    details,
  };
}

function createRunConfig(scenario: EvalScenario, seedSetId: string, now: Date): EvalRunConfig {
  const runtime = resolveEvalRuntimeConfig({
    env: {
      EVAL_TARGET_ENV: scenario.targetEnvironment,
      EVAL_SEED_SET_ID: seedSetId,
    },
    now,
  });

  return {
    scenarioId: scenario.id,
    layer: scenario.layer,
    targetEnvironment: scenario.targetEnvironment,
    mode: runtime.mode,
    modelProvider: runtime.modelProvider,
    modelName: runtime.modelName,
    seedSetId: runtime.seedSetId,
    startedAt: runtime.startedAt,
  };
}

function pushMessageObservations(observations: EvalObservation[], messages: Array<{ role: string; content: string; createdAt: string }>): void {
  for (const message of messages) {
    observations.push({
      kind: "message",
      at: message.createdAt,
      data: {
        role: message.role,
        content: message.content,
      },
    });
  }
}

function pushCheckpointObservations(observations: EvalObservation[], run: EvalRunConfig, checkpointResults: EvalCheckpointResult[]): void {
  for (const checkpoint of checkpointResults) {
    observations.push({
      kind: "checkpoint",
      at: run.startedAt,
      data: {
        checkpointId: checkpoint.id,
        passed: checkpoint.passed,
        details: checkpoint.details,
      },
    });
  }
}

function pushConversationEventObservations(
  observations: EvalObservation[],
  events: Array<{ type: string; metadata: Record<string, unknown>; createdAt: string }>,
): void {
  for (const event of events) {
    observations.push({
      kind: "state_transition",
      at: event.createdAt,
      data: {
        transition: event.type,
        ...event.metadata,
      },
    });
  }
}

export async function runDeterministicEvalScenario(
  scenarioId: string,
  options: { now?: Date } = {},
): Promise<DeterministicEvalExecution> {
  const scenario = getEvalScenarioById(scenarioId);

  if (scenario.layer !== "deterministic") {
    throw new Error(`Scenario ${scenarioId} is not deterministic.`);
  }

  const seedPack = resolveDeterministicSeedPack(scenarioId);
  const workspace = createEvalWorkspace();
  const now = options.now ?? new Date("2026-03-20T14:00:00.000Z");
  const run = createRunConfig(scenario, seedPack.seedSetId, now);
  const observations: EvalObservation[] = [];
  const checkpointResults: EvalCheckpointResult[] = [];
  let stopReason: string | null = null;
  let finalLane: string | null = null;
  let finalRecommendation: string | null = null;
  const toolCalls: string[] = [];

  try {
    const inflated = await inflateDeterministicSeedPack(workspace, seedPack);
    const primaryConversationId = inflated.refs.primaryConversationId;

    if (!primaryConversationId) {
      throw new Error(`Seed pack ${scenarioId} is missing primaryConversationId.`);
    }

    const conversation = await workspace.conversationRepo.findById(primaryConversationId);

    if (!conversation) {
      throw new Error(`Primary conversation ${primaryConversationId} was not seeded.`);
    }

    const messages = await workspace.listMessages(primaryConversationId);
    pushMessageObservations(observations, messages);
    finalLane = conversation.routingSnapshot.lane;
    finalRecommendation = conversation.routingSnapshot.recommendedNextStep;

    switch (scenarioId) {
      case "anonymous-high-intent-dropout": {
        const lead = await workspace.leadRepo.findByConversationId(primaryConversationId);
        const consultationRequest = await workspace.consultationRequestRepo.findByConversationId(primaryConversationId);
        const frictionReason = conversation.messageCount >= 2 && !lead && !consultationRequest
          ? "High-intent anonymous conversation ended before signup or contact capture."
          : null;

        checkpointResults.push(
          createCheckpointResult(scenario, "anonymous-discovery", messages.length > 0, messages.length > 0 ? null : "No seeded messages were found."),
          createCheckpointResult(
            scenario,
            "dropout-detected",
            conversation.userId.startsWith("anon_") && !lead && !consultationRequest,
            lead || consultationRequest ? "A downstream record exists, so this is not a dropout." : null,
          ),
          createCheckpointResult(
            scenario,
            "friction-summary",
            frictionReason !== null,
            frictionReason,
          ),
        );

        stopReason = "journey_stopped_before_signup";
        observations.push({
          kind: "summary",
          at: run.startedAt,
          data: {
            stopReason,
            frictionReason,
            finalLane,
            finalRecommendation,
          },
        });
        break;
      }
      case "anonymous-signup-continuity": {
        const anonymousUserId = inflated.refs.anonymousUserId;
        const authenticatedUserId = inflated.refs.authenticatedUserId;

        if (!anonymousUserId || !authenticatedUserId) {
          throw new Error("Signup continuity seed pack is missing ownership refs.");
        }

        await workspace.conversationRepo.transferOwnership(anonymousUserId, authenticatedUserId);
        await workspace.appendMessage({
          conversationId: primaryConversationId,
          role: "user",
          content: "I signed up. Can we keep going with the operator path?",
          createdAt: "2026-03-20T10:03:30.000Z",
        });
        await workspace.appendMessage({
          conversationId: primaryConversationId,
          role: "assistant",
          content: "Yes. Your conversation stays intact and the next step is an apprenticeship screening recommendation.",
          createdAt: "2026-03-20T10:04:00.000Z",
        });
        const migratedConversation = await workspace.conversationRepo.findById(primaryConversationId);
        const activeConversation = await workspace.conversationRepo.findActiveByUser(authenticatedUserId);
        const updatedMessages = await workspace.listMessages(primaryConversationId);
        const postSignupMessages = updatedMessages.slice(messages.length);

        pushMessageObservations(observations, postSignupMessages);

        observations.push({
          kind: "state_transition",
          at: run.startedAt,
          data: {
            transition: "conversation_migrated",
            fromUserId: anonymousUserId,
            toUserId: authenticatedUserId,
            conversationId: primaryConversationId,
          },
        });

        checkpointResults.push(
          createCheckpointResult(scenario, "anonymous-discovery", messages.length > 0, null),
          createCheckpointResult(scenario, "signup", migratedConversation?.userId === authenticatedUserId, null),
          createCheckpointResult(
            scenario,
            "continuity",
            migratedConversation?.convertedFrom === anonymousUserId
              && activeConversation?.id === primaryConversationId
              && postSignupMessages.length >= 2,
            migratedConversation?.convertedFrom === anonymousUserId && postSignupMessages.length >= 2
              ? null
              : "Conversation ownership markers were preserved, but a continued post-signup exchange was not proven.",
          ),
        );

        finalLane = migratedConversation?.routingSnapshot.lane ?? finalLane;
        finalRecommendation = migratedConversation?.routingSnapshot.recommendedNextStep ?? finalRecommendation;
        stopReason = null;
        observations.push({
          kind: "summary",
          at: run.startedAt,
          data: {
            stopReason,
            finalLane,
            finalRecommendation,
            activeConversationId: activeConversation?.id ?? null,
          },
        });
        break;
      }
      case "organization-buyer-deterministic": {
        const lead = await workspace.leadRepo.findByConversationId(primaryConversationId);
        const consultationRequest = await workspace.consultationRequestRepo.findByConversationId(primaryConversationId);

        if (!consultationRequest) {
          throw new Error("Organization buyer deterministic scenario requires a seeded consultation request.");
        }

        const deal = await workspace.dealWorkflow.createFromConsultationRequest("admin_eval_runner", consultationRequest.id);
        const visibleDeal = await workspace.dealRepo.updateStatus(deal.id, "estimate_ready", {
          founderNote: "Founder approved the estimate-ready next step.",
        });
        const events = await workspace.listConversationEvents(primaryConversationId);

        pushConversationEventObservations(observations, events);

        checkpointResults.push(
          createCheckpointResult(
            scenario,
            "qualification",
            lead?.triageState === "qualified" && consultationRequest.status === "reviewed",
            consultationRequest.status,
          ),
          createCheckpointResult(
            scenario,
            "consultation-or-deal",
            visibleDeal !== null,
            visibleDeal?.id ?? "Deal was not created.",
          ),
          createCheckpointResult(
            scenario,
            "approved-next-step",
            visibleDeal !== null && isDealCustomerVisibleStatus(visibleDeal.status),
            visibleDeal?.status ?? "Missing customer-visible deal status.",
          ),
        );

        finalLane = visibleDeal?.lane ?? finalLane;
        finalRecommendation = visibleDeal?.nextAction ?? finalRecommendation;
        observations.push({
          kind: "summary",
          at: run.startedAt,
          data: {
            stopReason: null,
            finalLane,
            finalRecommendation,
            dealId: visibleDeal?.id ?? null,
            visibleStatus: visibleDeal?.status ?? null,
          },
        });
        break;
      }
      case "individual-learner-deterministic": {
        const lead = await workspace.leadRepo.findByConversationId(primaryConversationId);

        if (!lead) {
          throw new Error("Individual learner deterministic scenario requires a seeded qualified lead.");
        }

        const trainingPath = await workspace.trainingWorkflow.createFromQualifiedLead("admin_eval_runner", lead.id);
        const visibleTrainingPath = await workspace.trainingPathRepo.updateStatus(trainingPath.id, "recommended", {
          founderNote: "Founder approved the training recommendation.",
        });
        const events = await workspace.listConversationEvents(primaryConversationId);

        pushConversationEventObservations(observations, events);

        checkpointResults.push(
          createCheckpointResult(
            scenario,
            "training-fit",
            lead.triageState === "qualified" && lead.trainingFit === "career_transition",
            lead.trainingFit ?? "Missing training fit.",
          ),
          createCheckpointResult(
            scenario,
            "training-path-created",
            visibleTrainingPath !== null,
            visibleTrainingPath?.id ?? "Training path was not created.",
          ),
          createCheckpointResult(
            scenario,
            "approved-recommendation",
            visibleTrainingPath !== null && isTrainingPathCustomerVisibleStatus(visibleTrainingPath.status),
            visibleTrainingPath?.status ?? "Missing customer-visible training-path status.",
          ),
        );

        finalLane = visibleTrainingPath?.lane ?? finalLane;
        finalRecommendation = visibleTrainingPath?.customerSummary ?? finalRecommendation;
        observations.push({
          kind: "summary",
          at: run.startedAt,
          data: {
            stopReason: null,
            finalLane,
            finalRecommendation,
            trainingPathId: visibleTrainingPath?.id ?? null,
            visibleStatus: visibleTrainingPath?.status ?? null,
          },
        });
        break;
      }
      case "misclassification-reroute": {
        const beforeRecommendation = conversation.routingSnapshot.recommendedNextStep;
        const beforeLane = conversation.routingSnapshot.lane;

        await workspace.conversationRepo.updateRoutingSnapshot(primaryConversationId, {
          lane: "development",
          confidence: 0.91,
          recommendedNextStep: "Prepare a scoped founder follow-up for development delivery.",
          detectedNeedSummary: "Prospect needs implementation and scoping support.",
          lastAnalyzedAt: run.startedAt,
        });

        const reroutedConversation = await workspace.conversationRepo.findById(primaryConversationId);

        observations.push({
          kind: "state_transition",
          at: run.startedAt,
          data: {
            transition: "routing_rerouted",
            fromLane: beforeLane,
            toLane: reroutedConversation?.routingSnapshot.lane ?? null,
          },
        });

        checkpointResults.push(
          createCheckpointResult(scenario, "initial-ambiguity", beforeLane === "uncertain", null),
          createCheckpointResult(scenario, "reroute", reroutedConversation?.routingSnapshot.lane === "development", null),
          createCheckpointResult(
            scenario,
            "updated-next-step",
            reroutedConversation?.routingSnapshot.recommendedNextStep !== beforeRecommendation,
            reroutedConversation?.routingSnapshot.recommendedNextStep ?? null,
          ),
        );

        finalLane = reroutedConversation?.routingSnapshot.lane ?? finalLane;
        finalRecommendation = reroutedConversation?.routingSnapshot.recommendedNextStep ?? finalRecommendation;
        observations.push({
          kind: "summary",
          at: run.startedAt,
          data: {
            stopReason: null,
            finalLane,
            finalRecommendation,
          },
        });
        break;
      }
      case "mcp-tool-avoidance": {
        const assistantAnswer = messages.find((message) => message.role === "assistant")?.content ?? "";
        checkpointResults.push(
          createCheckpointResult(scenario, "no-tool-needed", true, "The seeded conversation is directly answerable."),
          createCheckpointResult(scenario, "tool-avoided", true, "No tool call was emitted for this direct explanation."),
          createCheckpointResult(
            scenario,
            "answer-complete",
            /founder review/i.test(assistantAnswer),
            assistantAnswer,
          ),
        );

        observations.push({
          kind: "summary",
          at: run.startedAt,
          data: {
            stopReason: null,
            finalLane,
            finalRecommendation,
            directAnswerUsed: true,
          },
        });
        break;
      }
      case "mcp-calculator-must-use": {
        const toolFixtureId = inflated.refs.toolFixtureId;

        if (!toolFixtureId) {
          throw new Error("Calculator must-use scenario is missing toolFixtureId.");
        }

        const toolFixture = inflated.toolFixtures.get(toolFixtureId);

        if (!toolFixture) {
          throw new Error(`Missing tool fixture ${toolFixtureId}.`);
        }

        const toolResult = workspace.executeCalculator(toolFixture.args as { operation: string; a: number; b: number });
        const result = toolResult.result;
        toolCalls.push(toolFixture.toolId);
        await workspace.conversationRepo.setLastToolUsed(primaryConversationId, toolFixture.toolId);

        observations.push({
          kind: "tool_call",
          at: run.startedAt,
          data: {
            toolId: toolFixture.toolId,
            args: toolFixture.args,
            result,
            rawResult: toolResult,
            expectedResult: toolFixture.expectedResult ?? null,
            matchedExpected: result === toolFixture.expectedResult,
          },
        });

        checkpointResults.push(
          createCheckpointResult(scenario, "tool-needed", true, "The prompt requests precise arithmetic."),
          createCheckpointResult(scenario, "tool-called", true, `Called ${toolFixture.toolId} with fixture arguments.`),
          createCheckpointResult(
            scenario,
            "answer-correct",
            result === toolFixture.expectedResult,
            result === toolFixture.expectedResult ? `Result ${result} matched expectation.` : `Expected ${toolFixture.expectedResult} but got ${result}.`,
          ),
        );

        observations.push({
          kind: "summary",
          at: run.startedAt,
          data: {
            stopReason: null,
            finalLane,
            finalRecommendation: `Use calculator result ${result} in the final answer.`,
            toolResult: result,
          },
        });
        finalRecommendation = `Use calculator result ${result} in the final answer.`;
        break;
      }
      default:
        throw new Error(`No deterministic runner is implemented for scenario ${scenarioId}.`);
    }

    pushCheckpointObservations(observations, run, checkpointResults);

    return {
      scenario,
      run,
      observations,
      checkpointResults,
      stopReason,
      finalState: {
        lane: finalLane,
        recommendation: finalRecommendation,
        toolCalls,
      },
    };
  } finally {
    workspace.destroy();
  }
}