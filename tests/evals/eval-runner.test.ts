import { describe, expect, it } from "vitest";

import { runDeterministicEvalScenario } from "@/lib/evals/runner";

describe("eval deterministic runner", () => {
  it("preserves continuity across anonymous signup migration", async () => {
    const execution = await runDeterministicEvalScenario("anonymous-signup-continuity");

    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "signup", passed: true }),
        expect.objectContaining({ id: "continuity", passed: true }),
      ]),
    );
    expect(execution.observations.filter((observation) => observation.kind === "message")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ data: expect.objectContaining({ content: expect.stringContaining("I signed up") }) }),
        expect.objectContaining({ data: expect.objectContaining({ content: expect.stringContaining("conversation stays intact") }) }),
      ]),
    );
    expect(execution.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "state_transition",
          data: expect.objectContaining({ transition: "conversation_migrated" }),
        }),
      ]),
    );
  });

  it("records a no-tool deterministic scenario without tool_call observations", async () => {
    const execution = await runDeterministicEvalScenario("mcp-tool-avoidance");

    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "tool-avoided", passed: true }),
      ]),
    );
    expect(execution.observations.filter((observation) => observation.kind === "tool_call")).toEqual([]);
  });

  it("records a positive calculator tool call with arguments and expected result", async () => {
    const execution = await runDeterministicEvalScenario("mcp-calculator-must-use");
    const toolCall = execution.observations.find((observation) => observation.kind === "tool_call");

    expect(toolCall).toMatchObject({
      data: {
        toolId: "calculator",
        args: { operation: "multiply", a: 14, b: 3 },
        result: 42,
        matchedExpected: true,
      },
    });
    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "tool-called", passed: true }),
        expect.objectContaining({ id: "answer-correct", passed: true }),
      ]),
    );
  });

  it("records routing reroute transitions deterministically", async () => {
    const execution = await runDeterministicEvalScenario("misclassification-reroute");

    expect(execution.finalState.lane).toBe("development");
    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "reroute", passed: true }),
        expect.objectContaining({ id: "updated-next-step", passed: true }),
      ]),
    );
  });

  it("creates an estimate-ready deal for the deterministic organization buyer funnel", async () => {
    const execution = await runDeterministicEvalScenario("organization-buyer-deterministic");

    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "qualification", passed: true }),
        expect.objectContaining({ id: "consultation-or-deal", passed: true }),
        expect.objectContaining({ id: "approved-next-step", passed: true }),
      ]),
    );
    expect(execution.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "state_transition", data: expect.objectContaining({ transition: "deal_created" }) }),
      ]),
    );
  });

  it("creates a founder-approved training recommendation for the deterministic learner funnel", async () => {
    const execution = await runDeterministicEvalScenario("individual-learner-deterministic");

    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "training-fit", passed: true }),
        expect.objectContaining({ id: "training-path-created", passed: true }),
        expect.objectContaining({ id: "approved-recommendation", passed: true }),
      ]),
    );
    expect(execution.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "state_transition", data: expect.objectContaining({ transition: "training_path_recommended" }) }),
      ]),
    );
  });
});