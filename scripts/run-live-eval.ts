#!/usr/bin/env tsx
import { buildEvalRunReport, serializeEvalRunReport } from "../src/lib/evals/reporting";
import { runLiveEvalScenario } from "../src/lib/evals/live-runner";
import { scoreEvalExecution } from "../src/lib/evals/scoring";
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

function printUsage(): void {
  process.stderr.write(
    [
      "Usage: npm run eval:live -- --scenario <scenario-id> [--json]",
      "Example: EVAL_LIVE_ENABLED=true ANTHROPIC_API_KEY=... npm run eval:live -- --scenario organization-buyer-funnel",
    ].join("\n") + "\n",
  );
}

async function main(): Promise<void> {
  const scenarioId = readFlag("--scenario");
  const jsonOnly = process.argv.includes("--json");

  if (!scenarioId) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const execution = await runLiveEvalScenario(scenarioId, {
    env: process.env,
    apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.API__ANTHROPIC_API_KEY,
  });

  const report = buildEvalRunReport({
    scenarioId: execution.scenario.id,
    cohortId: execution.scenario.cohortId,
    run: execution.run,
    observations: execution.observations,
    dimensions: scoreEvalExecution(execution),
  });

  const serialized = serializeEvalRunReport(report);

  if (jsonOnly) {
    process.stdout.write(`${serialized}\n`);
    return;
  }

  process.stdout.write(`${report.summary}\n`);
  if (report.failureReasons.length > 0) {
    process.stdout.write(`Failures: ${report.failureReasons.join(" | ")}\n`);
  }
  process.stdout.write(`${serialized}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});