# Sprint 04 - Chat Route SRP Refactor

## Goal
Split monolithic chat route into focused components with explicit boundaries.

## Problems Addressed
- `/api/chat` currently handles validation, provider calls, tool orchestration, and response formatting in one file.

## TDD Cycle
### Red
- Add failing tests for new service boundaries:
  - `validateIncomingMessages`
  - `buildToolResults`
  - `runAnthropicTurn`
  - `orchestrateToolLoop`

### Green
- Extract modules:
  - `src/lib/chat/validation.ts`
  - `src/lib/chat/tools.ts`
  - `src/lib/chat/anthropic-client.ts`
  - `src/lib/chat/orchestrator.ts`
- Keep route as thin transport/controller layer.

### Refactor
- Replace ad-hoc casts with typed interfaces at module boundaries.

## Deliverables
- Thin route handler with dependency calls only.
- Unit tests per extracted module.
- Integration tests for success + tool error path.

## Acceptance Criteria
- Route file reduced substantially and focused on HTTP concerns.
- Tool-loop behavior unchanged and test-proven.

## Risks
- Over-splitting can reduce readability; keep files cohesive by business responsibility.
