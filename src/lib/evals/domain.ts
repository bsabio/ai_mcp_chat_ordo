export type EvalLayer = "deterministic" | "live_model" | "staging_canary";
export type EvalTargetEnvironment = "local" | "ci" | "staging";
export type EvalPrimaryLane = "organization" | "individual" | "development" | "uncertain" | "mixed";
export type EvalEntryMode = "anonymous" | "authenticated" | "mixed";
export type EvalIntentDepth = "low" | "medium" | "high";
export type EvalUrgency = "low" | "medium" | "high";
export type EvalBudgetSignal = "none" | "unclear" | "likely" | "confirmed";
export type EvalTechnicalMaturity = "non_technical" | "mixed" | "technical";
export type EvalExecutionMode = "deterministic" | "live";
export type EvalModelProvider = "none" | "anthropic";
export type EvalObservationKind = "message" | "tool_call" | "state_transition" | "checkpoint" | "summary";

export interface EvalCheckpointExpectation {
  id: string;
  label: string;
  required: boolean;
}

export interface EvalExpectedToolBehavior {
  policy: "must_use" | "avoid" | "recover";
  toolIds: string[];
  rationale: string;
}

export interface EvalCohort {
  id: string;
  name: string;
  entryMode: EvalEntryMode;
  primaryLane: EvalPrimaryLane;
  urgency: EvalUrgency;
  budgetSignal: EvalBudgetSignal;
  technicalMaturity: EvalTechnicalMaturity;
  intentDepth: EvalIntentDepth;
  notes: string[];
}

export interface EvalScenario {
  id: string;
  name: string;
  cohortId: string;
  layer: EvalLayer;
  targetEnvironment: EvalTargetEnvironment;
  requiredFixtures: string[];
  expectedCheckpoints: EvalCheckpointExpectation[];
  expectedToolBehaviors: EvalExpectedToolBehavior[];
  scoreDimensions: string[];
}

export interface EvalRunConfig {
  scenarioId: string;
  layer: EvalLayer;
  targetEnvironment: EvalTargetEnvironment;
  mode: EvalExecutionMode;
  modelProvider: EvalModelProvider;
  modelName: string | null;
  seedSetId: string;
  startedAt: string;
}

export interface EvalObservation {
  kind: EvalObservationKind;
  at: string;
  data: Record<string, unknown>;
}

export interface EvalScoreDimension {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  passed: boolean;
  details: string | null;
}

export interface EvalScorecard {
  dimensions: EvalScoreDimension[];
  totalScore: number;
  maxScore: number;
  passed: boolean;
}

export interface EvalRunReport {
  scenarioId: string;
  cohortId: string;
  run: EvalRunConfig;
  observations: EvalObservation[];
  scorecard: EvalScorecard;
  summary: string;
  passed: boolean;
  failureReasons: string[];
}

const EVAL_LAYERS: readonly EvalLayer[] = ["deterministic", "live_model", "staging_canary"];
const EVAL_TARGET_ENVIRONMENTS: readonly EvalTargetEnvironment[] = ["local", "ci", "staging"];
const EVAL_PRIMARY_LANES: readonly EvalPrimaryLane[] = ["organization", "individual", "development", "uncertain", "mixed"];
const EVAL_ENTRY_MODES: readonly EvalEntryMode[] = ["anonymous", "authenticated", "mixed"];
const EVAL_INTENT_DEPTHS: readonly EvalIntentDepth[] = ["low", "medium", "high"];
const EVAL_URGENCY_LEVELS: readonly EvalUrgency[] = ["low", "medium", "high"];
const EVAL_BUDGET_SIGNALS: readonly EvalBudgetSignal[] = ["none", "unclear", "likely", "confirmed"];
const EVAL_TECHNICAL_MATURITY_LEVELS: readonly EvalTechnicalMaturity[] = ["non_technical", "mixed", "technical"];
const EVAL_MODEL_PROVIDERS: readonly EvalModelProvider[] = ["none", "anthropic"];
const EVAL_EXECUTION_MODES: readonly EvalExecutionMode[] = ["deterministic", "live"];
const EVAL_OBSERVATION_KINDS: readonly EvalObservationKind[] = ["message", "tool_call", "state_transition", "checkpoint", "summary"];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoTimestamp(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

function includesValue<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.includes(value as T);
}

export function validateEvalCohort(cohort: EvalCohort): string[] {
  const errors: string[] = [];

  if (!isNonEmptyString(cohort.id)) {
    errors.push("cohort.id is required.");
  }

  if (!isNonEmptyString(cohort.name)) {
    errors.push("cohort.name is required.");
  }

  if (!includesValue(EVAL_ENTRY_MODES, cohort.entryMode)) {
    errors.push("cohort.entryMode must be valid.");
  }

  if (!includesValue(EVAL_PRIMARY_LANES, cohort.primaryLane)) {
    errors.push("cohort.primaryLane must be valid.");
  }

  if (!includesValue(EVAL_URGENCY_LEVELS, cohort.urgency)) {
    errors.push("cohort.urgency must be valid.");
  }

  if (!includesValue(EVAL_BUDGET_SIGNALS, cohort.budgetSignal)) {
    errors.push("cohort.budgetSignal must be valid.");
  }

  if (!includesValue(EVAL_TECHNICAL_MATURITY_LEVELS, cohort.technicalMaturity)) {
    errors.push("cohort.technicalMaturity must be valid.");
  }

  if (!includesValue(EVAL_INTENT_DEPTHS, cohort.intentDepth)) {
    errors.push("cohort.intentDepth must be valid.");
  }

  if (!Array.isArray(cohort.notes) || cohort.notes.some((note) => !isNonEmptyString(note))) {
    errors.push("cohort.notes must contain only non-empty strings.");
  }

  return errors;
}

export function validateEvalScenario(scenario: EvalScenario, cohortIds: readonly string[]): string[] {
  const errors: string[] = [];

  if (!isNonEmptyString(scenario.id)) {
    errors.push("scenario.id is required.");
  }

  if (!isNonEmptyString(scenario.name)) {
    errors.push("scenario.name is required.");
  }

  if (!cohortIds.includes(scenario.cohortId)) {
    errors.push(`scenario.cohortId must reference a known cohort: ${scenario.cohortId}`);
  }

  if (!includesValue(EVAL_LAYERS, scenario.layer)) {
    errors.push("scenario.layer must be valid.");
  }

  if (!includesValue(EVAL_TARGET_ENVIRONMENTS, scenario.targetEnvironment)) {
    errors.push("scenario.targetEnvironment must be valid.");
  }

  if (!Array.isArray(scenario.requiredFixtures) || scenario.requiredFixtures.length === 0) {
    errors.push("scenario.requiredFixtures must include at least one fixture.");
  }

  if (Array.isArray(scenario.requiredFixtures) && scenario.requiredFixtures.some((fixture) => !isNonEmptyString(fixture))) {
    errors.push("scenario.requiredFixtures must contain only non-empty strings.");
  }

  if (!Array.isArray(scenario.expectedCheckpoints) || scenario.expectedCheckpoints.length === 0) {
    errors.push("scenario.expectedCheckpoints must include at least one checkpoint.");
  }

  if (Array.isArray(scenario.expectedCheckpoints)) {
    for (const checkpoint of scenario.expectedCheckpoints) {
      if (!isNonEmptyString(checkpoint.id)) {
        errors.push("scenario checkpoint id is required.");
      }

      if (!isNonEmptyString(checkpoint.label)) {
        errors.push(`scenario checkpoint label is required for ${checkpoint.id || "unknown"}.`);
      }
    }
  }

  if (!Array.isArray(scenario.expectedToolBehaviors)) {
    errors.push("scenario.expectedToolBehaviors must be an array.");
  }

  if (Array.isArray(scenario.expectedToolBehaviors)) {
    for (const behavior of scenario.expectedToolBehaviors) {
      if (!["must_use", "avoid", "recover"].includes(behavior.policy)) {
        errors.push("scenario expectedToolBehaviors policy must be valid.");
      }

      if (!Array.isArray(behavior.toolIds) || behavior.toolIds.some((toolId) => !isNonEmptyString(toolId))) {
        errors.push("scenario expectedToolBehaviors.toolIds must contain only non-empty strings.");
      }

      if (!isNonEmptyString(behavior.rationale)) {
        errors.push("scenario expectedToolBehaviors.rationale is required.");
      }
    }
  }

  if (!Array.isArray(scenario.scoreDimensions) || scenario.scoreDimensions.length === 0) {
    errors.push("scenario.scoreDimensions must include at least one dimension.");
  }

  if (Array.isArray(scenario.scoreDimensions) && scenario.scoreDimensions.some((dimension) => !isNonEmptyString(dimension))) {
    errors.push("scenario.scoreDimensions must contain only non-empty strings.");
  }

  return errors;
}

export function validateEvalRunConfig(config: EvalRunConfig): string[] {
  const errors: string[] = [];

  if (!isNonEmptyString(config.scenarioId)) {
    errors.push("run.scenarioId is required.");
  }

  if (!includesValue(EVAL_LAYERS, config.layer)) {
    errors.push("run.layer must be valid.");
  }

  if (!includesValue(EVAL_TARGET_ENVIRONMENTS, config.targetEnvironment)) {
    errors.push("run.targetEnvironment must be valid.");
  }

  if (!includesValue(EVAL_EXECUTION_MODES, config.mode)) {
    errors.push("run.mode must be valid.");
  }

  if (!includesValue(EVAL_MODEL_PROVIDERS, config.modelProvider)) {
    errors.push("run.modelProvider must be valid.");
  }

  if (!isNonEmptyString(config.seedSetId)) {
    errors.push("run.seedSetId is required.");
  }

  if (!isNonEmptyString(config.startedAt) || !isIsoTimestamp(config.startedAt)) {
    errors.push("run.startedAt must be a valid ISO timestamp.");
  }

  if (config.mode === "live" && config.modelProvider === "none") {
    errors.push("live runs must declare a real model provider.");
  }

  if (config.mode === "deterministic" && config.modelProvider !== "none") {
    errors.push("deterministic runs must use modelProvider 'none'.");
  }

  if (config.modelProvider === "none" && config.modelName !== null) {
    errors.push("modelName must be null when modelProvider is 'none'.");
  }

  if (config.modelProvider !== "none" && !isNonEmptyString(config.modelName)) {
    errors.push("modelName is required for live runs.");
  }

  return errors;
}

export function validateEvalObservation(observation: EvalObservation): string[] {
  const errors: string[] = [];

  if (!includesValue(EVAL_OBSERVATION_KINDS, observation.kind)) {
    errors.push("observation.kind must be valid.");
  }

  if (!isNonEmptyString(observation.at) || !isIsoTimestamp(observation.at)) {
    errors.push("observation.at must be a valid ISO timestamp.");
  }

  if (observation.data == null || Array.isArray(observation.data) || typeof observation.data !== "object") {
    errors.push("observation.data must be an object.");
  }

  return errors;
}

export function normalizeEvalObservation(observation: EvalObservation): EvalObservation {
  return {
    kind: observation.kind,
    at: new Date(observation.at).toISOString(),
    data: { ...observation.data },
  };
}

export function normalizeEvalScoreDimension(dimension: EvalScoreDimension): EvalScoreDimension {
  const maxScore = Number.isFinite(dimension.maxScore) && dimension.maxScore > 0
    ? Math.trunc(dimension.maxScore)
    : 1;
  const rawScore = Number.isFinite(dimension.score) ? dimension.score : 0;
  const score = Math.min(Math.max(Math.trunc(rawScore), 0), maxScore);

  return {
    ...dimension,
    score,
    maxScore,
    passed: dimension.passed && score >= maxScore,
    details: dimension.details ?? null,
  };
}

export function createEvalScorecard(dimensions: EvalScoreDimension[]): EvalScorecard {
  const normalizedDimensions = dimensions.map(normalizeEvalScoreDimension);
  const totalScore = normalizedDimensions.reduce((sum, dimension) => sum + dimension.score, 0);
  const maxScore = normalizedDimensions.reduce((sum, dimension) => sum + dimension.maxScore, 0);

  return {
    dimensions: normalizedDimensions,
    totalScore,
    maxScore,
    passed: normalizedDimensions.every((dimension) => dimension.passed),
  };
}