# Sprint 12F-02 - Backing Service Abstraction and Resilience

## Objective
Improve Factors IV and VIII readiness.

## Scope
- Introduce provider adapter interface for LLM calls.
- Add timeouts/retry policy and error normalization.
- Add contract tests for provider behavior under failures.

## TDD Plan
### Red
- Failing tests for timeout, transient failures, and provider not-found behavior.

### Green
- Implement adapter + resilience wrappers.

### Refactor
- Route handlers consume adapter service only.

## Acceptance Criteria
- All provider interactions pass through one abstraction.
- Retry/timeout behavior is deterministic and tested.
- Failure modes return standardized API error envelopes.
