import { afterEach, describe, expect, it, vi } from "vitest";
import { getLivenessProbe, getReadinessProbe } from "@/lib/health/probes";

describe("health probes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns liveness ok", () => {
    const result = getLivenessProbe();
    expect(result.status).toBe("ok");
  });

  it("returns readiness ok when env is present", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("ANTHROPIC_MODEL", "claude-haiku-4-5");

    const result = getReadinessProbe();
    expect(result.status).toBe("ok");
  });

  it("returns readiness error when key is missing", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("API__ANTHROPIC_API_KEY", "");

    const result = getReadinessProbe();
    expect(result.status).toBe("error");
  });
});
