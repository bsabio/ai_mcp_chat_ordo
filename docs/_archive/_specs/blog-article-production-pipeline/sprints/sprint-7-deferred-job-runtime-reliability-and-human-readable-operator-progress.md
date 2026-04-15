# Sprint 7 — Deferred Job Runtime Reliability And Human-Readable Operator Progress

> **Goal:** Make deferred blog production feel reliable and legible in real use by introducing always-on job execution, human-readable job identity, richer progress and stage visibility, and a dedicated active-work operator surface that eliminates dependence on raw job ids.
> **Spec Sections:** Follow-on extension beyond Sprint 6, derived from the unresolved operational and UX gaps in deferred-job execution, `BAPP-041`, `BAPP-050` through `BAPP-060`, and the current runtime's mismatch between infrastructure-level job semantics and user-facing operator workflow needs.
> **Prerequisite:** Sprint 3 deferred orchestration, Sprint 4 shared job mutation surfaces, Sprint 5 editorial hero-image workflow, and Sprint 6 deferred-job status clarity, recovery, and publish handoff.
> **Status:** Planned next sprint.

---

## QA Review Of Sprint Scope

Sprint 7 is not a new content-generation sprint. It is a runtime and UX reliability sprint.

The current system already has:

1. deferred blog-production tools
2. queue persistence and dedupe
3. cancel and retry mutation routes
4. explicit job status and job listing read surfaces
5. chat-projected status cards
6. publish-ready actions after `produce_blog_article` completion

Those capabilities are necessary but not sufficient for a good operator experience.

The current gaps are structural:

1. jobs do not run unless a separate worker process is started manually
2. the worker entrypoint processes one job and exits rather than behaving like a service
3. the status model still centers on internal job ids rather than user-facing work items
4. the UI can render progress but does not yet expose a strong `current work` experience or a stage timeline
5. users still have to infer whether the system is working instead of seeing queue pickup, active processing, or worker-unavailable states directly
6. deferred jobs are not yet guaranteed to create one obvious, continuously updating user-facing work item from queue acknowledgement through terminal completion

QA conclusion: Sprint 7 is required even after Sprint 6 because the remaining problems are not missing status routes. They are missing runtime guarantees and missing operator-facing job identity.

## Sprint 7 Ownership Boundary

Sprint 7 explicitly owns the items that Sprint 6 intentionally does not close:

1. always-on worker startup in dev, production, and containerized environments
2. long-lived worker service behavior rather than one-shot processing
3. human-readable job identity and natural job references without GUIDs
4. richer progress and stage visibility beyond the current percent-plus-label card
5. a dedicated active-work operator surface
6. degraded-state UX for delayed pickup and worker-unavailable conditions

Sprint 7 does not re-open Sprint 6's already-landed status-read routes, publish handoff, or baseline recovery mechanics except where they need extension to support the above ownership boundary.

## QA Against Current Runtime

Sprint 7 was drafted against the current post-Sprint-6 runtime.

### Verified current limitations

| Limitation | Current state | Why Sprint 7 is needed |
| --- | --- | --- |
| Worker is not started by the app runtime | `scripts/dev.mjs`, `scripts/start-server.mjs`, and `compose.yaml` start the app only. The worker must be started separately. | Users experience queued jobs that never begin, which reads as product failure. |
| Worker is one-shot rather than long-lived | `scripts/process-deferred-jobs.ts` calls `DeferredJobWorker.runNext()` once and exits. | Interactive deferred workflows need continuous job pickup and visible runtime liveness. |
| Status reads still expose internal `job_id` semantics | `get_deferred_job_status` requires `job_id`, and the current assistant-facing model still depends on precise job lookup. | Users should interact with named work items, not GUIDs. |
| Progress UI is present but underspecified | `RichContentRenderer` can render status, percent, and progress label, but the model lacks queue position, pickup confirmation, stage history, and last-updated clarity. | The user cannot confidently tell whether work is alive, stuck, or done. |
| No dedicated active-job workspace surface | Job state appears only as message cards within the chat transcript. | Operators need a persistent `current work` surface that survives message clutter and reduces status-query friction. |
| Runtime health is invisible from chat | The system does not distinguish `queued and waiting for pickup` from `worker unavailable` in a user-facing way. | Silent queueing erodes trust faster than explicit degraded-state messaging. |

### Sprint 7 target outcome

| Requirement area | Target state |
| --- | --- |
| Runtime reliability | Deferred jobs are processed by an always-on worker service in dev, production, and containerized deployment paths. |
| Human-readable job identity | Blog jobs have user-facing titles and summaries that make sense without a raw id. |
| Progress clarity | Operators can see queue state, pickup state, active stage, progress, and terminal readiness clearly. |
| Active-work continuity | The UI exposes a dedicated surface for active jobs, not only buried transcript cards. |
| Status-query naturalness | Users can ask for the latest or active blog work naturally without referencing GUIDs. |
| Automatic job continuity | Starting a deferred blog job immediately creates a visible, titled work item that continues updating without requiring a follow-up status query. |

---

## Tasks

### 1. Make deferred job execution an always-on runtime service

Sprint 7 must ensure that queued jobs actually run in normal product operation.

Implementation requirements:

- add a long-lived deferred-job worker loop rather than a one-shot process
- start the worker automatically in local development alongside the app server
- ensure the default local developer path starts deferred processing without an extra manual command
- add a production runtime path that runs the worker continuously, either:
  - as a separate service in container orchestration
  - or as a supervised companion process in the deployment environment
- ensure the default production startup path used by this repo includes a worker runtime and does not rely on operator memory
- expose worker liveness and queue-drain health through logs and admin diagnostics

Suggested implementation options:

- replace `scripts/process-deferred-jobs.ts` with a loop-and-sleep worker service
- add a worker service to `compose.yaml`
- add a dev launcher that starts both the app and the worker together
- make the documented `npm run dev`, `npm start`, and container path reflect the real supported startup model

Suggested verification:

- add focused worker-loop and startup coverage
- validate the default startup paths, not only the worker in isolation
- run `npm exec vitest run tests/deferred-job-worker.test.ts tests/admin-processes.test.ts`

### 2. Add user-facing job identity and remove practical dependence on GUIDs

Sprint 7 must let users and the assistant refer to jobs naturally.

Implementation requirements:

- add a human-readable title field or derived title model for deferred jobs, especially blog-production jobs
- add a short subtitle or summary source that explains what the job is doing in product language
- preserve raw `job_id` internally, but stop requiring it for normal status workflows
- introduce status reads such as:
  - latest active blog job
  - latest completed blog production job
  - latest blog draft in this conversation
- expose job identity consistently in the status snapshot, presenter, active-work surface, and assistant copy
- update assistant guidance so the model refers to jobs by title and purpose first
- make raw ids a debug detail rather than the default user-facing identifier

Examples:

- `Blog Draft: Platform Capabilities`
- `Blog Draft: AI Governance Playbook`
- `Publish Deferred Queue Post`

Suggested verification:

- add presenter and tool tests proving natural-language identification paths work without raw ids
- add browser assertions that the default visible UI uses titles and summaries rather than GUIDs
- run `npm exec vitest run tests/chat-tools.test.ts src/adapters/ChatPresenter.test.ts`

### 3. Add a richer deferred-job progress model with visible stages

Sprint 7 must make deferred blog progress feel alive rather than binary.

Implementation requirements:

- extend the job-status model to support visible stages such as:
  - queued
  - waiting for pickup
  - picked up
  - composing article
  - reviewing article
  - resolving QA
  - designing hero image prompt
  - generating hero image
  - saving draft
  - ready to publish
- preserve existing `progressLabel` and `progressPercent`, but treat them as part of a larger stage model
- show `last updated` and `started at` data where available
- distinguish `queued and waiting for worker` from `running`
- make the stage model explicit enough that image-generation and draft-persistence steps feel visibly alive instead of opaque waiting

Suggested verification:

- add focused status-model, presenter, and browser coverage for queue, pickup, and stage transitions
- run `npm exec vitest run tests/deferred-job-events-route.test.ts src/adapters/ChatPresenter.test.ts`

### 4. Make the job message itself a continuously updating product artifact

Sprint 7 must ensure the operator does not need to ask whether the system is working after starting a deferred job.

Implementation requirements:

- when a deferred blog job is created, immediately create one visible, titled work item in chat
- keep updating that same work item through queue, pickup, progress, completion, failure, cancellation, and retry transitions
- ensure the work item remains visible after reload, reconnect, or route transition
- avoid creating confusing duplicate cards for the same job lifecycle unless a retry creates a genuinely new run
- treat explicit status queries as a way to inspect or summarize the current work item, not as the only way to surface it

Suggested verification:

- add client, presenter, and browser coverage that a newly queued job appears immediately and then updates in place as work progresses
- run `npm exec vitest run src/hooks/useGlobalChat.test.tsx src/adapters/ChatPresenter.test.ts`

### 5. Add a dedicated active-work operator surface in the chat UI

Sprint 7 must reduce the need for status questions by making current work obvious.

Implementation requirements:

- add an active-jobs or `Current work` surface that is visible independently of transcript position
- include at minimum:
  - human-readable job title
  - current stage
  - status
  - progress if available
  - last updated timestamp
  - context actions such as `Cancel`, `Open draft`, `Publish`, or `Retry`
- keep the existing transcript job cards, but treat the active-work surface as the operator summary layer

Suggested implementations:

- a pinned active-work tray above the message list
- a compact active-jobs panel near the composer
- a per-conversation current-work section restored on load

Suggested verification:

- add browser coverage for active-job persistence through reload and follow-up messaging
- run `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/browser-ui/deferred-blog-jobs.spec.ts`

### 6. Add degraded-state UX for worker-unavailable and delayed-pickup conditions

Sprint 7 must make runtime failure visible instead of silent.

Implementation requirements:

- detect when a queued job has not been picked up within an acceptable threshold
- define that threshold in configuration or product policy so the delayed state is testable and not subjective
- expose a user-facing state such as:
  - waiting for worker
  - delayed pickup
  - background processing unavailable
- give the operator useful next steps rather than silent waiting
- preserve retry and cancel semantics while making the degraded state explicit

Suggested verification:

- add route, presenter, and browser tests for delayed pickup and worker-unavailable conditions
- run `npm exec vitest run tests/chat-job-status-route.test.ts src/adapters/ChatPresenter.test.ts`

### 7. Add assistant-facing natural status tools and prompts built around work items, not ids

Sprint 7 must let the model answer natural status questions without training the user to speak in infrastructure terms.

Implementation requirements:

- add assistant-facing read capabilities for `latest relevant blog job` and `active blog work in this conversation`
- keep `get_deferred_job_status` for internal precision and debugging, but do not make it the primary conversational path
- update prompt guidance so the assistant uses human-readable job titles and explicit stage summaries by default
- avoid telling the user to check a raw job id unless they explicitly ask for low-level detail

Suggested verification:

- add deterministic and live evals for natural-language status follow-ups without raw ids
- run `npm exec vitest run tests/evals/eval-runner.test.ts tests/evals/eval-live-runner.test.ts`

### 8. Extend Sprint QA to include runtime and UX reliability evidence

Sprint 7 must be validated against actual operator trust, not only route correctness.

Implementation requirements:

- add deterministic eval scenarios for:
  - queued job pickup clarity
  - active-work surface continuity
  - natural-language status follow-ups without GUIDs
  - worker-unavailable degraded-state messaging
- add live eval scenarios for:
  - continuous blog production progress visibility
  - latest-job references without ids
  - publish handoff from the active-work surface
- add a Sprint 7 QA runner that chains:
  - runtime startup validation
  - worker health validation
  - focused deterministic evals
  - live evals or canaries
  - browser verification
  - release evidence generation

---

## Positive, Negative, And Edge-Case Test Matrix

### Positive tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| P1 | queue a `produce_blog_article` job with the normal app runtime running | the worker picks it up automatically and the job leaves `queued` state without manual operator intervention |
| P2 | ask `is the blog draft still running?` without a job id | the assistant identifies the latest active blog job and reports its human-readable title and stage |
| P3 | start a deferred blog job and then do nothing else | the operator immediately sees a titled work item in chat that continues updating automatically |
| P4 | watch an active blog-production job in chat | the operator sees stage transitions and progress updates in the active-work surface and transcript card |
| P5 | reload the page during a running blog job | the active-work surface and transcript recover the current job state and visible title |
| P6 | complete a `produce_blog_article` job | the job becomes publish-ready and exposes `Open draft`, `Publish`, and hero-image actions from both the transcript card and active-work surface |

### Negative tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| N1 | queue a job while the worker service is unavailable | the UI surfaces a delayed-pickup or worker-unavailable state instead of silent waiting |
| N2 | ask for job status in natural language when there is no active blog job | the assistant explains that no active blog work exists and does not fabricate a running state |
| N3 | request status for a different conversation’s job through the natural status surface | RBAC and conversation access controls still prevent cross-conversation leakage |
| N4 | the system starts a job but fails to surface a visible titled work item until the user asks for status | this is treated as a sprint failure, not acceptable UX |
| N5 | terminal job cards coexist with an active-work tray | the UI does not duplicate conflicting actions or show stale stage data |
| N6 | the worker loop encounters a handler failure | the job transitions to `failed`, the failure is visible, and retry remains available |

### Edge-case tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| E1 | a job is queued, then reclaimed after a worker lease expires | the active-work surface and transcript remain coherent and do not create duplicate visible jobs |
| E2 | a user asks for status while the job changes stage mid-stream | the assistant response and card converge on the latest visible state cleanly |
| E3 | multiple active deferred jobs exist in the same conversation | the active-work surface distinguishes them by human-readable title and status |
| E4 | the latest blog job completed while the browser was disconnected | reconciliation restores the terminal state and publish readiness without requiring a new status message |
| E5 | a canceled job is retried | the new job receives a new internal id but inherits a coherent human-readable title and visible operator context |
| E6 | the app is started through the repo's default supported runtime path | deferred processing is active without a second hidden setup step |

---

## Sprint 7 Acceptance Criteria

Sprint 7 is complete only when all of the following are true:

1. a normal dev and production runtime automatically runs deferred blog jobs without requiring a manual worker command
2. queued jobs become visibly `picked up` or visibly `delayed` within defined thresholds
3. the primary user experience for status checks no longer depends on GUIDs
4. starting a deferred blog job immediately creates one visible, human-readable work item that updates automatically without requiring a follow-up status query
5. blog jobs appear in chat and in the active-work surface with human-readable titles and stage-aware progress
6. operators can identify active work and publish-ready completion without scrolling through the transcript or asking low-level status questions
7. the documented default startup paths for local, production, and containerized runtime all include working deferred processing
8. deterministic tests, browser tests, and live evals demonstrate those behaviors
