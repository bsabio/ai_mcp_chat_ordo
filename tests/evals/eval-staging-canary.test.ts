import { describe, expect, it, vi } from "vitest";

import { type LiveEvalExecution } from "@/lib/evals/live-runner";
import {
  DEFAULT_STAGING_CANARY_SCENARIO_IDS,
  resolveStagingCanaryBaseUrl,
  resolveStagingCanaryScenarioIds,
  runStagingCanary,
} from "@/lib/evals/staging-canary";

function createExecution(overrides: Partial<LiveEvalExecution> = {}): LiveEvalExecution {
  return {
    scenario: {
      id: "organization-buyer-funnel",
      name: "Organization buyer funnel",
      cohortId: "signed-in-buyer",
      layer: "live_model",
      targetEnvironment: "local",
      requiredFixtures: ["signed-in user"],
      expectedCheckpoints: [
        { id: "qualification", label: "qualification", required: true },
        { id: "consultation-or-deal", label: "consultation-or-deal", required: true },
        { id: "approved-next-step", label: "approved-next-step", required: true },
      ],
      expectedToolBehaviors: [],
      scoreDimensions: ["funnel_completion", "customer_clarity"],
    },
    run: {
      scenarioId: "organization-buyer-funnel",
      layer: "live_model",
      targetEnvironment: "staging",
      mode: "live",
      modelProvider: "anthropic",
      modelName: "claude-sonnet-4-6",
      seedSetId: "staging-seed-pack",
      startedAt: "2026-03-20T12:00:00.000Z",
    },
    observations: [],
    checkpointResults: [
      { id: "qualification", label: "qualification", required: true, passed: true, details: null },
      { id: "consultation-or-deal", label: "consultation-or-deal", required: true, passed: true, details: null },
      { id: "approved-next-step", label: "approved-next-step", required: true, passed: true, details: null },
    ],
    stopReason: "end_turn",
    finalState: {
      lane: "organization",
      recommendation: "Founder-approved estimate ready.",
      toolCalls: [],
      promptProvenance: null,
    },
    ...overrides,
  };
}

const STAGING_ENV = {
  EVAL_LIVE_ENABLED: "true",
  EVAL_TARGET_ENV: "staging",
  EVAL_DEPLOYED_BASE_URL: "https://www.studioordo.com/",
  ANTHROPIC_API_KEY: "secret",
};

describe("staging canary", () => {
  it("runs the requested staging scenario set and rewrites reports to staging_canary", async () => {
    const executeScenario = vi.fn<typeof import("@/lib/evals/live-runner").runLiveEvalScenario>()
      .mockResolvedValue(createExecution());

    const summary = await runStagingCanary({
      env: STAGING_ENV,
      scenarioIds: ["organization-buyer-funnel"],
      executeScenario,
      now: new Date("2026-03-20T12:00:00.000Z"),
    });

    expect(summary.status).toBe("passed");
    expect(summary.baseUrl).toBe("https://www.studioordo.com");
    expect(summary.scenarioIds).toEqual(["organization-buyer-funnel"]);
    expect(summary.results[0]?.report?.run.layer).toBe("staging_canary");
    expect(summary.results[0]?.report?.run.targetEnvironment).toBe("staging");
    expect(executeScenario).toHaveBeenCalledWith(
      "organization-buyer-funnel",
      expect.objectContaining({
        targetEnvironmentOverride: "staging",
        env: expect.objectContaining({ EVAL_TARGET_ENV: "staging" }),
      }),
    );
  });

  it("fails closed when staging target environment is not explicitly selected", async () => {
    await expect(runStagingCanary({
      env: {
        EVAL_LIVE_ENABLED: "true",
        EVAL_TARGET_ENV: "local",
        EVAL_DEPLOYED_BASE_URL: "https://www.studioordo.com",
        ANTHROPIC_API_KEY: "secret",
      },
    })).rejects.toThrow("Staging canaries require EVAL_TARGET_ENV=staging.");
  });

  it("rejects scenarios outside the staging canary allowlist", () => {
    expect(() => resolveStagingCanaryScenarioIds(["live-anonymous-high-intent-loss"]))
      .toThrow(/Unsupported staging canary scenario/);
  });

  it("preserves mixed results when one scenario fails after earlier scenarios pass", async () => {
    const executeScenario = vi.fn<typeof import("@/lib/evals/live-runner").runLiveEvalScenario>()
      .mockImplementation(async (scenarioId) => {
        if (scenarioId === "individual-learner-funnel") {
          throw new Error("tool rounds exhausted");
        }

        return createExecution({
          scenario: {
            ...createExecution().scenario,
            id: scenarioId,
          },
          run: {
            ...createExecution().run,
            scenarioId,
          },
        });
      });

    const summary = await runStagingCanary({
      env: STAGING_ENV,
      scenarioIds: ["organization-buyer-funnel", "individual-learner-funnel"],
      executeScenario,
    });

    expect(summary.status).toBe("failed");
    expect(summary.passedScenarioCount).toBe(1);
    expect(summary.failedScenarioCount).toBe(1);
    expect(summary.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ scenarioId: "organization-buyer-funnel", passed: true }),
        expect.objectContaining({ scenarioId: "individual-learner-funnel", passed: false, error: "tool rounds exhausted" }),
      ]),
    );
  });

  it("uses the default scenario set and validates base URLs", () => {
    expect(resolveStagingCanaryScenarioIds()).toEqual([...DEFAULT_STAGING_CANARY_SCENARIO_IDS]);
    expect(resolveStagingCanaryBaseUrl(undefined, STAGING_ENV)).toBe("https://www.studioordo.com");
    expect(() => resolveStagingCanaryBaseUrl("ftp://invalid.example.com", STAGING_ENV)).toThrow(
      "Staging canary base URL must be a valid http or https URL.",
    );
  });

  it("falls back to the legacy staging base URL env var", () => {
    expect(resolveStagingCanaryBaseUrl(undefined, {
      ...STAGING_ENV,
      EVAL_DEPLOYED_BASE_URL: undefined,
      EVAL_STAGING_BASE_URL: "https://staging.example.com/",
    })).toBe("https://staging.example.com");
  });
});