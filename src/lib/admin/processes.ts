import fs from "node:fs";
import path from "node:path";
import { validateRequiredRuntimeConfig, getAnthropicModel } from "@/lib/config/env";
import { getLivenessProbe, getReadinessProbe } from "@/lib/health/probes";
import { getMetricsSnapshot } from "@/lib/observability/metrics";

export type AdminStatus = "ok" | "error";

export function getDiagnosticsReport() {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const releaseManifestPath = path.join(process.cwd(), "release", "manifest.json");

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as { version?: string; name?: string };

  return {
    status: "ok" as const,
    generatedAt: new Date().toISOString(),
    appName: packageJson.name ?? "unknown",
    appVersion: packageJson.version ?? "unknown",
    nodeVersion: process.version,
    nodeEnv: process.env.NODE_ENV ?? "development",
    anthropicModel: getAnthropicModel(),
    releaseManifestPresent: fs.existsSync(releaseManifestPath),
    metrics: getMetricsSnapshot(),
  };
}

export function getHealthSweepReport() {
  const liveness = getLivenessProbe();
  const readiness = getReadinessProbe();

  return {
    status: readiness.status === "ok" && liveness.status === "ok" ? ("ok" as const) : ("error" as const),
    generatedAt: new Date().toISOString(),
    liveness,
    readiness,
  };
}

export function getEnvValidationReport(): { status: AdminStatus; message: string } {
  try {
    validateRequiredRuntimeConfig();
    return {
      status: "ok",
      message: "Environment validation passed.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Environment validation failed.",
    };
  }
}
