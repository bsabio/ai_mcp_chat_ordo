# Sprint 02 - Shared Chat Policy Module

## Goal
Eliminate duplicate policy logic between standard and streaming routes.

## Problems Addressed
- Duplicated `looksLikeMath`, `SYSTEM_PROMPT`, and model candidates.
- Drift risk between `/api/chat` and `/api/chat/stream`.

## TDD Cycle
### Red
- Add failing unit tests for shared policy module:
  - Math detection positive and negative cases.
  - Model candidate ordering and dedupe.
  - Prompt content includes mandatory tool-use instruction.

### Green
- Implement `src/lib/chat/policy.ts` with pure functions/constants.
- Replace route-local copies with imports.

### Refactor
- Simplify route handlers by removing repeated blocks.

## Deliverables
- `policy.ts` with:
  - `SYSTEM_PROMPT`
  - `looksLikeMath()`
  - `getModelCandidates()`
- Route handlers updated to shared imports.

## Acceptance Criteria
- Zero duplicated policy functions in route files.
- Policy tests pass with >90% coverage for module.

## Risks
- Behavior changes in edge regex matching; mitigate with fixture tests.
