# Sprint 4: Notification, Migration, And QA Closure

## Goal

Finish the jobs-resilience program by closing the last operational gaps: distinguish suppressed notifications from delivery failures, prove that anonymous jobs survive account creation into `/jobs`, and wire the focused QA and release-evidence path around those guarantees.

## Scope

In scope:

- explicit `notification_failed` audit events for terminal delivery attempts that do not reach any subscription
- durable anonymous-to-authenticated job ownership migration during registration and login
- browser proof that migrated anonymous jobs appear in `/jobs` after sign-in and survive reload
- Sprint 4 QA script updates for focused jobs/browser coverage with conditional release-evidence regeneration

Out of scope:

- new admin governance work beyond the Sprint 3 surface
- unrelated repository-wide typecheck cleanup outside the jobs workstream
- broader notification inbox or preference UX beyond existing push registration controls

## Implementation Notes

1. Notification suppression is not the same as notification failure. Missing users, disabled preferences, and missing subscriptions should stay silent; only real delivery attempts that fail should append `notification_failed`.
2. Audit-only job events must not corrupt the live `/jobs` view. Browser consumers should continue to see the stable durable job state even when ownership-transfer or notification audit events arrive later.
3. Anonymous conversation migration must continue to transfer associated jobs and append `ownership_transferred` events so `/jobs` can recover inherited work without a hidden reconciliation step.
4. Sprint 4 QA should stay focused: jobs notification/migration regressions, `/jobs` browser recovery, push-notification browser coverage, and release-evidence regeneration when prerequisite artifacts already exist.

## Focused Verification

```bash
npm exec vitest run tests/deferred-job-notifications.test.ts tests/deferred-job-repository.test.ts tests/deferred-job-worker.test.ts tests/jobs/ownership-migration.test.ts src/app/api/auth/auth-routes.test.ts src/lib/jobs/job-event-stream.test.ts src/lib/jobs/job-read-model.test.ts tests/jobs-system-dashboard.test.ts tests/evals/eval-release-evidence.test.ts
npm exec playwright test tests/browser-ui/jobs-page.spec.ts tests/browser-ui/push-notifications.spec.ts
```

## Exit Criteria

1. Terminal notification delivery attempts record either `notification_sent` or `notification_failed` without misclassifying suppressed cases.
2. Anonymous jobs migrate into the authenticated `/jobs` workspace and remain visible after reload.
3. Sprint 4 QA automation points at the focused jobs/browser bundle and can regenerate release evidence when runtime-integrity and canary artifacts are already present.
4. All focused Sprint 4 tests pass.
