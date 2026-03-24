import { describe, expect, it } from "vitest";

import { resolveEvalRuntimeConfig } from "@/lib/evals/config";

describe("eval config", () => {
  it("fails closed to deterministic mode by default", () => {
    expect(resolveEvalRuntimeConfig({
      env: {},
      now: new Date("2026-03-20T00:00:00.000Z"),
    })).toEqual({
      mode: "deterministic",
      targetEnvironment: "local",
      modelProvider: "none",
      modelName: null,
      seedSetId: "deterministic-baseline",
      startedAt: "2026-03-20T00:00:00.000Z",
    });
  });

  it("blocks live evals in ci", () => {
    expect(() => resolveEvalRuntimeConfig({
      env: {
        CI: "true",
        EVAL_LIVE_ENABLED: "true",
        ANTHROPIC_API_KEY: "secret",
      },
    })).toThrow("Live evals are not allowed in the ci target environment.");
  });

  it("requires a real key for live evals", () => {
    expect(() => resolveEvalRuntimeConfig({
      env: {
        EVAL_LIVE_ENABLED: "true",
        EVAL_TARGET_ENV: "local",
      },
    })).toThrow("Live evals require ANTHROPIC_API_KEY or API__ANTHROPIC_API_KEY.");
  });

  it("returns live eval metadata when explicitly enabled", () => {
    expect(resolveEvalRuntimeConfig({
      env: {
        EVAL_LIVE_ENABLED: "true",
        EVAL_TARGET_ENV: "staging",
        EVAL_SEED_SET_ID: "seed-pack-1",
        ANTHROPIC_API_KEY: "secret",
        ANTHROPIC_MODEL: "claude-sonnet-4-6",
      },
      now: new Date("2026-03-20T01:00:00.000Z"),
    })).toEqual({
      mode: "live",
      targetEnvironment: "staging",
      modelProvider: "anthropic",
      modelName: "claude-sonnet-4-6",
      seedSetId: "seed-pack-1",
      startedAt: "2026-03-20T01:00:00.000Z",
    });
  });
});