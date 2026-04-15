#!/usr/bin/env tsx
import { spawnSync } from "node:child_process";

type Step = {
  label: string;
  command: string;
  args: string[];
};

const focusedVitestFiles = [
  "src/core/search/corpus-indexing.test.ts",
  "src/core/search/MarkdownChunker.test.ts",
  "src/core/use-cases/tools/search-corpus.tool.test.ts",
  "src/core/use-cases/tools/get-section.tool.test.ts",
  "src/core/tool-registry/ToolResultFormatter.test.ts",
  "src/lib/evals/runner.retrieval-contracts.test.ts",
];

function printUsage(): void {
  process.stderr.write(
    [
      "Usage: npm run qa:sprint-5",
      "Runs the focused Sprint 5 retrieval and chunking regression bundle, then regenerates the governed session-value audit artifacts.",
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
      label: "sprint-5 focused retrieval and chunk metadata regressions",
      command: "npm",
      args: ["exec", "vitest", "run", ...focusedVitestFiles],
    },
    {
      label: "search index rebuild with enriched chunk metadata",
      command: "npm",
      args: ["run", "build:search-index"],
    },
    {
      label: "session-value audit artifact regeneration",
      command: "npm",
      args: ["run", "qa:session-value-baseline"],
    },
  ];

  for (const step of steps) {
    runStep(step);
  }
}

main().catch((error) => {
  printUsage();
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});