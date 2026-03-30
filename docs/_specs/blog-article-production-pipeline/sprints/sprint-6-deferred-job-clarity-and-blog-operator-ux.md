# Sprint 6 — Deferred Job Clarity And Blog Operator UX

> **Goal:** Eliminate deferred blog-job ambiguity by adding explicit job listing and status inspection, deterministic completion surfacing in chat, and publish-ready operator actions once a produced draft is done.
> **Spec Sections:** Follow-on extension beyond Sprint 5, derived from `BAPP-041`, `BAPP-050` through `BAPP-060`, plus the current runtime gaps in deferred-job observability and chat action continuity.
> **Prerequisite:** Sprint 3 orchestration through deferred jobs, Sprint 4 retry and browser hardening, and Sprint 5 editorial hero-image selection.
> **Status:** Accepted with carry-forward into Sprint 7.

---

## QA Review Of Sprint Scope

Sprint 6 is a reliability and UX correction sprint. It is not about new content-generation capability. It is about making the existing deferred blog workflow legible, queryable, and safely actionable from chat.

The following scope clarifications are enforced in this sprint document:

1. Sprint 6 owns the operator-facing status and completion UX for deferred blog jobs, not the article-writing logic itself.
2. Sprint 6 must add explicit read surfaces for deferred jobs. The current runtime supports queueing and mutation (`cancel`, `retry`) but does not expose a dedicated read path for listing active jobs or checking one job on demand.
3. Sprint 6 must make terminal completion visible in chat even when the browser misses or delays the live SSE stream.
4. Sprint 6 must turn successful `produce_blog_article` results into a publish-ready workflow rather than stopping at `Open draft`.
5. Sprint 6 must preserve existing dedupe, retry, and RBAC rules while making job state easier for the assistant and user to inspect.
6. Sprint 6 should reduce assistant guesswork by making `check status` and `what jobs are active?` first-class capabilities rather than forcing the model to infer state from prior messages.

QA conclusion: Sprint 6 is substantially implemented but not fully complete in the current runtime. The system now has explicit deferred-job read routes, assistant-facing status tools, deterministic chat recovery for status snapshots, publish-ready `produce_blog_article` handoff actions, focused deterministic and live eval coverage, and a Sprint 6 QA wrapper. The remaining gaps are operational reliability and operator UX: the runtime still depends on a separately started worker process, the worker entrypoint is not a continuously running service, and the user-facing job experience still relies too heavily on internal job identifiers and sparse stage visibility.

## Post-Implementation Addendum

Sprint 6 was originally drafted against a runtime that lacked the entire status-read surface. That is no longer the current state.

The following Sprint 6 deliverables are now implemented:

| Sprint 6 requirement area | Status | Evidence |
| --- | --- | --- |
| Explicit deferred-job read surfaces | Implemented | `src/app/api/chat/jobs/route.ts` and `src/app/api/chat/jobs/[jobId]/route.ts` now expose conversation-scoped listing and single-job status reads. |
| Assistant-facing status inspection tools | Implemented | `src/core/use-cases/tools/deferred-job-status.tool.ts` now provides `list_deferred_jobs` and `get_deferred_job_status`. |
| Deterministic status recovery without relying entirely on live SSE continuity | Implemented | `src/hooks/chat/useChatJobEvents.ts` reconciles current job snapshots on load and on reconnect/focus. |
| Deterministic completion surfacing in chat | Implemented | `src/lib/jobs/deferred-job-conversation-projector.ts`, `src/app/api/chat/stream/route.ts`, and `src/adapters/ChatPresenter.ts` preserve and re-surface job status and terminal completion state in chat. |
| Publish-ready `produce_blog_article` handoff | Implemented | `src/lib/blog/blog-article-production-service.ts` preserves draft id and `src/adapters/ChatPresenter.ts` exposes `Open draft`, `Publish`, and `Open hero image`. |
| Sprint 6 deterministic and live eval coverage | Implemented | `src/lib/evals/scenarios.ts`, `src/lib/evals/live-scenarios.ts`, and the focused eval tests under `tests/evals/` contain the Sprint 6 cases. |
| Sprint-specific QA wrapper | Implemented | `scripts/run-sprint-6-qa.ts` exists and chains release prep, health checks, focused evals, and release evidence generation. |

The following gaps remain open and are no longer a good fit for Sprint 6 because they go beyond status clarity into runtime architecture and operator-experience redesign:

| Remaining gap | Current state | Why it is deferred beyond Sprint 6 |
| --- | --- | --- |
| Always-on job execution | The app server and container runtime do not start the deferred-job worker automatically. A separate process must run `npm run jobs:work`. | This is a runtime-architecture reliability problem, not just a status-read feature gap. |
| Continuous worker behavior | `scripts/process-deferred-jobs.ts` processes one job and exits rather than running as a long-lived service. | Interactive blog production needs a persistent queue worker with heartbeat and pickup visibility. |
| Human-readable job identity | Status reads and precise job inspection still center on internal `job_id` values. | The next UX step is a user-facing work-item model with titles and natural references, not more GUID exposure. |
| Rich progress UX | The current chat card can show percent and label, but the system lacks an operator timeline, queue wait explanation, and richer stage semantics. | This is a broader operator UX redesign, not a narrow Sprint 6 patch. |
| Active-job workspace surface | The current design keeps job state inside message cards only. There is no pinned `Current work` tray or active-job summary surface. | This belongs to a broader deferred-job UX sprint rather than the original read-surface sprint. |

Disposition: Sprint 6 should be treated as accepted for the status-read, recovery, and publish-handoff scope, with the above runtime and UX issues carried forward into Sprint 7.

## Historical Draft Baseline

Sprint 6 was originally drafted against the pre-implementation runtime. The following limitations and tasks are preserved as the historical scope that this sprint was created to resolve.

### Verified limitations at draft time

| Limitation | Current state | Why Sprint 6 is needed |
| --- | --- | --- |
| No explicit job list or status-read route | `src/app/api/chat/jobs/[jobId]/route.ts` supports `POST` actions for `cancel` and `retry`, but there is no `GET` route for a single job and no conversation-scoped job listing route. | The assistant cannot answer `what is the status?` or `is my blog job done?` with a deterministic read path. |
| Completion visibility depends on SSE polling | `src/hooks/chat/useChatJobEvents.ts` subscribes through `EventSource`, and `src/app/api/chat/events/route.ts` polls job events every 500 ms within a 25-second stream window. | If the client misses the stream or reconnects late, completion may not surface live in chat without a manual refresh. |
| Completion notifications are optional web push, not guaranteed chat continuity | `src/lib/jobs/deferred-job-notifications.ts` only sends browser push notifications when VAPID keys, subscriptions, and user preferences are present. | Push notification delivery is not the same as a guaranteed in-conversation completion message. |
| Projected job messages are status-only cards | `src/lib/jobs/deferred-job-conversation-projector.ts` updates or creates an assistant message with a `job_status` part only. | The runtime persists status, but it does not add a stronger terminal completion affordance or explicit operator guidance when a result is ready. |
| `produce_blog_article` completion lacks a direct publish action | `src/adapters/ChatPresenter.ts` treats `produce_blog_article` success as only `{ slug, imageAssetId }` and renders `Open draft` and `Open hero image`, but no `Publish` action. | Users who ask to publish immediately after production completion are forced into a manual follow-up instead of a deterministic one-click or one-command path. |
| Dedupe only protects exact per-conversation payload matches | `src/app/api/chat/stream/route.ts` and `src/lib/jobs/job-dedupe.ts` dedupe only when the same deferred tool input is repeated for the same conversation. | The assistant still lacks an explicit `existing active blog job` query surface, so similar-but-not-identical follow-ups can enqueue new work rather than checking the live job. |
| No assistant-facing status tool exists | The current tool set includes `draft_content`, `publish_content`, and `produce_blog_article`, but no `check deferred jobs` or `list blog jobs` tool. | The model is encouraged to re-run production when it should inspect existing job state. |

### Available assets

| Asset | Verified detail |
| --- | --- |
| `src/app/api/chat/stream/route.ts` | Queues deferred tool calls, applies per-conversation payload dedupe, and returns a deferred-job envelope immediately rather than inline terminal output. |
| `src/adapters/JobQueueDataMapper.ts` | Persists jobs and job events, supports dedupe lookup, event replay, claiming, cancellation, and retry seeds, but does not yet expose conversation-scoped job summaries. |
| `src/lib/jobs/deferred-job-worker.ts` | Appends `started`, `progress`, `result`, `failed`, and `canceled` events and projects them into the conversation if the worker completes normally. |
| `src/lib/jobs/deferred-job-conversation-projector.ts` | Rehydrates a single assistant message per job and replaces its `job_status` part as new events arrive. |
| `src/app/api/chat/events/route.ts` | Streams job events to the browser through polling SSE but does not provide a deterministic snapshot endpoint for `current active jobs` or `current status for job X`. |
| `src/hooks/chat/useChatJobEvents.ts` | Applies SSE-delivered job events client-side, but if there is no active EventSource session the UI relies on later conversation reload. |
| `src/adapters/ChatPresenter.ts` | Derives action buttons from terminal job results, including draft publish actions for `draft_content`, but not publish actions for `produce_blog_article`. |
| `src/app/api/chat/jobs/[jobId]/route.ts` | Already provides guarded `cancel` and `retry` behavior, which Sprint 6 should extend with read capabilities rather than replacing. |
| `src/lib/jobs/job-status.ts` | Builds human-readable job summaries from event payloads and result payloads, which can power a job-status read surface. |
| `src/lib/evals/scenarios.ts` and `src/lib/evals/live-scenarios.ts` | The repo already supports deterministic and live eval catalogs, so Sprint 6 should add deferred-job-specific scenarios rather than inventing a separate eval framework. |
| `scripts/run-live-eval.ts` and `scripts/run-staging-canary.ts` | Existing executable eval entry points can run live and deployed scenarios once Sprint 6 adds the needed eval definitions. |
| `scripts/run-sprint-3-qa.ts` | Provides the pattern for a sprint-specific QA wrapper that chains release prep, health checks, live evals, and release evidence generation. |
| `tests/chat-job-actions-route.test.ts` | Existing coverage already verifies cancel and retry semantics; Sprint 6 can extend this to status reads and list reads. |
| `tests/deferred-blog-job-flow.test.ts` | Existing worker-flow coverage provides the right place to add assertions for richer terminal completion projection. |
| `tests/browser-ui/deferred-blog-jobs.spec.ts` | Existing browser coverage validates job cards and reload resilience; Sprint 6 should extend it to deterministic completion surfacing and direct publish actions. |

---

## Original Sprint Tasks

The following checklist is preserved as the original Sprint 6 implementation scope. These items are now implemented unless they are explicitly called out in the post-implementation addendum as carry-forward work for Sprint 7.

### 1. Add explicit deferred-job read surfaces for status and listing

Sprint 6 must let the assistant and the UI inspect deferred jobs without mutating state.

Implementation requirements:

- add a `GET /api/chat/jobs/[jobId]` route that returns the current normalized job state for an authorized conversation participant
- add a conversation-scoped job listing route, for example `GET /api/chat/jobs?conversationId=...`, with filters for active-only and recent terminal jobs
- return normalized fields that match the existing `job_status` message part model:
  - job id
  - tool name
  - status
  - progress label and percent
  - summary or error
  - updated timestamp
  - result payload when terminal
- preserve RBAC and conversation access checks equivalent to the current cancel/retry route

Why this is necessary:

- status questions should become read operations rather than implicit reruns
- the assistant should be able to identify `the active blog production job` before deciding whether a new `produce_blog_article` call is appropriate

Suggested verification:

- add focused route coverage for job read and job list behavior
- run `npm exec vitest run tests/chat-job-actions-route.test.ts tests/chat-job-status-route.test.ts`

### 2. Make terminal completion deterministic in chat even without live SSE continuity

Sprint 6 must guarantee that a completed or failed deferred blog job becomes visible in the conversation without relying entirely on an uninterrupted EventSource session.

Implementation requirements:

- keep projecting terminal job events into conversation messages through `DeferredJobConversationProjector`
- add a deterministic client reconciliation step on chat load or chat focus that fetches current active and recently terminal jobs and merges them into local state
- ensure the browser can recover terminal state after SSE disconnects, tab sleeps, or route transitions without requiring the user to send another message
- preserve existing SSE streaming for low-latency updates, but stop treating SSE as the only completion-delivery mechanism

Suggested implementation options:

- extend the conversation bootstrap or refresh path to fetch current deferred-job snapshots
- or add a dedicated job snapshot hook that runs on mount and after reconnect

Suggested verification:

- add focused client and browser coverage for missed-stream recovery and delayed terminal event hydration
- run `npm exec vitest run src/hooks/useGlobalChat.test.tsx tests/deferred-blog-job-flow.test.ts`

### 3. Add explicit assistant-facing tools for checking deferred job state

Sprint 6 must reduce model confusion by exposing job inspection as a first-class tool surface.

Implementation requirements:

- add a deferred-job status tool that can answer `check the status of job X`
- add a deferred-job listing tool that can answer `show my active jobs in this conversation` or equivalent
- normalize results so the chat presenter can render status clearly and the model can extract post ids or publish readiness from completed blog jobs
- prefer read-only semantics; these tools should not create or retry jobs

Scope note:

- Sprint 6 does not need a broad operator dashboard. It needs deterministic chat-native status introspection for deferred workflows.

Suggested verification:

- add focused tool and registry coverage
- run `npm exec vitest run tests/tool-registry.integration.test.ts tests/chat-tools.test.ts`

### 4. Make `produce_blog_article` completion publish-ready

Sprint 6 must let operators move directly from a completed production job to publish when the result is valid.

Implementation requirements:

- include the produced draft id in the `produce_blog_article` result contract and preserve it through the deferred-job payload, presenter, and UI actions
- update `ChatPresenter` so a successful `produce_blog_article` result exposes at minimum:
  - `Open draft`
  - `Publish`
  - `Open hero image`
- keep publish action semantics aligned with the existing `publish_content` tool contract that requires a draft post id
- preserve draft-only safety: publish should remain an intentional follow-up action, not an automatic side effect of production completion

Suggested verification:

- extend presenter and browser deferred-blog coverage for publish-from-produced-draft
- run `npm exec vitest run src/adapters/ChatPresenter.test.ts tests/deferred-blog-publish-flow.test.ts`

### 5. Add clear in-chat operator guidance for queued, running, and terminal blog jobs

Sprint 6 must make job cards easier to interpret and act on.

Implementation requirements:

- distinguish initial queue acknowledgement from later status inspection results
- show a clearer terminal summary for `produce_blog_article`, including draft title, slug, and publish readiness
- when a matching active blog production job already exists, surface that fact explicitly instead of silently returning a deduped envelope
- avoid language that implies a new job was started when the system actually re-used an existing queued or running job

Suggested verification:

- extend presenter and browser tests for deduped job copy and terminal action labels
- run `npm exec vitest run src/adapters/ChatPresenter.test.ts tests/browser-ui/deferred-blog-jobs.spec.ts`

### 6. Preserve and extend existing cancel, retry, and dedupe behavior without regressions

Sprint 6 must improve observability without breaking the shared deferred runtime.

Implementation requirements:

- preserve `cancel` support for queued and running jobs
- preserve `retry` support for failed and canceled jobs
- keep current per-conversation payload dedupe semantics unless an explicit product decision changes the policy
- add test coverage that proves job reads, dedupe responses, and publish-ready actions all coexist with the current mutation routes

Suggested verification:

- run `npm exec vitest run tests/chat-job-actions-route.test.ts tests/deferred-blog-job-flow.test.ts tests/deferred-blog-publish-flow.test.ts`

### 7. Add real eval coverage and an executable Sprint 6 QA path

Sprint 6 must be validated with real evals, not just unit and route tests.

Implementation requirements:

- add deterministic eval scenarios to `src/lib/evals/scenarios.ts` for deferred blog-job continuity and publish readiness
- add live-model eval fixtures to `src/lib/evals/live-scenarios.ts` for real assistant behavior under asynchronous blog-job workflows
- add a Sprint 6 QA runner script, following the pattern in `scripts/run-sprint-3-qa.ts`, that executes:
  - release preparation
  - admin health checks
  - focused live evals or staging canaries
  - release evidence generation
- ensure Sprint 6 produces evidence artifacts that can be reviewed alongside route, browser, and eval results

Required deterministic eval scenarios:

- `blog-job-status-continuity-deterministic`
  - verifies that an existing queued or running `produce_blog_article` job is surfaced through a read path rather than a new run
- `blog-job-dedupe-clarity-deterministic`
  - verifies that deduped deferred-job responses explicitly identify reused work instead of implying a fresh queue event
- `blog-produce-publish-handoff-deterministic`
  - verifies that a completed `produce_blog_article` result exposes a publishable post id and a publish-ready next action
- `blog-missed-sse-recovery-deterministic`
  - verifies that terminal job state is recovered through reconciliation after an interrupted event stream

Required live eval scenarios:

- `live-blog-job-status-and-publish-handoff`
  - prompts the assistant to start production, asks for status while the job is still active, then asks to publish after completion
- `live-blog-job-reuse-instead-of-rerun`
  - asks for status multiple times while a matching job is active and expects the assistant to inspect or reference the existing job rather than create a new one
- `live-blog-completion-recovery`
  - validates that completion still surfaces coherently after a reconnect or delayed refresh path

Scoring dimensions should include at minimum:

- continuity
- tool correctness
- recovery
- customer clarity
- safety

Suggested verification:

- deterministic eval tests under `tests/evals/`
- live eval execution through `npm run eval:live -- --scenario <scenario-id>`
- a sprint wrapper such as `npm run qa:sprint-6`

---

## Real Evals And QA Program

Sprint 6 requires four layers of verification. All four are mandatory because this feature fails in interaction between backend state, chat projection, browser rehydration, and assistant decision-making.

### 1. Deterministic evals

Purpose:

- prove the runtime chooses read, reuse, and publish-handoff behavior under controlled seeded conditions

Implementation expectations:

- add Sprint 6 scenarios to `src/lib/evals/scenarios.ts`
- add or extend deterministic fixtures in `src/lib/evals/seeding.ts`
- add focused scoring coverage in `tests/evals/eval-runner.test.ts`, `tests/evals/eval-scoring.test.ts`, and `tests/evals/eval-integration.test.ts`

Pass criteria:

- all required Sprint 6 checkpoints pass
- tool use favors status reads over accidental reruns
- completed production jobs retain the post id needed for publish handoff

### 2. Live model evals

Purpose:

- prove the real assistant behavior is aligned with the runtime and does not drift back into “status means rerun” behavior

Implementation expectations:

- add Sprint 6 live fixtures to `src/lib/evals/live-scenarios.ts`
- run them through `scripts/run-live-eval.ts`
- include at least one staging or deployed canary path through `scripts/run-staging-canary.ts`

Pass criteria:

- the assistant accurately reports active-job state
- the assistant reuses existing active jobs when appropriate
- the assistant uses the completed post id to publish instead of requesting a new production run

### 3. Positive, negative, and edge-case automated tests

Purpose:

- prove the code contracts are stable at the route, repository, presenter, worker, and browser layers

Required focused areas:

- route tests for `GET /api/chat/jobs/[jobId]` and conversation job listing
- worker and projector tests for terminal projection and reconciliation state
- presenter tests for publish-ready `produce_blog_article` actions
- browser tests for reload, reconnect, missed SSE, and dedupe clarity

Minimum execution set:

- `npm exec vitest run tests/chat-job-actions-route.test.ts tests/chat-job-status-route.test.ts tests/deferred-blog-job-flow.test.ts tests/deferred-blog-publish-flow.test.ts src/adapters/ChatPresenter.test.ts src/hooks/useGlobalChat.test.tsx`
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/browser-ui/deferred-blog-jobs.spec.ts`

### 4. Sprint QA wrapper and release evidence

Purpose:

- make Sprint 6 verification repeatable and auditable the same way Sprint 3 QA already is

Implementation expectations:

- add `scripts/run-sprint-6-qa.ts`
- chain release prep, health validation, focused eval execution, and evidence generation
- emit artifacts suitable for release evidence and QA review

Pass criteria:

- Sprint 6 can be validated with one documented command sequence
- the resulting evidence captures deterministic test results, browser results, and live eval results

## Positive, Negative, And Edge-Case Test Matrix

### Positive tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| P1 | request the status of a queued `produce_blog_article` job by id | the read route returns `queued` with tool name and timestamps but does not create a new job |
| P2 | list active jobs for the current conversation | the response includes the active production job and any other queued or running deferred work |
| P3 | complete a `produce_blog_article` job while the chat tab is open | the job card transitions to terminal state with draft-ready summary and publish action |
| P4 | reload after a completed `produce_blog_article` job | the chat rehydrates the terminal job state and still exposes `Publish` |
| P5 | ask the assistant to publish after production completes | the assistant can use the existing post id from the completed result rather than rerunning production |

### Negative tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| N1 | request job status for a conversation the user does not own | the route returns `404` or `403` without leaking job details |
| N2 | request job status for a missing job id | the route returns `404` |
| N3 | ask for active jobs when none exist | the list route returns an empty result rather than synthetic queued state |
| N4 | receive a deduped deferred-job envelope for a matching active job | the UI explicitly states that the existing job is still active and does not imply a fresh run |
| N5 | attempt to publish from a produced job result whose post id is missing or invalid | the action is omitted or rejected safely rather than issuing a malformed publish command |
| N6 | ask the assistant for status while an existing job is active | the assistant performs a read or uses the existing job state rather than queuing another production job |
| N7 | lose push-notification eligibility before job completion | completion still appears in chat through projection and reconciliation rather than disappearing silently |

### Edge-case tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| E1 | SSE disconnects before terminal completion | the next reconciliation fetch restores the terminal job state in chat |
| E2 | the worker completes while push notifications are disabled | the conversation still shows the completed job via projection and reconciliation |
| E3 | the user asks for status repeatedly during a running job | each check reads the same job state and does not enqueue a duplicate job |
| E4 | a produced draft is later published through the chat action | the published route opens correctly and the draft action no longer implies unpublished state |
| E5 | a failed blog production job is retried after status inspection | retry still produces a fresh queued job or dedupes to an existing active retry candidate as appropriate |
| E6 | the browser reloads after job completion but before the last SSE event is processed | reconciliation rehydrates the terminal card with publish action intact |
| E7 | the assistant receives a deduped payload for an already-running blog job | the chat copy explicitly indicates reuse of the active job instead of implying a new run |

### Eval-specific cases

| ID | Eval | Expected outcome |
| --- | --- | --- |
| EV1 | deterministic `blog-job-status-continuity-deterministic` | active job inspection succeeds without creating a duplicate production job |
| EV2 | deterministic `blog-produce-publish-handoff-deterministic` | completed production result includes publishable post id and publish-ready action |
| EV3 | live `live-blog-job-status-and-publish-handoff` | the assistant checks status accurately and publishes using the returned draft id |
| EV4 | live `live-blog-job-reuse-instead-of-rerun` | repeated status prompts do not trigger additional production jobs |
| EV5 | live `live-blog-completion-recovery` | completion remains visible and actionable after reconnect or delayed refresh |

---

## Completion Checklist

- [ ] explicit job-status read route added
- [ ] conversation-scoped job-list route added
- [ ] assistant-facing deferred-job status tools added
- [ ] chat client reconciles missed terminal job updates without relying solely on SSE
- [ ] `produce_blog_article` result exposes a publish-ready action with the persisted post id
- [ ] deduped active jobs are clearly surfaced as existing work rather than implied fresh runs
- [ ] cancel, retry, dedupe, and RBAC behavior remain green
- [ ] deterministic Sprint 6 eval scenarios added to the eval catalog and scored green
- [ ] live Sprint 6 eval scenarios added and exercised through the live runner or staging canary path
- [ ] Sprint 6 QA wrapper script added and documented

## QA Deviations

- Sprint 6 read surfaces are not implemented; the current chat jobs route is mutation-only.
- Sprint 6 completion reconciliation is not implemented; the browser currently depends on SSE updates or a later conversation refresh.
- Sprint 6 publish-ready orchestration actions are not implemented; `produce_blog_article` completion currently exposes draft and hero-image links but no direct publish path.
- Sprint 6 eval coverage is not implemented; the current eval catalog has no deferred-blog-job scenarios for status inspection, rerun avoidance, or publish handoff.
