# Sprint 21 — MCP Boundary Rename And Shared Module Extraction

> **Status:** Complete
> **Goal:** Finish MCP boundary hardening around the already-shipped
> `operations-server` rename and shared-module extraction.
> **Prerequisite:** Sprint 20 core schema derivation landed; broad consumer migration remains partial but does not block boundary hardening
> **Estimated scope:** Medium — boundary guard tests, QA registration, and runtime inventory/release evidence metadata
> **Implementation note:** As of 2026-04-12, Sprint 21 now includes `src/core/capability-catalog/mcp-boundary-canonicalization.test.ts`, `qa:unification` registration for that guard, `src/core/capability-catalog/mcp-process-metadata.ts`, and MCP process metadata in `release/runtime-inventory.json` plus nested release-evidence runtime-integrity inventory.

## Why This Sprint Exists

The high-risk rename and extraction work is already in the repo. What remains
is the hardening layer that keeps the boundary from drifting back toward the
old mixed `mcp/` model.

## What Already Landed

Phase 2 and Phase 3 of the naming cleanup are already applied in code:

- `mcp/operations-server.ts` is now the composite MCP server entrypoint.
- `npm run mcp:operations` is the canonical command.
- `npm run mcp:embeddings` was a temporary compatibility alias at Sprint 21 closeout and is retired in Sprint 22.
- Shared capability modules now live under `src/lib/capabilities/shared/`.
- Active operations docs already record the `mcp:operations` /
  `mcp:embeddings` compatibility contract.
- No runtime `@mcp/*` imports remain in `src/` or `tests/`.
- Verified on 2026-04-12: `prompt-provenance`, `schema-derivation`,
  `embedding-domain-separation`, and `mcp-catalog-parity` all passed
  together (4 files, 60 tests).

This sprint closes the remaining drift so the new boundary becomes durable,
test-governed, and difficult to regress.

## QA Findings Before Closeout

1. **The file layout needed a dedicated guard.**
   That guard is now implemented in
   `src/core/capability-catalog/mcp-boundary-canonicalization.test.ts`.

2. **The seam suite previously stopped at Sprint 20.** `qa:unification` now
   includes the Sprint 21 boundary guard and currently runs 25 files / 313
   tests.

3. **Runtime inventory now carries MCP process metadata.**
   `runtime:inventory` exposes declared MCP processes, server names,
   canonical commands, compatibility aliases, and capability groups.

4. **Release evidence now reflects the rename indirectly through runtime
   integrity evidence.** The release evidence payload includes runtime
   integrity inventory data with the operations-server metadata.

5. **Active documentation is now backed by tests and artifacts.** The alias
   and rename are no longer prose-only claims.

## Implemented In Sprint 21

1. **Added an MCP boundary guard test**
   - `src/core/capability-catalog/mcp-boundary-canonicalization.test.ts`
   - Verifies `mcp/` contains only server entrypoints
   - Verifies shared capability modules live under `src/lib/capabilities/shared/`
   - Verifies no runtime `@mcp/*` imports remain in `src/` or `tests/`

2. **Registered the boundary guard in the unification seam suite**
   - Added `src/core/capability-catalog/mcp-boundary-canonicalization.test.ts`
     to `scripts/run-unification-qa.ts`

3. **Updated runtime inventory and release evidence metadata**
   - Added `src/core/capability-catalog/mcp-process-metadata.ts`
   - Included MCP process metadata in `runtime:inventory` output:
     - canonical server name
     - canonical command
     - compatibility aliases
     - capability groups
   - Release evidence now carries the same operations metadata through nested
     runtime-integrity inventory

4. **Kept alias retirement as a Sprint 22 follow-on**
   - At Sprint 21 closeout, the alias remained documented and artifact-visible
   - Sprint 22 later retired it after transport round-trip coverage landed

## Out of Scope

- Removing the `mcp:embeddings` alias in this sprint
- Rewriting MCP tool behavior
- Updating archived historical specs to use the new names

## Current QA Status

1. Rename and extraction are landed.
2. No runtime `@mcp/*` imports remain in live source or tests.
3. Boundary hardening, QA registration, and MCP artifact metadata are landed.

## Acceptance Criteria

1. `mcp/` is guarded by a test that enforces transport-only entrypoints and is
   registered in `qa:unification`.
2. No runtime `@mcp/*` imports remain in live code or tests.
3. Runtime inventory and release evidence expose `mcp:operations` as the
   canonical command; Sprint 21 recorded compatibility aliases explicitly and
   Sprint 22 later removed them after validation.
4. The compatibility alias has documented removal criteria backed by inventory
   and test evidence.
5. `npm run qa:unification` passes with the Sprint 21 boundary guard in place.

## Verification

```bash
# Current prerequisite seam verification (passed on 2026-04-12)
npm exec vitest run src/lib/prompts/prompt-provenance.test.ts src/core/capability-catalog/schema-derivation.test.ts src/core/capability-catalog/embedding-domain-separation.test.ts src/core/capability-catalog/mcp-catalog-parity.test.ts

# Sprint 21 closeout
npx vitest run src/core/capability-catalog/mcp-boundary-canonicalization.test.ts
npm run runtime:inventory
npm run qa:unification
rg "@mcp/" src tests
```
