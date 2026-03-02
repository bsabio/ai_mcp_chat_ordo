# Sprint 07 - Type Safety Cleanup and Regression Shield

## Goal
Remove unsafe type assertions and lock behavior with high-value regression tests.

## Problems Addressed
- `as never` and broad casts at API boundaries.
- Fragility around Anthropic SDK type contracts.

## TDD Cycle
### Red
- Add failing type-focused tests (or compile-time contract tests) for:
  - tool definitions
  - message transformations
  - tool result structures
- Add end-to-end regression tests for:
  - normal chat
  - math forced through calculator
  - model-not-found fallback

### Green
- Replace unsafe casts with typed adapter functions and narrowed types.
- Introduce explicit DTO types for route payloads and provider payloads.

### Refactor
- Prune dead code and unify repeated error strings/constants.

## Deliverables
- Minimal/no unsafe casts in chat route modules.
- Regression suite covering core workflows.
- Final architecture notes documenting module responsibilities.

## Acceptance Criteria
- Build passes with strict typing and no new lint/type suppressions.
- Regression suite passes reliably.

## Risks
- SDK types can change across releases; pin versions and add adapter isolation.
