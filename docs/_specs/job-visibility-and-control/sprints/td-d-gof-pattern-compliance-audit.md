# TD-D — GoF Pattern Compliance Audit

> **Goal:** Audit the feature for correct use of Repository, Facade, Observer, and Strategy patterns.
> **Parent spec:** [Job Visibility And Control](../spec.md) §3.6, §6 TD-D
> **Prerequisite:** TD-C complete

---

## Audit Focus

1. **Repository:** Job persistence and read-model loading remain behind repository ports.
2. **Facade:** Jobs page API assembly or service facade hides multi-step loading details from page components.
3. **Observer:** SSE/event propagation remains event-driven rather than ad hoc polling embedded throughout UI code.
4. **Strategy:** Status-summary behavior can vary by request intent without embedding branching prose logic throughout the chat stack.

## Required Outputs

- GoF findings table
- applied corrections or accepted deviations
- targeted verification tests

Verify: add the audit coverage under `tests/` using the repo's top-level audit-test pattern, then run `npx vitest run tests/job-visibility-patterns.test.ts`

## Completion Checklist

- [x] Repository pattern usage verified
- [x] Facade/Observer/Strategy usage verified
- [x] deviations documented or fixed

## QA Deviations

- None yet.
