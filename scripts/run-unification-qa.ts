#!/usr/bin/env tsx
/**
 * Sprint 8 — Unified QA script for the Architecture Unification program.
 *
 * Runs the unification seam suite from Sprints 4-25 as a single gate. This script is the
 * definitive unification seam verification command.
 *
 * Usage: npm run qa:unification
 */
import { spawnSync } from "node:child_process";

const UNIFICATION_TEST_FILES = [
  // Sprint 4 — Provider policy
  "src/lib/chat/provider-policy.test.ts",
  // Sprint 5 — Capability catalog + registry sync
  "src/core/capability-catalog/catalog.test.ts",
  "src/lib/chat/registry-sync.test.ts",
  // Sprint 5-6 — Job status + read model + event stream
  "src/lib/jobs/job-status.test.ts",
  "src/lib/jobs/job-read-model.test.ts",
  "src/lib/jobs/job-event-stream.test.ts",
  // Sprint 6 — Unified job publication
  "src/lib/jobs/job-publication.test.ts",
  // Sprint 7 — MCP export projection
  "src/core/capability-catalog/mcp-export.test.ts",
  // Sprint 9 — Data access canary
  "src/lib/db/data-access-canary.test.ts",
  // Sprint 10 — Catalog coverage
  "src/core/capability-catalog/catalog-coverage.test.ts",
  // Sprint 11 — MCP domain/transport separation
  "src/core/capability-catalog/mcp-domain-separation.test.ts",
  // Sprint 12 — Registry convergence
  "src/core/capability-catalog/registry-convergence.test.ts",
  // Sprint 13 — Prompt directive unification
  "src/core/capability-catalog/prompt-directive-unification.test.ts",
  // Sprint 14 — End-to-end catalog flow
  "src/core/capability-catalog/e2e-catalog-flow.test.ts",
  // Sprint 16 — Provider instrumentation verification
  "src/lib/chat/provider-instrumentation.test.ts",
  // Sprint 17 — Embedding server domain/transport separation
  "src/core/capability-catalog/embedding-domain-separation.test.ts",
  // Sprint 18 — MCP protocol parity tests
  "src/lib/capabilities/shared/calculator-tool.test.ts",
  "src/lib/capabilities/shared/embedding-tool.test.ts",
  "src/lib/capabilities/shared/librarian-tool.test.ts",
  "src/lib/capabilities/shared/prompt-tool.test.ts",
  "src/lib/capabilities/shared/web-search-tool.test.ts",
  "src/core/capability-catalog/mcp-catalog-parity.test.ts",
  // Sprint 19 — Prompt provenance persistence
  "src/lib/prompts/prompt-provenance.test.ts",
  // Sprint 20 — Catalog schema derivation
  "src/core/capability-catalog/schema-derivation.test.ts",
  // Sprint 23 — Catalog executor binding + runtime validation
  "src/core/capability-catalog/runtime-tool-binding.test.ts",
  // Sprint 21 — MCP boundary canonicalization
  "src/core/capability-catalog/mcp-boundary-canonicalization.test.ts",
  // Sprint 22 — MCP stdio transport round-trip
  "tests/mcp/transport/calculator-mcp-stdio.test.ts",
  "tests/mcp/transport/operations-mcp-stdio.test.ts",
  // Sprint 25 — Elite ops gates, security, and performance
  "tests/evals/elite-ops-evidence.test.ts",
];

function main(): void {
  process.stdout.write("╔══════════════════════════════════════════════════╗\n");
  process.stdout.write("║  Architecture Unification — Seam Verification   ║\n");
  process.stdout.write("║  Sprints 4-25 · 300+ tests · 29 test files     ║\n");
  process.stdout.write("╚══════════════════════════════════════════════════╝\n\n");

  process.stdout.write(`Test files:\n`);
  for (const file of UNIFICATION_TEST_FILES) {
    process.stdout.write(`  • ${file}\n`);
  }
  process.stdout.write("\n");

  const result = spawnSync(
    "node_modules/.bin/vitest",
    ["run", ...UNIFICATION_TEST_FILES],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    },
  );

  if (result.status !== 0) {
    process.stdout.write("\n❌ Unification seam verification FAILED\n");
    process.exit(result.status ?? 1);
  }

  process.stdout.write("\n✅ Unification seam verification PASSED\n");
}

main();
