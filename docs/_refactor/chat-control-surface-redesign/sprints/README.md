# Implementation Plan — Chat Control Surface Redesign

> **Status:** Completed
> **Source:** `docs/_refactor/chat-control-surface-redesign/spec.md`

## Sprint Files

| Sprint | File | Description |
| --- | --- | --- |
| 0 | [sprint-0-audit-and-token-contract.md](sprint-0-audit-and-token-contract.md) | Lock the current surface authority map and define the token-backed redesign contract |
| 1 | [sprint-1-composer-object-and-action-hierarchy.md](sprint-1-composer-object-and-action-hierarchy.md) | Rebuild the composer object, field, send, and attachment hierarchy |
| 2 | [sprint-2-copy-reduction-mobile-calibration-and-closeout.md](sprint-2-copy-reduction-mobile-calibration-and-closeout.md) | Reduce explanatory copy, calibrate compact/mobile behavior, and close with QA |

## Dependency Graph

```text
Sprint 0 (audit + token contract)
  └──→ Sprint 1 (composer object + action hierarchy)
         └──→ Sprint 2 (copy reduction + mobile calibration + closeout)
```