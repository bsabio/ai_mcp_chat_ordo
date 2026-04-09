# Sprint 1 — Stop Generation And Interrupted-Stream Recovery

> **Goal:** Add a first-class stop-generation control for live model streams, preserve truthful partial assistant output, and distinguish user-initiated stop from unexpected interruption without canceling deferred jobs.
> **Spec Sections:** `COR-024`, `COR-040`, `COR-041`, `COR-074`, `COR-080`
> **Prerequisite:** [Sprint 0](sprint-0-retention-lifecycle-and-reversible-delete-foundation.md) is complete, and the existing chat send/retry pipeline remains the active runtime boundary for live model streams.

---

## Available Assets

| Asset | Verified detail |
| --- | --- |
| `docs/_specs/conversation-operations-and-retention/artifacts/retention-and-lifecycle-matrix.md` | The lifecycle matrix already locks the product rule that stop generation affects only the active model stream and does not cancel deferred jobs. |
| `src/lib/chat/stream-pipeline.ts` | The current stream pipeline already owns an internal abort path, but it reacts only to transport cancellation and has no public `streamId` contract or ownership-validated stop endpoint. |
| `src/hooks/chat/useChatStreamRuntime.ts` | The runtime currently returns only a `runStream(...)` callback and does not expose active stream state or a `stopStream(...)` control surface. |
| `src/hooks/chat/useChatSend.ts` | Failed-send retry is already centralized here; interrupted-stream recovery should extend this path instead of inventing a second recovery model. |
| `src/frameworks/ui/MessageList.tsx` | The transcript rendering surface exists and can host stop/interrupted state affordances without introducing a separate dashboard-style control panel. |
| `src/hooks/chat/chatStreamRunner.test.ts`, `src/hooks/chat/useChatStreamRuntime.test.tsx`, `src/hooks/chat/useChatSend.test.tsx` | The hook/runtime seam already has focused tests and is the correct place to pin stop/interruption semantics before browser QA. |

---

## Tasks

### 1. Lock the stop-vs-interruption semantics before writing runtime code

Treat the following product rules as Sprint 1 inputs, not open design questions:

- user stop and unexpected interruption are distinct lifecycle events
- stop preserves truthful partial assistant output when any assistant text has already streamed
- stop does not cancel deferred jobs or queued background work
- if no assistant text exists yet, recovery should offer retry of the last user turn instead of inserting a fake assistant apology

Record any implementation deviation in this sprint doc rather than silently changing the lifecycle contract.

Verify: documentation-only; no command required.

### 2. Add a server-owned stream registry and ownership-validated stop route

Extend the live chat streaming boundary so each active stream has a server-known identifier and ownership record.

Implementation expectations:

- mint a durable-enough `streamId` when `/api/chat/stream` begins the live model response
- register `streamId`, owner identity, conversation id, and the active abort controller in a server-owned registry
- add `POST /api/chat/streams/[streamId]/stop`
- validate ownership in the stop route so one user cannot stop another user's active stream
- clean up registry entries on normal completion, explicit stop, and unexpected interruption paths

Do not overload the existing deferred-job cancellation routes or job registry for this feature.

Verify: add focused route/runtime coverage and run

```bash
npm exec vitest run tests/chat-stream-route.test.ts src/hooks/chat/chatStreamRunner.test.ts
```

### 3. Thread `streamId` and stop controls through the chat runtime

Update the client runtime so live stream state is no longer opaque.

Required behavior:

- `useChatStreamRuntime(...)` exposes both the active `streamId` and a `stopStream(...)` action or equivalent runtime control
- the client learns the current `streamId` from the stream handshake rather than fabricating it locally
- `useChatSend(...)` and the surrounding chat state can tell the difference between an active stream, a user stop, and an interrupted stream
- the transcript/header surface gains a stop action only while a live assistant stream is in flight

Keep the UI chat-native. Do not add a second operational panel for stream control.

Verify: `npm exec vitest run src/hooks/chat/useChatStreamRuntime.test.tsx src/hooks/chat/useChatSend.test.tsx`

### 4. Persist truthful partial assistant output and lifecycle events

The runtime must preserve what actually happened during a live response.

Required behavior:

- user stop after partial assistant text persists the partial text and records `generation_stopped`
- unexpected disconnect or interruption after partial assistant text persists the partial text and records `generation_interrupted`
- interruption without any assistant text keeps the user turn recoverable without manufacturing an assistant failure message
- event metadata distinguishes actor intent, interruption reason, and whether partial assistant content was retained

This sprint should prefer truthful partial persistence over synthetic cleanup copy.

Verify: extend stream and interactor coverage, then run

```bash
npm exec vitest run tests/chat-stream-route.test.ts src/hooks/chat/useChatSend.test.tsx src/hooks/chat/chatStreamRunner.test.ts
```

### 5. Add explicit retry and refresh recovery for interrupted sends

Interrupted sends must become a first-class recovery state.

Implementation expectations:

- extend the existing failed-send machinery so interrupted streams can retry or resume through one coherent recovery path
- preserve enough metadata to recover after refresh when a stream died mid-response
- label stopped versus interrupted transcript state clearly in the message UI
- keep retry-last-turn behavior aligned with the existing send pipeline rather than inventing a second message-creation path

Do not attempt transcript export/import or attachment portability in this sprint.

Verify: `npm exec vitest run src/hooks/chat/useChatSend.test.tsx src/frameworks/ui/MessageList.test.tsx`

### 6. Browser proof and scope lock

Add browser verification for the user-facing value of the sprint:

- stop a live response and confirm the assistant message is marked as stopped without canceling deferred jobs
- simulate interruption/reload and confirm the conversation can recover without duplicating the assistant response
- confirm unauthorized stop attempts are rejected by the server route

Explicitly keep out of scope:

- transcript export/import
- attachment portability and degraded asset restore
- admin purge workflows
- deferred-job cancellation UX beyond the existing job controls

Verify: add focused browser coverage and run

```bash
npm exec vitest run tests/chat-stream-route.test.ts src/hooks/chat/useChatStreamRuntime.test.tsx src/hooks/chat/useChatSend.test.tsx src/frameworks/ui/MessageList.test.tsx
npx playwright test tests/browser-ui/chat-stop-generation.spec.ts
```

---

## Smallest-Safe Execution Sequence

Sprint 1 should land in five mergeable slices. Each slice must leave the chat runtime internally consistent and must carry its own focused test gate before the next slice begins.

### Slice 1. Server stream registry and stop authorization

Scope:

- introduce a server-owned active stream registry for `streamId`, owner identity, conversation id, and abort controller state
- thread `streamId` creation through `src/app/api/chat/stream/route.ts` and `src/lib/chat/stream-pipeline.ts`
- add `POST /api/chat/streams/[streamId]/stop` with ownership validation and cleanup on stop/completion

Exact tests to add or update:

- add `src/lib/chat/active-stream-registry.test.ts`
- add `src/app/api/chat/stream/route.test.ts`
- add `src/app/api/chat/streams/[streamId]/stop/route.test.ts`

Gate:

```bash
npm exec vitest run src/lib/chat/active-stream-registry.test.ts src/app/api/chat/stream/route.test.ts 'src/app/api/chat/streams/[streamId]/stop/route.test.ts'
```

### Slice 2. Client handshake, active-stream state, and stop control

Scope:

- teach the stream handshake to expose the server-issued `streamId`
- extend `useChatStreamRuntime(...)` to surface active stream state and a stop action
- keep this slice focused on runtime control wiring, not transcript copy or recovery UX

Exact tests to add or update:

- update `src/hooks/chat/chatStreamRunner.test.ts`
- update `src/hooks/chat/useChatStreamRuntime.test.tsx`
- update `src/hooks/chat/chatStreamDispatch.test.ts` if stream-start or stream-stop dispatch state changes

Gate:

```bash
npm exec vitest run src/hooks/chat/chatStreamRunner.test.ts src/hooks/chat/useChatStreamRuntime.test.tsx src/hooks/chat/chatStreamDispatch.test.ts
```

### Slice 3. Partial-output persistence and lifecycle event truthfulness

Scope:

- persist truthful partial assistant text on explicit stop and unexpected interruption
- record `generation_stopped` versus `generation_interrupted` with enough metadata to distinguish actor intent and retained content
- keep interruption-with-no-assistant-output recoverable without generating synthetic assistant text

Exact tests to add or update:

- update `src/app/api/chat/stream/route.test.ts`
- update `src/hooks/chat/chatStreamProcessor.test.ts`
- update `src/hooks/chat/useChatSend.test.tsx`

Gate:

```bash
npm exec vitest run src/app/api/chat/stream/route.test.ts src/hooks/chat/chatStreamProcessor.test.ts src/hooks/chat/useChatSend.test.tsx
```

### Slice 4. Interrupted-send recovery and transcript affordances

Scope:

- extend the existing failed-send and retry-last-turn path so interrupted streams recover through the same send pipeline
- preserve recovery metadata across refresh
- label stopped versus interrupted assistant states in the transcript UI without adding a new control surface

Exact tests to add or update:

- update `src/hooks/chat/useChatSend.test.tsx`
- update `src/hooks/chat/chatConversationApi.test.ts`
- update `src/frameworks/ui/MessageList.test.tsx`
- update `src/frameworks/ui/ChatMessageViewport.test.tsx`

Gate:

```bash
npm exec vitest run src/hooks/chat/useChatSend.test.tsx src/hooks/chat/chatConversationApi.test.ts src/frameworks/ui/MessageList.test.tsx src/frameworks/ui/ChatMessageViewport.test.tsx
```

### Slice 5. Browser proof and regression lock

Scope:

- prove that a user can stop a live response and see the transcript settle truthfully
- prove interrupted-stream recovery after reload without duplicate assistant output
- prove the stop route rejects unauthorized callers

Exact tests to add or update:

- add `tests/browser-ui/chat-stop-generation.spec.ts`
- keep `src/app/api/chat/streams/[streamId]/stop/route.test.ts` as the authorization backstop for non-browser coverage

Gate:

```bash
npm exec vitest run 'src/app/api/chat/streams/[streamId]/stop/route.test.ts' src/hooks/chat/useChatStreamRuntime.test.tsx src/hooks/chat/useChatSend.test.tsx src/frameworks/ui/MessageList.test.tsx
npx playwright test tests/browser-ui/chat-stop-generation.spec.ts
```

Implementation rule:

- do not begin Slice 4 or Slice 5 until Slice 1 through Slice 3 are green, because recovery and browser assertions will be noisy if the server stop contract and partial-persistence semantics are still unstable

---

## Completion Checklist

- [x] user stop and interruption semantics are distinct and documented
- [x] live streams have a server-owned `streamId` and ownership-validated stop route
- [x] chat runtime exposes active stream state and stop control
- [x] partial assistant output persists truthfully on stop/interruption
- [x] interrupted sends have an explicit retry/recovery path after refresh
- [x] focused Vitest and browser verification pass
- [x] out-of-scope portability and purge work remains deferred

## QA Deviations

- None yet.
