# Implementation Plan — Session Identity Boundary Hardening

> **Status:** Ready for implementation
> **Source:** `docs/_refactor/session-identity-boundary-hardening/spec.md`

## Sprint Files

| Sprint | File | Description |
| --- | --- | --- |
| 0 | [sprint-0-real-session-authority.md](sprint-0-real-session-authority.md) | Remove mock-cookie fallback as an identity source |
| 1 | [sprint-1-safe-role-simulation.md](sprint-1-safe-role-simulation.md) | Keep role switching as an overlay on validated sessions |
| 2 | [sprint-2-auth-regression-qa.md](sprint-2-auth-regression-qa.md) | Add session cleanup and regression coverage |

## Dependency Graph

```text
Sprint 0 (real session authority)
  └──→ Sprint 1 (safe role simulation)
         └──→ Sprint 2 (regression + QA)
```