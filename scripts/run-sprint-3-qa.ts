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

function runStep(scriptName: string, env: NodeJS.ProcessEnv): void {
  const result = spawnSync("npm", ["run", scriptName], {
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
      "Usage: EVAL_LIVE_ENABLED=true EVAL_TARGET_ENV=staging EVAL_DEPLOYED_BASE_URL=https://www.studioordo.com npm run qa:sprint-3 [-- --env-file .env.local]",
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
      "Sprint 3 QA requires EVAL_LIVE_ENABLED, EVAL_TARGET_ENV, and EVAL_DEPLOYED_BASE_URL to be set in the shell or env file.",
    );
  }

  if (envFilePath) {
    process.stdout.write(`Using env file: ${path.relative(process.cwd(), envFilePath)}\n`);
  }

  for (const step of ["release:prepare", "admin:health", "eval:deployed-canary", "release:evidence"]) {
    process.stdout.write(`\n==> ${step}\n`);
    runStep(step, env);
  }
}

main().catch((error) => {
  printUsage();
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});