import { describe, expect, it } from "vitest";

import { runDeterministicEvalScenario } from "./runner";

function expectRequiredCheckpointsToPass(
  execution: Awaited<ReturnType<typeof runDeterministicEvalScenario>>,
): void {
  const failedRequired = execution.checkpointResults.filter(
    (checkpoint) => checkpoint.required && !checkpoint.passed,
  );

  expect(failedRequired).toEqual([]);
}

describe("runDeterministicEvalScenario retrieval contracts", () => {
  it("passes the two-stage retrieval integrity scenario", async () => {
    const execution = await runDeterministicEvalScenario("integrity-two-stage-retrieval-deterministic");

    expectRequiredCheckpointsToPass(execution);
  });

  it("passes the structured get_section integrity scenario", async () => {
    const execution = await runDeterministicEvalScenario("integrity-structured-get-section-deterministic");

    expectRequiredCheckpointsToPass(execution);
  });
});