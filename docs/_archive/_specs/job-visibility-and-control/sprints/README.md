# Job Visibility And Control — Sprint Plan

> **Status:** Paused for documentation reconciliation. The core user-facing jobs surface now exists in runtime through adjacent jobs workstreams; use this plan as architectural reference, not as an active sprint queue, until the docs are reconciled against current behavior.
> **Spec:** [Job Visibility And Control](../spec.md)

## Sprint Sequence

Sprint 0 -> Sprint 1 -> TD-A -> Sprint 2 -> Sprint 3 -> TD-C -> TD-D

## Focus

| Sprint | Focus |
| --- | --- |
| [Sprint 0](sprint-0-transcript-contract-and-ui-realignment.md) | Remove transcript-external active-work UI and re-center job visibility on assistant messages |
| [Sprint 1](sprint-1-user-scoped-job-read-model-and-event-apis.md) | Add user-scoped job list/detail/event APIs and repository support |
| [TD-A](td-a-booch-object-audit.md) | Audit object boundaries, cohesion, and encapsulation |
| [Sprint 2](sprint-2-jobs-page-and-account-menu-integration.md) | Add `/jobs`, account-menu integration, and real-time operational UI |
| [Sprint 3](sprint-3-agent-status-language-and-list-contract.md) | Make job questions answer in prose by default and reserve list rendering for explicit requests |
| [TD-C](td-c-martin-solid-audit.md) | Audit SOLID and layering discipline across repository, route, page, and prompt changes |
| [TD-D](td-d-gof-pattern-compliance-audit.md) | Audit Repository, Facade, Observer, and Strategy pattern correctness |

## Notes

- This feature does not replace Deferred Job Orchestration; it builds the user-facing visibility and control model on top of it.
- Transcript-native job cards remain the chat contract.
- The Jobs page is the operational surface and should not reintroduce a dashboard-first product shape.
- References to the old `ActiveWorkPanel` and expanded launcher summary describe the historical divergence that motivated this plan. Re-validate against runtime before reopening any sprint here.

## Pause Here

- `/jobs`, account-surface access, user-scoped event streams, and the broader resilience/governance work now live in the active codebase.
- The remaining value in this package is mostly documentation sync and future follow-up on agent-language or audit concerns.
- Reopen this sequence only if the product needs a new user-facing jobs behavior that is not already covered by the current runtime and tests.
