import { describe, expect, it } from "vitest";

import {
  createArchitectureDriftEvidence,
  createEliteOpsEvidence,
  createFailureModeEvidence,
  createLatencyBudgetEvidence,
  createRbacRegressionMatrix,
} from "@/lib/evals/elite-ops-evidence";
import { createRuntimeInventory } from "@/lib/evals/runtime-integrity-evidence";

const NOW = new Date("2026-04-08T12:00:00.000Z");
const INVENTORY = createRuntimeInventory(NOW);
const MCP_SNAPSHOT = INVENTORY.mcp.processes.map((process) => ({
  id: process.id,
  serverName: process.serverName,
  entrypoint: process.entrypoint,
  canonicalCommand: process.canonicalCommand,
  compatibilityAliases: [...process.compatibilityAliases],
  capabilityGroups: [...process.capabilityGroups],
}));

function findMatrixEntry(
  entries: ReturnType<typeof createRbacRegressionMatrix>["entries"],
  surfaceKind: "tool" | "route" | "mcp_export",
  surfaceId: string,
  role: "ANONYMOUS" | "AUTHENTICATED" | "APPRENTICE" | "STAFF" | "ADMIN",
) {
  return entries.find((entry) =>
    entry.surfaceKind === surfaceKind
    && entry.surfaceId === surfaceId
    && entry.role === role,
  );
}

describe("elite ops evidence", () => {
  it("keeps the architecture drift bundle aligned across runtime, MCP, docs, and release evidence", () => {
    const evidence = createArchitectureDriftEvidence({ inventoryMcpProcesses: MCP_SNAPSHOT });

    expect(evidence.status).toBe("passed");
    expect(evidence.checks.map((check) => check.id)).toEqual(expect.arrayContaining([
      "tool_registry_primary_runtime_path",
      "mcp_transport_boundary_canonical",
      "operations_inventory_matches_shared_exports",
      "runtime_inventory_tracks_mcp_process_metadata",
      "active_docs_match_runtime_story",
      "release_evidence_promotes_elite_ops_summary",
    ]));
  });

  it("produces a reproducible RBAC matrix across tools, routes, and MCP exports", () => {
    const matrix = createRbacRegressionMatrix();

    expect(matrix.status).toBe("passed");
    expect(matrix.summary.failedEntries).toBe(0);
    expect(findMatrixEntry(matrix.entries, "tool", "admin_search", "ANONYMOUS")).toMatchObject({
      expected: "deny",
      observed: "deny",
      status: "passed",
    });
    expect(findMatrixEntry(matrix.entries, "tool", "generate_chart", "AUTHENTICATED")).toMatchObject({
      expected: "allow",
      observed: "allow",
      status: "passed",
    });
    expect(findMatrixEntry(matrix.entries, "route", "/admin/system", "STAFF")).toMatchObject({
      expected: "deny",
      observed: "deny",
      status: "passed",
    });
    expect(findMatrixEntry(matrix.entries, "route", "/admin/system", "ADMIN")).toMatchObject({
      expected: "allow",
      observed: "allow",
      status: "passed",
    });
    expect(findMatrixEntry(matrix.entries, "mcp_export", "operations:prompt_set", "ADMIN")).toMatchObject({
      expected: "deny",
      observed: "deny",
      status: "passed",
    });
    expect(findMatrixEntry(matrix.entries, "mcp_export", "calculator:calculator", "ANONYMOUS")).toMatchObject({
      expected: "allow",
      observed: "allow",
      status: "passed",
    });
  });

  it("measures latency budgets for the governed runtime paths", () => {
    const evidence = createLatencyBudgetEvidence();

    expect(evidence.status).toBe("passed");
    expect(evidence.measurements.map((measurement) => measurement.id)).toEqual(expect.arrayContaining([
      "prompt_assembly",
      "retrieval_preparation",
      "first_tool_execution",
      "representative_mcp_round_trip",
    ]));
    for (const measurement of evidence.measurements) {
      expect(measurement.observedMs).not.toBeNull();
      expect(measurement.status).toBe("passed");
    }
  }, 30000);

  it("captures deterministic degraded-path probes for provider, env, DB, and MCP startup failures", () => {
    const evidence = createFailureModeEvidence();

    expect(evidence.status).toBe("passed");
    expect(evidence.probes.map((probe) => probe.id)).toEqual(expect.arrayContaining([
      "provider_fallback_path",
      "env_misconfiguration_path",
      "db_busy_timeout_path",
      "mcp_startup_failure_diagnostics",
    ]));
    expect(evidence.probes.every((probe) => probe.status === "passed")).toBe(true);
  }, 30000);

  it("aggregates the full elite-ops bundle into a single passed artifact", () => {
    const evidence = createEliteOpsEvidence({
      inventoryMcpProcesses: MCP_SNAPSHOT,
      now: NOW,
    });

    expect(evidence.status).toBe("passed");
    expect(evidence.blockingReasons).toEqual([]);
    expect(evidence.architectureDrift.status).toBe("passed");
    expect(evidence.rbacMatrix.status).toBe("passed");
    expect(evidence.latencyBudgets.status).toBe("passed");
    expect(evidence.failureModes.status).toBe("passed");
  }, 30000);
});