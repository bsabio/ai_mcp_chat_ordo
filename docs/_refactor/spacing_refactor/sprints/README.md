# Implementation Plan — Spacing And Layout Refactor

> **Status:** Sprint 3 complete
> **Source:** `docs/_refactor/spacing_refactor/spec.md`

## Sprint Files

| Sprint | File | Description |
| --- | --- | --- |
| 0 | [sprint-0-authority-map-and-token-baseline.md](sprint-0-authority-map-and-token-baseline.md) | Freeze spacing authority, define the first semantic token layer, and add audit guardrails |
| 1 | [sprint-1-shell-and-chat-migration.md](sprint-1-shell-and-chat-migration.md) | Migrate shell and chat surfaces onto the governed spacing contract |
| 2 | [sprint-2-journal-and-jobs-migration.md](sprint-2-journal-and-jobs-migration.md) | Extend the spacing system into jobs, journal, and other shared panel surfaces |
| 3 | [sprint-3-component-sweep-and-enforcement.md](sprint-3-component-sweep-and-enforcement.md) | Finish deferred surfaces, tighten the audit, and close verification |

## Dependency Graph

```text
Sprint 0 (authority + token baseline)
  └──→ Sprint 1 (shell + chat adoption)
         └──→ Sprint 2 (shared panel and menu migration)
                └──→ Sprint 3 (component sweep + strict enforcement)
```
