# Role Navigation QA Refactor — Sprint Plan

> **Status:** Complete Through Sprint 3
> **Source:** [../spec.md](../spec.md)
> **Grounding audits:** [../admin-dashboard-nav-audit.md](../admin-dashboard-nav-audit.md), [../theme-mcp-contract-audit.md](../theme-mcp-contract-audit.md)
> **Convention:** Each sprint must reduce route, permission, and ownership drift before it widens UI complexity.

## Sprint Files

| Sprint | File | Tasks | Description |
| --- | --- | --- | --- |
| **0** | [sprint-0-inventory-and-capability-registry.md](sprint-0-inventory-and-capability-registry.md) | 4 | Create the canonical job capability registry, freeze the current authority map, and add drift guards before any `/jobs` UI change |
| **1** | [sprint-1-self-service-jobs-route-truth.md](sprint-1-self-service-jobs-route-truth.md) | 4 | Finish the signed-in `/jobs` workspace with detail, live sync, and route-truth regression coverage |
| **2** | [sprint-2-global-jobs-policy-alignment.md](sprint-2-global-jobs-policy-alignment.md) | 4 | Make `/admin/jobs` consume capability policy instead of ad hoc assumptions |
| **3** | [sprint-3-navigation-convergence.md](sprint-3-navigation-convergence.md) | 4 | Canonicalize shell/account/admin route truth, converge shipped desktop/mobile admin nav, and align admin surfaces to the live theme system |
| **4** | Planned: `sprint-4-qa-matrix-and-regression-hardening.md` | 4 | Add role-by-route and role-by-capability regression coverage and close remaining drift |

## Dependency Graph

```text
Sprint 0 (capability registry + authority freeze)
  -> Sprint 1 (/jobs route truth)
     -> Sprint 2 (/admin/jobs policy alignment)
        -> Sprint 3 (navigation convergence)
           -> Sprint 4 (QA matrix + regression hardening)
```

## Summary

| Sprint | Primary risk removed |
| --- | --- |
| **0** | Deferred job types, signed-in job roles, and cross-layer authority remain implicit and can drift silently |
| **1** | `/jobs` remains too shallow to act as a durable signed-in workspace for one selected job |
| **2** | Global jobs behavior stays coupled to admin-only assumptions instead of explicit capability policy |
| **3** | Shell, account, desktop admin, and mobile admin navigation keep diverging from one another |
| **4** | Role and route drift remain easy to reintroduce without focused regression coverage |

## Requirement Mapping

| Requirement group | Covered in |
| --- | --- |
| `RNQ-001` through `RNQ-004` | Sprint 0 |
| `RNQ-010` through `RNQ-014` | Sprints 0-2 |
| `RNQ-020` through `RNQ-026` | Sprints 0-4 |
| `RNQ-030` through `RNQ-043` | Sprints 0-2 |
| `RNQ-050` through `RNQ-055` | Sprints 1-3 |
| `RNQ-060` through `RNQ-071` | Sprints 0-2 |
| `RNQ-080` through `RNQ-095` | Sprints 3-4 |

## Current Sprint State

1. Sprint 0 is complete and verified.
2. Sprint 1 is complete and verified, including selected-job detail, durable history, live SSE sync, focused route/browser coverage, typecheck, and production build.
3. Sprint 2 is complete and verified, including capability-aware browse, detail, and action policy for `/admin/jobs`, focused regression coverage, typecheck, and production build.
4. Sprint 3 is complete and verified, including canonical grouped admin navigation, the mounted mobile admin navigator, the owned admin CSS partition, focused Vitest and Playwright regression coverage, `npm run typecheck`, and a production build.
5. Sprint 4 is the next planned phase and will expand the role x route x capability regression matrix around the converged navigation model.
