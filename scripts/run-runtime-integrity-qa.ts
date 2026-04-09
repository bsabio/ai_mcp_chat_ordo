#!/usr/bin/env tsx
import { spawnSync } from "node:child_process";

import {
  RUNTIME_INTEGRITY_FOCUSED_TEST_SUITES,
  writeRuntimeIntegrityQaEvidenceArtifact,
  type RuntimeIntegrityQaStepResult,
} from "../src/lib/evals/runtime-integrity-evidence";

type Step = {
  label: string;
  command: string;
  args: string[];
};

function printUsage(): void {
  process.stderr.write(
    [
      "Usage: npm run qa:runtime-integrity",
      "Runs the focused runtime-truthfulness and retrieval-integrity bundle, writes release/runtime-integrity-evidence.json, and exits non-zero on any blocker.",
    ].join("\n") + "\n",
  );
}

function runStep(step: Step): RuntimeIntegrityQaStepResult {
  process.stdout.write(`\n==> ${step.label}\n`);

  const result = spawnSync(step.command, step.args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  return {
    label: step.label,
    command: [step.command, ...step.args].join(" "),
    status: result.status === 0 ? "passed" : "failed",
  };
}

async function main(): Promise<void> {
  if (process.argv.includes("--help")) {
    printUsage();
    return;
  }

  const steps: Step[] = [
    {
      label: "integrity eval suites",
      command: "npm",
      args: ["exec", "vitest", "run", ...RUNTIME_INTEGRITY_FOCUSED_TEST_SUITES],
    },
    {
      label: "production build",
      command: "npm",
      args: ["run", "build"],
    },
  ];

  const results: RuntimeIntegrityQaStepResult[] = [];

  for (const step of steps) {
    const result = runStep(step);
    results.push(result);
    if (result.status === "failed") {
      break;
    }
  }

  const blockingReasons = results
    .filter((result) => result.status === "failed")
    .map((result) => `Failed step: ${result.label}.`);
  const { artifactPath, evidence } = writeRuntimeIntegrityQaEvidenceArtifact({
    steps: results,
    blockingReasons,
  });

  process.stdout.write(`\nRuntime integrity evidence: ${artifactPath}\n`);
  process.stdout.write(`Runtime integrity status: ${evidence.status}\n`);

  if (evidence.status !== "passed") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const { artifactPath } = writeRuntimeIntegrityQaEvidenceArtifact({
    steps: [],
    blockingReasons: [error instanceof Error ? error.message : String(error)],
  });

  printUsage();
  process.stderr.write(`Runtime integrity evidence: ${artifactPath}\n`);
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});