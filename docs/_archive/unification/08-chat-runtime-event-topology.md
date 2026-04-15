# 08 Chat Runtime Event Topology
> **Historical snapshot.** This document describes the pre-unification system
> state and was used as research input for the sprint program. For current
> architecture, see `02-post-unification-architecture.md` and
> `04-fully-unified-architecture.md`.
This document maps how the current chat runtime moves state between the browser, the chat stream route, the deferred-job subsystem, and the presenter.

The main conclusion is that the chat UI does not rely on one transport. It relies on a small event topology:

- the primary chat SSE stream from `/api/chat/stream`
- a second EventSource for deferred jobs from `/api/chat/events`
- reconciliation reads from `/api/chat/jobs`
- local browser-side capability rewrites for some media and visualization flows

That topology is functional, but it is also one of the most important current reliability seams.

## 1. Topology Overview

```mermaid
flowchart TB
    User[User send] --> Send[useChatSend]
    Send --> StreamRuntime[useChatStreamRuntime]
    StreamRuntime --> MainSSE[/api/chat/stream]
    MainSSE --> Pipeline[stream-pipeline]
    Pipeline --> Anthropic[Anthropic streaming loop]
    Pipeline --> Queue[Deferred job queue]
    Queue --> JobEvents[/api/chat/events]
    Queue --> JobSnapshots[/api/chat/jobs]
    JobEvents --> JobListener[useChatJobEvents]
    JobSnapshots --> Reconcile[best-effort reconcile]
    MainSSE --> StreamProcessor[chat stream processor]
    JobListener --> StreamProcessor
    StreamProcessor --> Reducer[chat reducer]
    Reducer --> BrowserRuntime[useBrowserCapabilityRuntime]
    BrowserRuntime --> Reducer
    Reducer --> Presenter[ChatPresenter]
```

## 2. Send Lifecycle As Implemented Today

The current browser send path is split across a few focused pieces:

1. `useChatSend` validates input and prevents a second in-flight send.
2. `prepareChatSend` appends an optimistic user message and an empty assistant placeholder.
3. `useChatStreamRuntime` opens the main stream and creates a dispatcher that tracks the resolved conversation ID, stream ID, and terminal lifecycle state.
4. `runChatStream` consumes non-text events immediately and buffers text until the next non-text boundary.
5. The reducer mutates assistant content, tool calls, tool results, job-status parts, and generation-status parts.

### Important implication

Conversation identity, stream identity, and terminal generation state are not derived solely from reducer state. The dispatcher tracks them outside the chat message array and only writes selected parts back into reducer actions.

That is practical for the current hook structure, but it also means some important runtime state is transient and not directly visible in persisted chat state.

## 3. What The Main Chat Stream Actually Carries

The main stream is more than token deltas.

`/api/chat/stream` currently emits:

- `stream_id`
- `conversation_id`
- text deltas
- tool calls
- tool results
- promoted deferred-job events
- generation lifecycle terminal events

The server-side promotion behavior matters.

When the tool loop returns a deferred-job payload, the stream pipeline does all of the following in one pass:

1. appends the raw `tool_result`
2. converts the payload into a `job_status` message part
3. emits a second SSE event using the same job status as a typed `job_queued`, `job_started`, `job_progress`, `job_completed`, `job_failed`, or `job_canceled` stream event

The same pattern also applies when a tool result already contains job snapshots.

### Important implication

The primary chat stream is both an LLM delta channel and a capability-state channel.

That reduces UI round-trips in the happy path, but it also means one transport now carries multiple semantic layers with different durability expectations.

## 4. The Separate Deferred-Job Event Channel

The chat client also opens a second EventSource through `useChatJobEvents`.

That hook:

- subscribes to `/api/chat/events?conversationId=...`
- parses the payload into the same `StreamEvent` family used by the main stream processor
- dispatches job updates with `assistantIndex: -1` because those updates are keyed by message ID and job ID rather than assistant position
- reconciles from `/api/chat/jobs` when the stream errors, the window regains focus, or the tab becomes visible

The server route behind `/api/chat/events` is not a push socket backed by in-memory publishers. It is a short-lived polling SSE route.

Current behavior:

- the route resolves the conversation for the current user
- it reads job events from the repository by sequence number
- it converts them into the same `StreamEvent` job types used elsewhere
- it keeps the connection open for a bounded window, then closes so the browser reconnects

### Important implication

Deferred jobs are treated as their own runtime timeline, not merely as a phase of the main chat stream.

That is a reasonable design when jobs may outlive a single streamed assistant turn, but it means ordering across the two channels is only partially coordinated.

## 5. Reconciliation Is Part Of The Intended Runtime

`/api/chat/jobs` is not just an emergency fallback. It is part of the intended state model.

The chat job-event hook reconciles from that route on:

- initial mount
- EventSource errors
- window focus
- document visibility restoration

The jobs route returns snapshot views, not event history. Those snapshots are then upserted into the reducer as `job_status` parts.

### Important implication

The browser runtime currently assumes event loss, reconnect churn, and stale local state are normal enough that snapshot repair is part of the standard flow.

That is a pragmatic design, but it means the real contract is not any one stream. The real contract is the combined behavior of event streams plus snapshot repair.

## 6. Browser Runtime Rewrites Add A Fourth Mutation Path

`useBrowserCapabilityRuntime` adds another important seam.

For some chart, graph, audio, and media capabilities, the browser can rewrite a previously appended tool result into a job-like status part and may upload derived assets afterward.

That means job-shaped UI state can originate from:

- a deferred-job payload promoted by the main server stream
- a job event from `/api/chat/events`
- a snapshot from `/api/chat/jobs`
- a browser-side transformation of a tool result

### Important implication

The `job_status` message part is already acting like the common UI handoff object, but the system reaches it through multiple routes rather than one authoritative projection layer.

## 7. Presenter And Reducer Convergence

The reducer and presenter do converge on a few important objects.

### What converges today

- `StreamEvent` is the common browser event grammar.
- `job_status` parts are the common UI-facing deferred-job shape.
- the presenter can render job status either from direct message parts or by extracting snapshots from tool results.
- generation terminal state is normalized into a `generation_status` part.

This is one of the strongest parts of the current design. The repo already has the beginnings of a shared state grammar.

## 8. What Currently Works Well

- The event grammar is richer than plain token streaming and already models tool and job lifecycle state explicitly.
- Deferred jobs can outlive a single streamed assistant response without disappearing from the UI.
- Snapshot reconciliation reduces the chance that one lost SSE message permanently corrupts the visible job state.
- The stop API is explicit and owner-scoped rather than relying on client-only cancellation.
- The presenter can recover rich rendering from both message parts and historical tool payloads.

## 9. Where The Current Design Is Fragile

### 9.1 Same state, multiple transports

The same deferred-job state can surface through:

- the raw `tool_result`
- the promoted job event in the main stream
- `/api/chat/events`
- `/api/chat/jobs`
- browser-side job rewriting

The reducer is therefore doing convergence work after the fact rather than reading one authoritative event log.

### 9.2 No single ordering authority across channels

The job stream has a sequence number. The main chat stream does not share that same sequencing model for all events. Browser rewrites have no repository sequence at all.

That means the visible order of capability state is only partially causal.

### 9.3 Stop semantics are scoped narrowly

The stop endpoint only aborts the currently registered active chat stream in process memory. It does not cancel deferred jobs already queued, and it depends on the active-stream registry existing in the same server process that owns the stream.

### 9.4 Normal reconnect churn is baked into the design

The job EventSource is expected to close and reconnect as part of normal operation because the route uses a bounded stream window. That is workable, but it means reconnect behavior is part of the core contract, not an edge case.

### 9.5 Some control data still rides inside content strings

Hero messages still embed response-state and suggestion metadata as control tags inside assistant content. That is a separate sign that state transport remains mixed between structured parts and string conventions.

## 10. Architectural Reading

The current chat runtime is not broken because it has multiple channels. It is fragile because the system does not treat one of those channels as the authoritative state source.

The strongest current design direction is this:

- typed stream events
- typed job-status parts
- typed generation-status parts

The weakness is that those types are produced by several parallel paths rather than a single runtime authority.

That is the main reliability insight from the current event topology.