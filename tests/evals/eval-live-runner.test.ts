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

  it("inspects a completed blog job and publishes the produced draft in the live runner", async () => {
    const execution = await runLiveEvalScenario("live-blog-job-status-and-publish-handoff", {
      executeRuntime: vi.fn().mockImplementation(async (request) => {
        const toolExecutor = request.toolExecutor;

        if (!toolExecutor) {
          throw new Error("Expected a tool executor for the live blog status scenario.");
        }

        const listed = await toolExecutor("list_deferred_jobs", { active_only: false, limit: 5 }) as {
          jobs: Array<{ part: { jobId: string } }>;
        };
        const jobId = listed.jobs[0]?.part.jobId;

        if (!jobId) {
          throw new Error("Expected a seeded deferred job.");
        }

        const status = await toolExecutor("get_deferred_job_status", { job_id: jobId }) as {
          job: { part: { resultPayload: { id: string; slug: string } } };
        };
        const postId = status.job.part.resultPayload.id;
        const publish = await toolExecutor("publish_content", { post_id: postId });

        return {
          model: "claude-sonnet-4-6",
          assistantText: `Published the completed draft at /blog/${status.job.part.resultPayload.slug}.`,
          stopReason: "end_turn",
          toolRoundCount: 3,
          toolCalls: [
            { name: "list_deferred_jobs", args: { active_only: false, limit: 5 } },
            { name: "get_deferred_job_status", args: { job_id: jobId } },
            { name: "publish_content", args: { post_id: postId } },
          ],
          toolResults: [
            { name: "list_deferred_jobs", result: listed, isError: false },
            { name: "get_deferred_job_status", result: status, isError: false },
            { name: "publish_content", result: publish, isError: false },
          ],
          systemPrompt: request.systemPrompt ?? "system",
          toolCount: request.tools?.length ?? 0,
        };
      }),
    });

    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "job-inspected", passed: true }),
        expect.objectContaining({ id: "publish-triggered", passed: true }),
        expect.objectContaining({ id: "publish-complete", passed: true }),
      ]),
    );
  });

  it("reuses an existing running blog job instead of rerunning production in the live runner", async () => {
    const execution = await runLiveEvalScenario("live-blog-job-reuse-instead-of-rerun", {
      executeRuntime: vi.fn().mockImplementation(async (request) => {
        const toolExecutor = request.toolExecutor;

        if (!toolExecutor) {
          throw new Error("Expected a tool executor for the live blog reuse scenario.");
        }

        const listed = await toolExecutor("list_deferred_jobs", { active_only: true, limit: 5 }) as {
          jobs: Array<{ part: { jobId: string; progressLabel?: string } }>;
        };
        const jobId = listed.jobs[0]?.part.jobId;

        if (!jobId) {
          throw new Error("Expected an active deferred job.");
        }

        const status = await toolExecutor("get_deferred_job_status", { job_id: jobId });

        return {
          model: "claude-sonnet-4-6",
          assistantText: "The existing job is still running, so I am reusing it instead of starting over.",
          stopReason: "end_turn",
          toolRoundCount: 2,
          toolCalls: [
            { name: "list_deferred_jobs", args: { active_only: true, limit: 5 } },
            { name: "get_deferred_job_status", args: { job_id: jobId } },
          ],
          toolResults: [
            { name: "list_deferred_jobs", result: listed, isError: false },
            { name: "get_deferred_job_status", result: status, isError: false },
          ],
          systemPrompt: request.systemPrompt ?? "system",
          toolCount: request.tools?.length ?? 0,
        };
      }),
    });

    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "existing-job-found", passed: true }),
        expect.objectContaining({ id: "rerun-avoided", passed: true }),
        expect.objectContaining({ id: "active-status-explained", passed: true }),
      ]),
    );
  });

  it("recovers a completed blog job through the snapshot path in the live runner", async () => {
    const execution = await runLiveEvalScenario("live-blog-completion-recovery", {
      executeRuntime: vi.fn().mockImplementation(async (request) => {
        const toolExecutor = request.toolExecutor;

        if (!toolExecutor) {
          throw new Error("Expected a tool executor for the live blog recovery scenario.");
        }

        const listed = await toolExecutor("list_deferred_jobs", { active_only: false, limit: 5 }) as {
          jobs: Array<{ part: { jobId: string } }>;
        };
        const jobId = listed.jobs[0]?.part.jobId;

        if (!jobId) {
          throw new Error("Expected a completed deferred job.");
        }

        const status = await toolExecutor("get_deferred_job_status", { job_id: jobId });

        return {
          model: "claude-sonnet-4-6",
          assistantText: "I recovered the completed draft from the status snapshot, and it is ready to publish without rerunning production.",
          stopReason: "end_turn",
          toolRoundCount: 2,
          toolCalls: [
            { name: "list_deferred_jobs", args: { active_only: false, limit: 5 } },
            { name: "get_deferred_job_status", args: { job_id: jobId } },
          ],
          toolResults: [
            { name: "list_deferred_jobs", result: listed, isError: false },
            { name: "get_deferred_job_status", result: status, isError: false },
          ],
          systemPrompt: request.systemPrompt ?? "system",
          toolCount: request.tools?.length ?? 0,
        };
      }),
    });

    expect(execution.checkpointResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "terminal-job-recovered", passed: true }),
        expect.objectContaining({ id: "publish-readiness-explained", passed: true }),
        expect.objectContaining({ id: "completion-visible-without-rerun", passed: true }),
      ]),
    );
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