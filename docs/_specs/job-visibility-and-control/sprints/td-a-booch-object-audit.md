# TD-A — Booch Object Audit

> **Goal:** Audit the transcript job UI, Jobs page read model, and event transport for Booch object-model compliance: abstraction quality, encapsulation, modularity, hierarchy, and cohesion.
> **Parent spec:** [Job Visibility And Control](../spec.md) §3.6, §6 TD-A
> **Prerequisite:** Sprint 1 complete

---

## Audit Focus

1. Transcript rendering should remain a cohesive concern of message rendering, not shell chrome or Jobs page components.
2. User-scoped job read APIs should not leak SQLite or mapper details into route or component layers.
3. Event-stream code should not combine projection, auth, and view formatting in one place.
4. Job page selection/detail state should not be fused into the repository or route layer.

## Required Outputs

- Booch findings table with severity
- remediation checklist
- focused audit tests or structural assertions where useful

Verify: add the audit coverage under `tests/` using the repo's top-level audit-test pattern, then run `npx vitest run tests/td-a-booch-job-visibility.test.ts`

## Completion Checklist

- [x] abstraction and cohesion audit completed
- [x] encapsulation leaks documented or fixed
- [x] modularity/hierarchy issues documented or fixed

## QA Deviations

- None yet.
