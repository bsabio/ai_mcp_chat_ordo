# Sprint 03 - Calculator Single Source of Truth

## Goal
Remove duplicated calculator logic and reuse one domain implementation across API and MCP server.

## Problems Addressed
- `calculate` logic duplicated in TS app layer and MCP server JS file.

## TDD Cycle
### Red
- Add failing contract tests that run the same arithmetic fixture set against:
  - Domain calculator function.
  - MCP `calculator` tool call output.

### Green
- Move calculator implementation to one shared module and adapt both consumers.
- Ensure divide-by-zero and invalid input errors are identical.

### Refactor
- Introduce adapter wrappers where language/runtime boundaries differ.

## Deliverables
- Shared calculator core module.
- MCP server imports shared logic (or generated wrapper) instead of reimplementing.
- Unified error message constants.

## Acceptance Criteria
- Fixture parity tests pass for all operations and error cases.
- No duplicate arithmetic branches remain in MCP server.

## Risks
- ESM import path friction between server script and app code; mitigate with clear module boundary.
