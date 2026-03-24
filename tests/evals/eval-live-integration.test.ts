import { describe, expect, it, vi } from "vitest";

import { runLiveEvalScenario } from "@/lib/evals/live-runner";
import { buildEvalRunReport, serializeEvalRunReport } from "@/lib/evals/reporting";
import { scoreEvalExecution } from "@/lib/evals/scoring";

describe("eval live integration", () => {
  it("runs, scores, and serializes a live anonymous dropout scenario", async () => {
    const execution = await runLiveEvalScenario("live-anonymous-high-intent-loss", {
      executeRuntime: vi.fn().mockResolvedValue({
        model: "claude-sonnet-4-6",
        assistantText: "The prospect showed strong purchase intent but likely dropped because signup friction interrupted the handoff.",
        stopReason: "end_turn",
        toolRoundCount: 1,
        toolCalls: [],
        toolResults: [],
        systemPrompt: "system",
        toolCount: 0,
      }),
    });

    const report = buildEvalRunReport({
      scenarioId: execution.scenario.id,
      cohortId: execution.scenario.cohortId,
      run: execution.run,
      observations: execution.observations,
      dimensions: scoreEvalExecution(execution),
    });

    expect(report.passed).toBe(true);
    expect(report.scorecard.dimensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "funnel_completion", passed: true }),
        expect.objectContaining({ id: "continuity", passed: true }),
      ]),
    );

    const artifact = JSON.parse(serializeEvalRunReport(report)) as Record<string, unknown>;
    expect(artifact).toEqual(expect.objectContaining({ scenarioId: "live-anonymous-high-intent-loss", passed: true }));
  });

  it("produces failure reasons when a required live tool checkpoint fails", async () => {
    const execution = await runLiveEvalScenario("mcp-tool-choice-and-recovery", {
      executeRuntime: vi.fn().mockResolvedValue({
        model: "claude-haiku-4-5",
        assistantText: "I answered directly without using a tool.",
        stopReason: "end_turn",
        toolRoundCount: 1,
        toolCalls: [],
        toolResults: [],
        systemPrompt: "system",
        toolCount: 0,
      }),
    });

    const report = buildEvalRunReport({
      scenarioId: execution.scenario.id,
      cohortId: execution.scenario.cohortId,
      run: execution.run,
      observations: execution.observations,
      dimensions: scoreEvalExecution(execution),
    });

    expect(report.passed).toBe(false);
    expect(report.failureReasons.length).toBeGreaterThan(0);
    expect(report.failureReasons.join(" ")).toMatch(/tool/i);
  });

  it("serializes a successful organization buyer funnel run", async () => {
    const execution = await runLiveEvalScenario("organization-buyer-funnel", {
      executeRuntime: vi.fn().mockResolvedValue({
        model: "claude-sonnet-4-6",
        assistantText: "Founder-approved estimate ready.",
        stopReason: "end_turn",
        toolRoundCount: 1,
        toolCalls: [],
        toolResults: [],
        systemPrompt: "system",
        toolCount: 0,
      }),
    });

    const report = buildEvalRunReport({
      scenarioId: execution.scenario.id,
      cohortId: execution.scenario.cohortId,
      run: execution.run,
      observations: execution.observations,
      dimensions: scoreEvalExecution(execution),
    });

    expect(report.passed).toBe(true);
    expect(report.run.modelName).toBe("claude-sonnet-4-6");
    expect(JSON.parse(serializeEvalRunReport(report))).toEqual(
      expect.objectContaining({ scenarioId: "organization-buyer-funnel", passed: true }),
    );
  });

  it("produces a mixed scorecard for a multi-tool partial success", async () => {
    const execution = await runLiveEvalScenario("mcp-multi-tool-synthesis", {
      executeRuntime: vi.fn().mockResolvedValue({
        model: "claude-sonnet-4-6",
        assistantText: "I combined part of the evidence, but the result remained incomplete.",
        stopReason: "end_turn",
        toolRoundCount: 2,
        toolCalls: [
          { name: "web_search", args: { query: "pricing baseline" } },
          { name: "calculator", args: { operation: "add", a: 2, b: 3 } },
        ],
        toolResults: [
          { name: "web_search", result: { hits: 2 }, isError: false },
          { name: "calculator", result: 5, isError: false },
        ],
        systemPrompt: "system",
        toolCount: 2,
      }),
    });

    const dimensions = scoreEvalExecution(execution);
    expect(dimensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "tool_selection", passed: true }),
        expect.objectContaining({ id: "tool_correctness", passed: true }),
      ]),
    );
  });
});