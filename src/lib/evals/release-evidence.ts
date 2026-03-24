import fs from "node:fs";
import path from "node:path";

import type { ReleaseManifestReport } from "@/lib/admin/processes";
import { getHealthSweepReport, getReleaseManifestReport } from "@/lib/admin/processes";
import type { StagingCanarySummary } from "./staging-canary";

export interface ReleaseEvidence {
  version: 1;
  generatedAt: string;
  status: "approved" | "conditional" | "blocked";
  manifest: ReleaseManifestReport;
  health: ReturnType<typeof getHealthSweepReport>;
  canary: {
    present: boolean;
    artifactPath: string;
    summary: StagingCanarySummary | null;
  };
  review: {
    blockingReasons: string[];
    warnings: string[];
    manualChecks: string[];
  };
}

interface CreateReleaseEvidenceOptions {
  manifest?: ReleaseManifestReport;
  health?: ReturnType<typeof getHealthSweepReport>;
  canarySummary?: StagingCanarySummary | null;
  warnings?: string[];
  manualChecks?: string[];
  now?: Date;
  canaryArtifactPath?: string;
}

interface WriteReleaseEvidenceArtifactsOptions extends CreateReleaseEvidenceOptions {
  releaseDir?: string;
}

function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function uniqueNonEmpty(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

export function createReleaseEvidence(options: CreateReleaseEvidenceOptions = {}): ReleaseEvidence {
  const manifest = options.manifest ?? getReleaseManifestReport();
  const health = options.health ?? getHealthSweepReport();
  const canarySummary = options.canarySummary ?? null;
  const warnings = uniqueNonEmpty(options.warnings);
  const manualChecks = uniqueNonEmpty(options.manualChecks);
  const blockingReasons: string[] = [];

  if (!manifest.present) {
    blockingReasons.push(manifest.error ?? "Release manifest is missing.");
  }

  if (health.status === "error") {
    blockingReasons.push("Health sweep reported an error.");
  }

  if (!canarySummary) {
    blockingReasons.push("Staging canary summary is missing.");
  } else if (canarySummary.failedScenarioCount > 0 || canarySummary.status !== "passed") {
    blockingReasons.push("One or more staging canary scenarios failed.");
  }

  const status = blockingReasons.length > 0
    ? "blocked"
    : warnings.length > 0 || manualChecks.length > 0
      ? "conditional"
      : "approved";

  return {
    version: 1,
    generatedAt: (options.now ?? new Date()).toISOString(),
    status,
    manifest,
    health,
    canary: {
      present: canarySummary !== null,
      artifactPath: options.canaryArtifactPath ?? "release/canary-summary.json",
      summary: canarySummary,
    },
    review: {
      blockingReasons,
      warnings,
      manualChecks,
    },
  };
}

export function validateReleaseEvidence(evidence: ReleaseEvidence): string[] {
  const errors: string[] = [];

  if (!evidence.manifest.present) {
    errors.push("Release manifest evidence is missing.");
  }

  if (evidence.health.status === "error") {
    errors.push("Health evidence reported an error.");
  }

  if (!evidence.canary.present || !evidence.canary.summary) {
    errors.push("Staging canary evidence is missing.");
  }

  if (evidence.canary.summary && evidence.canary.summary.failedScenarioCount > 0) {
    errors.push("Staging canary evidence contains failed scenarios.");
  }

  return errors;
}

export function readCanarySummaryFromFile(filePath: string): StagingCanarySummary | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8")) as StagingCanarySummary;
}

export function writeReleaseEvidenceArtifacts(options: WriteReleaseEvidenceArtifactsOptions = {}): {
  canarySummaryPath: string;
  qaEvidencePath: string;
  evidence: ReleaseEvidence;
} {
  const releaseDir = options.releaseDir ?? path.join(process.cwd(), "release");
  const canarySummaryPath = path.join(releaseDir, "canary-summary.json");
  const qaEvidencePath = path.join(releaseDir, "qa-evidence.json");
  const canarySummary = options.canarySummary ?? readCanarySummaryFromFile(canarySummaryPath);
  const evidence = createReleaseEvidence({
    ...options,
    canarySummary,
    canaryArtifactPath: path.relative(process.cwd(), canarySummaryPath),
  });

  fs.mkdirSync(releaseDir, { recursive: true });

  if (canarySummary) {
    fs.writeFileSync(canarySummaryPath, serializeJson(canarySummary), "utf8");
  }

  fs.writeFileSync(qaEvidencePath, serializeJson(evidence), "utf8");

  return {
    canarySummaryPath,
    qaEvidencePath,
    evidence,
  };
}