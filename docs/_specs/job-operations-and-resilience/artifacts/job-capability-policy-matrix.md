# Job Capability Policy Matrix

> **Status:** Updated through Sprint 2
> **Applies to:** [Job Operations And Resilience](../spec.md)

## Current Policy Defaults

1. All currently shipped deferred job capabilities remain **admin-initiated** and default to the **global** jobs surface.
2. All current capabilities use `executionPrincipal = system_worker` with `executionAllowedRoles = [ADMIN]`.
3. Safe editorial capabilities may use bounded automatic retry with fixed backoff when repeated execution is idempotent and user-visible lineage does not require a fresh job id.
4. No current capability uses `checkpoint_resume` in the first implementation slice; all use `recoveryMode = rerun`.
5. Manual replay always creates a new job id with lineage to the source job.
6. Dedupe applies only against equivalent **active** work and must return an explicit dedupe result rather than pretending a new replay started.
7. Result retention stays `retain` for all current capabilities until telemetry justifies payload pruning.

## Capability Matrix

| Capability | Default surface / initiator | Owner view / action | Global view / action | Execution | Retry policy | Recovery mode | Result retention | Artifact policy | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `draft_content` | `global`, `ADMIN` only | `ADMIN` / `ADMIN` | `ADMIN` / `ADMIN` | `system_worker`, allowed roles `[ADMIN]` | `automatic`, `maxAttempts = 3`, `fixed`, `baseDelayMs = 3000` | `rerun` | `retain` | `open_artifact` | Safe editorial draft persistence with bounded auto-retry for transient infrastructure failures |
| `publish_content` | `global`, `ADMIN` only | `ADMIN` / `ADMIN` | `ADMIN` / `ADMIN` | `system_worker`, allowed roles `[ADMIN]` | `automatic`, `maxAttempts = 3`, `fixed`, `baseDelayMs = 3000` | `rerun` | `retain` | `open_artifact` | Publish path remains lineage-safe while allowing bounded retry on transient execution failures |
| `prepare_journal_post_for_publish` | `global`, `ADMIN` only | `ADMIN` / `ADMIN` | `ADMIN` / `ADMIN` | `system_worker`, allowed roles `[ADMIN]` | `automatic`, `maxAttempts = 3`, `fixed`, `baseDelayMs = 3000` | `rerun` | `retain` | `retain` | Readiness summary is read-oriented and safe to re-run automatically |
| `generate_blog_image` | `global`, `ADMIN` only | `ADMIN` / `ADMIN` | `ADMIN` / `ADMIN` | `system_worker`, allowed roles `[ADMIN]` | `automatic`, `maxAttempts = 3`, `fixed`, `baseDelayMs = 3000` | `rerun` | `retain` | `retain` | Vendor-generated asset creation now auto-retries only for bounded transient failures |
| `compose_blog_article` | `global`, `ADMIN` only | `ADMIN` / `ADMIN` | `ADMIN` / `ADMIN` | `system_worker`, allowed roles `[ADMIN]` | `automatic`, `maxAttempts = 3`, `fixed`, `baseDelayMs = 3000` | `rerun` | `retain` | `retain` | Draft composition remains idempotent enough for bounded automatic retry |
| `qa_blog_article` | `global`, `ADMIN` only | `ADMIN` / `ADMIN` | `ADMIN` / `ADMIN` | `system_worker`, allowed roles `[ADMIN]` | `manual_only`, `maxAttempts = 1`, `none` | `rerun` | `retain` | `none` | Findings summary only |
| `resolve_blog_article_qa` | `global`, `ADMIN` only | `ADMIN` / `ADMIN` | `ADMIN` / `ADMIN` | `system_worker`, allowed roles `[ADMIN]` | `manual_only`, `maxAttempts = 1`, `none` | `rerun` | `retain` | `open_artifact` | Mutates draft content; explicit replay only |
| `generate_blog_image_prompt` | `global`, `ADMIN` only | `ADMIN` / `ADMIN` | `ADMIN` / `ADMIN` | `system_worker`, allowed roles `[ADMIN]` | `manual_only`, `maxAttempts = 1`, `none` | `rerun` | `retain` | `none` | Prompt metadata/result summary only |
| `produce_blog_article` | `global`, `ADMIN` only | `ADMIN` / `ADMIN` | `ADMIN` / `ADMIN` | `system_worker`, allowed roles `[ADMIN]` | `manual_only`, `maxAttempts = 1`, `none` | `rerun` | `retain` | `open_artifact` | Pipeline orchestration remains explicit and lineage-aware |

## Cross-Capability Rules

1. Manual replay adds lineage metadata linking the new job to the source job.
2. Automatic retry reuses the same job id, stores `nextRetryAt`, and emits explicit `retry_scheduled` plus `retry_exhausted` lifecycle events rather than silently looping.
3. Checkpoint resume is deferred until a concrete capability proves rerun is too expensive or too lossy.
4. Lease-based worker recovery emits `lease_recovered` so admins can distinguish retry/recovery from ordinary queue churn.
5. Clipboard-copy actions for terminal summaries and error details should be available on `/jobs` and `/admin/jobs` even when no artifact exists.
