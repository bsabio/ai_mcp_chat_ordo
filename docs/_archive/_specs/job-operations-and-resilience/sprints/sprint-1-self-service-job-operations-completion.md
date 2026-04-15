# Sprint 1 - Self-Service Job Operations Completion

> Parent spec: `docs/_specs/job-operations-and-resilience/spec.md`

## Goal

Complete the signed-in `/jobs` self-service surface so it is operationally useful without forcing users into admin tooling. This sprint closes the product gap around result portability, artifact-open behavior, and clear manual replay feedback.

## Scope

In scope:

1. `/jobs` detail-panel controls for copy summary, copy failure details, and export durable job history.
2. Capability-policy-driven artifact links for job results that resolve to durable article surfaces.
3. Clear manual replay semantics in self-service UI, including explicit dedupe outcomes and replay lineage visibility.
4. Focused test coverage for helper logic, jobs workspace interaction, and browser-visible controls.

Out of scope:

1. Automatic retry and backoff scheduling.
2. Checkpoint-based resume support.
3. Admin global queue hardening beyond shared helper behavior.
4. Notification guarantees and migration closure work reserved for later sprints.

## Implementation Tasks

### 1. Promote artifact-open behavior into capability policy

Extend the current job artifact policy model so capabilities can explicitly advertise artifact opening instead of relying on hard-coded result-payload inspection in the `/jobs` UI. For the current editorial capabilities, artifact-open should be enabled only where the result payload can truthfully resolve to a draft preview or published journal route.

Expected code areas:

- `src/core/entities/job.ts`
- `src/lib/jobs/job-capability-registry.ts`
- `src/components/jobs/job-workspace-helpers.ts`

### 2. Add result portability controls to `/jobs`

The signed-in job detail panel should expose:

1. copy summary
2. copy failure details when present
3. export durable job history and terminal payload summary as a JSON download

These controls should be client-side, use already-authoritative job/history data, and avoid introducing a parallel export backend unless the current self-service API contract proves insufficient.

Expected code areas:

- `src/components/jobs/JobDetailPanel.tsx`
- `src/components/jobs/JobsWorkspace.tsx`
- `src/components/jobs/job-workspace-helpers.ts`

### 3. Make manual replay semantics explicit in self-service UX

The current POST `/api/jobs/[jobId]` contract already differentiates queued replay from deduped replay. The `/jobs` workspace should surface that distinction clearly so users understand whether a new job was created or existing active work was reused. Replay lineage metadata should remain visible in the selected job detail when available.

Expected code areas:

- `src/lib/jobs/job-status.ts`
- `src/core/entities/message-parts.ts`
- `src/components/jobs/JobsWorkspace.tsx`
- `src/components/jobs/JobDetailPanel.tsx`

## Verification

Focused verification for this sprint:

```bash
npm exec vitest run src/lib/jobs/job-capability-registry.test.ts src/components/jobs/job-workspace-helpers.test.ts src/components/jobs/JobsWorkspace.test.tsx
npx playwright test tests/browser-ui/jobs-page.spec.ts
```

If the Playwright environment is already running against the local app, also keep the existing `/jobs` live-update expectations green.
