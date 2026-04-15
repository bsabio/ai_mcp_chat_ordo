# Sprint 0 — Baseline Freeze, Governance, And Artifact Map

> **Status:** Complete
> **Goal:** Freeze the baseline contracts, inventories, public-release
> assumptions, and artifact locations before runtime refactors begin.
> **Spec ref:** `UNI-010` through `UNI-039`, `UNI-320` through `UNI-359`

## Why This Sprint Exists

The unification research set is broad enough that later work can easily forget
side concerns that matter to a public release.

Sprint 0 exists to freeze the starting point and define what must be carried
forward all the way to closeout.

## Primary Areas

- `docs/_refactor/unification/*`
- `docs/operations/*`
- `README.md`
- `CONTRIBUTING.md`
- release evidence scripts and docs
- current runtime-integrity and secret-scan commands

## Tasks

1. **Freeze current inventories**
   - Record current role inventory, capability counts, prompt slot coverage,
  provider-path inventory, deferred-state publication paths, stop semantics,
  service lifetime classes, MCP boundary facts, and current seam-test blind
  spots.

2. **Freeze program vocabulary**
   - Finalize the canonical meanings of capability catalog, prompt runtime,
     provider runtime, prompt control plane, deferred-state projection, MCP
     export layer, and release gate.

3. **Define artifact locations**
   - Create the intended artifact map for future sprint evidence so baseline,
     equivalence, release-gate, and public-package artifacts do not end up
     scattered.

4. **Document public-release assumptions**
   - Record which deployment, environment, contributor, and governance facts are
     allowed to remain repo-internal and which must become public docs.

5. **Freeze acceptance and closeout categories**
   - Define what the program must prove at the end for architecture unification,
     public release, and governance closeout.

## Required Artifacts

- [../artifacts/sprint-0-baseline-inventory.md](../artifacts/sprint-0-baseline-inventory.md)
- [../artifacts/sprint-0-public-release-assumption-matrix.md](../artifacts/sprint-0-public-release-assumption-matrix.md)
- [../artifacts/sprint-0-closeout-category-checklist.md](../artifacts/sprint-0-closeout-category-checklist.md)
- [../artifacts/sprint-0-vocabulary-and-boundary-glossary.md](../artifacts/sprint-0-vocabulary-and-boundary-glossary.md)
- [../artifacts/sprint-0-artifact-map.md](../artifacts/sprint-0-artifact-map.md)

## Implementation Outputs

- updated unification spec and sprint docs as needed
- `docs/_refactor/unification/artifacts/README.md`
- `docs/operations/release-gates-and-evidence.md`
- repo entry-point updates in `README.md`, `CONTRIBUTING.md`, `docs/README.md`,
  `docs/operations/user-handbook.md`, and `docs/operations/system-architecture.md`
- baseline inventory notes for prompts, providers, capabilities, jobs, and
  release gates in the linked Sprint 0 artifacts

## Acceptance Criteria

1. Later sprints can reference a frozen baseline instead of re-deriving scope.
2. Public-release concerns are explicit rather than implied.
3. Artifact locations and closeout categories are agreed before code changes
   start.
4. The baseline includes service lifetime, MCP boundary, interruption/recovery,
  and test-reality facts from the research set rather than only prompt and
  provider summaries.

## Verification

- documentation review only
- no runtime behavior changes required in this sprint
