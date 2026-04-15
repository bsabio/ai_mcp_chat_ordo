# Job Operations And Resilience

> **Status:** Draft v0.1
> **Date:** 2026-04-08
> **Scope:** Define the product and architecture for role-aware job management and recovery across chat, `/jobs`, and `/admin/jobs`: inspect, cancel, retry, replay, result portability, ownership migration, execution governance, retry/backoff policy, checkpointed recovery where needed, and audit-grade retention.
> **Dependencies:** [Deferred Job Orchestration](../deferred-job-orchestration/spec.md), [Job Visibility And Control](../job-visibility-and-control/spec.md), [RBAC](../rbac/spec.md), [Admin Platform](../admin-platform/spec.md), [Role Navigation QA Refactor](../role_nav_qa_refactor/spec.md)
> **Affects:** `src/core/entities/job.ts`, `src/core/use-cases/JobQueueRepository.ts`, `src/app/api/jobs/**`, `src/app/api/chat/jobs/**`, `src/lib/jobs/deferred-job-runtime.ts`, `src/lib/jobs/deferred-job-handlers.ts`, `src/lib/jobs/job-capability-registry.ts`, `src/lib/jobs/job-event-stream.ts`, `src/lib/jobs/job-read-model.ts`, `src/components/jobs/**`, and admin job loaders/actions
> **Requirement IDs:** `JOR-001` through `JOR-099`

---

## 1. Problem Statement

### 1.1 Current state

The repository already has durable deferred jobs, append-only job events, user-scoped `/jobs`, admin-scoped `/admin/jobs`, SSE resume support, cancel/retry actions, and lease-based worker recovery. The product gap is no longer whether jobs exist or whether users can see them at all. The gap is whether job management is complete, recoverable, and policy-safe as the system expands beyond the current admin-only editorial capabilities. `[JOR-001]`

The current implementation is strong on visibility and acceptable on basic control, but under-specified on resilience policy and long-term governance:

1. cancel and retry exist, but retry/backoff policy is ad hoc
2. lease recovery exists, but handler-level resume/checkpoint policy does not
3. jobs are retained, but export/copy/artifact navigation and audit semantics are incomplete
4. owner visibility exists for authenticated users and admins, but anonymous-to-authenticated migration and execution-role policy are not fully normalized

That creates a system that works today for editorial jobs but is not yet the final contract for broader user-facing job work. `[JOR-002]`

### 1.2 Verified current capabilities and gaps

| Area | Verified current behavior | Gap this spec owns |
| --- | --- | --- |
| Durable queue | `JobQueueRepository` persists jobs and append-only events; workers claim queued jobs and emit lifecycle events. | Retry policy, recovery tiers, and long-term governance are not yet explicit. |
| User-scoped jobs | `/api/jobs`, `/api/jobs/events`, `/api/jobs/[jobId]`, `/api/jobs/[jobId]/events`, and `/jobs` exist for signed-in users. | Result portability, ownership migration edge cases, and richer recovery semantics are not fully defined. |
| Conversation-scoped jobs | `/api/chat/jobs/[jobId]` and related chat routes let anonymous or signed-in users manage jobs tied to the active conversation. | The contract between conversation-scoped and user-scoped ownership needs to be formalized. |
| Cancel/retry | User and admin routes already support cancel and retry with status checks. | Automatic retry, backoff, retry exhaustion, and replay intent are not modeled. |
| SSE resume | `/api/jobs/events` and `job-event-stream.ts` already support `afterSequence` and `last-event-id` style recovery. | Terminal delivery guarantees and notification retry semantics are not yet defined. |
| Admin control | `/admin/jobs` and admin server actions support global filters, cancel, retry, and payload inspection. | Admin governance lacks explicit capability-level execution role, circuit breaker, and export policy. |
| Capability policy | `job-capability-registry.ts` centralizes audience and action roles. | Execution role, retry policy, recovery mode, artifact policy, and retention policy are missing from the registry. |
| Handler execution context | `deferred-job-handlers.ts` currently hard-codes `role: "ADMIN"` for several handlers. | Future non-admin jobs need execution policy that does not silently run as admin. |
| Ownership migration | Conversation ownership migration exists for anonymous conversations. | Job ownership migration during sign-in is not owned by a first-class job contract yet. |

### 1.3 Product decision

This feature formalizes the following product shape:

1. **Jobs remain durable, not conversational guesses.** Chat cards, `/jobs`, and `/admin/jobs` all read from the same durable job model. `[JOR-010]`
2. **Management is explicit by surface.** Chat owns narrative status and immediate actions, `/jobs` owns self-service operations, and `/admin/jobs` owns global audit and intervention. `[JOR-011]`
3. **Recovery has tiers.** Every job can at least be replayed safely; some jobs may additionally support checkpointed resume where the capability warrants the complexity. `[JOR-012]`
4. **Capability policy is the source of truth.** Visibility, action rights, execution role, retry policy, and recovery mode belong in the capability registry rather than being scattered across handlers and pages. `[JOR-013]`

---

## 2. Design Goals

1. **Durable truth first.** A user should never have to guess whether a job ran, failed, or completed because the tab refreshed at the wrong time. `[JOR-020]`
2. **User control without operational clutter.** Cancel, retry, replay, export, and artifact-open actions should be available where relevant without turning chat into an admin console. `[JOR-021]`
3. **Recovery before duplicate work.** The platform should prefer replay, resume, or event reconciliation before asking users to start over. `[JOR-022]`
4. **Role-safe from anonymous through admin.** Anonymous conversation-bound users, signed-in self-service users, and admins each need a clear, intentionally limited job-management contract. `[JOR-023]`
5. **Execution authority must be explicit.** Background handlers must run with a declared execution role and policy, not with an accidental hard-coded superuser context. `[JOR-024]`
6. **Retention without silent erasure.** Jobs and job events should remain auditable by default; destructive cleanup must be governed rather than casually exposed. `[JOR-025]`
7. **Capability-specific resilience.** Not every job needs checkpointed resume, but every job needs a declared retry/recovery strategy. `[JOR-026]`
8. **One source of policy truth.** The capability registry should own actionability, visibility, recovery mode, and retention defaults. `[JOR-027]`

---

## 3. Architecture

### 3.1 Verified current interfaces

**`JobQueueRepository` today:**

```typescript
export interface JobQueueRepository {
  createJob(seed: JobRequestSeed): Promise<JobRequest>;
  findJobById(id: string): Promise<JobRequest | null>;
  findLatestEventForJob(jobId: string): Promise<JobEvent | null>;
  findActiveJobByDedupeKey(conversationId: string, dedupeKey: string): Promise<JobRequest | null>;
  listJobsByConversation(
    conversationId: string,
    options?: { statuses?: JobStatus[]; limit?: number },
  ): Promise<JobRequest[]>;
  listJobsByUser(
    userId: string,
    options?: { statuses?: JobStatus[]; limit?: number },
  ): Promise<JobRequest[]>;
  appendEvent(seed: JobEventSeed): Promise<JobEvent>;
  requeueExpiredRunningJobs(now: string): Promise<number>;
  listConversationEvents(
    conversationId: string,
    options?: { afterSequence?: number; limit?: number },
  ): Promise<JobEvent[]>;
  listUserEvents(
    userId: string,
    options?: { afterSequence?: number; limit?: number },
  ): Promise<JobEvent[]>;
  listEventsForUserJob(
    userId: string,
    jobId: string,
    options?: { limit?: number },
  ): Promise<JobEvent[]>;
  claimNextQueuedJob(options: JobClaimOptions): Promise<JobRequest | null>;
  updateJobStatus(id: string, update: JobStatusUpdate): Promise<JobRequest>;
  cancelJob(id: string, now: string): Promise<JobRequest>;
}
```

**`JobCapabilityDefinition` today:**

```typescript
export interface JobCapabilityDefinition {
  toolName: DeferredJobHandlerName;
  family: JobFamily;
  label: string;
  description: string;
  initiatorRoles: readonly RoleName[];
  ownerViewerRoles: readonly RoleName[];
  ownerActionRoles: readonly RoleName[];
  globalViewerRoles: readonly RoleName[];
  globalActionRoles: readonly RoleName[];
  defaultSurface: JobSurface;
}
```

These are the correct extension points. The spec adds missing policy dimensions rather than replacing the queue model. `[JOR-030]`

### 3.2 Product surfaces and audiences

| Audience | Scope | Required job-management capability |
| --- | --- | --- |
| **ANONYMOUS** | Current conversation only | View queued/running/completed job cards in chat, inspect conversation-scoped job detail, cancel/retry eligible jobs in that conversation, recover state after refresh via conversation-scoped event replay. No `/jobs` route. |
| **AUTHENTICATED** | Own jobs across owned conversations | Full `/jobs` workspace: list, filter, inspect, copy result summary, open artifact, cancel, retry, export job log, recover after disconnect. |
| **APPRENTICE** | Same self-owned scope as authenticated users | Same self-service job controls. |
| **STAFF** | Same self-owned scope unless another feature delegates more | Same self-service job controls without implicit global queue access. |
| **ADMIN** | Global queue plus self-owned jobs | `/admin/jobs` global browse/detail, capability-aware cancel/retry/requeue, export logs, inspect payloads, view recovery state, and apply governed interventions. |

As with conversations, elevated non-admin roles do not automatically gain cross-user visibility. `[JOR-031]`

### 3.3 Capability registry as policy source of truth

The current registry already owns audience and action roles. It should also own execution and resilience policy.

```typescript
interface JobRetryPolicy {
  mode: "manual_only" | "automatic";
  maxAttempts: number;
  backoffStrategy: "none" | "fixed" | "exponential";
  baseDelayMs?: number;
}

type JobRecoveryMode = "rerun" | "checkpoint_resume";

type JobExecutionPrincipal = "system_worker" | "admin_delegate" | "owner_delegate";

interface JobCapabilityDefinition {
  toolName: DeferredJobHandlerName;
  family: JobFamily;
  label: string;
  description: string;
  initiatorRoles: readonly RoleName[];
  ownerViewerRoles: readonly RoleName[];
  ownerActionRoles: readonly RoleName[];
  globalViewerRoles: readonly RoleName[];
  globalActionRoles: readonly RoleName[];
  defaultSurface: JobSurface;
  executionPrincipal: JobExecutionPrincipal;
  executionAllowedRoles: readonly RoleName[];
  retryPolicy: JobRetryPolicy;
  recoveryMode: JobRecoveryMode;
  resultRetention: "retain" | "prune_payload_keep_events";
  artifactPolicy: "none" | "open_artifact" | "open_or_download";
}
```

This solves two current problems:

1. handlers no longer need to hard-code `role: "ADMIN"`
2. background execution no longer reuses the end-user role enum as a surrogate for worker privilege
3. retry/backoff/recovery behavior becomes capability-defined and testable `[JOR-032]`

### 3.4 Lifecycle and recovery model

The existing status model remains the visible user contract:

```typescript
type JobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";
```

Resilience detail should be expressed through metadata and events rather than by exploding the visible status list.

```typescript
type JobFailureClass = "transient" | "permanent" | "operator_canceled" | "user_canceled" | null;

interface JobRequest {
  // existing fields...
  failureClass?: JobFailureClass;
  nextRetryAt?: string | null;
  recoveryMode?: JobRecoveryMode;
  lastCheckpointId?: string | null;
  replayedFromJobId?: string | null;
  supersededByJobId?: string | null;
}
```

Required lifecycle behavior:

1. Every job supports **manual replay** of an eligible failed or canceled run. `[JOR-040]`
2. Automatic retry is allowed only when the capability registry declares it. `[JOR-041]`
3. When automatic retry is exhausted, the job remains visible with explicit exhaustion metadata rather than silently disappearing. `[JOR-042]`
4. Checkpointed resume is optional and capability-scoped; jobs without checkpoint support fall back to replay semantics. `[JOR-043]`
5. Lease recovery continues to requeue expired running jobs, but the resulting event history must show that recovery explicitly. `[JOR-044]`

Replay and dedupe rules:

1. **Automatic retry** stays within the same job lineage and must not create a second user-visible root job card. `[JOR-045]`
2. **Manual replay** creates a new job id linked by `replayedFromJobId`, even when the original failed or was canceled. `[JOR-046]`
3. Existing dedupe rules apply only to equivalent active work. If a manual replay encounters an already-active equivalent job, the API must return an explicit dedupe outcome referencing the active job rather than silently pretending a new replay started. `[JOR-047]`
4. Retried or replayed jobs must preserve a visible lineage chain in `/jobs` and `/admin/jobs` so users and admins can understand what was superseded, reused, or exhausted. `[JOR-048]`

Recommended additional event coverage:

```text
queued
started
progress
result
failed
canceled
retry_scheduled
retry_exhausted
lease_recovered
checkpoint_written
ownership_transferred
notification_sent
notification_failed
```

### 3.5 Ownership, migration, and result portability

Jobs now live on two axes: `conversationId` and `userId`. The product contract should make both explicit.

1. **Conversation ownership remains the bootstrap anchor** for anonymous work. `[JOR-050]`
2. **User ownership becomes authoritative after sign-in migration** so `/jobs` can see inherited work without special-case ambiguity. `[JOR-051]`
3. Anonymous-to-authenticated conversion must update both conversations and associated jobs, then emit `ownership_transferred` events for audit and replay. This transfer must be atomic where the backing store allows it; otherwise the product must provide a reconciliation query path that keeps inherited jobs visible during any short-lived partial-migration window. `[JOR-052]`
4. `/jobs` reads by `userId` first, while chat recovery reads by `conversationId` first. Those surfaces are complementary, not competing. `[JOR-053]`

Account-lifecycle consequences:

1. **User add/create** does not create any jobs automatically outside the explicit initiating surfaces for that role. `[JOR-055]`
2. **User edit / role change** changes what jobs the user may initiate or manage going forward, but does not rewrite historical job ownership or audit lineage. `[JOR-056]`
3. **User deactivation** revokes self-service access while preserving jobs and job events for admin audit, support, and policy-driven reassignment. `[JOR-057]`
4. **User deletion or privacy-request closure** must follow a governed retention path: preserve audit-safe metadata/events where required, redact payloads when needed, and purge only through an auditable policy workflow. `[JOR-058]`

Result portability requirements:

1. Every completed or failed job should expose a human-usable result summary.
2. Capabilities may additionally expose an artifact link or download action when the result has a concrete deliverable.
3. Self-service and admin surfaces should expose clipboard-copy actions for terminal summaries, error details, and, where policy allows, request parameters.
4. Users and admins can export job event history and terminal payload summaries without needing database access. `[JOR-054]`

### 3.6 UX contract by surface

#### Chat

- Shows the narrative status card and only the immediate actions that make sense in context.
- For anonymous users, chat remains the only operational job surface.
- When a job fails, the assistant can summarize the failure and present retry/open-jobs actions without forcing the user into admin-style detail. `[JOR-060]`

#### `/jobs`

- Remains the signed-in self-service workspace.
- Must support active-first ordering, recent terminal jobs, filters, detail/history, cancel/retry, copy/export, and artifact-open where applicable.
- Must remain recoverable from durable history even if the user missed live SSE events. `[JOR-061]`

#### `/admin/jobs`

- Remains the global operator surface.
- Adds resilience-state visibility: retry policy, recovery mode, exhaustion state, checkpoint state, and notification status.
- Continues to use capability-aware bulk actions rather than a blanket superuser queue UI. `[JOR-062]`

### 3.7 Retention and destructive actions

Jobs should not gain an ordinary hard-delete affordance.

Retention policy:

1. `job_requests` and `job_events` remain retained by default for audit and support.
2. Payload pruning, if ever needed, should preserve event history and metadata even when large result payloads are truncated.
3. User-facing cleanup should hide or filter old jobs, not erase them outright.
4. Admin/system purge workflows, if introduced later, must be explicit, capability-aware, and auditable. `[JOR-070]`

This mirrors the conversation rule: ordinary management is reversible and observable; destructive cleanup is governed. `[JOR-071]`

---

## 4. Security And Access

1. User-scoped job APIs may return or mutate only jobs visible to the current user through explicit ownership rules. `[JOR-080]`
2. Anonymous users may operate only on jobs attached to the current resolved conversation identity. `[JOR-081]`
3. Admin global actions must continue to pass capability-based permission checks, not just route-level admin checks. `[JOR-082]`
4. Background handler execution role must come from capability policy, never from incidental hard-coded values. `[JOR-083]`
5. Exported job logs and artifacts must respect the same ownership rules as live job detail. `[JOR-084]`
6. Automatic retry and checkpoint recovery must not bypass audit-event emission. `[JOR-085]`

---

## 5. Testing Strategy

| Area | Coverage expectation |
| --- | --- |
| Repository and worker runtime | Retry scheduling, lease recovery, checkpoint metadata, ownership migration, payload retention, retry exhaustion |
| Capability registry | Execution principal, execution-allowed roles, retry policy, recovery mode, artifact policy, and permission checks |
| API routes | User vs anonymous vs admin access, cancel/retry/replay safety, dedupe outcomes, atomic or reconciled ownership migration, result export, artifact-open behavior, job log export |
| `/jobs` UI | Active/recent ordering, degraded fallback, replay after missed events, copy/export, artifact actions, lineage visibility, and retry exhaustion messaging |
| Chat UI and tool behavior | Prose status responses, in-message cancel/retry actions, anonymous recovery after refresh, no admin-only leakage into self-service answers |
| Admin flows | Global filters, resilience-state visibility, bulk actions, payload inspector, capability-scoped permissions, and user-lifecycle retention effects |
| Browser flows | Anonymous chat job recovery, sign-in ownership migration, `/jobs` live updates, admin intervention, dedupe-visible replay behavior, and exported-log download |

Focused browser verification is required because recovery promises must hold after disconnects, reloads, and delayed event delivery. `[JOR-090]`

---

## 6. Sprint Plan

| Sprint | Name | Goal |
| --- | --- | --- |
| **0** | **Capability Policy And Ownership Alignment** | Extend the job capability model to own execution role, retry policy, recovery mode, and ownership-transfer rules. |
| **1** | **Self-Service Job Operations Completion** | Finish `/jobs` user operations: copy/export, artifact-open, clear replay semantics, and explicit result/failure summaries. |
| **2** | **Retry, Backoff, And Recovery Tiers** | Add automatic retry where declared, exhaustion state, lease-recovery visibility, and checkpoint-resume support for the capabilities that justify it. |
| **3** | **Admin Governance And Global Queue Hardening** | Extend `/admin/jobs` with resilience-state inspection, governed interventions, and capability-level audit visibility. |
| **4** | **Notification, Migration, And QA Closure** | Finish notification-delivery guarantees, anonymous-to-authenticated job migration, browser verification, and release evidence. |

---

## 7. Future Considerations

1. Team-owned or delegated jobs once staff workflows need shared ownership.
2. Capability pause/disable switches for runaway handlers or vendor incidents.
3. Partial payload redaction or vault-backed artifact storage for sensitive future job families.
4. Cross-job dependency graphs if orchestration expands beyond mostly independent deferred tasks.
