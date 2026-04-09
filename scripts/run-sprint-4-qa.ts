#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type Step = {
  label: string;
  command: string;
  args: string[];
};

const focusedVitestFiles = [
  "tests/deferred-job-notifications.test.ts",
  "tests/deferred-job-repository.test.ts",
  "tests/deferred-job-worker.test.ts",
  "tests/jobs/ownership-migration.test.ts",
  "src/app/api/auth/auth-routes.test.ts",
  "src/lib/jobs/job-event-stream.test.ts",
  "src/lib/jobs/job-read-model.test.ts",
  "tests/jobs-system-dashboard.test.ts",
  "tests/evals/eval-release-evidence.test.ts",
];

const browserSpecs = [
  "tests/browser-ui/jobs-page.spec.ts",
  "tests/browser-ui/push-notifications.spec.ts",
];

function hasReleaseEvidenceInputs(): boolean {
  const releaseDir = path.join(process.cwd(), "release");

  return fs.existsSync(path.join(releaseDir, "runtime-integrity-evidence.json"))
    && fs.existsSync(path.join(releaseDir, "canary-summary.json"));
}

function printUsage(): void {
  process.stderr.write(
    [
      "Usage: npm run qa:sprint-4",
      "Runs the focused jobs notification/migration bundle, browser verification for /jobs and push notifications, and regenerates release evidence when prerequisite artifacts already exist.",
    ].join("\n") + "\n",
  );
}

function runStep(step: Step): void {
  process.stdout.write(`\n==> ${step.label}\n`);
  const result = spawnSync(step.command, step.args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--help")) {
    printUsage();
    return;
  }

  const steps: Step[] = [
    {
      label: "jobs notification and migration regression bundle",
      command: "npm",
      args: ["exec", "vitest", "run", ...focusedVitestFiles],
    },
    {
      label: "jobs migration and push browser verification",
      command: "npm",
      args: ["exec", "playwright", "test", ...browserSpecs],
    },
  ];

  for (const step of steps) {
    runStep(step);
  }

  if (hasReleaseEvidenceInputs()) {
    runStep({
      label: "release evidence regeneration",
      command: "npm",
      args: ["run", "release:evidence"],
    });
    return;
  }

  process.stdout.write(
    "\n==> release evidence regeneration\nSkipping: release/runtime-integrity-evidence.json and/or release/canary-summary.json are missing.\n",
  );
}

main().catch((error) => {
  printUsage();
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});