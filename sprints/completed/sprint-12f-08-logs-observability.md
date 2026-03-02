# Sprint 12F-08 - Structured Logging and Observability Baseline

## Objective
Close major gaps for Factor XI.

## Scope
- Add structured JSON logs for API routes.
- Add request ID correlation and error codes.
- Add minimal metrics counters (requests, errors, latency buckets).

## TDD Plan
### Red
- Tests assert log shape and correlation ID propagation.

### Green
- Implement logger utility and route instrumentation.

### Refactor
- Remove ad hoc error string responses where structured codes are needed.

## Acceptance Criteria
- Every request log has timestamp, level, route, requestId.
- Error responses include stable error code field.
- Logs are stdout/stderr stream-friendly for aggregation.
