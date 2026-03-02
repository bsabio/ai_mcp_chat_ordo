# Sprint 00 - Testing Foundation (TDD Bootstrap)

## Goal
Create a reliable automated test foundation so all subsequent sprints follow strict TDD.

## Problems Addressed
- No test suite currently in place.
- Refactors are high risk without fast feedback loops.

## TDD Cycle
### Red
- Add failing smoke tests for:
  - `calculate` behavior (valid ops + divide by zero).
  - `looksLikeMath` heuristics.
  - Chat route basic request validation (`400` on empty messages).

### Green
- Configure test stack and make tests pass with minimal implementation support.

### Refactor
- Consolidate test utilities for route handler invocation and fixtures.

## Deliverables
- Test runner (`vitest`) configured.
- Coverage tooling enabled.
- Shared test helper folder (`tests/helpers`) for request factories.
- CI-ready scripts:
  - `test`
  - `test:watch`
  - `test:coverage`

## Acceptance Criteria
- At least 8 tests run and pass.
- Total test runtime under 10s on dev machine.
- Coverage report generated successfully.

## Risks
- Next route handler testing setup can be noisy; mitigate with helper wrappers.
