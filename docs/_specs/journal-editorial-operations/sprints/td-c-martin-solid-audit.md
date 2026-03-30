# TD-C — Martin SOLID Audit

> **Goal:** Audit SOLID and Clean Architecture boundaries across journal interactors, repositories, admin APIs, route handlers, and route-convergence helpers.
> **Spec ref:** `JEO-019B`, `JEO-019E` through `JEO-019M`, `JEO-059A` through `JEO-059C`, `JEO-073A` through `JEO-073D`, `JEO-085A` through `JEO-085G`
> **Prerequisite:** Sprint 3 complete

---

## Audit focus

1. Single Responsibility: admin list loading, workflow transitions, revision restore, and route redirects should not collapse into one module.
2. Open/Closed: route compatibility should support `/blog` and `/journal` without duplicating page logic.
3. Interface Segregation: route handlers and server components should depend on narrow editorial use-case interfaces.
4. Dependency Inversion: route handlers should depend on interactors or services, not data mappers directly when business rules are involved.
5. Layer purity: no SQL in use cases, no business policy in route files, no UI logic in adapters.
6. Worker isolation: discrete journal workers should stay narrow; do not let one orchestration surface absorb metadata edits, revision restore, inventory reporting, and publication policy.
7. Support-surface discipline: admin pages and chat presenters should both depend on the same narrow service seams rather than each growing bespoke business logic.

## Deliverables

1. SOLID findings table with violation catalog and remediation
2. Refactors applied for layering or interface drift
3. Feature-scoped audit tests under `tests/`
4. Explicit finding on whether the concrete worker inventory still satisfies SRP and ISP after implementation

## Verify

```bash
npm exec vitest run tests/td-c-journal-editorial-operations.test.ts
```

## QA Deviations

None yet.
