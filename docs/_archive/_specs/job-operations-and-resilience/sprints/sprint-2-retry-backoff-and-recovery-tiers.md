# Sprint 2 - Retry, Backoff, and Recovery Tiers

> Parent spec: `docs/_specs/job-operations-and-resilience/spec.md`

## Goal

Add bounded automatic retry for the safe editorial job capabilities, make lease recovery explicit in durable event history, and expose resilience state in the admin job detail surface.

## Scope

In scope:

1. Capability-policy retry metadata for the idempotent editorial jobs that can safely auto-retry.
2. Deferred worker scheduling for transient failures using fixed backoff and explicit retry lifecycle events.
3. Explicit `lease_recovered` events when expired running jobs are requeued.
4. Admin job detail visibility for retry mode, next retry timing, failure class, and exhaustion state.
5. Focused worker, admin loader, and admin page regression coverage.

Out of scope:

1. Checkpoint-based resume for handler-specific long-running work.
2. Automatic retry for the full `produce_blog_article` orchestration pipeline.
3. Notification retry guarantees.
4. New browser automation beyond existing server-rendered admin detail coverage.

## Implementation Tasks

### 1. Promote retry policy into executable worker behavior

The capability registry already carries retry policy. This sprint makes it operational by enabling automatic retry on the safe editorial capabilities and enforcing due-time claiming via `nextRetryAt` in the queue mapper.

Expected code areas:

- `src/core/entities/job.ts`
- `src/core/use-cases/JobQueueRepository.ts`
- `src/lib/jobs/job-capability-registry.ts`
- `src/adapters/JobQueueDataMapper.ts`

### 2. Add transient failure scheduling and exhaustion events

The deferred worker should classify failures, schedule retries only for transient failures on automatic-retry capabilities, and emit durable lifecycle events for both scheduled retry and retry exhaustion.

Expected code areas:

- `src/lib/jobs/deferred-job-worker.ts`
- `src/lib/jobs/job-status.ts`
- `src/lib/jobs/manual-replay.ts`

### 3. Make lease recovery explicit

Expired running jobs were already reclaimed, but the system did not explain that recovery anywhere durable. This sprint adds a `lease_recovered` event so event history and admin detail can distinguish crash recovery from ordinary queue progress.

Expected code areas:

- `src/adapters/JobQueueDataMapper.ts`
- `src/lib/jobs/deferred-job-worker.ts`

### 4. Surface resilience state in `/admin/jobs/[id]`

The admin detail page should explain whether a job is manual-only or automatic-retry, show the next scheduled retry when present, preserve failure class visibility, and call out when the automatic retry budget is exhausted while still allowing manual replay.

Expected code areas:

- `src/lib/admin/jobs/admin-jobs.ts`
- `src/app/admin/jobs/[id]/page.tsx`

## Verification

Focused verification for this sprint:

```bash
npm exec vitest run tests/deferred-job-worker.test.ts tests/deferred-job-worker-process.test.ts src/lib/admin/jobs/admin-jobs.test.ts src/app/admin/jobs/[id]/page.test.tsx src/lib/jobs/job-capability-registry.test.ts src/app/api/jobs/[jobId]/route.test.ts
npm run typecheck
```

If admin surface coverage expands further in the same workstream, keep the existing admin jobs page regression bundle green before closing the sprint.
