import { describe, expect, it } from "vitest";

import { buildEvalRunReport, serializeEvalRunReport } from "@/lib/evals/reporting";
import { runDeterministicEvalScenario } from "@/lib/evals/runner";
import { scoreDeterministicEvalExecution } from "@/lib/evals/scoring";

describe("eval integration", () => {
  it("runs, scores, and serializes a deterministic signup continuity scenario", async () => {
    const execution = await runDeterministicEvalScenario("anonymous-signup-continuity");
    const report = buildEvalRunReport({
      scenarioId: execution.scenario.id,
      cohortId: execution.scenario.cohortId,
      run: execution.run,
      observations: execution.observations,
      dimensions: scoreDeterministicEvalExecution(execution),
    });

    expect(report.passed).toBe(true);
    expect(report.scorecard.dimensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "funnel_completion", passed: true }),
        expect.objectContaining({ id: "continuity", passed: true }),
      ]),
    );

    const artifact = JSON.parse(serializeEvalRunReport(report)) as Record<string, unknown>;
    expect(artifact).toEqual(expect.objectContaining({ version: 1, scenarioId: "anonymous-signup-continuity", passed: true }));
  });

  it("demonstrates both positive and no-tool observation paths across the deterministic-first set", async () => {
    const calculatorExecution = await runDeterministicEvalScenario("mcp-calculator-must-use");
    const avoidanceExecution = await runDeterministicEvalScenario("mcp-tool-avoidance");

    expect(calculatorExecution.observations.some((observation) => observation.kind === "tool_call")).toBe(true);
    expect(avoidanceExecution.observations.some((observation) => observation.kind === "tool_call")).toBe(false);
  });

  it("runs, scores, and serializes a deterministic downstream buyer funnel scenario", async () => {
    const execution = await runDeterministicEvalScenario("organization-buyer-deterministic");
    const report = buildEvalRunReport({
      scenarioId: execution.scenario.id,
      cohortId: execution.scenario.cohortId,
      run: execution.run,
      observations: execution.observations,
      dimensions: scoreDeterministicEvalExecution(execution),
    });

    expect(report.passed).toBe(true);
    expect(report.scorecard.dimensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "funnel_completion", passed: true }),
        expect.objectContaining({ id: "customer_clarity", passed: true }),
      ]),
    );

    const artifact = JSON.parse(serializeEvalRunReport(report)) as Record<string, unknown>;
    expect(artifact).toEqual(expect.objectContaining({ scenarioId: "organization-buyer-deterministic", passed: true }));
  });
});