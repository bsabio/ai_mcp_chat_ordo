#!/usr/bin/env tsx
import { spawnSync } from "node:child_process";

type Step = {
  label: string;
  command: string;
  args: string[];
};

const focusedVitestFiles = [
  "src/app/api/referral/[code]/route.test.ts",
  "src/app/api/referral/visit/route.test.ts",
  "src/lib/referrals/referral-visit.test.ts",
  "src/app/r/[code]/page.test.tsx",
  "src/app/referrals/page.test.tsx",
  "tests/chat-stream-route.test.ts",
  "src/lib/referrals/referral-ledger.test.ts",
  "src/core/use-cases/LeadCaptureInteractor.test.ts",
  "src/core/use-cases/RequestConsultationInteractor.test.ts",
  "src/core/use-cases/CreateDealFromWorkflowInteractor.test.ts",
  "src/core/use-cases/CreateTrainingPathFromWorkflowInteractor.test.ts",
  "src/lib/referrals/admin-referral-analytics.test.ts",
  "src/core/use-cases/tools/affiliate-analytics.tool.test.ts",
  "src/lib/graphs/graph-data-sources.test.ts",
  "tests/sprint-4-referral-governance-qa.test.ts",
  "tests/core-policy.test.ts",
  "tests/tool-registry.integration.test.ts",
  "src/app/api/admin/affiliates/export/route.test.ts",
  "src/app/api/notifications/feed/route.test.ts",
  "tests/evals/eval-release-evidence.test.ts",
];

function printUsage(): void {
  process.stderr.write(
    [
      "Usage: npm run qa:sprint-4",
      "Runs the focused referral governance bundle, the admin shell regression checks, Playwright responsive smoke, lint, typecheck, and build.",
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
      label: "referral governance test bundle",
      command: "npm",
      args: ["run", "test", "--", ...focusedVitestFiles],
    },
    {
      label: "admin shell regression checks",
      command: "npm",
      args: ["exec", "vitest", "run", "tests/admin-shell-and-concierge.test.tsx", "tests/sprint-10-ux-layout-and-navigation.test.tsx"],
    },
    {
      label: "responsive browser smoke",
      command: "npm",
      args: ["exec", "playwright", "test", "tests/browser-ui/admin-shell-responsive.spec.ts"],
    },
    {
      label: "lint",
      command: "npm",
      args: ["run", "lint"],
    },
    {
      label: "typecheck",
      command: "npm",
      args: ["run", "typecheck"],
    },
    {
      label: "build",
      command: "npm",
      args: ["run", "build"],
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