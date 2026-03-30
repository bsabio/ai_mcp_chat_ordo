# Deferred Job Orchestration — Durable Queue And Chat Push Notifications

> **Status:** Draft v0.1
> **Date:** 2026-03-24
> **Scope:** Add a queue-backed, durable execution model for long-running MCP and internal tool processes so the chat can enqueue work, observe progress, recover after disconnects, and notify users when work completes or fails. This is a cross-cutting system capability, not a blog-only feature.
> **Dependencies:** [Tool Architecture](../tool-architecture/spec.md), [Chat Experience](../chat-experience/spec.md), [Interactive Chat Actions](../interactive-chat-actions/spec.md), [Platform V1](../platform-v1/spec.md)
> **Affects:** `src/app/api/chat/stream/route.ts`, chat stream event contracts, conversation persistence, tool registry wiring, worker/runtime scripts, notification delivery, and specs that currently assume synchronous tool execution
> **Motivation:** The current chat stream is optimized for short-lived tool execution and loses state when long work outlives the request lifecycle. The platform needs a durable, abstract job system that supports blog drafting first, then image generation, indexing, and any future long-running tool without creating a second non-chat UI.
> **Requirement IDs:** `DJO-001` through `DJO-099`

---

## 1. Problem Statement

### 1.1 Current state

Studio Ordo currently executes tool work inside the active `/api/chat/stream` request and streams results back over SSE. That works for fast tools, but it is structurally fragile for long-running processes because the request itself is the execution boundary. If the browser disconnects, the tab sleeps, the request times out, or the provider stalls, the system has no durable job model to resume, inspect, retry, or notify. `[DJO-001]`

### 1.2 Verified issues

| # | Issue | Evidence | Impact |
| --- | --- | --- | --- |
| 1 | **No durable background work model** | Chat streaming currently emits `delta`, `tool_call`, and `tool_result` events directly from the request path in `src/app/api/chat/stream/route.ts`. | Any long task is coupled to a single live HTTP stream. |
| 2 | **No resumable job state** | There is no persisted `job`, `task`, or `queue` entity in the current runtime model, and no stable event cursor for deterministic replay. | A disconnected client cannot recover precise in-progress status safely. |
| 3 | **Tool execution is implicitly synchronous** | `ToolRegistry.execute()` and the current tool executor contract assume immediate execution semantics. | Long-running tools cannot opt into a first-class deferred path. |
| 4 | **No progress or lifecycle events outside the stream** | Chat stream events currently cover only text/tool call/tool result/error. | The UI cannot observe queued, started, progress, canceled, or completed states independently of the model stream. |
| 5 | **Push notifications have no abstract source of truth** | The runtime has no durable event surface from which browser push notifications could be emitted safely. | Notifications would be unreliable or ad hoc if added directly to tool code. |
| 6 | **Long-running use cases are growing** | Blog drafting, image generation, indexing/embeddings, large content transforms, and future media pipelines all exceed the safe envelope for inline request execution. | The platform will either become unreliable or start accumulating one-off background-work exceptions. |

### 1.3 Root cause

The platform has a solid streaming chat model, but it does not yet distinguish between:

1. conversational response streaming
2. durable background work orchestration

Those are separate concerns and need separate lifecycle management. `[DJO-002]`

### 1.4 Why it matters

Without a durable job system:

- chat cannot remain the only interface for long-running business actions
- users cannot safely leave and return while work continues
- operators cannot observe background work reliably
- push notifications would be lossy and hard to trust
- every slow tool would require custom handling

The queue must therefore be abstract and reusable across any long-running capability, with blog drafting treated as the first canonical use case rather than the only one. This spec owns the queue architecture; feature specs such as Platform V1 should reference it rather than duplicating queue design. `[DJO-003]`

---

## 2. Design Goals

1. **Durable over ephemeral.** Long-running work must survive request termination, tab closure, and reconnects. `[DJO-010]`
2. **Chat remains the primary interface.** Jobs are created, tracked, retried, canceled, and resolved from chat-native surfaces. No parallel dashboard is required. `[DJO-011]`
3. **Abstract, not blog-specific.** The architecture must support blog drafting, image generation, indexing, document transforms, and future deferred tools through the same job model. `[DJO-012]`
4. **Explicit lifecycle.** Jobs must move through durable states such as `queued`, `running`, `succeeded`, `failed`, and `canceled`. `[DJO-013]`
5. **Resumable event delivery.** The UI must be able to subscribe to job lifecycle updates independently of the LLM text stream. `[DJO-014]`
6. **Push as augmentation, not source of truth.** Browser push notifications should be emitted from durable job events, never from transient in-memory state alone. `[DJO-015]`
7. **Tool-level opt-in.** Each tool must declare whether it executes inline or via deferred job orchestration. `[DJO-016]`
8. **User-safe and RBAC-safe.** Only authorized users may create, inspect, cancel, or retry jobs associated with their conversations or roles. `[DJO-017]`
9. **Observable and testable.** Job state, attempts, event history, and final results must be auditable in tests and runtime evidence. `[DJO-018]`
10. **SQLite-first, portable later.** The initial implementation should fit the current single-instance deployment model while keeping the abstraction portable to a future distributed store. `[DJO-019]`
11. **Conversation-first ownership.** Jobs must be attachable to a conversation even when the initiating actor is anonymous or not yet associated with a durable user id. `[DJO-020]`

---

## 3. Architecture

### 3.1 Core model

Long-running work is represented by a durable **job request** plus an append-only **job event stream**.

```text
user chat action
  -> tool chooses deferred mode
  -> create job_request row
  -> append job_event: queued
  -> stream immediate queued result into chat
  -> worker claims job
  -> worker emits started/progress/result/failure events
  -> worker appends durable conversation result message
  -> optional push notification emitted from durable event
```

This separates:

1. the conversational request/response loop
2. the background execution lifecycle
3. notification delivery

`[DJO-031]`

### 3.2 Job entities

**New table: `job_requests`**

```sql
CREATE TABLE IF NOT EXISTS job_requests (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  user_id TEXT DEFAULT NULL,
  tool_name TEXT NOT NULL,
  status TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  dedupe_key TEXT DEFAULT NULL,
  initiator_type TEXT NOT NULL DEFAULT 'user',
  request_payload_json TEXT NOT NULL,
  result_payload_json TEXT DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  progress_percent REAL DEFAULT NULL,
  progress_label TEXT DEFAULT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  lease_expires_at TEXT DEFAULT NULL,
  claimed_by TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT DEFAULT NULL,
  completed_at TEXT DEFAULT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_job_requests_conversation ON job_requests(conversation_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_user_status ON job_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_job_requests_status_priority_created ON job_requests(status, priority, created_at);
```

**New table: `job_events`**

```sql
CREATE TABLE IF NOT EXISTS job_events (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  event_payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES job_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_events_conversation_sequence_unique ON job_events(conversation_id, sequence);
CREATE INDEX IF NOT EXISTS idx_job_events_job_created ON job_events(job_id, created_at);
CREATE INDEX IF NOT EXISTS idx_job_events_job_sequence ON job_events(job_id, sequence);
CREATE INDEX IF NOT EXISTS idx_job_events_conversation_sequence ON job_events(conversation_id, sequence);
```

`conversation_id` is the primary ownership anchor. `user_id` is optional so anonymous-origin conversations can enqueue deferred work without violating the platform's chat-first entry model. `sequence` is monotonic within a conversation and is the durable replay cursor for reconnect-safe event delivery on conversation-scoped streams. `[DJO-032]`

### 3.3 Job status model

```typescript
type JobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";
```

Optional future extension may split failure type into transient vs permanent, but the initial abstract contract requires at minimum:

- current status
- attempt count
- progress label
- progress percent
- durable result or durable error

`[DJO-033]`

### 3.4 Event model

```typescript
type JobEventType =
  | "queued"
  | "started"
  | "progress"
  | "result"
  | "failed"
  | "canceled"
  | "notification_sent";
```

Events are append-only and are the durable source for:

1. chat-side live updates
2. reconnect recovery
3. push notification emission
4. observability and QA

Replay and SSE resume semantics must be based on the last acknowledged conversation-scoped `sequence`, not `created_at`, so reconnect behavior remains deterministic even when multiple events share the same timestamp. `[DJO-034]`

### 3.5 Tool execution modes

Tool descriptors gain an execution-mode contract:

```typescript
type ToolExecutionMode = "inline" | "deferred";

interface DeferredExecutionConfig {
  dedupeStrategy?: "none" | "per-conversation-payload";
  retryable?: boolean;
  notificationPolicy?: "none" | "completion-and-failure" | "all-terminal";
}

interface ToolDescriptor {
  name: string;
  schema: ...;
  command: ...;
  roles: ...;
  category: ...;
  executionMode?: ToolExecutionMode;
  deferred?: DeferredExecutionConfig;
}
```

Default remains `inline` for backward compatibility. `[DJO-035]`

### 3.6 Chat request behavior

When a deferred tool is selected during `/api/chat/stream` execution:

1. do not run the heavy job inline inside the current stream loop
2. create a `job_request`
3. append a `queued` event
4. emit an immediate chat-side tool result describing the queued work
5. let the worker complete the job outside the request lifecycle

The immediate tool result should include enough information for ICA rendering:

- job id
- label
- status
- retry/cancel route or action hooks where applicable

If the initiating conversation is anonymous, the queued job must still be attached and queryable through the conversation id and current session context. `[DJO-036]`

### 3.7 Worker model

The platform introduces a separate job worker process.

**Initial runtime shape:**

```text
Next.js app process
  writes queued jobs

separate Node worker process
  polls queued jobs
  claims one atomically
  executes the tool command
  writes progress/result/failure events
  persists any final conversation message
```

The first implementation should use SQLite-compatible polling and transactional claim semantics.

The worker contract must also define:

- lease or heartbeat semantics for claimed jobs
- stale-claim detection and requeue rules
- terminal recovery behavior when a worker crashes after claim but before completion

`[DJO-037]`

### 3.8 Chat notification stream

The platform adds a second live event channel for the UI, separate from the LLM text stream.

Example endpoint forms:

```text
/api/chat/events
/api/conversations/{id}/events
```

This stream emits job lifecycle notifications so the conversation can update even when the original LLM response stream has already closed. `[DJO-038]`

Example event shape:

```typescript
type ChatJobEvent =
  | { type: "job_queued"; jobId: string; conversationId: string; sequence: number; toolName: string; label: string }
  | { type: "job_started"; jobId: string; conversationId: string; sequence: number; label: string }
  | { type: "job_progress"; jobId: string; conversationId: string; sequence: number; label: string; percent?: number }
  | { type: "job_completed"; jobId: string; conversationId: string; sequence: number; summary: string; messageId?: string }
  | { type: "job_failed"; jobId: string; conversationId: string; sequence: number; error: string };
```

Resume behavior should use the last acknowledged conversation-scoped `sequence` as the durable cursor. If the platform later adds a user-scoped aggregate stream, it must define a separate cursor contract rather than reusing the conversation cursor implicitly.

### 3.9 Chat rendering model

Jobs should render as first-class chat content rather than hidden transport metadata.

Suggested rich-content block:

```typescript
type JobStatusBlock = {
  type: "job-status";
  jobId: string;
  label: string;
  toolName: string;
  status: "queued" | "running" | "succeeded" | "failed" | "canceled";
  progressPercent?: number;
  progressLabel?: string;
  summary?: string;
  actions?: InlineNode[];
};
```

This keeps jobs visible and actionable inside chat while preserving a durable backend source of truth. `[DJO-039]`

### 3.10 Push notification delivery

Push notifications are emitted from durable job events, not directly from the tool runtime.

Recommended initial policy:

1. notify on completion
2. notify on failure
3. optionally notify on explicit user-action-required states

Do not notify on every progress increment. `[DJO-028]`

Each push should carry only thin routing information:

- job id
- conversation id
- terminal status
- short message

Opening the app should rehydrate the authoritative state from the database.

The platform must also define a durable push-subscription contract with:

- authenticated user ownership
- subscribe and unsubscribe lifecycle
- revocation support
- one or more device/browser endpoints per user where applicable

Push delivery is derived from terminal job events plus the current subscription set, not from ad hoc tool code.

### 3.11 Blog drafting as worked example

Blog drafting is the canonical first use case but not a special-case architecture.

Flow:

1. user asks chat to draft a blog post
2. assistant selects the draft-content tool
3. runtime sees the tool is `deferred`
4. runtime creates a job request such as `tool_name = "draft_content"`
5. chat immediately renders a queued job card: “Drafting blog post”
6. worker executes:
   - validate request
   - draft content
   - normalize markdown
   - persist draft
7. worker emits progress events
8. worker appends final result message with actions:
   - open draft
   - revise
   - publish

The same orchestration model must work for image generation, index rebuilds, media transforms, and future deferred tools. `[DJO-029]`

### 3.12 Spec ownership and platform alignment

This document defines the system-wide deferred-jobs program.

Platform and feature specs may consume it, but they should not restate queue architecture in parallel. Instead they should:

1. reference this spec for durable job behavior
2. identify which feature first consumes deferred execution
3. define only feature-local UI and workflow details that sit on top of the shared job model

For Platform V1, the first consuming feature is blog drafting and content pipeline work. `[DJO-030]`

---

## 4. Security And Access

1. **Job visibility follows conversation and role access.** A user may only inspect jobs for conversations they are authorized to access. `[DJO-040]`
2. **Deferred execution does not bypass RBAC.** A queued job must preserve the initiating role/user context where present and re-validate execution authorization when claimed. Anonymous-origin jobs must be restricted to tools explicitly allowed for anonymous conversations. `[DJO-041]`
3. **Notification payloads are minimal.** Browser push payloads must not contain sensitive result bodies or raw provider output. `[DJO-042]`
4. **Payload validation remains mandatory.** Deferred tools must validate request payloads before queue insertion and again before worker execution where necessary. `[DJO-043]`
5. **Dedupe must be deterministic and safe.** If dedupe is enabled, the dedupe key must be based on normalized, validated payload shape rather than raw untrusted input. `[DJO-044]`
6. **Cancellation is cooperative.** Workers must only expose cancel where the tool can safely stop between steps without corrupting durable state. `[DJO-045]`
7. **Job events are append-only.** Event history must not be rewritten in place; state transitions are derived from explicit event creation plus current status projection. `[DJO-046]`
8. **Push subscriptions are user-scoped.** Notification subscriptions must be bound to authenticated user identity and revocable. `[DJO-047]`
9. **Replay cursors are durable.** Reconnect and recovery behavior must rely on durable event sequence values rather than wall-clock timestamps. `[DJO-048]`
10. **Claims must expire safely.** In-progress jobs must be recoverable after worker death or process interruption via lease expiry or equivalent stale-claim handling. `[DJO-049]`

---

## 5. Testing Strategy

### 5.1 Unit tests

| Area | Estimated count | What's tested |
| --- | --- | --- |
| Job entity + status transitions | 10 | queued/running/succeeded/failed/canceled state rules |
| Event cursor semantics | 6 | monotonic sequence assignment and replay behavior |
| Dedupe logic | 6 | dedupe-key normalization and active-job reuse |
| Deferred tool descriptor behavior | 6 | execution-mode routing and config defaults |
| Notification policy logic | 6 | which durable events emit push notifications |

### 5.2 Integration tests

| Area | Estimated count | What's tested |
| --- | --- | --- |
| Chat enqueue flow | 6 | deferred tool call creates job and immediate queued result |
| Worker claim-and-complete flow | 6 | queued job claimed, progressed, completed, persisted |
| Worker crash recovery | 5 | stale claim recovery and safe requeue after interrupted execution |
| Reconnect/resume behavior | 5 | UI can reload event history and restore visible status |
| Blog draft deferred flow | 5 | draft_content use case from queue creation through final draft message |
| Cancellation/retry flow | 5 | cancel and retry semantics for retryable tools |

### 5.3 Browser/runtime tests

| Area | Estimated count | What's tested |
| --- | --- | --- |
| Chat job-status rendering | 4 | queued/running/success/failure states and actions |
| Notification-triggered resume | 3 | push-opened route rehydrates job state in conversation |
| Mobile notification-safe UI | 3 | long-running status blocks remain legible and actionable on mobile |

### 5.4 Existing test preservation

The existing synchronous tool path must remain valid for tools that stay `inline`. Adding deferred execution must not regress the current chat stream contract for fast tools. `[DJO-050]`

---

## 6. Sprint Plan

| Sprint | Name | Goal | Estimated tests |
| --- | --- | --- | --- |
| **0** | **Job Model And Queue Contract** | Add durable job tables, status model, tool execution-mode contract, and queue interfaces. | +20 |
| **1** | **Worker And Chat Event Stream** | Add worker claim/execute flow plus resumable chat job-event SSE. | +18 |
| **2** | **Chat Rendering And Blog Use Case** | Add job-status chat rendering, deferred `draft_content`, and end-to-end blog-draft job flow. | +16 |
| **3** | **Push Notifications And Hardening** | Add browser push delivery, retry/cancel policy, and reconnect hardening. | +14 |

---

## 7. Future Considerations

1. Multi-worker distributed execution once the platform moves beyond single-instance SQLite.
2. Priority lanes and rate classes for expensive providers.
3. Scheduled jobs and recurring background maintenance.
4. Admin/operator views over job health rendered through chat-native tools rather than a dashboard.
5. Provider-specific resumable workflows for image/video generation where the external API itself is asynchronous.
6. Outbound email/SMS notifications using the same durable event model.
