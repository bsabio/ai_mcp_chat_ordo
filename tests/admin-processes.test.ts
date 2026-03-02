import { afterEach, describe, expect, it } from "vitest";
import {
  getDiagnosticsReport,
  getEnvValidationReport,
  getHealthSweepReport,
} from "@/lib/admin/processes";
import { resetMetrics } from "@/lib/observability/metrics";

const ORIGINAL_ENV = process.env;

describe("admin processes", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    resetMetrics();
  });

  it("returns diagnostics with runtime metadata", () => {
    process.env = {
      ...ORIGINAL_ENV,
      ANTHROPIC_API_KEY: "test-key",
      ANTHROPIC_MODEL: "claude-haiku-4-5",
    };

    const report = getDiagnosticsReport();
    expect(report.status).toBe("ok");
    expect(report.appName).toBeTruthy();
    expect(report.nodeVersion).toContain("v");
  });

  it("returns health sweep ok when env is valid", () => {
    process.env = {
      ...ORIGINAL_ENV,
      ANTHROPIC_API_KEY: "test-key",
      ANTHROPIC_MODEL: "claude-haiku-4-5",
    };

    const report = getHealthSweepReport();
    expect(report.status).toBe("ok");
    expect(report.readiness.status).toBe("ok");
  });

  it("returns env validation error when key is missing", () => {
    process.env = {
      ...ORIGINAL_ENV,
      ANTHROPIC_API_KEY: "",
      API__ANTHROPIC_API_KEY: "",
    };

    const report = getEnvValidationReport();
    expect(report.status).toBe("error");
  });
});
