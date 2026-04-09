#!/usr/bin/env tsx
import { writeRuntimeInventoryArtifact } from "../src/lib/evals/runtime-integrity-evidence";

async function main(): Promise<void> {
  const { artifactPath, inventory } = writeRuntimeInventoryArtifact();

  process.stdout.write(`Runtime inventory: ${artifactPath}\n`);
  process.stdout.write(`Corpus: ${inventory.corpus.documentCount} books / ${inventory.corpus.sectionCount} chapters\n`);
  process.stdout.write(`Anonymous tools: ${inventory.tools.countsByRole.ANONYMOUS}\n`);
  process.stdout.write(`Admin tools: ${inventory.tools.countsByRole.ADMIN}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});