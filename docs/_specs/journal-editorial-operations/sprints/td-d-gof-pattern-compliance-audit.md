# TD-D — GoF Pattern Compliance Audit

> **Goal:** Audit compatibility facades, repository/data-mapper correctness, composition-root wiring, and route-convergence wrappers for pattern correctness and drift resistance.
> **Spec ref:** `JEO-019E` through `JEO-019I`, `JEO-073A` through `JEO-073D`, `JEO-081` through `JEO-085`, `JEO-093A` through `JEO-093E`
> **Prerequisite:** TD-C complete

---

## Audit focus

1. **Facade:** `/blog` and `/journal`, plus blog-named and journal-named admin APIs, should act as compatibility facades over one canonical implementation.
2. **Repository + Data Mapper:** SQL remains isolated in mappers and repository contracts stay consistent with the rest of the codebase.
3. **Composition Root:** editorial services and interactors are wired in one place rather than assembled ad hoc in route files.
4. **Read Model:** admin list/detail loaders are intentionally separate from public publication composition.
5. **Tool Wrapper Pattern:** journal-first worker names should wrap or delegate to canonical implementations where compatibility is required, not fork behavior into parallel pipelines.
6. **Compatibility Pattern:** chat presenters, route helpers, and admin quick actions should share one canonical route-truth helper rather than duplicate redirect logic or URL construction.

## Deliverables

1. Pattern verification report with findings and applied corrections
2. Compatibility-layer inventory confirming there is one canonical implementation per capability
3. Feature-scoped audit tests under `tests/`
4. Verification that concrete journal workers are registered or wrapped through composition-root seams rather than assembled ad hoc in UI modules

## Verify

```bash
npm exec vitest run tests/td-d-journal-editorial-operations.test.ts
```

## QA Deviations

None yet.
