import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createRuntimeIntegrityQaEvidence,
  createRuntimeInventory,
  writeRuntimeIntegrityQaEvidenceArtifact,
} from "@/lib/evals/runtime-integrity-evidence";

describe("runtime integrity evidence", () => {
  it("builds a generated runtime inventory from live corpus, tool, and route sources", () => {
    const inventory = createRuntimeInventory(new Date("2026-04-08T12:00:00.000Z"));

    expect(inventory.corpus.documentCount).toBe(10);
    expect(inventory.corpus.sectionCount).toBe(87);
    expect(inventory.tools.countsByRole.ADMIN).toBeGreaterThan(inventory.tools.countsByRole.ANONYMOUS);
    expect(inventory.tools.manifestsByRole.ANONYMOUS.map((entry) => entry.name)).toContain("navigate_to_page");
    expect(inventory.tools.manifestsByRole.ANONYMOUS.map((entry) => entry.name)).not.toContain("navigate");
    expect(inventory.navigation.routesByRole.ANONYMOUS.some((route) => route.href === "/library")).toBe(true);
  });

  it("marks the QA evidence failed when any step failed", () => {
    const evidence = createRuntimeIntegrityQaEvidence({
      now: new Date("2026-04-08T12:00:00.000Z"),
      steps: [
        { label: "integrity eval suites", command: "npm exec vitest run", status: "failed" },
      ],
    });

    expect(evidence.status).toBe("failed");
    expect(evidence.review.blockingReasons).toContain("QA step failed: integrity eval suites.");
  });

  it("writes the runtime integrity evidence artifact", () => {
    const releaseDir = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-integrity-"));
    const { artifactPath, evidence } = writeRuntimeIntegrityQaEvidenceArtifact({
      releaseDir,
      now: new Date("2026-04-08T12:00:00.000Z"),
      steps: [
        { label: "integrity eval suites", command: "npm exec vitest run", status: "passed" },
        { label: "production build", command: "npm run build", status: "passed" },
      ],
    });

    expect(fs.existsSync(artifactPath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(artifactPath, "utf8"))).toEqual(evidence);
  });
});