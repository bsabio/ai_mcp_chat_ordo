# Implementation Plan — Conversation Search Migration Integrity

> **Status:** Ready for implementation
> **Source:** `docs/_refactor/conversation-search-migration-integrity/spec.md`

## Sprint Files

| Sprint | File | Description |
| --- | --- | --- |
| 0 | [sprint-0-index-repair-primitives.md](sprint-0-index-repair-primitives.md) | Create safe reindex/repair building blocks |
| 1 | [sprint-1-registration-migration-wiring.md](sprint-1-registration-migration-wiring.md) | Repair index during anonymous-to-authenticated conversion on registration and login |
| 2 | [sprint-2-backfill-and-qa.md](sprint-2-backfill-and-qa.md) | Add recovery tooling and regression coverage |

## Dependency Graph

```text
Sprint 0 (repair primitives)
  └──→ Sprint 1 (auth-success wiring)
         └──→ Sprint 2 (backfill + QA)
```
