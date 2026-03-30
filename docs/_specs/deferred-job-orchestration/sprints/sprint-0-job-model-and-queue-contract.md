# Sprint 0 — Job Model And Queue Contract

> **Goal:** Introduce the durable job entities, repository/queue interfaces, and tool execution-mode contract needed to represent deferred work without yet running a full worker lifecycle.
> **Spec Sections:** `DJO-020` through `DJO-024`
> **Prerequisite:** Current tool registry and chat stream architecture are in place

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/app/api/chat/stream/route.ts` | Current chat route streams `conversation_id`, `delta`, `tool_call`, and `tool_result` directly from the request lifecycle. This is the current synchronous boundary that deferred jobs must stop depending on. |
| `src/core/entities/chat-stream.ts` | Current stream event union is small and text/tool focused. Sprint 0 should not overextend it yet, but it establishes the current contract surface. |
| `src/lib/chat/tool-composition-root.ts` | Canonical tool registration point. Any execution-mode extension must integrate here via descriptors, not via ad hoc route branching. |
| `src/lib/db/schema.ts` | Existing schema migration style is additive and idempotent. New job tables must follow the same pattern. |
| `src/adapters/*DataMapper.ts` | Existing persistence pattern uses adapter/data-mapper classes rather than embedding SQL in use cases. The job queue should follow that pattern. |

---

## Tasks

### 1. Add durable job entities and repository contracts

Create core entities and ports for:

- job request
- job event
- job status enum
- queue repository interface

The initial contract must also cover:

- anonymous-origin compatibility, so jobs can be attached to a conversation even when no authenticated user exists yet
- a durable initiator model that preserves conversation id as the primary ownership link

Keep the contract generic. Do not make it blog-specific.

Verify: add focused tests such as `tests/deferred-job-contract.test.ts` and run `npx vitest run tests/deferred-job-contract.test.ts tests/tool-registry.test.ts tests/tool-registry.integration.test.ts`

### 2. Add schema support for job tables

Modify `src/lib/db/schema.ts` using the existing additive migration pattern to create:

- `job_requests`
- `job_events`

Include indexes for:

- conversation lookup
- user/status lookup
- queue polling by status/priority/created-at

The schema must also add a stable, monotonic event cursor or sequence field for resumable event replay. `created_at` alone is not sufficient for reconnect-safe ordering.

Verify: add focused tests such as `tests/deferred-job-schema.test.ts` and run `npx vitest run tests/deferred-job-schema.test.ts`

### 3. Add data mapper / repository implementation

Create adapter-layer persistence for:

- creating jobs
- appending events
- claiming queued jobs
- updating status and result state
- listing conversation events

Repository methods must support replay by stable cursor, not only by timestamp.

Keep SQL isolated in the adapter.

Verify: add focused tests such as `tests/deferred-job-repository.test.ts` and run `npx vitest run tests/deferred-job-repository.test.ts src/adapters/ConversationDataMapper.test.ts src/adapters/ConversationEventDataMapper.test.ts`

### 4. Add tool execution-mode contract

Extend the tool descriptor shape so tools can declare:

- `inline`
- `deferred`

Add deferred configuration for:

- dedupe policy
- retryability
- notification policy

This sprint should only add the contract and tests, not the worker implementation.

Verify: `npx vitest run tests/tool-registry.test.ts tests/tool-registry.integration.test.ts tests/chat-tools.test.ts`

---

## Completion Checklist

- [ ] durable job entities created
- [ ] anonymous-origin job ownership supported
- [ ] job tables added to schema
- [ ] stable event cursor/sequence added to job events
- [ ] adapter-layer queue persistence created
- [ ] tool execution-mode contract added
- [ ] focused tests pass

## QA Deviations

- None yet
