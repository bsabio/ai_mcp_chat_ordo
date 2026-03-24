import { describe, expect, it, vi } from "vitest";

import { executeLiveEvalRuntime } from "@/lib/evals/live-runtime";
import { runLiveEvalScenario } from "@/lib/evals/live-runner";

describe("eval live runtime and runner", () => {
  it("executes the injected live runtime adapter with the real stream boundary shape", async () => {
    const invokeStream = vi.fn().mockResolvedValue({
      model: "claude-haiku-4-5",
      assistantText: "ok",
      stopReason: "end_turn",
      toolRoundCount: 1,
      toolCalls: [],
      toolResults: [],
    });

    const result = await executeLiveEvalRuntime({
      apiKey: "test-key",
      role: "AUTHENTICATED",
      userId: "usr_test",
      messages: [{ role: "user", content: "hello" }],
      systemPrompt: "system",
      tools: [],
      toolExecutor: vi.fn(),
      invokeStream,
    });

    expect(invokeStream).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        model: "claude-haiku-4-5",
        assistantText: "ok",
        stopReason: "end_turn",
        systemPrompt: "system",
        toolCount: 0,
      }),
    );
  });

  it("records live anonymous signup continuity with a post-signup continued exchange", async () => {
    const execution = await runLiveEvalScenario("live-anonymous-signup-continuity", {
      executeRuntime: vi.fn().mockResolvedValue({
        model: "claude-haiku-4-5",
        assistantText: "Your next step is an apprenticeship screening recommendation.",
        stopReason: "end_turn",
        toolRoundCount: 1,
        toolCalls: [],
        toolResults: [],
        systemPrompt: "system",
        toolCount: 0,
      }),
    });

    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "signup", passed: true }),
        expect.objectContaining({ id: "continuity", passed: true }),
      ]),
    );
    expect(execution.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "state_transition", data: expect.objectContaining({ transition: "conversation_migrated" }) }),
        expect.objectContaining({ kind: "summary", data: expect.objectContaining({ stopReason: "end_turn" }) }),
      ]),
    );
  });

  it("fails closed when a live eval is requested without a key", async () => {
    await expect(
      runLiveEvalScenario("organization-buyer-funnel", {
        apiKey: "",
      }),
    ).rejects.toThrow("Live evals require ANTHROPIC_API_KEY or API__ANTHROPIC_API_KEY.");
  });

  it("captures tool recovery observations and edge-case stop reasons", async () => {
    const execution = await runLiveEvalScenario("mcp-tool-choice-and-recovery", {
      executeRuntime: vi.fn().mockResolvedValue({
        model: "claude-haiku-4-5",
        assistantText: "The calculator failed once, so I recovered with a manual fallback explanation.",
        stopReason: "max_tool_rounds_exhausted",
        toolRoundCount: 4,
        toolCalls: [
          { name: "calculator", args: { operation: "add", a: 4, b: 5 } },
        ],
        toolResults: [
          { name: "calculator", result: "temporarily unavailable", isError: true },
        ],
        systemPrompt: "system",
        toolCount: 1,
      }),
    });

    expect(execution.stopReason).toBe("max_tool_rounds_exhausted");
    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "tool-selection", passed: true }),
        expect.objectContaining({ id: "tool-arguments", passed: true }),
        expect.objectContaining({ id: "tool-recovery", passed: true }),
      ]),
    );
    expect(execution.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "tool_call", data: expect.objectContaining({ toolId: "calculator", error: "temporarily unavailable" }) }),
      ]),
    );
  });

  it("injects a one-time calculator failure fixture for the live recovery scenario", async () => {
    const execution = await runLiveEvalScenario("mcp-tool-choice-and-recovery", {
      executeRuntime: vi.fn().mockImplementation(async (request) => {
        const toolExecutor = request.toolExecutor;

        if (!toolExecutor) {
          throw new Error("Expected a tool executor for the recovery scenario.");
        }

        let firstError = "";
        try {
          await toolExecutor("calculator", { operation: "add", a: 4, b: 5 });
        } catch (error) {
          firstError = error instanceof Error ? error.message : String(error);
        }

        const secondResult = await toolExecutor("calculator", { operation: "add", a: 4, b: 5 });

        return {
          model: "claude-sonnet-4-6",
          assistantText: `The calculator failed once, so I retried with the same inputs and recovered with the final total of ${String(secondResult)}.`,
          stopReason: "end_turn",
          toolRoundCount: 2,
          toolCalls: [
            { name: "calculator", args: { operation: "add", a: 4, b: 5 } },
            { name: "calculator", args: { operation: "add", a: 4, b: 5 } },
          ],
          toolResults: [
            { name: "calculator", result: firstError, isError: true },
            { name: "calculator", result: secondResult, isError: false },
          ],
          systemPrompt: request.systemPrompt ?? "system",
          toolCount: request.tools?.length ?? 0,
        };
      }),
    });

    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "tool-selection", passed: true }),
        expect.objectContaining({ id: "tool-arguments", passed: true }),
        expect.objectContaining({ id: "tool-recovery", passed: true }),
      ]),
    );
  });

  it("creates a visible downstream deal for the organization buyer funnel", async () => {
    const execution = await runLiveEvalScenario("organization-buyer-funnel", {
      executeRuntime: vi.fn().mockResolvedValue({
        model: "claude-sonnet-4-6",
        assistantText: "You are ready for a founder-approved estimate and proposal next step.",
        stopReason: "end_turn",
        toolRoundCount: 1,
        toolCalls: [],
        toolResults: [],
        systemPrompt: "system",
        toolCount: 0,
      }),
    });

    expect(execution.run.modelName).toBe("claude-sonnet-4-6");
    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "qualification", passed: true }),
        expect.objectContaining({ id: "consultation-or-deal", passed: true }),
        expect.objectContaining({ id: "approved-next-step", passed: true }),
      ]),
    );
  });

  it("injects routing context and removes corpus tools for live funnel scenarios", async () => {
    const executeRuntime = vi.fn().mockResolvedValue({
      model: "claude-sonnet-4-6",
      assistantText: "Founder-approved estimate ready.",
      stopReason: "end_turn",
      toolRoundCount: 1,
      toolCalls: [],
      toolResults: [],
      systemPrompt: "system",
      toolCount: 0,
    });

    await runLiveEvalScenario("organization-buyer-funnel", {
      executeRuntime,
    });

    expect(executeRuntime).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: [],
      }),
    );
    expect(executeRuntime.mock.calls[0]?.[0]?.systemPrompt).toContain("[Live eval funnel directive]");
    expect(executeRuntime.mock.calls[0]?.[0]?.systemPrompt).toContain("lane=organization");
    expect(executeRuntime.mock.calls[0]?.[0]?.systemPrompt).toContain("recommended_next_step=\"Prepare a founder-reviewed estimate-ready next step.\"");
  });

  it("fails the organization buyer funnel when the live response never reaches deal creation", async () => {
    const execution = await runLiveEvalScenario("organization-buyer-funnel", {
      executeRuntime: vi.fn().mockResolvedValue({
        model: "claude-haiku-4-5",
        assistantText: "You should gather more context before we decide anything.",
        stopReason: "end_turn",
        toolRoundCount: 1,
        toolCalls: [],
        toolResults: [],
        systemPrompt: "system",
        toolCount: 0,
      }),
    });

    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "consultation-or-deal", passed: false }),
        expect.objectContaining({ id: "approved-next-step", passed: false }),
      ]),
    );
  });

  it("creates a visible training recommendation for the individual learner funnel", async () => {
    const execution = await runLiveEvalScenario("individual-learner-funnel", {
      executeRuntime: vi.fn().mockResolvedValue({
        model: "claude-haiku-4-5",
        assistantText: "I recommend an apprenticeship screening and a founder-approved training recommendation.",
        stopReason: "end_turn",
        toolRoundCount: 1,
        toolCalls: [],
        toolResults: [],
        systemPrompt: "system",
        toolCount: 0,
      }),
    });

    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "training-fit", passed: true }),
        expect.objectContaining({ id: "training-path-created", passed: true }),
        expect.objectContaining({ id: "approved-recommendation", passed: true }),
      ]),
    );
  });

  it("fails the learner funnel when the recommendation is too weak to create a training path", async () => {
    const execution = await runLiveEvalScenario("individual-learner-funnel", {
      executeRuntime: vi.fn().mockResolvedValue({
        model: "claude-haiku-4-5",
        assistantText: "You should think about your goals a little more first.",
        stopReason: "end_turn",
        toolRoundCount: 1,
        toolCalls: [],
        toolResults: [],
        systemPrompt: "system",
        toolCount: 0,
      }),
    });

    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "training-path-created", passed: false }),
        expect.objectContaining({ id: "approved-recommendation", passed: false }),
      ]),
    );
  });

  it("creates a scoping-ready deal for the development prospect funnel", async () => {
    const execution = await runLiveEvalScenario("development-prospect-funnel", {
      executeRuntime: vi.fn().mockResolvedValue({
        model: "claude-sonnet-4-6",
        assistantText: "You are ready for a scoping and estimate conversation for implementation delivery.",
        stopReason: "end_turn",
        toolRoundCount: 1,
        toolCalls: [],
        toolResults: [],
        systemPrompt: "system",
        toolCount: 0,
      }),
    });

    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "technical-qualification", passed: true }),
        expect.objectContaining({ id: "deal-created", passed: true }),
        expect.objectContaining({ id: "approved-next-step", passed: true }),
      ]),
    );
  });

  it("fails the development prospect funnel when the response never reaches scoping", async () => {
    const execution = await runLiveEvalScenario("development-prospect-funnel", {
      executeRuntime: vi.fn().mockResolvedValue({
        model: "claude-haiku-4-5",
        assistantText: "This still sounds early, so keep exploring the problem first.",
        stopReason: "end_turn",
        toolRoundCount: 1,
        toolCalls: [],
        toolResults: [],
        systemPrompt: "system",
        toolCount: 0,
      }),
    });

    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "deal-created", passed: false }),
        expect.objectContaining({ id: "approved-next-step", passed: false }),
      ]),
    );
  });

  it("captures multi-tool synthesis when both tools are used and combined", async () => {
    const execution = await runLiveEvalScenario("mcp-multi-tool-synthesis", {
      executeRuntime: vi.fn().mockResolvedValue({
        model: "claude-sonnet-4-6",
        assistantText: "I combined the search context with the calculator result into one answer.",
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

    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "multi-tool-selection", passed: true }),
        expect.objectContaining({ id: "result-combination", passed: true }),
        expect.objectContaining({ id: "final-answer-accuracy", passed: true }),
      ]),
    );
  });

  it("fails multi-tool synthesis when only one tool is used", async () => {
    const execution = await runLiveEvalScenario("mcp-multi-tool-synthesis", {
      executeRuntime: vi.fn().mockResolvedValue({
        model: "claude-haiku-4-5",
        assistantText: "I only used search.",
        stopReason: "end_turn",
        toolRoundCount: 1,
        toolCalls: [
          { name: "web_search", args: { query: "pricing baseline" } },
        ],
        toolResults: [
          { name: "web_search", result: { hits: 1 }, isError: false },
        ],
        systemPrompt: "system",
        toolCount: 1,
      }),
    });

    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "multi-tool-selection", passed: false }),
      ]),
    );
  });
});