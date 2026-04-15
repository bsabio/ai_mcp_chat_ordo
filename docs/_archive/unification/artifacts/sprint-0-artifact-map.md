# Sprint 0 Artifact Map

> **Status:** Frozen on 2026-04-11

This artifact map defines where the unification program should store evidence so
later sprints do not scatter planning and release artifacts across unrelated
folders.

## Artifact Homes

| Artifact class | Default home | Notes |
| --- | --- | --- |
| Baseline freezes | `docs/_refactor/unification/artifacts/` | Sprint 0 owns the baseline record |
| Equivalence matrices | `docs/_refactor/unification/artifacts/` | includes prompt-control and provider-policy equivalence evidence |
| Seam-test coverage notes | `docs/_refactor/unification/artifacts/` | keep architecture-specific test evidence close to the workstream |
| Capability derivation matrices | `docs/_refactor/unification/artifacts/` | may later be promoted into operations or release docs if they become permanent reference material |
| Release-gate reports | `docs/_refactor/unification/artifacts/` plus `release/` for machine-readable artifacts | markdown explanation in the workstream, machine-readable outputs in `release/` |
| Public-package safety checklists | `docs/_refactor/unification/artifacts/` | should remain human-readable and reviewable in source control |
| Residual-risk registers | `docs/_refactor/unification/artifacts/` | publish explicitly at closeout |
| Stable architecture and operator docs | `docs/operations/` | only move material here once the architecture is actually shipped |

## Freeze Rules

1. Sprint-specific evidence should stay in the unification workstream until the program closes.
2. Machine-readable release evidence should go to `release/` only when the command that produces it is part of the actual release gate.
3. Do not store secrets, environment values, or production-only identifiers in any artifact.
