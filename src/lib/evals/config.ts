import type { EvalExecutionMode, EvalModelProvider, EvalTargetEnvironment } from "./domain";

type EvalEnvironment = Record<string, string | undefined>;

export interface EvalRuntimeConfig {
  mode: EvalExecutionMode;
  targetEnvironment: EvalTargetEnvironment;
  modelProvider: EvalModelProvider;
  modelName: string | null;
  seedSetId: string;
  startedAt: string;
}

interface EvalRuntimeConfigOptions {
  env?: EvalEnvironment;
  now?: Date;
}

function readEnv(env: EvalEnvironment, key: string): string | undefined {
  const value = env[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function resolveTargetEnvironment(env: EvalEnvironment): EvalTargetEnvironment {
  const targetEnvironment = readEnv(env, "EVAL_TARGET_ENV");

  if (!targetEnvironment) {
    return env.CI ? "ci" : "local";
  }

  if (targetEnvironment !== "local" && targetEnvironment !== "ci" && targetEnvironment !== "staging") {
    throw new Error("EVAL_TARGET_ENV must be one of local, ci, or staging.");
  }

  return targetEnvironment;
}

export function resolveEvalRuntimeConfig(options: EvalRuntimeConfigOptions = {}): EvalRuntimeConfig {
  const env: EvalEnvironment = options.env ?? process.env;
  const startedAt = (options.now ?? new Date()).toISOString();
  const targetEnvironment = resolveTargetEnvironment(env);
  const liveEnabled = readEnv(env, "EVAL_LIVE_ENABLED") === "true";

  if (!liveEnabled) {
    return {
      mode: "deterministic",
      targetEnvironment,
      modelProvider: "none",
      modelName: null,
      seedSetId: readEnv(env, "EVAL_SEED_SET_ID") ?? "deterministic-baseline",
      startedAt,
    };
  }

  if (targetEnvironment === "ci") {
    throw new Error("Live evals are not allowed in the ci target environment.");
  }

  const apiKey = readEnv(env, "ANTHROPIC_API_KEY");

  if (!apiKey) {
    throw new Error("Live evals require ANTHROPIC_API_KEY.");
  }

  return {
    mode: "live",
    targetEnvironment,
    modelProvider: "anthropic",
    modelName: readEnv(env, "ANTHROPIC_MODEL") ?? "claude-haiku-4-5",
    seedSetId: readEnv(env, "EVAL_SEED_SET_ID") ?? "manual-live-run",
    startedAt,
  };
}