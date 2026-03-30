# TD-C — Martin SOLID Audit

> **Goal:** Audit repository, route, page, and prompt/tool boundaries for SOLID compliance after the Jobs page and agent status work land.
> **Parent spec:** [Job Visibility And Control](../spec.md) §3.6, §6 TD-C
> **Prerequisite:** Sprint 3 complete

---

## Audit Focus

1. **Single Responsibility:** Jobs page projection logic should not live inside repository or route code.
2. **Open/Closed:** New job surfaces should extend shell navigation and status policy without conditional sprawl across unrelated modules.
3. **Dependency Inversion:** UI and route layers should depend on read-model abstractions rather than SQLite mappers.
4. **Interface Segregation:** User-scoped read contracts should not force page code to depend on mutation-only job operations.

## Required Outputs

- SOLID findings table
- remediation list
- targeted audit verification

Verify: add the audit coverage under `tests/` using the repo's top-level audit-test pattern, then run `npx vitest run tests/td-c-job-visibility-solid-audit.test.ts`

## Completion Checklist

- [x] SRP findings documented or fixed
- [x] DIP/OCP findings documented or fixed
- [x] interface boundaries verified

## QA Deviations

- None yet.
