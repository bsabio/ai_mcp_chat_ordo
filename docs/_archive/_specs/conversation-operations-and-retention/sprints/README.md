# Conversation Operations And Retention Sprints

> **Source:** `docs/_specs/conversation-operations-and-retention/spec.md`

## Sprint Sequence

Sprint 0 -> Sprint 1 -> Sprint 2

## Focus

| Sprint | Focus |
| --- | --- |
| [Sprint 0](sprint-0-retention-lifecycle-and-reversible-delete-foundation.md) | Lock retention defaults, add conversation tombstones, replace hard delete with reversible delete, and expose deleted-state visibility to admins |
| [Sprint 1](sprint-1-stop-generation-and-interrupted-stream-recovery.md) | Add intentional stream stop, persist truthful partial assistant output, and make interrupted sends recoverable without canceling deferred jobs |
| [Sprint 2](sprint-2-admin-audit-portability-cleanup-and-qa-closure.md) | Add transcript copy/export/import, governed admin export and purge, retention cleanup jobs, and release-grade QA closure |

## Notes

- Sprint 0 already absorbed the original self-service history, trash, and restore foundation that the parent spec first described as a separate follow-on tranche.
- Sprint 2 is implemented and validated with focused Vitest coverage, Playwright browser proof, targeted lint, and a clean production build.
- Later work should focus on delegated/shared conversation workflows, full privacy/compliance request UX, and any non-platform portability formats after Sprint 2 lands.
