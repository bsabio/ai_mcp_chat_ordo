# Implementation Plan — Summary Context Hardening

> **Status:** Ready for implementation
> **Source:** `docs/_refactor/summary-context-hardening/spec.md`

## Sprint Files

| Sprint | File | Description |
| --- | --- | --- |
| 0 | [sprint-0-context-window-contract.md](sprint-0-context-window-contract.md) | Fix summary replay representation |
| 1 | [sprint-1-route-assembly-alignment.md](sprint-1-route-assembly-alignment.md) | Align route/provider assembly to the corrected contract |
| 2 | [sprint-2-regression-and-safety.md](sprint-2-regression-and-safety.md) | Add regression tests and safety assertions |

## Dependency Graph

```text
Sprint 0 (context contract)
  └──→ Sprint 1 (route assembly)
         └──→ Sprint 2 (regression + safety)
```
