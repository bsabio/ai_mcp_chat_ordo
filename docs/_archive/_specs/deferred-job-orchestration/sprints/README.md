# Deferred Job Orchestration — Sprint Plan

> **Status:** Ready for implementation
> **Spec:** [Deferred Job Orchestration](../spec.md)

## Sprint Sequence

Sprint 0 -> Sprint 1 -> Sprint 2 -> Sprint 3

## Platform Alignment

This spec owns the implementation sprints for the system-wide jobs program.

Implementation status as of 2026-03-25:

- Sprint 0 through Sprint 3 are implemented in the active codebase.
- The queue is already consumed by `draft_content` and `publish_content`.
- Browser push, retry, cancel, reconnect, and durable job-status rendering are in place.
- The next platform dependency is Platform V1 Sprint 8 rather than another queue sprint.

| Platform area | Dependency on this spec |
| --- | --- |
| Platform V1 Sprint 7 — Blog and Content Pipeline | First feature consumer. Deferred blog drafting should land on top of Sprint 0–2 from this spec rather than inventing a separate background-job path. |
| Future image/media tools | Reuse the same queue, worker, event stream, and notification model after this spec is complete. |
| Operator/admin tooling | May expose job health and outcomes through chat tools later, but those tools depend on the shared job model defined here. |

| Sprint | Focus |
| --- | --- |
| [Sprint 0](sprint-0-job-model-and-queue-contract.md) | Durable job entities, queue interfaces, tool execution mode |
| [Sprint 1](sprint-1-worker-and-chat-event-stream.md) | Worker loop, claim semantics, resumable chat event stream |
| [Sprint 2](sprint-2-chat-rendering-and-blog-use-case.md) | Job status chat blocks and deferred blog draft flow |
| [Sprint 3](sprint-3-push-notifications-and-hardening.md) | Push notification delivery, retry/cancel hardening, reconnect resilience |
