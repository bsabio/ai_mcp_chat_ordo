#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";

import { runStagingCanary } from "../src/lib/evals/staging-canary";
import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

function readFlag(name: string): string | undefined {
  const prefix = `${name}=`;
  const direct = process.argv.find((arg) => arg.startsWith(prefix));
  if (direct) {
    return direct.slice(prefix.length);
  }

  const index = process.argv.findIndex((arg) => arg === name);
  if (index >= 0) {
    return process.argv[index + 1];
  }

  return undefined;
}

function readRepeatedFlags(name: string): string[] {
  const values: string[] = [];

  for (let index = 0; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (arg === name && process.argv[index + 1]) {
      values.push(process.argv[index + 1]);
      continue;
    }

    const prefix = `${name}=`;
    if (arg.startsWith(prefix)) {
      values.push(arg.slice(prefix.length));
    }
  }

  return values;
}

function printUsage(): void {
  process.stderr.write(
    [
      "Usage: EVAL_LIVE_ENABLED=true EVAL_TARGET_ENV=staging EVAL_DEPLOYED_BASE_URL=https://www.studioordo.com node --env-file=.env.local --import tsx scripts/run-staging-canary.ts [--scenario <scenario-id>] [--json]",
      "Example: EVAL_LIVE_ENABLED=true EVAL_TARGET_ENV=staging EVAL_DEPLOYED_BASE_URL=https://www.studioordo.com node --env-file=.env.local --import tsx scripts/run-staging-canary.ts --scenario organization-buyer-funnel",
      "Legacy fallback: EVAL_STAGING_BASE_URL is still supported.",
    ].join("\n") + "\n",
  );
}

async function main(): Promise<void> {
  if (process.argv.includes("--help")) {
    printUsage();
    return;
  }

  const scenarioIds = readRepeatedFlags("--scenario");
  const jsonOnly = process.argv.includes("--json");
  const baseUrl = readFlag("--base-url");
  const summary = await runStagingCanary({
    env: process.env,
    scenarioIds,
    baseUrl,
    apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.API__ANTHROPIC_API_KEY,
  });
  const releaseDir = path.join(process.cwd(), "release");
  const summaryPath = path.join(releaseDir, "canary-summary.json");
  const serialized = JSON.stringify(summary, null, 2);

  fs.mkdirSync(releaseDir, { recursive: true });
  fs.writeFileSync(summaryPath, `${serialized}\n`, "utf8");

  if (jsonOnly) {
    process.stdout.write(`${serialized}\n`);
  } else {
    process.stdout.write(
      `${summary.status === "passed" ? "Deployed canary passed" : "Deployed canary failed"} with ${summary.passedScenarioCount}/${summary.results.length} scenarios passing.\n`,
    );
    process.stdout.write(`Artifact: ${summaryPath}\n`);
    process.stdout.write(`${serialized}\n`);
  }

  if (summary.status !== "passed") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  printUsage();
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});