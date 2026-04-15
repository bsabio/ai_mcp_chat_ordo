# Sprint 25 — Elite Ops Gates, Security, And Performance

> **Status:** Complete
> **Goal:** Add the operational gates that keep Studio Ordo elite under change:
> architecture drift checks, RBAC regression matrices, latency budgets, and
> failure-mode evidence for the core governed runtime.
> **Prerequisite:** Sprint 22 complete ✅, Sprint 23 complete ✅, and Sprint 24 complete ✅
> **Estimated scope:** Landed — elite-ops evidence bundle, release-ladder integration, and follow-on gate hardening

## Why This Sprint Exists

Good systems pass tests. Elite systems also prove that they stay fast enough,
safe enough, and understandable enough as the codebase evolves.

## Implementation Note

Sprint 25 landed by extending the existing `qa:unification`,
`qa:runtime-integrity`, and `release:evidence` ladder rather than by creating a
parallel verification system.

## What Already Landed Before Sprint 25

1. **MCP boundary and inventory hardening already exist.**
   Sprint 21 added `src/core/capability-catalog/mcp-boundary-canonicalization.test.ts`
   plus MCP process metadata in runtime inventory and release evidence.

2. **Real MCP transport round-trip coverage already exists.**
   Sprint 22 added the spawned stdio transport harness in
   `tests/mcp/transport/stdio-harness.ts`, round-trip tests for calculator and
   operations servers, and the reviewed allowlist in
   `tests/mcp/transport/operations-tool-inventory.json`.

3. **Catalog-backed runtime binding already exists for the first migrated tranche.**
   Sprint 23 landed `src/core/capability-catalog/runtime-tool-binding.ts` and
   `src/core/capability-catalog/runtime-tool-binding.test.ts`, covering
   catalog-backed validator and executor binding for `admin_web_search`,
   `draft_content`, `publish_content`, `compose_media`, and `search_corpus`.

4. **Prompt provenance is now durable, replayable, and operator-visible.**
   Sprint 24 landed durable per-turn provenance storage, replay and diff
   support, admin conversation audit cards, and eval parity via
   `src/adapters/PromptProvenanceDataMapper.ts`,
   `src/lib/prompts/prompt-provenance-service.ts`,
   `src/app/admin/conversations/[id]/page.tsx`, and
   `src/lib/evals/live-runner.ts`.

5. **The release-evidence ladder already exists.**
   `qa:unification`, `qa:runtime-integrity`, and `release:evidence` are live,
   with supporting tests in `tests/evals/runtime-integrity-evidence.test.ts`
   and `tests/evals/eval-release-evidence.test.ts`.

By this point the repo already has:

- unified prompt/control-plane behavior
- catalog-driven capability metadata
- real MCP transport tests
- durable prompt provenance with replay and admin audit surfaces

The next level was making regressions hard to hide. Sprint 25 now ships that
bundle.

## Implemented In Sprint 25

1. **Added a consolidated elite-ops evidence bundle.**
   `src/lib/evals/elite-ops-evidence.ts` now produces architecture-drift,
   RBAC-matrix, latency-budget, and degraded-path evidence from live runtime,
   MCP, and documentation seams.

2. **Made route and runtime RBAC evidence explicit.**
   `src/lib/shell/shell-navigation.ts` now exposes route-visibility snapshots,
   and `tests/evals/elite-ops-evidence.test.ts` records reproducible allowed
   and denied outcomes across critical tools, routes, and MCP exports.

3. **Integrated elite-ops evidence into release artifacts.**
   `src/lib/evals/runtime-integrity-evidence.ts` now embeds the full elite-ops
   bundle, while `src/lib/evals/release-evidence.ts` promotes a top-level
   `eliteOps` summary and blocks release evidence if those gates regress.

4. **Promoted Sprint 25 into the standing seam gates.**
   `tests/evals/elite-ops-evidence.test.ts` now runs in both
   `qa:runtime-integrity` and `qa:unification`, and `scripts/run-unification-qa.ts`
   now treats Sprint 25 as part of the normal program closeout suite.

5. **Fixed release-ladder blockers uncovered during landing.**
   Sprint 25 also closed production-typecheck blockers in
   `src/core/capability-catalog/runtime-tool-binding.ts`, moved DB pragma
   introspection behind the approved RepositoryFactory seam, and fixed the
   missing `vi` import in `tests/helpers/chat-stream-route-fixture.ts` so the
   runtime-integrity build gate stays green.

## Original QA Findings Before Implementation

1. **Architectural drift gates exist in slices, but not yet as one elite-ops bundle.**
   We now have targeted guards for MCP boundary shape, transport inventory, and
   catalog-backed runtime binding, but not one cross-seam gate that proves the
   internal tool platform, MCP transport shell, runtime inventory, and active
   docs still tell the same story together.

2. **RBAC regressions are still covered as spot checks, not an explicit matrix.**
   Tool- and route-level tests exist, but the repo still lacks a maintained
   role × critical tool × route × MCP-export matrix with artifact-grade output.

3. **Latency budgets are not first-class release criteria yet.**
   Runtime integrity and release evidence exist, but they do not currently
   enforce explicit performance budgets for prompt assembly, retrieval prep,
   first tool execution, or representative MCP round trips.

4. **Failure-mode evidence is still thinner than happy-path coverage.**
   Release evidence validates missing runtime-integrity artifacts, but provider
   fallback, DB lock contention, MCP process startup failure, and key env
   misconfiguration do not yet produce one consolidated deterministic evidence
   bundle.

## Tasks Landed

1. **Added architecture drift gates**
   - Built on the existing slice guards for `tool-composition-root`, MCP
     boundary canonicalization, transport inventory, and runtime inventory
     metadata
   - Verified the internal ToolRegistry remains the primary runtime path
   - Verified `mcp/` remains transport-only
   - Verified catalog metadata, runtime inventory, release evidence, and active
     docs agree on the MCP story

2. **Created an RBAC regression matrix**
   - Enumerated roles × critical tools × critical routes × critical MCP exports
   - Added canaries for denied and allowed paths
   - Recorded expected behavior as evidence, not just inline assertions

3. **Defined and tested latency budgets**
   - Set budgets for:
     - prompt assembly
     - retrieval preparation
     - first tool execution
     - representative MCP stdio tool calls
   - Kept the gate focused on meaningful regressions rather than incidental
     local variance

4. **Added failure-mode evidence tests**
   - Provider fallback path
   - missing key / env misconfiguration path
   - DB busy/lock contention handling on critical reads
   - MCP process startup failure diagnostics

5. **Integrated the bundle with release evidence**
   - Wrote architecture drift, RBAC matrix, and latency-budget summaries into
     release evidence artifacts
   - Made these part of the elite-system release ladder

## Out of Scope

- Full-scale load testing infrastructure
- Multi-region deployment strategy
- Replacing existing release evidence format wholesale

## Acceptance Criteria

1. Architecture drift has explicit automated gates.
2. RBAC behavior is covered by a reproducible matrix across critical surfaces.
3. Latency budgets exist for core governed runtime paths.
4. Failure-mode evidence is generated for key degraded-path scenarios.
5. Release evidence includes drift, RBAC, and latency summaries.

## Current QA Status

- `npm exec vitest run tests/evals/elite-ops-evidence.test.ts tests/evals/runtime-integrity-evidence.test.ts tests/evals/eval-release-evidence.test.ts src/lib/shell/shell-navigation.test.ts` ✅
- `npm run qa:unification` ✅ (29 files / 334 tests)
- `npm run qa:runtime-integrity` ✅ (17 files / 190 tests plus production build)
- `npm run release:evidence` ✅ with top-level `eliteOps` summary marked passed in `release/qa-evidence.json`

## Verification

```bash
npm exec vitest run tests/evals/runtime-integrity-evidence.test.ts tests/evals/eval-release-evidence.test.ts tests/mcp/transport/operations-mcp-stdio.test.ts src/core/capability-catalog/runtime-tool-binding.test.ts
npm run qa:unification
npm run qa:runtime-integrity
npm run release:evidence
rg "latency|rbac|drift" release docs/operations src tests
```
