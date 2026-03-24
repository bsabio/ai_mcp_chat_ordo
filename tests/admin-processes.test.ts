import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDiagnosticsReport,
  getEnvValidationReport,
  getHealthSweepReport,
} from "@/lib/admin/processes";
import { resetMetrics } from "@/lib/observability/metrics";

describe("admin processes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetMetrics();
  });

  it("returns diagnostics with runtime metadata", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("ANTHROPIC_MODEL", "claude-haiku-4-5");

    const report = getDiagnosticsReport();
    expect(report.status).toBe("ok");
    expect(report.appName).toBeTruthy();
    expect(report.nodeVersion).toContain("v");
  });

  it("returns health sweep ok when env is valid", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("ANTHROPIC_MODEL", "claude-haiku-4-5");

    const report = getHealthSweepReport();
    expect(report.status).toBe("ok");
    expect(report.readiness.status).toBe("ok");
  });

  it("returns env validation error when key is missing", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("API__ANTHROPIC_API_KEY", "");

    const report = getEnvValidationReport();
    expect(report.status).toBe("error");
  });
});
