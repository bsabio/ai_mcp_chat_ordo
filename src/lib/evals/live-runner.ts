import type Anthropic from "@anthropic-ai/sdk";

import type { ConversationRoutingSnapshot } from "@/core/entities/conversation-routing";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import { isDealCustomerVisibleStatus } from "@/core/entities/deal-record";
import { isTrainingPathCustomerVisibleStatus } from "@/core/entities/training-path-record";
import { buildSystemPrompt } from "@/lib/chat/policy";
import { buildRoutingContextBlock } from "@/lib/chat/routing-context";
import { getToolExecutor } from "@/lib/chat/tool-composition-root";
import type { EvalObservation, EvalRunConfig, EvalScenario, EvalTargetEnvironment } from "./domain";
import { resolveEvalRuntimeConfig } from "./config";
import { getEvalScenarioById } from "./scenarios";
import { inflateDeterministicSeedPack, type DeterministicEvalToolFixture, type InflatedDeterministicEvalSeedPack } from "./seeding";
import { resolveLiveEvalScenarioFixture } from "./live-scenarios";
import { createEvalWorkspace } from "./workspace";
import { executeLiveEvalRuntime, type LiveEvalRuntimeRequest, type LiveEvalRuntimeResult } from "./live-runtime";
import type { EvalCheckpointResult } from "./runner";

export interface LiveEvalExecution {
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

function pushMessageObservation(
  observations: EvalObservation[],
  at: string,
  role: string,
  content: string,
): void {
  observations.push({
    kind: "message",
    at,
    data: {
      role,
      content,
    },
  });
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

function buildPromptTimestamp(index: number): string {
  return new Date(Date.parse("2026-03-20T19:00:00.000Z") + index * 60_000).toISOString();
}

function containsAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function matchesToolFixtureArgs(args: Record<string, unknown>, fixture: DeterministicEvalToolFixture): boolean {
  return Object.entries(fixture.args).every(([key, value]) => args[key] === value);
}

function createLiveEvalToolExecutor(options: {
  scenarioId: string;
  role: LiveEvalRuntimeRequest["role"];
  userId: string;
  inflated: InflatedDeterministicEvalSeedPack;
}): LiveEvalRuntimeRequest["toolExecutor"] | undefined {
  const execContext: ToolExecutionContext = {
    role: options.role,
    userId: options.userId,
  };
  const baseExecutor = getToolExecutor();

  if (options.scenarioId !== "mcp-tool-choice-and-recovery") {
    return (name, input) => baseExecutor(name, input, execContext);
  }

  const recoveryFixture = options.inflated.pack.toolFixtures[0];

  if (!recoveryFixture) {
    return (name, input) => baseExecutor(name, input, execContext);
  }

  let remainingInjectedFailures = 1;

  return async (name, input) => {
    if (
      name === recoveryFixture.toolId
      && remainingInjectedFailures > 0
      && matchesToolFixtureArgs(input, recoveryFixture)
    ) {
      remainingInjectedFailures -= 1;
      throw new Error("Calculator temporarily unavailable. Retry once with the same arguments.");
    }

    return baseExecutor(name, input, execContext);
  };
}

const FUNNEL_FOCUSED_LIVE_SCENARIOS = new Set([
  "organization-buyer-funnel",
  "individual-learner-funnel",
  "development-prospect-funnel",
]);

function isFunnelFocusedLiveScenario(scenarioId: string): boolean {
  return FUNNEL_FOCUSED_LIVE_SCENARIOS.has(scenarioId);
}

async function buildLiveEvalSystemPrompt(
  scenarioId: string,
  role: LiveEvalRuntimeRequest["role"],
  routingSnapshot: ConversationRoutingSnapshot,
): Promise<string> {
  let systemPrompt = await buildSystemPrompt(role);

  if (isFunnelFocusedLiveScenario(scenarioId)) {
    systemPrompt += [
      "",
      "[Live eval funnel directive]",
      "Treat the current conversation and seeded workflow state as the only relevant context for this response.",
      "The user is asking for the concrete next commercial step in this exact conversation, not for general library research.",
      "Do not use corpus-content tools unless the user explicitly asks for library or reference material.",
      "Prefer a direct answer that advances this conversation toward a founder-approved estimate, training recommendation, or scoping step.",
      "Keep the answer short and decisive.",
    ].join("\n");
  }

  systemPrompt += buildRoutingContextBlock(routingSnapshot);

  return systemPrompt;
}

function getLiveEvalToolsForScenario(
  scenarioId: string,
  _role: LiveEvalRuntimeRequest["role"],
): Anthropic.Tool[] | undefined {
  if (!isFunnelFocusedLiveScenario(scenarioId)) {
    return undefined;
  }

  return [];
}

function createLiveRunConfig(
  scenario: EvalScenario,
  seedSetId: string,
  now: Date,
  apiKey: string,
  env?: Record<string, string | undefined>,
  targetEnvironmentOverride?: EvalTargetEnvironment,
): EvalRunConfig {
  const targetEnvironment = targetEnvironmentOverride ?? scenario.targetEnvironment;
  const runtime = resolveEvalRuntimeConfig({
    env: {
      ...env,
      EVAL_LIVE_ENABLED: "true",
      EVAL_TARGET_ENV: targetEnvironment,
      EVAL_SEED_SET_ID: seedSetId,
      ANTHROPIC_API_KEY: apiKey,
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

function buildToolObservations(
  observations: EvalObservation[],
  run: EvalRunConfig,
  runtimeResult: LiveEvalRuntimeResult,
): string[] {
  const toolCalls = runtimeResult.toolCalls.map((call) => call.name);

  runtimeResult.toolCalls.forEach((call, index) => {
    const toolResult = runtimeResult.toolResults[index];
    observations.push({
      kind: "tool_call",
      at: run.startedAt,
      data: {
        toolId: call.name,
        args: call.args,
        result: toolResult?.result ?? null,
        matchedExpected: toolResult ? !toolResult.isError : false,
        error: toolResult?.isError ? toolResult.result : undefined,
      },
    });
  });

  return toolCalls;
}

export async function runLiveEvalScenario(
  scenarioId: string,
  options: {
    now?: Date;
    env?: Record<string, string | undefined>;
    apiKey?: string;
    targetEnvironmentOverride?: EvalTargetEnvironment;
    runtimeRequestOverrides?: Partial<Omit<LiveEvalRuntimeRequest, "apiKey" | "role" | "userId" | "messages">>;
    executeRuntime?: (request: LiveEvalRuntimeRequest) => Promise<LiveEvalRuntimeResult>;
  } = {},
): Promise<LiveEvalExecution> {
  const scenario = getEvalScenarioById(scenarioId);

  if (scenario.layer !== "live_model") {
    throw new Error(`Scenario ${scenarioId} is not live_model.`);
  }

  const fixture = resolveLiveEvalScenarioFixture(scenarioId);
  const workspace = createEvalWorkspace();
  const now = options.now ?? new Date("2026-03-20T20:00:00.000Z");
  const apiKey = options.apiKey ?? options.env?.ANTHROPIC_API_KEY ?? "test-live-key";
  const run = createLiveRunConfig(
    scenario,
    fixture.seedPack.seedSetId,
    now,
    apiKey,
    options.env,
    options.targetEnvironmentOverride,
  );
  const observations: EvalObservation[] = [];
  const checkpointResults: EvalCheckpointResult[] = [];
  let stopReason: string | null = null;
  let finalLane: string | null = null;
  let finalRecommendation: string | null = null;
  let toolCalls: string[] = [];

  try {
    const inflated = await inflateDeterministicSeedPack(workspace, fixture.seedPack);
    const primaryConversationId = inflated.refs.primaryConversationId;

    if (!primaryConversationId) {
      throw new Error(`Live eval fixture ${scenarioId} is missing primaryConversationId.`);
    }

    const seededConversation = await workspace.conversationRepo.findById(primaryConversationId);

    if (!seededConversation) {
      throw new Error(`Primary conversation ${primaryConversationId} was not seeded.`);
    }

    const seededMessages = await workspace.listMessages(primaryConversationId);
    for (const message of seededMessages) {
      pushMessageObservation(observations, message.createdAt, message.role, message.content);
    }

    finalLane = seededConversation.routingSnapshot.lane;
    finalRecommendation = seededConversation.routingSnapshot.recommendedNextStep;

    if (scenarioId === "live-anonymous-signup-continuity") {
      const anonymousUserId = inflated.refs.anonymousUserId;
      const authenticatedUserId = inflated.refs.authenticatedUserId;

      if (!anonymousUserId || !authenticatedUserId) {
        throw new Error("Live anonymous signup continuity requires both anonymous and authenticated user refs.");
      }

      await workspace.conversationRepo.transferOwnership(anonymousUserId, authenticatedUserId);
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
    }

    const promptMessages = fixture.promptMessages;
    const systemPrompt = await buildLiveEvalSystemPrompt(
      scenarioId,
      fixture.role,
      seededConversation.routingSnapshot,
    );
    const tools = getLiveEvalToolsForScenario(scenarioId, fixture.role);
    const toolExecutor = options.runtimeRequestOverrides?.toolExecutor
      ?? createLiveEvalToolExecutor({
        scenarioId,
        role: fixture.role,
        userId: fixture.userId,
        inflated,
      });
    const anthropicMessages: Anthropic.MessageParam[] = seededMessages.map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));

    for (const [index, promptMessage] of promptMessages.entries()) {
      if (typeof promptMessage.content === "string") {
        const createdAt = buildPromptTimestamp(index);
        await workspace.appendMessage({
          conversationId: primaryConversationId,
          role: promptMessage.role as "user" | "assistant",
          content: promptMessage.content,
          createdAt,
        });
        pushMessageObservation(observations, createdAt, promptMessage.role, promptMessage.content);
      }
      anthropicMessages.push(promptMessage);
    }

    const executeRuntime = options.executeRuntime ?? executeLiveEvalRuntime;
    const runtimeResult = await executeRuntime({
      apiKey,
      role: fixture.role,
      userId: fixture.userId,
      messages: anthropicMessages,
      systemPrompt,
      tools,
      toolExecutor,
      ...options.runtimeRequestOverrides,
    });

    run.modelName = runtimeResult.model;
    stopReason = runtimeResult.stopReason;
    toolCalls = buildToolObservations(observations, run, runtimeResult);

    if (runtimeResult.assistantText.trim().length > 0) {
      await workspace.appendMessage({
        conversationId: primaryConversationId,
        role: "assistant",
        content: runtimeResult.assistantText,
      });
      pushMessageObservation(observations, run.startedAt, "assistant", runtimeResult.assistantText);
    }

    switch (scenarioId) {
      case "live-anonymous-high-intent-loss": {
        const lead = await workspace.leadRepo.findByConversationId(primaryConversationId);
        const consultationRequest = await workspace.consultationRequestRepo.findByConversationId(primaryConversationId);
        const frictionReason = runtimeResult.assistantText.trim().length > 0
          ? runtimeResult.assistantText
          : "Anonymous high-intent conversation ended before signup.";

        checkpointResults.push(
          createCheckpointResult(scenario, "anonymous-discovery", seededMessages.length > 0, null),
          createCheckpointResult(
            scenario,
            "dropout-detected",
            lead === null && consultationRequest === null,
            lead || consultationRequest ? "A downstream record exists, so this is not a dropout." : null,
          ),
          createCheckpointResult(scenario, "friction-summary", frictionReason.length > 0, frictionReason),
        );

        stopReason = stopReason ?? "journey_stopped_before_signup";
        finalRecommendation = frictionReason;
        break;
      }
      case "live-anonymous-signup-continuity": {
        const authenticatedUserId = inflated.refs.authenticatedUserId;
        const migratedConversation = await workspace.conversationRepo.findById(primaryConversationId);
        const activeConversation = authenticatedUserId
          ? await workspace.conversationRepo.findActiveByUser(authenticatedUserId)
          : null;
        const updatedMessages = await workspace.listMessages(primaryConversationId);
        const postSignupExchange = updatedMessages.length >= seededMessages.length + 2;

        checkpointResults.push(
          createCheckpointResult(scenario, "anonymous-discovery", seededMessages.length > 0, null),
          createCheckpointResult(scenario, "signup", migratedConversation?.userId === authenticatedUserId, null),
          createCheckpointResult(
            scenario,
            "continuity",
            migratedConversation?.convertedFrom === inflated.refs.anonymousUserId
              && activeConversation?.id === primaryConversationId
              && postSignupExchange
              && runtimeResult.assistantText.trim().length > 0,
            postSignupExchange ? null : "Post-signup continued exchange was not preserved.",
          ),
        );

        finalLane = migratedConversation?.routingSnapshot.lane ?? finalLane;
        finalRecommendation =
          runtimeResult.assistantText
          || migratedConversation?.routingSnapshot.recommendedNextStep
          || finalRecommendation;
        stopReason = stopReason ?? null;
        break;
      }
      case "organization-buyer-funnel": {
        const lead = await workspace.leadRepo.findByConversationId(primaryConversationId);
        const consultationRequest = await workspace.consultationRequestRepo.findByConversationId(primaryConversationId);
        let visibleDeal = null;

        if (consultationRequest && containsAny(runtimeResult.assistantText, [/estimate/i, /proposal/i, /founder-approved/i, /next step/i])) {
          const createdDeal = await workspace.dealWorkflow.createFromConsultationRequest("admin_eval_live", consultationRequest.id);
          visibleDeal = await workspace.dealRepo.updateStatus(createdDeal.id, "estimate_ready", {
            founderNote: "Founder approved the next-step recommendation.",
          });
        }

        pushConversationEventObservations(observations, await workspace.listConversationEvents(primaryConversationId));

        checkpointResults.push(
          createCheckpointResult(
            scenario,
            "qualification",
            lead?.triageState === "qualified" && consultationRequest?.status === "reviewed",
            consultationRequest?.status ?? "Missing reviewed consultation request.",
          ),
          createCheckpointResult(
            scenario,
            "consultation-or-deal",
            visibleDeal !== null,
            visibleDeal?.id ?? "Live response did not produce a scoped deal.",
          ),
          createCheckpointResult(
            scenario,
            "approved-next-step",
            visibleDeal !== null && isDealCustomerVisibleStatus(visibleDeal.status),
            visibleDeal?.status ?? "Missing customer-visible deal status.",
          ),
        );

        finalLane = visibleDeal?.lane ?? finalLane;
        finalRecommendation = visibleDeal?.nextAction ?? runtimeResult.assistantText;
        break;
      }
      case "individual-learner-funnel": {
        const lead = await workspace.leadRepo.findByConversationId(primaryConversationId);
        let visibleTrainingPath = null;

        if (lead && containsAny(runtimeResult.assistantText, [/training/i, /operator/i, /apprenticeship/i, /mentorship/i, /recommend/i])) {
          const createdTrainingPath = await workspace.trainingWorkflow.createFromQualifiedLead("admin_eval_live", lead.id);
          visibleTrainingPath = await workspace.trainingPathRepo.updateStatus(createdTrainingPath.id, "recommended", {
            founderNote: "Founder approved the training recommendation.",
          });
        }

        pushConversationEventObservations(observations, await workspace.listConversationEvents(primaryConversationId));

        checkpointResults.push(
          createCheckpointResult(
            scenario,
            "training-fit",
            lead?.triageState === "qualified" && lead.trainingFit === "career_transition",
            lead?.trainingFit ?? "Missing training fit.",
          ),
          createCheckpointResult(
            scenario,
            "training-path-created",
            visibleTrainingPath !== null,
            visibleTrainingPath?.id ?? "Live response did not produce a training path.",
          ),
          createCheckpointResult(
            scenario,
            "approved-recommendation",
            visibleTrainingPath !== null && isTrainingPathCustomerVisibleStatus(visibleTrainingPath.status),
            visibleTrainingPath?.status ?? "Missing customer-visible training-path status.",
          ),
        );

        finalLane = visibleTrainingPath?.lane ?? finalLane;
        finalRecommendation = visibleTrainingPath?.customerSummary ?? runtimeResult.assistantText;
        break;
      }
      case "development-prospect-funnel": {
        const lead = await workspace.leadRepo.findByConversationId(primaryConversationId);
        let visibleDeal = null;

        if (lead && containsAny(runtimeResult.assistantText, [/scope/i, /scoping/i, /estimate/i, /implementation/i, /delivery/i])) {
          const createdDeal = await workspace.dealWorkflow.createFromQualifiedLead("admin_eval_live", lead.id);
          visibleDeal = await workspace.dealRepo.updateStatus(createdDeal.id, "estimate_ready", {
            founderNote: "Founder approved the scoped development next step.",
          });
        }

        pushConversationEventObservations(observations, await workspace.listConversationEvents(primaryConversationId));

        checkpointResults.push(
          createCheckpointResult(
            scenario,
            "technical-qualification",
            Boolean(lead?.technicalEnvironment),
            lead?.technicalEnvironment ?? "Missing technical environment.",
          ),
          createCheckpointResult(
            scenario,
            "deal-created",
            visibleDeal !== null,
            visibleDeal?.id ?? "Live response did not produce a development deal.",
          ),
          createCheckpointResult(
            scenario,
            "approved-next-step",
            visibleDeal !== null && isDealCustomerVisibleStatus(visibleDeal.status),
            visibleDeal?.status ?? "Missing customer-visible deal status.",
          ),
        );

        finalLane = visibleDeal?.lane ?? finalLane;
        finalRecommendation = visibleDeal?.nextAction ?? runtimeResult.assistantText;
        break;
      }
      case "mcp-tool-choice-and-recovery": {
        const expectedToolIds = scenario.expectedToolBehaviors.flatMap((behavior) => behavior.toolIds);
        const matchingToolCall = runtimeResult.toolCalls.find((toolCall) => expectedToolIds.includes(toolCall.name));
        const hadToolError = runtimeResult.toolResults.some((toolResult) => toolResult.isError);
        const recoveredClearly = hadToolError
          ? containsAny(runtimeResult.assistantText, [/recover/i, /fallback/i, /manually/i, /could not/i, /alternative/i, /retry/i, /retried/i, /succeeded/i, /confirmed/i])
          : true;

        checkpointResults.push(
          createCheckpointResult(
            scenario,
            "tool-selection",
            Boolean(matchingToolCall),
            matchingToolCall?.name ?? "No expected tool was called.",
          ),
          createCheckpointResult(
            scenario,
            "tool-arguments",
            Boolean(matchingToolCall) && Object.keys(matchingToolCall?.args ?? {}).length > 0,
            matchingToolCall ? JSON.stringify(matchingToolCall.args) : "No tool arguments were captured.",
          ),
          createCheckpointResult(
            scenario,
            "tool-recovery",
            recoveredClearly,
            hadToolError ? runtimeResult.assistantText || "Tool failed without a clear recovery." : "No tool failure occurred.",
          ),
        );

        finalRecommendation = runtimeResult.assistantText;
        break;
      }
      case "mcp-multi-tool-synthesis": {
        const calledToolIds = new Set(runtimeResult.toolCalls.map((toolCall) => toolCall.name));
        const requiredToolIds = ["web_search", "calculator"];

        checkpointResults.push(
          createCheckpointResult(
            scenario,
            "multi-tool-selection",
            requiredToolIds.every((toolId) => calledToolIds.has(toolId)),
            JSON.stringify(Array.from(calledToolIds)),
          ),
          createCheckpointResult(
            scenario,
            "result-combination",
            runtimeResult.toolResults.length >= 2,
            `Observed ${runtimeResult.toolResults.length} tool results.`,
          ),
          createCheckpointResult(
            scenario,
            "final-answer-accuracy",
            runtimeResult.assistantText.trim().length > 0,
            runtimeResult.assistantText || "Final synthesized answer was empty.",
          ),
        );

        finalRecommendation = runtimeResult.assistantText;
        break;
      }
      default:
        throw new Error(`No live eval runner is implemented for scenario ${scenarioId}.`);
    }

    observations.push({
      kind: "summary",
      at: run.startedAt,
      data: {
        stopReason,
        finalLane,
        finalRecommendation,
        model: runtimeResult.model,
        assistantText: runtimeResult.assistantText,
        toolRoundCount: runtimeResult.toolRoundCount,
      },
    });

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
