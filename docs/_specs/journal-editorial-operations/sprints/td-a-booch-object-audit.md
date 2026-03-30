# TD-A — Booch Object Audit

> **Goal:** Audit the editorial domain, repository expansion, admin read model, and compatibility layers for abstraction quality, cohesion, encapsulation, and modularity before public route cutover.
> **Spec ref:** `JEO-019A` through `JEO-019M`, `JEO-050` through `JEO-059`, `JEO-070` through `JEO-073`, `JEO-073A` through `JEO-073D`
> **Prerequisite:** Sprint 1 complete

---

## Audit focus

1. Repository interfaces should remain persistence-focused and not absorb orchestration logic.
2. Editorial interactors or service facades should present cohesive responsibilities rather than route-shaped god objects.
3. `/admin/journal` list/detail read models should be separate from public publication builders.
4. Compatibility wrappers for `/admin/blog` and `/admin/journal` should delegate to one canonical implementation.
5. The worker inventory should map to coherent seams; read workers, deterministic mutation workers, and orchestration workers should not collapse into one "journal manager" abstraction.
6. Admin pages should read as support surfaces over canonical loaders rather than the place where the real object model lives.

## Deliverables

1. Booch findings table with severity and remediation
2. Refactors applied where cohesion or abstraction quality is weak
3. Feature-scoped audit coverage under `tests/`
4. Explicit note on whether the concrete worker inventory still aligns one-to-one with cohesive object boundaries

## Verify

```bash
npm exec vitest run tests/td-a-journal-editorial-operations.test.ts
```

## QA Deviations

None yet.
