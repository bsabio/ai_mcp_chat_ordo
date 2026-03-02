import { afterEach, describe, expect, it } from "vitest";
import { getLivenessProbe, getReadinessProbe } from "@/lib/health/probes";

const ORIGINAL_ENV = process.env;

describe("health probes", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns liveness ok", () => {
    const result = getLivenessProbe();
    expect(result.status).toBe("ok");
  });

  it("returns readiness ok when env is present", () => {
    process.env = {
      ...ORIGINAL_ENV,
      ANTHROPIC_API_KEY: "test-key",
      ANTHROPIC_MODEL: "claude-haiku-4-5",
    };

    const result = getReadinessProbe();
    expect(result.status).toBe("ok");
  });

  it("returns readiness error when key is missing", () => {
    process.env = {
      ...ORIGINAL_ENV,
      ANTHROPIC_API_KEY: "",
      API__ANTHROPIC_API_KEY: "",
    };

    const result = getReadinessProbe();
    expect(result.status).toBe("error");
  });
});
