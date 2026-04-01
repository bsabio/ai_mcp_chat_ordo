import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createReleaseEvidence,
  validateReleaseEvidence,
  writeReleaseEvidenceArtifacts,
} from "@/lib/evals/release-evidence";
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

describe("release evidence", () => {
  it("approves a release when manifest, health, and canaries are all green", () => {
    const evidence = createReleaseEvidence({
      manifest: MANIFEST,
      health: HEALTH_OK,
      referralDiagnostics: REFERRAL_DIAGNOSTICS_OK,
      canarySummary: createCanarySummary(),
      now: new Date("2026-03-20T13:00:00.000Z"),
    });

    expect(evidence.status).toBe("approved");
    expect(validateReleaseEvidence(evidence)).toEqual([]);
  });

  it("blocks a release when canary evidence is missing", () => {
    const evidence = createReleaseEvidence({
      manifest: MANIFEST,
      health: HEALTH_OK,
      referralDiagnostics: REFERRAL_DIAGNOSTICS_OK,
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

    const { canarySummaryPath, qaEvidencePath, evidence } = writeReleaseEvidenceArtifacts({
      releaseDir,
      manifest: MANIFEST,
      health: HEALTH_OK,
      referralDiagnostics: REFERRAL_DIAGNOSTICS_OK,
      canarySummary,
    });

    expect(fs.existsSync(canarySummaryPath)).toBe(true);
    expect(fs.existsSync(qaEvidencePath)).toBe(true);
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
      canarySummary: createCanarySummary(),
    });

    expect(evidence.status).toBe("blocked");
    expect(evidence.review.blockingReasons).toContain("Referral identity verification checks failed.");
    expect(validateReleaseEvidence(evidence)).toContain("Referral identity verification evidence failed.");
  });
});