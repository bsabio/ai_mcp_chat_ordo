import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createReleaseEvidence,
  validateReleaseEvidence,
  writeReleaseEvidenceArtifacts,
} from "@/lib/evals/release-evidence";
import {
  createRuntimeIntegrityQaEvidence,
  createRuntimeInventory,
} from "@/lib/evals/runtime-integrity-evidence";
import {
  createEliteOpsEvidence,
  type EliteOpsEvidence,
} from "@/lib/evals/elite-ops-evidence";
import type { StagingCanarySummary } from "@/lib/evals/staging-canary";
import type { ProbeResult } from "@/lib/health/probes";

function createCanarySummary(overrides: Partial<StagingCanarySummary> = {}): StagingCanarySummary {
  return {
    version: 1,
    status: "passed",
    targetEnvironment: "staging",
    baseUrl: "https://www.studioordo.com",
    startedAt: "2026-03-20T12:00:00.000Z",
    finishedAt: "2026-03-20T12:05:00.000Z",
    scenarioIds: ["organization-buyer-funnel"],
    passedScenarioCount: 1,
    failedScenarioCount: 0,
    results: [
      {
        scenarioId: "organization-buyer-funnel",
        cohortId: "signed-in-buyer",
        passed: true,
        summary: "organization-buyer-funnel passed in live mode on staging with 3/3 points.",
        failureReasons: [],
        stopReason: "end_turn",
        modelName: "claude-sonnet-4-6",
        targetEnvironment: "staging",
        baseUrl: "https://www.studioordo.com",
        startedAt: "2026-03-20T12:00:00.000Z",
        report: null,
        error: null,
      },
    ],
    ...overrides,
  };
}

const MANIFEST = {
  present: true,
  manifest: {
    appName: "studio-ordo",
    version: "0.1.0",
    gitSha: "abc1234",
    gitBranch: "main",
    builtAt: "2026-03-20T10:00:00.000Z",
    nodeVersion: "v22.0.0",
  },
};

function createProbeResult(status: ProbeResult["status"]): ProbeResult {
  return {
    status,
    checks: {
      config: status,
      model: status,
    },
    details: status === "error" ? "Probe failed." : undefined,
  };
}

const HEALTH_OK = {
  status: "ok" as const,
  generatedAt: "2026-03-20T10:30:00.000Z",
  liveness: createProbeResult("ok"),
  readiness: createProbeResult("ok"),
};

const REFERRAL_DIAGNOSTICS_OK = {
  status: "ok" as const,
  publicOrigin: "https://www.studioordo.com",
  originSource: "environment" as const,
  localhostFallback: false,
  knownReferrerPromptVerified: true,
  missingReferrerPromptVerified: true,
  warnings: [],
};

function createPassingEliteOps(now: Date): EliteOpsEvidence {
  const inventory = createRuntimeInventory(now);
  const eliteOps = createEliteOpsEvidence({
    inventoryMcpProcesses: inventory.mcp.processes.map((process) => ({
      id: process.id,
      serverName: process.serverName,
      entrypoint: process.entrypoint,
      canonicalCommand: process.canonicalCommand,
      compatibilityAliases: [...process.compatibilityAliases],
      capabilityGroups: [...process.capabilityGroups],
    })),
    now,
  });

  return {
    ...eliteOps,
    status: "passed",
    blockingReasons: [],
    architectureDrift: {
      ...eliteOps.architectureDrift,
      status: "passed",
      blockingReasons: [],
    },
    rbacMatrix: {
      ...eliteOps.rbacMatrix,
      status: "passed",
      blockingReasons: [],
    },
    latencyBudgets: {
      ...eliteOps.latencyBudgets,
      status: "passed",
      blockingReasons: [],
    },
    failureModes: {
      ...eliteOps.failureModes,
      status: "passed",
      blockingReasons: [],
    },
  };
}

const RUNTIME_INTEGRITY_OK = createRuntimeIntegrityQaEvidence({
  now: new Date("2026-03-20T12:45:00.000Z"),
  eliteOps: createPassingEliteOps(new Date("2026-03-20T12:45:00.000Z")),
  steps: [
    { label: "integrity eval suites", command: "npm exec vitest run", status: "passed" },
    { label: "production build", command: "npm run build", status: "passed" },
  ],
});

describe("release evidence", () => {
  it("approves a release when manifest, health, and canaries are all green", () => {
    const evidence = createReleaseEvidence({
      manifest: MANIFEST,
      health: HEALTH_OK,
      referralDiagnostics: REFERRAL_DIAGNOSTICS_OK,
      runtimeIntegrityEvidence: RUNTIME_INTEGRITY_OK,
      canarySummary: createCanarySummary(),
      now: new Date("2026-03-20T13:00:00.000Z"),
    });

    expect(evidence.status).toBe("approved");
    expect(validateReleaseEvidence(evidence)).toEqual([]);
    expect(evidence.eliteOps.status).toBe("passed");
    expect(evidence.runtimeIntegrity.evidence?.inventory.mcp.processes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "operations",
          canonicalCommand: "npm run mcp:operations",
          compatibilityAliases: [],
        }),
      ]),
    );
  });

  it("blocks a release when canary evidence is missing", () => {
    const evidence = createReleaseEvidence({
      manifest: MANIFEST,
      health: HEALTH_OK,
      referralDiagnostics: REFERRAL_DIAGNOSTICS_OK,
      runtimeIntegrityEvidence: RUNTIME_INTEGRITY_OK,
      canarySummary: null,
    });

    expect(evidence.status).toBe("blocked");
    expect(evidence.review.blockingReasons).toContain("Staging canary summary is missing.");
    expect(validateReleaseEvidence(evidence)).toContain("Staging canary evidence is missing.");
  });

  it("blocks a release when health fails even if canaries pass", () => {
    const evidence = createReleaseEvidence({
      manifest: MANIFEST,
      health: {
        ...HEALTH_OK,
        status: "error",
        readiness: createProbeResult("error"),
      },
      referralDiagnostics: REFERRAL_DIAGNOSTICS_OK,
      runtimeIntegrityEvidence: RUNTIME_INTEGRITY_OK,
      canarySummary: createCanarySummary(),
    });

    expect(evidence.status).toBe("blocked");
    expect(evidence.review.blockingReasons).toContain("Health sweep reported an error.");
  });

  it("marks the release conditional when warnings or manual checks remain", () => {
    const evidence = createReleaseEvidence({
      manifest: MANIFEST,
      health: HEALTH_OK,
      referralDiagnostics: REFERRAL_DIAGNOSTICS_OK,
      runtimeIntegrityEvidence: RUNTIME_INTEGRITY_OK,
      canarySummary: createCanarySummary(),
      warnings: ["Known non-blocking copy issue."],
      manualChecks: ["Founder sign-off pending."],
    });

    expect(evidence.status).toBe("conditional");
    expect(evidence.review.warnings).toEqual(["Known non-blocking copy issue."]);
    expect(evidence.review.manualChecks).toEqual(["Founder sign-off pending."]);
  });

  it("writes deterministic canary and qa evidence artifacts to the release directory", () => {
    const releaseDir = fs.mkdtempSync(path.join(os.tmpdir(), "release-evidence-"));
    const canarySummary = createCanarySummary();

    const { runtimeIntegrityPath, canarySummaryPath, qaEvidencePath, evidence } = writeReleaseEvidenceArtifacts({
      releaseDir,
      manifest: MANIFEST,
      health: HEALTH_OK,
      referralDiagnostics: REFERRAL_DIAGNOSTICS_OK,
      runtimeIntegrityEvidence: RUNTIME_INTEGRITY_OK,
      canarySummary,
    });

    expect(fs.existsSync(runtimeIntegrityPath)).toBe(true);
    expect(fs.existsSync(canarySummaryPath)).toBe(true);
    expect(fs.existsSync(qaEvidencePath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(runtimeIntegrityPath, "utf8"))).toEqual(RUNTIME_INTEGRITY_OK);
    expect(JSON.parse(fs.readFileSync(canarySummaryPath, "utf8"))).toEqual(canarySummary);
    expect(JSON.parse(fs.readFileSync(qaEvidencePath, "utf8"))).toEqual(evidence);
  });

  it("blocks a release when referral identity verification fails", () => {
    const evidence = createReleaseEvidence({
      manifest: MANIFEST,
      health: HEALTH_OK,
      referralDiagnostics: {
        ...REFERRAL_DIAGNOSTICS_OK,
        status: "error",
        knownReferrerPromptVerified: false,
        warnings: ["Known-referrer prompt verification failed."],
      },
      runtimeIntegrityEvidence: RUNTIME_INTEGRITY_OK,
      canarySummary: createCanarySummary(),
    });

    expect(evidence.status).toBe("blocked");
    expect(evidence.review.blockingReasons).toContain("Referral identity verification checks failed.");
    expect(validateReleaseEvidence(evidence)).toContain("Referral identity verification evidence failed.");
  });

  it("blocks a release when runtime integrity evidence is missing or failed", () => {
    const missingEvidence = createReleaseEvidence({
      manifest: MANIFEST,
      health: HEALTH_OK,
      referralDiagnostics: REFERRAL_DIAGNOSTICS_OK,
      canarySummary: createCanarySummary(),
    });

    expect(missingEvidence.status).toBe("blocked");
    expect(missingEvidence.review.blockingReasons).toContain("Runtime integrity QA evidence is missing.");
    expect(validateReleaseEvidence(missingEvidence)).toContain("Runtime integrity QA evidence is missing.");
    expect(validateReleaseEvidence(missingEvidence)).toContain("Elite ops evidence summary is missing.");

    const failedEvidence = createReleaseEvidence({
      manifest: MANIFEST,
      health: HEALTH_OK,
      referralDiagnostics: REFERRAL_DIAGNOSTICS_OK,
      runtimeIntegrityEvidence: createRuntimeIntegrityQaEvidence({
        steps: [
          { label: "integrity eval suites", command: "npm exec vitest run", status: "failed" },
        ],
      }),
      canarySummary: createCanarySummary(),
    });

    expect(failedEvidence.status).toBe("blocked");
    expect(failedEvidence.review.blockingReasons).toContain("Runtime integrity QA evidence contains blockers.");
    expect(validateReleaseEvidence(failedEvidence)).toContain("Runtime integrity QA evidence contains blockers.");
  });

  it("blocks a release when elite ops gates fail inside runtime integrity evidence", () => {
    const failedEliteOpsEvidence = createReleaseEvidence({
      manifest: MANIFEST,
      health: HEALTH_OK,
      referralDiagnostics: REFERRAL_DIAGNOSTICS_OK,
      runtimeIntegrityEvidence: {
        ...RUNTIME_INTEGRITY_OK,
        status: "failed",
        eliteOps: {
          ...RUNTIME_INTEGRITY_OK.eliteOps,
          status: "failed",
          blockingReasons: ["Latency budgets: Representative MCP stdio round trip exceeded its 8000ms budget."],
        },
      },
      canarySummary: createCanarySummary(),
    });

    expect(failedEliteOpsEvidence.status).toBe("blocked");
    expect(failedEliteOpsEvidence.review.blockingReasons).toContain("Elite ops release gates reported blockers.");
    expect(validateReleaseEvidence(failedEliteOpsEvidence)).toContain("Elite ops release gates reported blockers.");
  });
});