#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function loadEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Env file not found: ${filePath}`);
  }

  const parsed: Record<string, string> = {};
  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const normalizedLine = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separatorIndex = normalizedLine.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalizedLine.slice(0, separatorIndex).trim();
    const value = stripWrappingQuotes(normalizedLine.slice(separatorIndex + 1).trim());

    if (key) {
      parsed[key] = value;
    }
  }

  return parsed;
}

function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv): void {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function printUsage(): void {
  process.stderr.write(
    [
      "Usage: EVAL_LIVE_ENABLED=true EVAL_TARGET_ENV=staging EVAL_DEPLOYED_BASE_URL=https://www.studioordo.com ANTHROPIC_API_KEY=... npm run qa:sprint-6 [-- --env-file .env.local]",
      "Default env file: .env.local when present in the repo root.",
    ].join("\n") + "\n",
  );
}

async function main(): Promise<void> {
  if (process.argv.includes("--help")) {
    printUsage();
    return;
  }

  const requestedEnvFile = readFlag("--env-file");
  const defaultEnvFile = path.join(process.cwd(), ".env.local");
  const envFilePath = requestedEnvFile
    ? path.resolve(process.cwd(), requestedEnvFile)
    : fs.existsSync(defaultEnvFile)
      ? defaultEnvFile
      : null;

  const fileEnv = envFilePath ? loadEnvFile(envFilePath) : {};
  const env: NodeJS.ProcessEnv = {
    ...fileEnv,
    ...process.env,
  };

  if (!env.EVAL_LIVE_ENABLED || !env.EVAL_TARGET_ENV || !env.EVAL_DEPLOYED_BASE_URL) {
    throw new Error(
      "Sprint 6 QA requires EVAL_LIVE_ENABLED, EVAL_TARGET_ENV, and EVAL_DEPLOYED_BASE_URL to be set in the shell or env file.",
    );
  }

  if (!env.ANTHROPIC_API_KEY && !env.API__ANTHROPIC_API_KEY) {
    throw new Error("Sprint 6 QA requires ANTHROPIC_API_KEY or API__ANTHROPIC_API_KEY for the live eval runs.");
  }

  if (envFilePath) {
    process.stdout.write(`Using env file: ${path.relative(process.cwd(), envFilePath)}\n`);
  }

  const liveScenarios = [
    "live-blog-job-status-and-publish-handoff",
    "live-blog-job-reuse-instead-of-rerun",
    "live-blog-completion-recovery",
  ];

  process.stdout.write("\n==> release:prepare\n");
  runCommand("npm", ["run", "release:prepare"], env);

  process.stdout.write("\n==> admin:health\n");
  runCommand("npm", ["run", "admin:health"], env);

  process.stdout.write("\n==> sprint-6 focused eval tests\n");
  runCommand("npm", [
    "exec",
    "vitest",
    "run",
    "tests/evals/eval-scenarios.test.ts",
    "tests/evals/eval-runner.test.ts",
    "tests/evals/eval-live-runner.test.ts",
  ], env);

  for (const scenarioId of liveScenarios) {
    process.stdout.write(`\n==> eval:live --scenario ${scenarioId}\n`);
    runCommand("npm", ["run", "eval:live", "--", "--scenario", scenarioId], env);
  }

  process.stdout.write("\n==> release:evidence\n");
  runCommand("npm", ["run", "release:evidence"], env);
}

main().catch((error) => {
  printUsage();
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});