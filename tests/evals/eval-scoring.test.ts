import { describe, expect, it } from "vitest";

import { runDeterministicEvalScenario } from "@/lib/evals/runner";
import { scoreDeterministicEvalExecution, scoreEvalExecution } from "@/lib/evals/scoring";

describe("eval scoring", () => {
  it("scores deterministic must-use tool execution from structured observations", async () => {
    const execution = await runDeterministicEvalScenario("mcp-calculator-must-use");
    const dimensions = scoreDeterministicEvalExecution(execution);

    expect(dimensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "tool_selection", passed: true }),
        expect.objectContaining({ id: "tool_correctness", passed: true, score: 1 }),
        expect.objectContaining({ id: "customer_clarity", passed: true }),
      ]),
    );
  });

  it("scores deterministic no-tool behavior as safe and correct avoidance", async () => {
    const execution = await runDeterministicEvalScenario("mcp-tool-avoidance");
    const dimensions = scoreDeterministicEvalExecution(execution);

    expect(dimensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "tool_selection", passed: true }),
        expect.objectContaining({ id: "safety", passed: true }),
      ]),
    );
  });

  it("supports mixed live-style scorecards where some dimensions pass and others fail", () => {
    const dimensions = scoreEvalExecution({
      scenario: {
        expectedToolBehaviors: [
          { policy: "must_use", toolIds: ["calculator"] },
        ],
        scoreDimensions: ["tool_selection", "tool_correctness", "customer_clarity"],
      },
      checkpointResults: [
        { id: "tool-selection", label: "tool selection", required: true, passed: false, details: "No tool used." },
        { id: "answer-correct", label: "answer correct", required: true, passed: true, details: null },
      ],
      observations: [
        {
          kind: "tool_call",
          data: {
            toolId: "calculator",
            matchedExpected: false,
            error: "temporarily unavailable",
          },
        },
      ],
      stopReason: "end_turn",
      finalState: {
        lane: "uncertain",
        recommendation: "Fallback answer",
        toolCalls: ["calculator"],
      },
    });

    expect(dimensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "tool_selection", passed: true }),
        expect.objectContaining({ id: "tool_correctness", passed: false }),
        expect.objectContaining({ id: "customer_clarity", passed: true }),
      ]),
    );
  });

  it("treats recovery scenarios as correct when a retry eventually returns the expected tool result", () => {
    const dimensions = scoreEvalExecution({
      scenario: {
        expectedToolBehaviors: [
          { policy: "must_use", toolIds: ["calculator"] },
          { policy: "recover", toolIds: ["calculator"] },
        ],
        scoreDimensions: ["tool_selection", "tool_correctness", "recovery"],
      },
      checkpointResults: [
        { id: "tool-recovery", label: "tool recovery", required: true, passed: true, details: "Retried successfully." },
      ],
      observations: [
        {
          kind: "tool_call",
          data: {
            toolId: "calculator",
            matchedExpected: false,
            error: "temporarily unavailable",
          },
        },
        {
          kind: "tool_call",
          data: {
            toolId: "calculator",
            matchedExpected: true,
          },
        },
      ],
      stopReason: "end_turn",
      finalState: {
        lane: "uncertain",
        recommendation: "Recovered total: 9",
        toolCalls: ["calculator", "calculator"],
      },
    });

    expect(dimensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "tool_selection", passed: true }),
        expect.objectContaining({ id: "tool_correctness", passed: true, score: 1, maxScore: 1 }),
        expect.objectContaining({ id: "recovery", passed: true }),
      ]),
    );
  });

  it("treats fallback continuity scoring as passed when no continuity checkpoints are defined", () => {
    const dimensions = scoreEvalExecution({
      scenario: {
        expectedToolBehaviors: [],
        scoreDimensions: ["continuity", "customer_clarity"],
      },
      checkpointResults: [
        { id: "qualification", label: "qualification", required: true, passed: true, details: null },
        { id: "approved-next-step", label: "approved next step", required: true, passed: true, details: null },
      ],
      observations: [],
      stopReason: "end_turn",
      finalState: {
        lane: "organization",
        recommendation: "Founder-approved next step",
        toolCalls: [],
      },
    });

    expect(dimensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "continuity", passed: true, score: 1, maxScore: 1 }),
        expect.objectContaining({ id: "customer_clarity", passed: true }),
      ]),
    );
  });
});