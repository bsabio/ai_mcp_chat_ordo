# Sprint 05 - Streaming Hardening and Parser Reliability

## Goal
Make streaming robust under malformed chunks, partial frames, and upstream errors.

## Problems Addressed
- Manual SSE parsing is brittle.
- Stream endpoint and non-stream endpoint may drift in behavior.

## TDD Cycle
### Red
- Add failing parser tests for SSE edge cases:
  - split JSON across chunks
  - multiple events in one frame
  - unknown event types
  - malformed `data:` payload
- Add integration test for math request path delegating to `/api/chat`.

### Green
- Extract parser into `src/lib/chat/sse-parser.ts` with deterministic state handling.
- Improve upstream error normalization and non-200 handling.

### Refactor
- Share model fallback and message conversion helpers with non-stream route.

## Deliverables
- Dedicated SSE parser module with full fixture tests.
- Stream endpoint with clearer error contract.

## Acceptance Criteria
- Parser fixture suite passes with broad edge-case coverage.
- Streaming endpoint behavior is deterministic under malformed events.

## Risks
- Network variability in integration tests; use mocked upstream responses.
