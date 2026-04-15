# Sprint 1 — Worker And Chat Event Stream

> **Goal:** Add the worker loop and the resumable chat event stream so deferred jobs can run outside the LLM request lifecycle while the UI still receives live updates.
> **Spec Sections:** `DJO-025` through `DJO-026`
> **Prerequisite:** Sprint 0 complete

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/hooks/chat/useChatStreamRuntime.ts` | Existing client stream runtime is request-bound and model-stream focused. This sprint adds a sibling event path rather than mutating the model stream into a queue transport. |
| `src/adapters/ChatStreamAdapter.ts` | Existing SSE parsing path can guide event parsing patterns for a second event stream. |
| `src/hooks/chat/chatState.ts` | Current reducer already accepts append/update actions and is the natural place to add job event handling later. |
| `scripts/` | Existing workspace already uses scripts for operational processes. The worker should follow that pattern rather than being hidden inside a route handler. |

---

## Tasks

### 1. Add a queue worker process

Create a worker script that:

- polls queued jobs
- claims one atomically
- executes the deferred tool path
- emits started/progress/result/failure events

The worker contract must also define:

- claim lease or heartbeat semantics
- stale-claim recovery and requeue rules
- terminal handling when the worker crashes after claim but before completion

Use SQLite-safe claim semantics appropriate for the current single-instance model.

Verify: add focused tests such as `tests/deferred-job-worker.test.ts` and run `npx vitest run tests/deferred-job-worker.test.ts tests/observability.test.ts`

### 2. Add a resumable chat job-event SSE endpoint

Create a second event stream endpoint for job lifecycle notifications, scoped to the current authenticated user and/or conversation.

It must support:

- initial backlog replay
- live append-only events
- reconnection without losing terminal job state

It must resume from the durable event cursor introduced in Sprint 0.

Verify: add focused tests such as `tests/deferred-job-events-route.test.ts` and run `npx vitest run tests/deferred-job-events-route.test.ts tests/chat-stream-route.test.ts tests/sse-parser.test.ts`

### 3. Append durable conversation-side lifecycle messages

When jobs change state, write the appropriate durable conversation message or event linkage so the chat history remains truthful after reload.

Verify: `npx vitest run tests/deferred-job-worker.test.ts src/adapters/ConversationDataMapper.test.ts src/adapters/ConversationEventDataMapper.test.ts tests/chat-route.test.ts`

---

## Completion Checklist

- [ ] worker process added
- [ ] stale-claim recovery defined and tested
- [ ] resumable job-event stream added
- [ ] event replay uses stable cursor semantics
- [ ] conversation lifecycle persistence integrated
- [ ] focused tests pass

## QA Deviations

- None yet
