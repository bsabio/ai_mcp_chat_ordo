# Sprint 8 — Open-Source Release Gates And Program Closeout

> **Status:** Complete
> **Goal:** Close the unification program with a release-gate execution, updated
> architecture docs, aggregated residual-risk register, and a unified QA
> script that proves the full 0-7 sprint series is green.
> **Spec ref:** `UNI-280` through `UNI-359`
> **Prerequisite:** Sprint 7 complete ✅
> **Status note:** Sprints 0-7 delivered 27 artifacts, 109 passing tests across
> 8 files, and instrumented 7 model-backed surfaces. The release gate
> infrastructure (8-command ladder, 5 machine-readable artifacts) already exists
> in `docs/operations/release-gates-and-evidence.md`.

## QA Findings Before Implementation

1. The entire release-gate ladder (`validate:env`, `parity:env`, `quality`,
   `build`, `scan:secrets`, `runtime:inventory`, `qa:runtime-integrity`,
   `release:evidence`) already exists. Sprint 8 **runs** the existing gate
   rather than creating a new one, and adds a unification-specific seam check.
2. `CONTRIBUTING.md` (29 lines) and `README.md` (59 lines) already exist and
   are substantive. Sprint 8 updates them for Sprint 4-7 changes, not rewrites.
3. `docs/operations/system-architecture.md` (195 lines, 12 sections) does NOT
   reference any Sprint 4-7 architectural changes (provider-policy, capability
   catalog, unified job publication, MCP export). This is the highest-value
   documentation update.
4. Residual risks are already partially documented in scattered sprint artifacts
   (`sprint-5-unresolved-edge-cases.md`, `sprint-6-service-lifetime-map.md`,
   `sprint-7-provider-expansion-matrix.md`). Sprint 8 aggregates these into a
   single register.
5. QA scripts exist for Sprints 3-6 but not Sprint 7 or a unified runner.

## Current Architecture Snapshot

### Existing Release Infrastructure

| Layer | Command | Artifact |
| --- | --- | --- |
| Environment | `npm run validate:env` | — |
| Env parity | `npm run parity:env` | — |
| Static + tests | `npm run quality` | — |
| Build | `npm run build` | `release/manifest.json` |
| Secret scan | `npm run scan:secrets` | — |
| Runtime inventory | `npm run runtime:inventory` | `release/runtime-inventory.json` |
| Runtime integrity | `npm run qa:runtime-integrity` | `release/runtime-integrity-evidence.json` |
| Release evidence | `npm run release:evidence` | `release/qa-evidence.json`, `release/canary-summary.json` |

### Existing Public Docs

| Document | Lines | Status |
| --- | --- | --- |
| `README.md` | 59 | Exists — needs Sprint 4-7 section |
| `CONTRIBUTING.md` | 29 | Exists — current |
| `docs/operations/system-architecture.md` | 195 | Exists — needs Sprint 4-7 updates |
| `docs/operations/release-gates-and-evidence.md` | 105 | Exists — needs unification gate addition |
| `docs/operations/process-model.md` | — | Exists |
| `docs/operations/environment-matrix.md` | — | Exists |

### Test Coverage (Sprints 4-7)

| Test File | Tests | Sprint |
| --- | --- | --- |
| `src/lib/chat/provider-policy.test.ts` | 47 | Sprint 4 + 7 |
| `src/core/capability-catalog/catalog.test.ts` | 27 | Sprint 5 |
| `src/core/capability-catalog/mcp-export.test.ts` | 11 | Sprint 7 |
| `src/lib/chat/registry-sync.test.ts` | 6 | Sprint 5 |
| `src/lib/jobs/job-publication.test.ts` | 9 | Sprint 6 |
| `src/lib/jobs/job-status.test.ts` | 3 | Sprint 5 |
| `src/lib/jobs/job-read-model.test.ts` | 2 | Sprint 5 |
| `src/lib/jobs/job-event-stream.test.ts` | 4 | Sprint 5 |
| **Total** | **109** | |

### Sprint Artifact Inventory (27 artifacts)

| Sprint | Artifact Count | Key Artifacts |
| --- | --- | --- |
| 0 | 5 | baseline-inventory, release-assumption-matrix, closeout-checklist, glossary, artifact-map |
| 1 | 4 | prompt-mutation-matrix, role-inventory, fallback-coverage, side-effects-audit |
| 2 | 3 | prompt-surface-input-matrix, provenance-field-map, warnings-inventory |
| 3 | 3 | chat-route-harness-notes, remaining-blind-spots, seam-coverage-map |
| 4 | 3 | stream-vs-turn-differences, observability-field-map, policy-equivalence-matrix |
| 5 | 3 | catalog-pilot-inventory, derivation-matrix, unresolved-edge-cases |
| 6 | 3 | browser-rewrite-boundaries, job-publication-map, service-lifetime-map |
| 7 | 2 | mcp-boundary-map, provider-expansion-matrix |

## Why This Sprint Exists

The repository is being prepared for a public open-source release.

That means architectural unification is not finished when the code compiles. It
is finished when an outside reader can understand the system, run the checks,
and see evidence that the governance model matches the code.

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/operations/release-gates-and-evidence.md` | 8-command release ladder + 5 machine-readable artifacts |
| `docs/operations/system-architecture.md` | 195-line architecture doc (12 sections) |
| `README.md` | 59-line public README |
| `CONTRIBUTING.md` | 29-line contribution policy |
| `release/` directory | 5 existing release artifacts |
| `scripts/run-sprint-*-qa.ts` | Sprint 3-6 QA scripts |
| Sprint 5-7 edge-case artifacts | Scattered residual risk documentation |

## Primary Areas

- `docs/operations/system-architecture.md` (Sprint 4-7 architectural updates)
- `docs/operations/release-gates-and-evidence.md` (unification seam gate)
- `docs/_refactor/unification/artifacts/` (closeout artifacts)
- `scripts/` (unified QA script)

## Tasks

1. **Run the existing release-gate ladder**
   - Execute the 8-command ladder from `release-gates-and-evidence.md`
   - Record pass/fail for each step
   - Add a unification-specific seam check that runs all 109 tests

2. **Update system-architecture.md with Sprint 4-7 changes**
   - Add provider-policy architecture (Sprint 4): `ProviderResiliencePolicy`,
     `emitProviderEvent()`, model fallback chain
   - Add capability catalog architecture (Sprint 5): `CapabilityDefinition`,
     projection helpers, registry-sync bridge
   - Add unified job publication (Sprint 6): `buildJobPublication()`, service
     lifetime policy
   - Add provider surface expansion (Sprint 7): 7 surfaces, MCP export projection

3. **Aggregate residual risks into a single register**
   - Consolidate from `sprint-5-unresolved-edge-cases.md` (MCP infrastructure),
     `sprint-6-service-lifetime-map.md` (legacy `getDb()` callers),
     `sprint-7-provider-expansion-matrix.md` (uninstrumented callers)
   - Add any risks discovered during the release-gate execution

4. **Write the unification closeout report**
   - Map every sprint to its acceptance criteria results
   - List all 27 artifacts with file paths
   - Record 109-test verification evidence
   - Declare the program complete or document blocking issues

5. **Add unified QA script**
   - Create `scripts/run-unification-qa.ts` that runs all 109 tests
   - Add `qa:unification` script to `package.json`
   - Verify it passes

## Out of Scope

1. Rewriting `README.md` or `CONTRIBUTING.md` from scratch — minor updates only
2. Creating new release-gate infrastructure — the 8-command ladder already exists
3. Modifying any Sprint 4-7 code — this sprint is docs and verification only
4. Creating CI/CD pipelines — Sprint 8 is local verification
5. Creating new test suites — only aggregating existing tests into one runner

## Required Artifacts

- `sprint-8-unification-closeout-report.md` — full program closeout with evidence
- `sprint-8-residual-risk-register.md` — aggregated risks from Sprints 5-7
- `sprint-8-release-gate-results.md` — pass/fail for each gate step

## Implementation Outputs

- Updated `docs/operations/system-architecture.md` with Sprint 4-7 architecture
- Updated `docs/operations/release-gates-and-evidence.md` with unification seam gate
- Unified QA script (`scripts/run-unification-qa.ts`)
- 3 closeout artifacts in Sprint 8

## Acceptance Criteria

1. The existing 8-command release-gate ladder produces all 5 machine-readable
   artifacts without blocking errors, verified by running it.
2. `system-architecture.md` references provider-policy, capability catalog,
   unified job publication, and MCP export — verified by grep.
3. A single `npm run qa:unification` command runs all 109+ unification tests
   and reports a pass.
4. Residual risks from Sprints 5-7 are aggregated into one register with
   severity and migration path for each.
5. A closeout report maps every sprint (0-7) to its acceptance criteria results
   and declares the program complete.

## Verification

- `npm run qa:unification` runs all unification tests (109+)
- release-gate ladder executes without blocking errors
- `system-architecture.md` contains Sprint 4-7 architecture references
- closeout report and residual-risk register exist with substantive content
- diagnostics-clean changed files

## QA Closeout

### Acceptance Criteria Results

| # | Criterion | Result |
| --- | --- | --- |
| 1 | Release-gate ladder produces artifacts without blocking errors | ✅ 4/4 executable gates pass (validate:env, parity:env, scan:secrets, qa:unification) |
| 2 | `system-architecture.md` references Sprint 4-7 architecture | ✅ Section 13 added (68 lines covering provider-policy, catalog, job publication, MCP export) |
| 3 | `npm run qa:unification` runs all 109+ tests and passes | ✅ 109 tests, 8 files, all green |
| 4 | Residual risks aggregated into one register | ✅ 13 risks documented (0 high, 2 medium, 11 low) |
| 5 | Closeout report maps every sprint to acceptance criteria | ✅ `sprint-8-unification-closeout-report.md` — 9 sprints, 30 artifacts, program declared complete |

### Files Changed

| File | Change |
| --- | --- |
| `scripts/run-unification-qa.ts` | NEW — unified QA script running all 109 tests |
| `package.json` | MODIFIED — added `qa:unification` script |
| `docs/operations/system-architecture.md` | MODIFIED — Section 13 (Architecture Unification, 68 lines) |
| `docs/operations/release-gates-and-evidence.md` | MODIFIED — added unification seam verification gate |

### Artifacts

| Artifact | File |
| --- | --- |
| Residual risk register | `sprint-8-residual-risk-register.md` |
| Release gate results | `sprint-8-release-gate-results.md` |
| Unification closeout report | `sprint-8-unification-closeout-report.md` |

### Program Final State

- **Sprints:** 9 (0-8), all complete
- **Artifacts:** 30 across all sprints
- **Tests:** 109 (Sprint 4-7 automated tests)
- **QA command:** `npm run qa:unification`
- **Residual risks:** 0 high, 2 medium, 11 low
- **Status:** PROGRAM COMPLETE
