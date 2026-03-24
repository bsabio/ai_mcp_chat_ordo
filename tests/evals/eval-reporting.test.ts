import { describe, expect, it } from "vitest";

import { buildEvalRunReport, serializeEvalRunReport, summarizeEvalRun } from "@/lib/evals/reporting";

describe("eval reporting", () => {
  it("builds a report with derived summary and failure reasons", () => {
    const report = buildEvalRunReport({
      scenarioId: "organization-buyer-funnel",
      cohortId: "signed-in-buyer",
      run: {
        scenarioId: "organization-buyer-funnel",
        layer: "live_model",
        targetEnvironment: "local",
        mode: "live",
        modelProvider: "anthropic",
        modelName: "claude-haiku-4-5",
        seedSetId: "seed-live-1",
        startedAt: "2026-03-20T02:00:00.000Z",
      },
      observations: [
        {
          kind: "checkpoint",
          at: "2026-03-20T02:00:01.000Z",
          data: {
            checkpointId: "qualification",
            passed: true,
          },
        },
      ],
      dimensions: [
        {
          id: "funnel_completion",
          label: "Funnel completion",
          score: 3,
          maxScore: 3,
          passed: true,
          details: null,
        },
        {
          id: "customer_clarity",
          label: "Customer clarity",
          score: 1,
          maxScore: 2,
          passed: false,
          details: "Next action language was too vague.",
        },
      ],
    });

    expect(report.passed).toBe(false);
    expect(report.failureReasons).toEqual(["Next action language was too vague."]);
    expect(summarizeEvalRun(report)).toMatch(/organization-buyer-funnel failed/i);
    expect(report.observations).toEqual([
      {
        kind: "checkpoint",
        at: "2026-03-20T02:00:01.000Z",
        data: {
          checkpointId: "qualification",
          passed: true,
        },
      },
    ]);
  });

  it("serializes a JSON-safe artifact", () => {
    const report = buildEvalRunReport({
      scenarioId: "anonymous-high-intent-dropout",
      cohortId: "anonymous-org-buyer",
      run: {
        scenarioId: "anonymous-high-intent-dropout",
        layer: "deterministic",
        targetEnvironment: "ci",
        mode: "deterministic",
        modelProvider: "none",
        modelName: null,
        seedSetId: "deterministic-baseline",
        startedAt: "2026-03-20T03:00:00.000Z",
      },
      observations: [],
      dimensions: [
        {
          id: "continuity",
          label: "Continuity",
          score: 2,
          maxScore: 2,
          passed: true,
          details: null,
        },
      ],
    });

    const artifact = JSON.parse(serializeEvalRunReport(report)) as Record<string, unknown>;

    expect(artifact.version).toBe(1);
    expect(artifact.scenarioId).toBe("anonymous-high-intent-dropout");
    expect(artifact.passed).toBe(true);
    expect(artifact.scorecard).toEqual(expect.objectContaining({ totalScore: 2, maxScore: 2 }));
  });
});