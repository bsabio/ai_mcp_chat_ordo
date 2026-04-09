# Job Operations And Resilience Sprints

> **Source:** `docs/_specs/job-operations-and-resilience/spec.md`
> **Status:** Sprint 0 through Sprint 4 are complete in the active codebase. Pause here unless a new non-editorial deferred capability, privacy/retention requirement, or checkpoint-resume implementation explicitly reopens this program.

## Sprint Sequence

Sprint 0
Sprint 1
Sprint 2
Sprint 3
Sprint 4

## Focus

| Sprint | Focus |
| --- | --- |
| [Sprint 0](sprint-0-capability-policy-and-replay-foundation.md) | Lock job capability defaults, remove hard-coded execution authority, and define replay, dedupe, and ownership-transfer foundations |
| [Sprint 1](sprint-1-self-service-job-operations-completion.md) | Finish `/jobs` self-service controls with copy/export actions, policy-driven artifact links, and clearer manual replay outcomes |
| [Sprint 2](sprint-2-retry-backoff-and-recovery-tiers.md) | Add automatic retry for safe editorial jobs, make lease recovery explicit, and surface resilience state in the admin job detail workflow |
| [Sprint 3](sprint-3-admin-governance-and-global-queue-hardening.md) | Add audited admin requeue, capability-policy visibility, and exportable global job logs without weakening capability-scoped permissions |
| [Sprint 4](sprint-4-notification-migration-and-qa-closure.md) | Distinguish notification suppression from delivery failure, prove anonymous job migration into `/jobs`, and close the sprint with focused browser and release-evidence wiring |

## Pause Here

- The editorial jobs foundation, `/jobs` self-service surface, admin governance layer, retry/backoff policy, and notification/migration closure work are already landed.
- Do not start another sprint in this sequence just to keep the jobs program moving. Reopen it only when a new capability family, retention/compliance rule, or true checkpoint-resume requirement creates concrete product pressure.
- If reopened, start from the current runtime and tests, not from the assumption that this sprint list is still an active implementation queue.
