# Sprint 3: Admin Governance And Global Queue Hardening

## Goal

Extend `/admin/jobs` beyond basic global browse/detail so operators can apply governed interventions, inspect capability policy directly from the registry contract, and export job logs without database access.

## Scope

In scope:

- audited admin requeue for queued or running jobs
- capability-policy visibility on admin browse/detail surfaces
- admin export of job logs and terminal payload summaries
- focused regression coverage for admin actions, loaders, detail UI, and export route

Out of scope:

- new self-service `/jobs` behavior
- worker retry-policy changes beyond the Sprint 2 model
- pause or disable switches for capabilities
- privacy-retention pruning flows from later sprint work

## Implementation Notes

1. Requeue is an admin-only intervention for in-flight work. It should reset runtime state on the same job lineage and append an explicit audit event instead of creating a replay child job.
2. Manual retry remains the terminal-job path and must continue to create a linked replay job through the existing replay seam.
3. Capability audit visibility should come from `src/lib/jobs/job-capability-registry.ts`, not duplicated page-local constants.
4. Exported admin logs should include capability-policy metadata, request/result payloads, and full event history, and must fail closed for unregistered or non-visible job types.

## Focused Verification

```bash
npm exec vitest run src/lib/admin/jobs/admin-jobs-actions.test.ts src/lib/admin/jobs/admin-jobs.test.ts src/app/admin/jobs/[id]/page.test.tsx src/app/api/admin/jobs/[jobId]/export/route.test.ts tests/jobs-system-dashboard.test.ts
```

## Exit Criteria

1. `/admin/jobs` surfaces capability-policy audit details derived from the registry.
2. Admins can requeue queued or running jobs without weakening manual replay lineage semantics.
3. Admin detail exposes log export through a dedicated admin route.
4. All focused Sprint 3 tests pass.
