# Implementation Plan — Anonymous Conversation Consistency

> **Status:** Ready for implementation
> **Source:** `docs/_refactor/anonymous-conversation-consistency/spec.md`
> **Focus:** Make anonymous persistence behave the same on create, restore, and
> archive flows.

## Sprint Files

| Sprint | File | Description |
| --- | --- | --- |
| 0 | [sprint-0-route-policy-alignment.md](sprint-0-route-policy-alignment.md) | Narrow middleware protection to auth-only endpoints |
| 1 | [sprint-1-client-restore-hardening.md](sprint-1-client-restore-hardening.md) | Improve client bootstrap handling and route tests |
| 2 | [sprint-2-regression-qa.md](sprint-2-regression-qa.md) | Verify end-to-end anonymous restore behavior and clean up docs/tests |

## Dependency Graph

```text
Sprint 0 (policy alignment)
  └──→ Sprint 1 (client restore + tests)
         └──→ Sprint 2 (regression QA)
```
