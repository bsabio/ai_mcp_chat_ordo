import type { EvalRunReport } from "./domain";
import { buildEvalRunReport } from "./reporting";
import { scoreEvalExecution } from "./scoring";
import { runLiveEvalScenario } from "./live-runner";
import { resolveEvalRuntimeConfig } from "./config";

export const DEFAULT_STAGING_CANARY_SCENARIO_IDS = [
  "organization-buyer-funnel",
  "individual-learner-funnel",
  "development-prospect-funnel",
  "mcp-tool-choice-and-recovery",
] as const;

export type StagingCanaryScenarioId = (typeof DEFAULT_STAGING_CANARY_SCENARIO_IDS)[number];

export interface StagingCanaryScenarioResult {
  scenarioId: string;
  cohortId: string;
  passed: boolean;
  summary: string;
  failureReasons: string[];
  stopReason: string | null;
  modelName: string | null;
  targetEnvironment: "staging";
  baseUrl: string;
  startedAt: string;
  report: EvalRunReport | null;
  error: string | null;
}

export interface StagingCanarySummary {
  version: 1;
  status: "passed" | "failed";
  targetEnvironment: "staging";
  baseUrl: string;
  startedAt: string;
  finishedAt: string;
  scenarioIds: string[];
  passedScenarioCount: number;
  failedScenarioCount: number;
  results: StagingCanaryScenarioResult[];
}

interface StagingCanaryOptions {
  env?: Record<string, string | undefined>;
  scenarioIds?: string[];
  baseUrl?: string;
  now?: Date;
  apiKey?: string;
  executeScenario?: typeof runLiveEvalScenario;
}

function readEnv(env: Record<string, string | undefined>, key: string): string | undefined {
  const value = env[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function assertStagingCanaryEnabled(env: Record<string, string | undefined>): void {
  if (readEnv(env, "EVAL_LIVE_ENABLED") !== "true") {
    throw new Error("Staging canaries require EVAL_LIVE_ENABLED=true.");
  }

  const runtime = resolveEvalRuntimeConfig({ env });

  if (runtime.mode !== "live") {
    throw new Error("Staging canaries require live eval mode.");
  }

  if (runtime.targetEnvironment !== "staging") {
    throw new Error("Staging canaries require EVAL_TARGET_ENV=staging.");
  }
}

export function resolveStagingCanaryBaseUrl(
  baseUrl: string | undefined,
  env: Record<string, string | undefined>,
): string {
  const candidate = baseUrl ?? readEnv(env, "EVAL_DEPLOYED_BASE_URL") ?? readEnv(env, "EVAL_STAGING_BASE_URL");

  if (!candidate) {
    throw new Error("Staging canaries require EVAL_DEPLOYED_BASE_URL, EVAL_STAGING_BASE_URL, or --base-url.");
  }

  try {
    const parsed = new URL(candidate);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid protocol");
    }

    return parsed.toString().replace(/\/$/, "");
  } catch {
    throw new Error("Staging canary base URL must be a valid http or https URL.");
  }
}

export function resolveStagingCanaryScenarioIds(requestedScenarioIds?: string[]): string[] {
  if (!requestedScenarioIds || requestedScenarioIds.length === 0) {
    return [...DEFAULT_STAGING_CANARY_SCENARIO_IDS];
  }

  const uniqueScenarioIds = [...new Set(requestedScenarioIds.map((scenarioId) => scenarioId.trim()).filter(Boolean))];
  const invalidScenarioIds = uniqueScenarioIds.filter(
    (scenarioId) => !DEFAULT_STAGING_CANARY_SCENARIO_IDS.includes(scenarioId as StagingCanaryScenarioId),
  );

  if (invalidScenarioIds.length > 0) {
    throw new Error(
      `Unsupported staging canary scenario(s): ${invalidScenarioIds.join(", ")}. Allowed scenarios: ${DEFAULT_STAGING_CANARY_SCENARIO_IDS.join(", ")}`,
    );
  }

  return uniqueScenarioIds;
}

function createScenarioFailureResult(
  scenarioId: string,
  baseUrl: string,
  startedAt: string,
  error: unknown,
): StagingCanaryScenarioResult {
  const message = error instanceof Error ? error.message : String(error);

  return {
    scenarioId,
    cohortId: "unknown",
    passed: false,
    summary: `${scenarioId} failed in live mode on staging before a report could be generated.`,
    failureReasons: [message],
    stopReason: null,
    modelName: null,
    targetEnvironment: "staging",
    baseUrl,
    startedAt,
    report: null,
    error: message,
  };
}

function createCanaryReport(execution: Awaited<ReturnType<typeof runLiveEvalScenario>>): EvalRunReport {
  return buildEvalRunReport({
    scenarioId: execution.scenario.id,
    cohortId: execution.scenario.cohortId,
    run: {
      ...execution.run,
      layer: "staging_canary",
      targetEnvironment: "staging",
    },
    observations: execution.observations,
    dimensions: scoreEvalExecution(execution),
  });
}

export async function runStagingCanary(options: StagingCanaryOptions = {}): Promise<StagingCanarySummary> {
  const env = options.env ?? process.env;
  assertStagingCanaryEnabled(env);

  const baseUrl = resolveStagingCanaryBaseUrl(options.baseUrl, env);
  const scenarioIds = resolveStagingCanaryScenarioIds(options.scenarioIds);
  const executeScenario = options.executeScenario ?? runLiveEvalScenario;
  const startedAt = (options.now ?? new Date()).toISOString();
  const results: StagingCanaryScenarioResult[] = [];

  for (const scenarioId of scenarioIds) {
    const scenarioNow = options.now ?? new Date();
    try {
      const execution = await executeScenario(scenarioId, {
        env: {
          ...env,
          EVAL_LIVE_ENABLED: "true",
          EVAL_TARGET_ENV: "staging",
        },
        apiKey: options.apiKey ?? env.ANTHROPIC_API_KEY ?? env.API__ANTHROPIC_API_KEY,
        now: scenarioNow,
        targetEnvironmentOverride: "staging",
      });
      const report = createCanaryReport(execution);

      results.push({
        scenarioId: execution.scenario.id,
        cohortId: execution.scenario.cohortId,
        passed: report.passed,
        summary: report.summary,
        failureReasons: report.failureReasons,
        stopReason: execution.stopReason,
        modelName: report.run.modelName,
        targetEnvironment: "staging",
        baseUrl,
        startedAt: report.run.startedAt,
        report,
        error: null,
      });
    } catch (error) {
      results.push(createScenarioFailureResult(scenarioId, baseUrl, scenarioNow.toISOString(), error));
    }
  }

  const passedScenarioCount = results.filter((result) => result.passed).length;
  const failedScenarioCount = results.length - passedScenarioCount;

  return {
    version: 1,
    status: failedScenarioCount === 0 ? "passed" : "failed",
    targetEnvironment: "staging",
    baseUrl,
    startedAt,
    finishedAt: new Date().toISOString(),
    scenarioIds,
    passedScenarioCount,
    failedScenarioCount,
    results,
  };
}