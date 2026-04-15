# System Debt Cleaning — Sprint Plan

16 specs across 5 sprints. Each sprint's entry criteria require the previous sprint to be complete.

| Sprint | Theme | Specs | Duration | Key Deliverable |
|--------|-------|-------|----------|----------------|
| [1](sprint-1-foundation-and-critical-safety.md) | Foundation & Critical Safety | 01, 03, 04 | ~2 weeks | Unified `getToolComposition()`, worker decoupling |
| [2](sprint-2-validation-boundaries-and-observability.md) | Validation Boundaries & Observability | 07, 08, 06, 05, 13 | ~2 weeks | Zod schemas, structured logging, env centralization |
| [3](sprint-3-runtime-consistency.md) | Runtime Consistency | 02, 09, 12 | ~2 weeks | Single RBAC enforcement, embedder singleton, role-switch audit |
| [4](sprint-4-architecture-decomposition.md) | Architecture Decomposition | 10, 14, 11 | ~2–3 weeks | Route decomposed, composition root bundled, CSRF middleware |
| [5](sprint-5-formalization-and-cleanup.md) | Formalization & Cleanup | 16, 15 | ~1 week | Deprecated shims removed, `DEBT_BACKLOG.md` |

## Dependency Flow

```
Sprint 1 (01, 03, 04)
    │
    ├──► Sprint 2 (07, 08, 06, 05, 13)
    │        │
    │        ├──► Sprint 3 (02, 09, 12)
    │        │        │
    │        │        ├──► Sprint 4 (10, 14, 11)
    │        │        │        │
    │        │        │        └──► Sprint 5 (16, 15)
    │        │        │
    │        └────────┘
    └────────────────────────────┘
```

## Spec → Sprint Map

| Spec | Title | Sprint |
|------|-------|--------|
| 01 | Registry/Executor Unification | 1 |
| 02 | RBAC Policy Consolidation | 3 |
| 03 | Tool-Round Config Unification | 1 |
| 04 | Worker/Server Decoupling | 1 |
| 05 | SQLite Boundary Formalization | 2 |
| 06 | TTS Route Hardening | 2 |
| 07 | Request Validation Schemas | 2 |
| 08 | Fallback Observability | 2 |
| 09 | Embedder Warm-Up & Batching | 3 |
| 10 | Stream Route Decomposition | 4 |
| 11 | CSRF Hardening | 4 |
| 12 | Dev Role-Switch Guard | 3 |
| 13 | Env Centralization | 2 |
| 14 | Composition Root Decomposition | 4 |
| 15 | Debt Backlog Formalization | 5 |
| 16 | Compatibility Layer Sunset | 5 |
