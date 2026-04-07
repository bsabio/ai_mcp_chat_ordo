# Mobile Surface Density And Route Remediation - Sprints

> **Status:** In Progress
> **Source:** `docs/_refactor/mobile-surface-density-and-route-remediation/spec.md`

## Sprint Files

| Sprint | File | Description |
| --- | --- | --- |
| 0 | [sprint-0-baseline-audit-route-contract-and-acceptance-gates.md](sprint-0-baseline-audit-route-contract-and-acceptance-gates.md) | Freeze the current mobile route-family authority map and define the acceptance matrix and regression harness plan |
| 1 | [sprint-1-shared-mobile-primitives-and-floating-chat.md](sprint-1-shared-mobile-primitives-and-floating-chat.md) | Establish shared mobile density primitives and fix chat, home, and library-index compaction defects |
| 2 | [sprint-2-public-routes-discovery-and-reading-remediation.md](sprint-2-public-routes-discovery-and-reading-remediation.md) | Compact public discovery, reading, auth, and landing routes while preserving editorial quality |
| 3 | [sprint-3-workspace-and-admin-list-compaction.md](sprint-3-workspace-and-admin-list-compaction.md) | Rebuild signed-in workspace and admin list routes around mobile-first scan order and overflow models |
| 4 | [sprint-4-admin-detail-editorial-and-inspector-redesign.md](sprint-4-admin-detail-editorial-and-inspector-redesign.md) | Redesign admin detail and editorial routes into mobile-first review and edit sequences |
| 5 | [sprint-5-regression-coverage-route-evidence-and-release-closeout.md](sprint-5-regression-coverage-route-evidence-and-release-closeout.md) | Add route-level regression coverage, manual evidence, and final release gates |

## Dependency Graph

```text
Sprint 0 (baseline contract + acceptance gates)
  └──→ Sprint 1 (shared mobile primitives + floating chat)
         └──→ Sprint 2 (public discovery + reading + auth)
                └──→ Sprint 3 (workspace + admin list compaction)
                       └──→ Sprint 4 (admin detail + editorial redesign)
                              └──→ Sprint 5 (regression coverage + release closeout)
```
