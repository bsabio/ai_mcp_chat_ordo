# Sprint 22 — MCP Transport Round-Trip And Compatibility Deprecation

> **Status:** Complete
> **Goal:** Add real JSON-RPC/stdio protocol tests for MCP server entrypoints,
> publish a compatibility matrix, and retire the `mcp:embeddings` alias when
> evidence says it is safe.
> **Prerequisite:** Sprint 21 complete ✅
> **Estimated scope:** Medium-to-large — transport harness, 2–3 new test files, compatibility docs
> **Implementation note:** Sprint 22 now adds `tests/mcp/transport/stdio-harness.ts`, spawned stdio transport tests for `mcp/calculator-server.ts` and `mcp/operations-server.ts`, a checked-in reviewed operations tool inventory allowlist, `qa:unification` registration for the new transport tests, and alias retirement across scripts, metadata, eval expectations, active docs, and generated release artifacts.

## Why This Sprint Exists

Sprint 18 gave strong module-level confidence, but the weakest seam is still
the actual MCP protocol boundary. Today we mostly prove that shared modules are
correct and that the operations server imports the right schema factories.

Elite confidence requires proof that the real stdio servers:

- answer `tools/list` correctly
- accept valid `tools/call` requests
- reject invalid inputs predictably
- preserve tool inventory and output shape through the actual protocol

## QA Findings Before Implementation

1. **No true stdio JSON-RPC round-trip tests exist.** Module tests are strong,
   but the protocol shell itself is still a confidence gap. The existing
   `tests/mcp/calculator-mcp-contract.test.ts` proves domain parity only; it
   does not spawn the MCP server or speak JSON-RPC over stdio.

2. **The compatibility alias required evidence-backed retirement.**
   Sprint 22 closed that gap by adding direct transport coverage to the
   canonical `mcp:operations` path first, then removing the alias from code,
   tests, docs, and generated artifacts together.

3. **Tool inventory is not snapshot-governed at the protocol level.** A server
   can accidentally drop or rename a tool without a dedicated round-trip guard.

4. **Compatibility documentation already exists, but it is not yet tied to a
   transport-backed retirement decision.** `docs/operations/process-model.md`,
   `docs/operations/system-architecture.md`, `docs/operations/user-handbook.md`,
   and `docs/operations/mcp-naming-cleanup.md` already describe the canonical
   command and alias window. Sprint 22 should reconcile and close that contract,
   not introduce a second compatibility story.

5. **The calculator server is ideal as a transport harness reference.** It is
   simple, deterministic, and good for validating the test utility itself.

6. **`qa:unification` still has no transport-level MCP tests.** Sprint 21 added
   boundary canonicalization, but the seam suite still stops short of an actual
   spawned MCP protocol round-trip.

## What Already Landed Before Sprint 22

- `mcp/calculator-server.ts` and `mcp/operations-server.ts` are already thin
  stdio servers built on `StdioServerTransport` plus `ListToolsRequestSchema`
  and `CallToolRequestSchema` handlers.
- `mcp/operations-server.ts` is the canonical composite server entrypoint.
- `npm run mcp:operations` is the canonical command.
- `src/core/capability-catalog/mcp-boundary-canonicalization.test.ts` guards
  the file boundary, script mapping, and server-name contract.
- `release/runtime-inventory.json` already records the canonical command and
  MCP process metadata for the operations process.
- Operations docs already described the compatibility window before retirement.

## Implemented In Sprint 22

1. **Added a reusable MCP stdio transport harness**
   - `tests/mcp/transport/stdio-harness.ts`
   - Uses the real SDK stdio client transport against spawned `tsx` server processes
   - Provides transport-focused helpers for `tools/list` and `tools/call`

2. **Added calculator transport round-trip coverage**
   - `tests/mcp/transport/calculator-mcp-stdio.test.ts`
   - Verifies `tools/list`, successful calculator execution, and deterministic unknown-tool failure through the real stdio boundary

3. **Added operations transport round-trip coverage**
   - `tests/mcp/transport/operations-mcp-stdio.test.ts`
   - Verifies the reviewed tool inventory, a deterministic prompt provenance read, index stats round-trip behavior, and predictable invalid-payload failure through the real stdio boundary

4. **Added protocol-visible inventory governance**
   - `tests/mcp/transport/operations-tool-inventory.json`
   - Keeps the operations server tool list on a checked-in reviewed allowlist

5. **Retired the compatibility alias after transport validation**
   - Removed `mcp:embeddings` from `package.json`
   - Removed the compatibility alias from `src/core/capability-catalog/mcp-process-metadata.ts`
   - Updated active operations docs, eval expectations, and generated release artifacts to the canonical `mcp:operations` command only

## Delivered Work

1. **Create a reusable MCP stdio test harness**
   - Completed in `tests/mcp/transport/stdio-harness.ts`

2. **Add calculator transport tests**
   - Completed in `tests/mcp/transport/calculator-mcp-stdio.test.ts`
   - `tests/mcp/calculator-mcp-contract.test.ts` remains the domain-parity guard

3. **Add operations server transport tests**
   - Completed in `tests/mcp/transport/operations-mcp-stdio.test.ts`
   - Registered in `qa:unification`

4. **Add an MCP tool inventory snapshot gate**
    - Completed via the checked-in allowlist in `tests/mcp/transport/operations-tool-inventory.json`

5. **Reconcile the compatibility and deprecation contract**
    - Completed across scripts, metadata, tests, docs, and generated artifacts

## Out of Scope

- Remote MCP deployment or network transport
- Non-stdio transport adapters
- Full end-to-end chat integration through an MCP client
- Removing the alias without transport evidence and doc or artifact convergence

## Acceptance Criteria

1. Calculator server has real stdio round-trip tests, and the existing domain
   parity test remains green.
2. Operations server has real stdio round-trip tests and is registered in
   `qa:unification`.
3. Tool inventory is snapshot-governed or allowlist-governed at the protocol
   layer.
4. Alias removal criteria are documented and tied to code, active operations
   references, and artifact convergence.
5. The alias is removed from scripts, metadata, active operations command
   references, evidence tests, and generated artifacts after transport
   coverage lands on the canonical server. Historical cleanup docs may retain
   explicit retirement notes.

## Verification

```bash
npm exec vitest run tests/mcp/calculator-mcp-contract.test.ts tests/mcp/transport/calculator-mcp-stdio.test.ts tests/mcp/transport/operations-mcp-stdio.test.ts
npm run qa:unification
npm run mcp:calculator
npm run mcp:operations
! grep -RIn "mcp:embeddings" package.json src/core/capability-catalog tests/evals release docs/operations/process-model.md docs/operations/system-architecture.md docs/operations/user-handbook.md docs/_corpus/system-docs/chapters/04-tooling-and-mcp.md
```
