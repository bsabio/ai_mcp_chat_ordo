# Sprint 0 — Capability Policy And Replay Foundation

> **Goal:** Freeze the current capability defaults and add the contract foundation for explicit execution principals, replay lineage, dedupe-visible outcomes, and ownership-transfer compatibility. Automatic retry, checkpoint resume, and payload pruning are explicitly deferred.
> **Spec Sections:** `JOR-030` through `JOR-058`, `JOR-080` through `JOR-090`
> **Prerequisite:** Deferred jobs, user-scoped `/jobs`, admin-scoped `/admin/jobs`, and current cancel/retry flows are already in place.

---

## Available Assets

| Asset | Verified detail |
| --- | --- |
| `docs/_specs/job-operations-and-resilience/artifacts/job-capability-policy-matrix.md` | Canonical phase-1 defaults now exist for execution principal, allowed roles, retry mode, recovery mode, retention, artifact policy, and dedupe semantics. |
| `src/lib/jobs/job-capability-registry.ts` | `JobCapabilityDefinition` currently carries audience/action roles and `defaultSurface`, but no execution, retry, recovery, or retention policy fields. |
| `src/lib/jobs/deferred-job-handlers.ts` | Several handlers still construct execution context with `role: "ADMIN"`, which is the exact coupling Sprint 0 must remove. |
| `src/core/entities/job.ts` | `JobRequest` currently has status/progress/attempt metadata, but no replay lineage, failure-class, or next-retry fields. |
| `src/core/use-cases/JobQueueRepository.ts` | The port already supports `listJobsByUser(...)`, `listUserEvents(...)`, `findActiveJobByDedupeKey(...)`, and `cancelJob(...)`, but no ownership-transfer or replay-lineage helpers. |
| `src/adapters/JobQueueDataMapper.ts` | `createJob(...)`, `findActiveJobByDedupeKey(...)`, and `listJobsByUser(...)` exist today. User-scoped list queries currently join through `conversations.user_id`, which gives Sprint 0 a migration-safe fallback path. |
| `src/app/api/jobs/[jobId]/route.ts` | Self-service `POST` supports `cancel` and `retry`; retry currently clones the job and may return an existing active job when dedupe matches. |
| `src/app/api/chat/jobs/[jobId]/route.ts` | Conversation-scoped `POST` mirrors the same cancel/retry behavior for anonymous or resolved conversation users. |
| `src/app/api/jobs/events/route.ts` | User-scoped SSE already streams durable events via `listUserEvents(...)`, so ownership migration must preserve visibility here. |

---

## Tasks

### 1. Treat the capability matrix as locked input

Use `artifacts/job-capability-policy-matrix.md` as the Sprint 0 policy source of truth.

Sprint 0 must assume:

- all current capabilities remain admin-only and `defaultSurface = global`
- `executionPrincipal = system_worker`
- `executionAllowedRoles = [ADMIN]`
- `retryPolicy.mode = manual_only`
- `recoveryMode = rerun`
- `resultRetention = retain`

Do not reopen automatic retry or checkpoint-resume debates during Sprint 0.

Verify: documentation-only; no runtime command required.

### 2. Extend core job and capability contracts

Update the core entities and ports so the runtime can represent the policy decisions explicitly.

Required changes:

- extend `JobCapabilityDefinition` with `executionPrincipal`, `executionAllowedRoles`, `retryPolicy`, `recoveryMode`, `resultRetention`, and `artifactPolicy`
- extend `JobRequest` with replay/recovery metadata such as `failureClass`, `nextRetryAt`, `recoveryMode`, `lastCheckpointId`, `replayedFromJobId`, and `supersededByJobId`
- add repository support for ownership transfer/backfill of jobs after anonymous-to-authenticated conversion

Keep new fields nullable and backward-compatible with existing stored rows.

Verify: `npx vitest run tests/deferred-job-contract.test.ts src/core/use-cases/tools/deferred-job-status.tool.test.ts`

### 3. Replace implicit admin execution with explicit capability policy

Refactor the capability registry and deferred-job handler wiring so background execution no longer depends on a hard-coded admin role.

Required behavior:

- the registry becomes the single source of truth for execution principal and allowed initiator roles
- handler wiring reads the capability policy rather than inlining `role: "ADMIN"`
- current editorial jobs still require admin initiation, but execution context is represented as worker policy, not end-user role reuse

Do not add automatic retry scheduling or checkpoint persistence in this sprint.

Verify: `npx vitest run src/lib/jobs/job-capability-registry.test.ts src/lib/jobs/deferred-job-runtime.test.ts`

### 4. Normalize replay and dedupe semantics across self-service and chat routes

Bring `/api/jobs/[jobId]` and `/api/chat/jobs/[jobId]` into alignment around explicit replay semantics.

Required behavior:

- treat current `retry` as **manual replay** from a failed or canceled source job
- store lineage from the new job to the source job
- if equivalent active work already exists, return an explicit dedupe outcome referencing that active job
- preserve existing cancel semantics for `queued` and `running` jobs
- keep replay behavior identical between self-service and conversation-scoped routes

Verify: `npx vitest run tests/admin-search-tool.test.ts src/app/api/jobs/[jobId]/route.test.ts src/app/api/chat/jobs/[jobId]/route.test.ts`

### 5. Add ownership-transfer and migration-safe read behavior

Finish the contract that lets anonymous-origin jobs become stable signed-in jobs without disappearing from `/jobs` or its SSE stream.

Required behavior:

- backfill `job_requests.user_id` when anonymous conversations migrate to an authenticated user
- keep `listJobsByUser(...)` and `listUserEvents(...)` visible during transition by using a migration-safe read path if historical rows are missing `user_id`
- emit ownership-transfer audit events/metadata so replay history remains explainable

Do not build full privacy-retention pruning or reassignment UI in this sprint.

Verify: `npx vitest run src/adapters/JobQueueDataMapper.test.ts tests/jobs/ownership-migration.test.ts`

### 6. Coverage, compatibility notes, and out-of-scope lock

Add or update tests that prove:

- current capabilities resolve policy from the registry rather than hard-coded handler roles
- replay lineage is visible and dedupe outcomes are explicit
- self-service and chat-scoped replay behavior stay in sync
- authenticated users continue to see inherited anonymous jobs after sign-in

Record the following as explicitly deferred past Sprint 0:

- automatic retry scheduler
- checkpoint resume
- payload pruning / retention cleanup jobs
- artifact export/download UI beyond current route/result affordances

Verify: `npx vitest run src/adapters/JobQueueDataMapper.test.ts src/lib/jobs/job-capability-registry.test.ts src/app/api/jobs/[jobId]/route.test.ts src/app/api/chat/jobs/[jobId]/route.test.ts`

---

## Completion Checklist

- [ ] capability defaults treated as fixed Sprint 0 inputs
- [ ] capability and job entity contracts extended for policy and lineage
- [ ] handler execution no longer depends on hard-coded admin role injection
- [ ] replay and dedupe semantics normalized across self-service and chat routes
- [ ] anonymous-to-authenticated job ownership transfer is defined and test-covered
- [ ] focused tests pass
- [ ] out-of-scope items are recorded so Sprint 0 stays narrow

## QA Deviations

- None yet.
