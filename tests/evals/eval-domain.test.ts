import { describe, expect, it } from "vitest";

import {
  createEvalScorecard,
  type EvalObservation,
  normalizeEvalObservation,
  type EvalScenario,
  normalizeEvalScoreDimension,
  validateEvalObservation,
  validateEvalCohort,
  validateEvalRunConfig,
  validateEvalScenario,
} from "@/lib/evals/domain";

describe("eval domain", () => {
  it("validates a complete cohort", () => {
    expect(validateEvalCohort({
      id: "org-buyer",
      name: "Org buyer",
      entryMode: "anonymous",
      primaryLane: "organization",
      urgency: "high",
      budgetSignal: "likely",
      technicalMaturity: "mixed",
      intentDepth: "high",
      notes: ["serious buyer"],
    })).toEqual([]);
  });

  it("reports invalid scenario references and missing checkpoints", () => {
    const invalidScenario: EvalScenario = {
      id: "",
      name: "",
      cohortId: "missing",
      layer: "deterministic",
      targetEnvironment: "ci",
      requiredFixtures: [],
      expectedCheckpoints: [],
      expectedToolBehaviors: [],
      scoreDimensions: [],
    };

    expect(validateEvalScenario(invalidScenario, ["known-cohort"])).toEqual(
      expect.arrayContaining([
        "scenario.id is required.",
        "scenario.name is required.",
        "scenario.cohortId must reference a known cohort: missing",
        "scenario.requiredFixtures must include at least one fixture.",
        "scenario.expectedCheckpoints must include at least one checkpoint.",
        "scenario.scoreDimensions must include at least one dimension.",
      ]),
    );
  });

  it("normalizes score dimensions and computes a scorecard", () => {
    const dimension = normalizeEvalScoreDimension({
      id: "tool_selection",
      label: "Tool selection",
      score: 7,
      maxScore: 5,
      passed: true,
      details: "Selection was correct.",
    });

    expect(dimension).toEqual({
      id: "tool_selection",
      label: "Tool selection",
      score: 5,
      maxScore: 5,
      passed: true,
      details: "Selection was correct.",
    });

    const scorecard = createEvalScorecard([
      dimension,
      {
        id: "continuity",
        label: "Continuity",
        score: 1,
        maxScore: 2,
        passed: false,
        details: "Continuity broke after signup.",
      },
    ]);

    expect(scorecard.totalScore).toBe(6);
    expect(scorecard.maxScore).toBe(7);
    expect(scorecard.passed).toBe(false);
  });

  it("validates run config mode and provider consistency", () => {
    expect(validateEvalRunConfig({
      scenarioId: "organization-buyer-funnel",
      layer: "live_model",
      targetEnvironment: "local",
      mode: "live",
      modelProvider: "anthropic",
      modelName: "claude-haiku-4-5",
      seedSetId: "seed-live-1",
      startedAt: "2026-03-20T00:00:00.000Z",
    })).toEqual([]);

    expect(validateEvalRunConfig({
      scenarioId: "organization-buyer-funnel",
      layer: "deterministic",
      targetEnvironment: "ci",
      mode: "deterministic",
      modelProvider: "anthropic",
      modelName: "claude-haiku-4-5",
      seedSetId: "seed-1",
      startedAt: "2026-03-20T00:00:00.000Z",
    })).toContain("deterministic runs must use modelProvider 'none'.");
  });

  it("normalizes and validates observations", () => {
    const observation = normalizeEvalObservation({
      kind: "tool_call",
      at: "2026-03-20T00:00:00Z",
      data: {
        toolId: "web_search",
        arguments: { query: "workflow continuity" },
      },
    });

    expect(observation).toEqual({
      kind: "tool_call",
      at: "2026-03-20T00:00:00.000Z",
      data: {
        toolId: "web_search",
        arguments: { query: "workflow continuity" },
      },
    });

    expect(validateEvalObservation(observation)).toEqual([]);
    const invalidObservation = {
      kind: "message",
      at: "not-a-date",
      data: [],
    } as unknown as EvalObservation;

    expect(validateEvalObservation(invalidObservation)).toEqual([
      "observation.at must be a valid ISO timestamp.",
      "observation.data must be an object.",
    ]);
  });
});