# Sprint 3 - Job Phase Model And Transcript Durability

> **Status:** Draft
> **Goal:** Extend deferred-job reporting, normalized job projection, and chat transport so phased progress, whole-job retry lineage, and payload-first history rendering work end to end without waiting for the Sprint 4 global progress strip.
> **Spec refs:** `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md` §3.4, §3.6, §3.7, §3.10, §5, §6, §8
> **Prerequisite:** Sprint 2 complete

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md` | Canonical phase-progress, retry, replay-snapshot, and transcript-durability contract |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-1-presentation-manifest-and-result-envelope.md` | The implemented descriptor and result-envelope substrate that Sprint 3 must extend rather than bypass |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-2-shared-card-system-and-tone-primitives.md` | The implemented shared system-card family that already knows how to render envelope timelines and detail drawers |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/README.md` | Current roadmap sequencing and the explicit dependency that Sprint 4 waits on normalized job state |
| `src/core/entities/capability-result.ts` | `CapabilityProgressPhase`, `activePhaseKey`, artifact refs, and replay-snapshot fields already exist in the core envelope contract |
| `src/frameworks/ui/chat/registry/capability-presentation-registry.ts` | Current presentation manifest already marks `produce_blog_article` as `progressMode: "phased"` and deferred capabilities as `supportsRetry: "whole_job"` |
| `src/frameworks/ui/chat/plugins/system/SystemJobCard.tsx` | Shared system card already renders envelope phases via `CapabilityTimeline` and exposes replay-snapshot detail without new UI invention |
| `src/core/entities/message-parts.ts` | Current `JobStatusMessagePart` durability surface for queued, running, and terminal job transcript entries |
| `src/core/entities/chat-stream.ts` | Current live job SSE union still speaks in slim `progressPercent` and `progressLabel` fields only |
| `src/lib/jobs/deferred-job-worker.ts` | Current `DeferredJobProgressUpdate` contract and progress-event persistence seam |
| `src/lib/jobs/deferred-job-handlers.ts` | Current worker bridge where `produce_blog_article` progress is still reduced to label plus percent |
| `src/core/use-cases/tools/blog-production.tool.ts` | Current deferred editorial tool contract that still exposes a two-argument progress callback |
| `src/lib/blog/blog-article-production-service.ts` | Existing staged editorial pipeline with a stable phase order suitable for the first phased job adopter |
| `src/lib/jobs/job-status.ts` | Current job-event to `JobStatusMessagePart` projector and envelope reconstruction logic |
| `src/lib/jobs/deferred-job-result.ts` | Deferred-job wrapper and hydration path used when tool results carry queued or terminal job snapshots |
| `src/lib/jobs/job-read-model.ts` | Durable snapshot builder and current audit-event fallback logic |
| `src/lib/jobs/job-status-query.ts` | Current snapshot query only asks the repository for the latest event per job |
| `src/core/use-cases/JobQueueRepository.ts` | Current repository contract only exposes `findLatestEventForJob()`, which is too weak for a clean latest-renderable snapshot path |
| `src/adapters/JobQueueDataMapper.ts` | Current SQLite-backed repository implementation and the cleanest place to add a latest-renderable-event query |
| `src/lib/jobs/job-status-snapshots.ts` | Snapshot extraction and snapshot-to-stream adapter for job status parts |
| `src/lib/jobs/job-event-stream.ts` | Current `/api/chat/events` payload mapper that reconstructs thin typed SSE payloads from job events |
| `src/lib/jobs/manual-replay.ts` | Existing whole-job retry path with lineage and dedupe-aware replay behavior |
| `src/lib/chat/StreamStrategy.ts` | Current client-side stream reducer path that rebuilds thin `JobStatusMessagePart`s from typed SSE events |
| `src/adapters/chat/EventParserStrategy.ts` | Current parser for live job SSE payloads |
| `src/hooks/chat/useChatJobEvents.ts` | Conversation job snapshot reconciliation plus `/api/chat/events` subscription loop |
| `src/core/services/ConversationMessages.ts` | Current `UPSERT_JOB_STATUS` merge semantics for transcript messages |
| `src/lib/chat/conversation-portability.ts` | Conversation export/import sanitizer that must preserve replay-safe job envelopes |
| `src/app/api/chat/jobs/route.ts` | Snapshot route currently returning conversation job parts from the job read model |
| `src/app/api/chat/events/route.ts` | Live SSE route for conversation job events |
| `src/app/api/chat/jobs/[jobId]/route.ts` | Existing chat job action route for whole-job cancel and retry |
| `src/lib/jobs/job-status.test.ts` | Projection regression surface for envelope-backed job parts |
| `src/lib/jobs/deferred-job-result.test.ts` | Deferred-job wrapper regression surface |
| `src/lib/jobs/job-read-model.test.ts` | Snapshot and audit-event fallback regression surface |
| `src/lib/jobs/job-event-stream.test.ts` | Live event payload mapping regression surface |
| `src/lib/chat/StreamStrategy.test.ts` | Client-side job stream reduction regression surface |
| `src/hooks/chat/useChatJobEvents.test.tsx` | Snapshot-plus-SSE reconciliation regression surface |
| `src/app/api/chat/jobs/route.test.ts` | Snapshot route regression surface |
| `tests/deferred-job-repository.test.ts` | Repository-level durability and event ordering regression surface for the SQLite-backed job store |
| `tests/chat/chat-job-actions-route.test.ts` | Existing whole-job cancel and retry route coverage for the chat surface |

---

## Cross-Layer Constraints

1. Sprint 3 is a normalized job-state and durability sprint. It must not wire the global progress strip into `ChatContentSurface.tsx`, move header chrome, or redesign system cards. Those belong to Sprint 4.
2. `capability-presentation-registry.ts` remains the chat source of truth for `progressMode` and `supportsRetry`. `JOB_CAPABILITY_REGISTRY` remains the execution and governance source of truth. Sprint 3 must not create a third progress-policy registry inside the worker path.
3. Retry remains whole-job only. Do not introduce checkpoint resume, phase-level retry, or partial rerun affordances. The existing `manual-replay.ts` plus `/api/chat/jobs/[jobId]` route stays the only retry path.
4. Compatibility fields `progressPercent` and `progressLabel` stay additive until all live and snapshot consumers can read normalized envelope progress. Sprint 3 may extend transports, but it must not strand current jobs/admin surfaces on day one.
5. History stays payload-first and no-refetch. If a card cannot render correctly from the saved `JobStatusMessagePart` plus `resultEnvelope`, Sprint 3 has not satisfied the transcript-durability bar.
6. Audit-only events must not become user-visible state, but they also must not erase the latest user-facing phased snapshot. Notification and ownership audit records are allowed to exist only if the durable read model still preserves render fidelity.
7. Sprint 3 may extend job stream payloads, but `/api/chat/jobs`, `/api/chat/events`, deferred-job result wrappers, and event-history mapping must still converge on one normalized `JobStatusMessagePart` truth rather than drifting into parallel models.
8. The replay-snapshot and envelope budgets frozen in Sprint 0 still apply. Progress phases, retry lineage, and replay previews must stay compact and JSON-serializable.

---

## Engineering Quality Bar

Sprint 3 is not complete because phased progress appears in more places. It is complete only if the normalized job-state path becomes simpler, more explicit, and harder to regress than the current single-progress model.

### Knuth bar - explicit invariants and minimal accidental complexity

1. Define one pure normalization helper for phase ordering, status normalization, and compatibility `progressPercent` plus `progressLabel` derivation. Worker code, snapshot code, and stream code may consume it, but they may not each invent their own phase mapper.
2. Live merge precedence must be deterministic. Monotonic sequence ordering is authoritative; timestamps alone are not sufficient when deciding whether an incoming job update is newer or merely noisier.
3. Audit-only event handling must be centralized. The repository or read-model seam may decide what the latest renderable event is, but routes, reducers, and stream adapters should not each carry their own stringly typed event blacklist.
4. Textual status surfaces such as `describeJobStatus()` and transcript export must derive from the same normalized phase state as cards, or the user experience will drift between the visible UI, accessibility copy, and exported history.

### Martin bar - narrow responsibilities and stable boundaries

1. Service code emits semantic work-state intent, worker code persists updates, projector and read-model code build transcript parts, and stream adapters transport them. Do not collapse those responsibilities into a single omniscient helper or route.
2. If the clean durability fix requires knowledge of the latest renderable event, add an additive repository or query contract for that purpose instead of burying SQL or audit-event branching inside `job-status-query.ts` or route handlers.
3. Presentation policy such as `progressMode` and `supportsRetry` remains descriptor-owned. Retry and recovery policy remain job-capability-registry-owned. Sprint 3 must not blur those concerns.
4. `ConversationMessages.upsertJobStatusMessage()` should remain a merge boundary, not become a second projection layer that reinterprets transport payloads.

### GoF bar - pragmatic patterns, not ceremony

1. Use small Strategy or Adapter helpers for phase normalization, latest-renderable-event selection, and stream parsing rather than introducing a new god-object job manager.
2. Keep transport adaptation separate from domain projection. `job-event-stream.ts`, `EventParserStrategy.ts`, and `StreamStrategy.ts` should adapt normalized state, not own the business rules for phase identity or retry policy.
3. Favor composition of pure helpers over inheritance or deep wrapper chains for worker progress handling, snapshot reconstruction, and stream reduction.
4. Any new helper must reduce branch count in its consumers. If Sprint 3 leaves the worker, read model, or stream adapters longer and more ad hoc than they are now, the abstraction is failing.

---

## Pragmatic Test Standard

1. Add direct unit coverage for any new phase-normalization helper and any new latest-renderable-event selector. These are pure logic seams and should not be tested only through route fixtures.
2. Stream transport changes need parser coverage and reducer coverage. `StreamStrategy` tests alone are not enough once `EventParserStrategy` starts handling richer job payloads.
3. Accessibility and portability surfaces need explicit assertions. `describeJobStatus()` and `buildTranscriptCopy()` should mention active phase and percent when that information exists.
4. Route and read-model tests should prove `/api/chat/jobs` and `/api/chat/events` emit compatible normalized state for the same underlying job, especially after audit-only events.
5. Prefer invariant assertions over broad snapshots. For Sprint 3, the important failures are dropped phases, lost envelopes, incorrect lineage, and merge-precedence regressions.
6. Keep the verification bundle focused on the changed boundaries. Do not broaden this sprint into indiscriminate full-suite churn unless the contract boundary truly changes.

---

## Runtime And UX Guardrails

1. Running-state cards, exported transcripts, and assistive descriptions should all surface the same active phase label and percent when available. Generic `running` copy is acceptable only when phase detail is absent.
2. Live updates must never replace a richer stored job part with a poorer one. Merge behavior should be monotonic in fidelity as well as sequence.
3. History playback, import or export, and `/jobs` snapshot views must not re-fetch data just to recover phase state or replay-snapshot detail that should have been preserved in the saved part.
4. Stream payload extensions must stay additive and compact. Do not duplicate heavyweight envelope data across every tick when a normalized part can carry the same durable truth.
5. Audit-only events must not cause visible jitter or status regressions in the conversation transcript.

---

## QA Findings Before Implementation

1. `CapabilityResultEnvelope.progress.phases` and `activePhaseKey` already exist in `src/core/entities/capability-result.ts`, and `SystemJobCard.tsx` already renders them, but the worker/reporting, projection, snapshot, and SSE layers still only thread `progressPercent` and `progressLabel`.
2. `produce_blog_article` is already declared `progressMode: "phased"` in `capability-presentation-registry.ts`, but `createDeferredJobHandlers()`, `executeProduceBlogArticle()`, and `BlogArticleProductionService.produceArticle()` still expose only a `(label, percent)` progress contract.
3. `buildJobStatusPartFromProjection()` in `src/lib/jobs/job-status.ts` still reconstructs envelopes from raw part fields using only percent and label progress. Phase arrays, replay previews, and richer running-state summaries are discarded unless they happen to arrive in a native terminal envelope.
4. `deferred-job-result.ts`, `job-event-stream.ts`, `job-status-snapshots.ts`, `chat-stream.ts`, `EventParserStrategy.ts`, and `StreamStrategy.ts` currently round-trip a slim live-event shape, so a richer snapshot-derived job part can be overwritten by a thinner SSE update that lacks `resultEnvelope`, `failureClass`, `recoveryMode`, and replay lineage.
5. `RepositoryBackedJobStatusQuery` only calls `findLatestEventForJob()`. When the latest event is audit-only, `job-read-model.ts` falls back to a synthetic event built from the job row, which preserves terminal status but cannot preserve phased-progress detail unless the query or snapshot model gets stronger.
6. `conversation-portability.ts` exports raw `job_status` parts through `deepCloneParts(...)`, but its import sanitizer currently whitelists legacy job fields only and drops `resultEnvelope`, which breaks payload-first replay on round-trip import.
7. `ChatPresenter.buildJobStatusActions()` already surfaces `Cancel` and `Retry`, but the action derivation is still status-driven rather than descriptor-driven and does not benefit from the richer replay lineage and dedupe context already returned by `/api/chat/jobs/[jobId]`.
8. `describeJobStatus()` and `buildTranscriptCopy()` currently reduce running jobs to generic status text, so accessibility output and exported transcript copy would lag behind the richer phased card UI unless Sprint 3 tightens those surfaces too.
9. `JobQueueRepository` exposes `findLatestEventForJob()` only. Without an additive latest-renderable-event contract, the clean durability fix is likely to devolve into duplicated audit-event filtering across repository consumers.
10. `StreamStrategy.test.ts` currently proves text and tool-call dispatch only. There is no direct parser regression surface yet for richer job SSE payloads, which is too weak for a transport-changing sprint.

---

## Task 3.1 - Extend deferred job progress reporting and define the first stable phased job

**What:** Expand the worker progress contract so deferred jobs can emit stable phase state, then implement the first real phased emitter using the existing `produce_blog_article` pipeline.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/jobs/job-progress-state.ts` |
| **Create** | `src/lib/jobs/job-progress-state.test.ts` |
| **Modify** | `src/lib/jobs/deferred-job-worker.ts` |
| **Modify** | `src/lib/jobs/deferred-job-handlers.ts` |
| **Modify** | `src/core/use-cases/tools/blog-production.tool.ts` |
| **Modify** | `src/lib/blog/blog-article-production-service.ts` |
| **Modify** | `src/lib/jobs/deferred-job-runtime.test.ts` |
| **Modify as needed** | `tests/deferred-job-worker.test.ts` |
| **Modify as needed** | `tests/deferred-blog-job-flow.test.ts` |
| **Spec** | §3.4, §3.7, §3.10 |

### Task 3.1 outcomes

1. Create one pure helper that defines phase ordering, normalizes phase-status input, and derives compatibility `progressPercent` plus `progressLabel` from semantic phase state.
2. Extend `DeferredJobProgressUpdate` with additive phased-progress metadata so a worker progress tick can carry stable phase keys, phase statuses, `activePhaseKey`, and compatibility fields in one update.
3. Use `produce_blog_article` as the first concrete phased adopter and map its current pipeline onto stable phase keys aligned to the existing service stages: `compose_blog_article`, `qa_blog_article`, `resolve_blog_article_qa`, `generate_blog_image_prompt`, `generate_blog_image`, and `draft_content`.
4. Keep top-level `progressPercent` and `progressLabel` populated for compatibility, but persist the richer phase state in the event payload so later read-model and stream layers no longer have to infer it from label text.
5. Keep progress payloads compact. Running-state updates may include normalized summary or replay-preview data, but they must not embed full draft bodies, raw QA logs, or binary asset payloads.
6. Keep `recoveryMode` as `rerun`. Sprint 3 does not add per-phase resume semantics just because phase state now exists.

### Task 3.1 notes

1. Prefer stable machine-readable phase keys over prose-only labels. Human labels can still change, but transcript history and tests need deterministic phase identity.
2. The normalization helper should own compatibility percent and label derivation so service code does not hand-encode duplicate percentage math in multiple places.
3. Do not add new `job_requests` columns for phase arrays unless the later durability task proves the current event-backed snapshot model is insufficient.
4. If another deferred capability adopts `progressMode: "phased"` during implementation, it must use the same stable-key discipline and compatibility fields.

### Verify Task 3.1

```bash
npx vitest run src/lib/jobs/job-progress-state.test.ts src/lib/jobs/deferred-job-runtime.test.ts tests/deferred-job-worker.test.ts tests/deferred-blog-job-flow.test.ts
```

---

## Task 3.2 - Project phased envelopes through job status, durable snapshots, and replay lineage

**What:** Make normalized job parts and deferred-job wrappers preserve envelope-backed phase state, replay snapshots, and lineage across snapshot reads, history playback, and conversation portability.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/jobs/job-status.ts` |
| **Modify** | `src/lib/jobs/deferred-job-result.ts` |
| **Modify** | `src/lib/jobs/job-read-model.ts` |
| **Modify** | `src/lib/jobs/job-status-query.ts` |
| **Modify** | `src/core/use-cases/JobQueueRepository.ts` |
| **Modify** | `src/adapters/JobQueueDataMapper.ts` |
| **Modify** | `src/lib/jobs/job-status-snapshots.ts` |
| **Modify as needed** | `src/core/entities/message-parts.ts` |
| **Modify as needed** | `src/lib/jobs/manual-replay.ts` |
| **Modify** | `src/lib/chat/conversation-portability.ts` |
| **Create** | `src/lib/chat/conversation-portability.test.ts` |
| **Modify** | `src/lib/jobs/job-status.test.ts` |
| **Modify** | `src/lib/jobs/deferred-job-result.test.ts` |
| **Modify** | `src/lib/jobs/job-read-model.test.ts` |
| **Modify** | `tests/deferred-job-repository.test.ts` |
| **Modify as needed** | `tests/chat/chat-job-actions-route.test.ts` |
| **Spec** | §3.4, §3.10, §5 transcript durability tests |

### Task 3.2 outcomes

1. `buildJobStatusPartFromProjection()` must prefer event-supplied or envelope-supplied phases, `activePhaseKey`, replay-snapshot data, artifacts, lineage, and summary fields before falling back to tool-specific heuristics.
2. `describeJobStatus()` and any shared textual status formatter must surface active phase and percent when available so accessibility copy and exported transcript text do not regress behind the card UI.
3. `createDeferredJobResultPayload()` and `deferredJobResultToMessagePart()` must preserve normalized `resultEnvelope` for queued, running, and terminal states so the deferred-job wrapper does not collapse back to raw payload plus label semantics.
4. Add an additive repository or query contract for the latest renderable non-audit event so durable snapshot fidelity does not depend on duplicated event-type filtering in repository consumers.
5. The durable snapshot path behind `RepositoryBackedJobStatusQuery` must preserve the most recent user-facing event state when the latest stored event is audit-only, so notification or ownership records cannot strip active phase detail or terminal replay fidelity.
6. Whole-job replay stays on the existing `manual-replay.ts` route and lineage model, but replayed and superseded job metadata must survive through the normalized envelope path without requiring local reinterpretation.
7. Conversation export and import must round-trip `resultEnvelope` and any additive phased-progress metadata so imported transcripts replay with the same system-card fidelity as the original conversation.
8. Historical rendering remains snapshot-first. No conversation import, history page, or job detail surface may re-fetch remote data just to recover envelope detail that should have been preserved in the saved part.

### Task 3.2 notes

1. Prefer envelope-first durability over adding more top-level `JobStatusMessagePart` fields. Add a new top-level field only when the envelope cannot reasonably carry the value.
2. If synthetic snapshot fallback remains necessary for audit-only events, it must reconstruct the same effective envelope fidelity as the last user-facing event for that job.
3. Prefer one shared textual description path reused by portability and accessibility surfaces rather than duplicating phase-summary string assembly.
4. `conversation-portability.ts` is part of the durability contract, not an optional cleanup follow-up. If imports still drop envelopes after Sprint 3, the sprint is incomplete.

### Verify Task 3.2

```bash
npx vitest run src/lib/jobs/job-status.test.ts src/lib/jobs/deferred-job-result.test.ts src/lib/jobs/job-read-model.test.ts src/lib/chat/conversation-portability.test.ts tests/deferred-job-repository.test.ts tests/chat/chat-job-actions-route.test.ts
```

---

## Task 3.3 - Make snapshot and SSE transport converge on the same normalized job part

**What:** Stop live job updates from degrading replay fidelity by making the chat stream prefer normalized job parts rather than reconstructing thin job states from ad hoc event fields.

| Item | Detail |
| --- | --- |
| **Modify** | `src/core/entities/chat-stream.ts` |
| **Modify** | `src/lib/jobs/job-event-stream.ts` |
| **Modify** | `src/lib/jobs/job-status-snapshots.ts` |
| **Modify** | `src/lib/chat/StreamStrategy.ts` |
| **Modify** | `src/adapters/chat/EventParserStrategy.ts` |
| **Modify** | `src/hooks/chat/useChatJobEvents.ts` |
| **Modify** | `src/core/services/ConversationMessages.ts` |
| **Create** | `src/adapters/chat/EventParserStrategy.test.ts` |
| **Create** | `src/app/api/chat/events/route.test.ts` |
| **Modify** | `src/lib/jobs/job-event-stream.test.ts` |
| **Modify** | `src/lib/chat/StreamStrategy.test.ts` |
| **Modify** | `src/hooks/chat/useChatJobEvents.test.tsx` |
| **Modify** | `src/app/api/chat/jobs/route.test.ts` |
| **Spec** | §3.7, §3.10, §5 transcript durability tests |

### Task 3.3 outcomes

1. Extend chat job stream events additively so they can carry a normalized `JobStatusMessagePart` or equivalent envelope-first payload alongside the current typed event name. Keep `job_queued`, `job_progress`, `job_completed`, and the other existing event names for compatibility.
2. `jobStatusSnapshotToStreamEvent()` and `mapJobEventPayload()` must emit the same normalized job-part truth that `/api/chat/jobs` returns, so snapshot reconciliation and live SSE updates no longer disagree about the shape of current job state.
3. `EventParserStrategy` and `StreamStrategy` must prefer the normalized part when present and fall back to legacy top-level fields only when older payloads are encountered.
4. `upsertJobStatusMessage()` must stop replacing a richer stored job part with a thinner live update for the same job. Sequence-aware merge semantics or equivalent fidelity-preserving logic is required.
5. `useChatJobEvents()` should remain best-effort and non-blocking, but a focus re-reconcile must no longer be the mechanism that restores envelope fidelity after a live update degraded it.
6. Add the missing `/api/chat/events` route coverage and explicit regressions for phased progress, replay snapshot preservation, and lineage retention through the live stream path.
7. Parser and reducer tests must prove that richer job payloads survive both parsing and dispatch unchanged when a normalized part is present.

### Task 3.3 notes

1. Prefer a part-first transport extension over exploding the typed SSE union with one new top-level field per piece of normalized job metadata.
2. The stream contract should remain cheap enough for active progress ticks, which means normalized running-state parts must still respect the Sprint 0 replay and envelope budgets.
3. Do not let stream transport become a second source of retry policy. The event carries current job state; retry eligibility still comes from the descriptor plus existing job route.
4. Merge rules should prefer higher sequence first and richer payload only as a tie-breaker. They should not be based on whichever path happened to arrive later in the browser.

### Verify Task 3.3

```bash
npx vitest run src/lib/jobs/job-event-stream.test.ts src/adapters/chat/EventParserStrategy.test.ts src/lib/chat/StreamStrategy.test.ts src/hooks/chat/useChatJobEvents.test.tsx src/app/api/chat/jobs/route.test.ts src/app/api/chat/events/route.test.ts
```

---

## Task 3.4 - Align retry affordances and add drift guards for phase fidelity

**What:** Keep whole-job retry behavior policy-correct in chat and add the regressions that fail when phased progress or replay durability drifts back toward the current lossy model.

| Item | Detail |
| --- | --- |
| **Modify** | `src/adapters/ChatPresenter.ts` |
| **Modify** | `src/adapters/ChatPresenter.test.ts` |
| **Modify as needed** | `src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx` |
| **Modify as needed** | `src/frameworks/ui/chat/plugins/system/system-card-family.test.tsx` |
| **Modify as needed** | `tests/plugin-integration.test.tsx` |
| **Modify as needed** | `tests/chat/chat-job-actions-route.test.ts` |
| **Spec** | §3.6, §3.7, §3.10, §5 contract tests |

### Task 3.4 outcomes

1. `buildJobStatusActions()` must stay whole-job only and should prefer descriptor `supportsRetry` policy plus job status over open-coded assumptions about deferred tools.
2. Chat presenter tests must prove that a phased running job keeps its normalized envelope, timeline data, and retry or cancel affordance behavior after repeated live updates.
3. System-card and integration tests must prove that the existing Sprint 2 surfaces render phased timelines, replay snapshots, and lineage from saved envelope data without new fetch behavior.
4. Regression coverage must fail if a live SSE event can still overwrite a richer snapshot-derived job part with a thinner one.
5. Regression coverage must fail if imported conversations or snapshot routes lose `resultEnvelope`, `activePhaseKey`, replay snapshot, failure class, recovery mode, or replay lineage for the same job.
6. Regression coverage must fail if accessibility copy or transcript export drops active phase detail for running phased jobs.

### Task 3.4 notes

1. Sprint 3 is not a new action-manifest sprint. It should tighten the current job action path, not invent a second action framework.
2. `SystemJobCard.tsx` and the shared card primitives already know how to render phases. If Sprint 3 requires broad UI rewrites to display phased progress, the data contract is being implemented in the wrong place.
3. Prefer direct invariant assertions over broad snapshots. The failure mode here is fidelity loss, not markup churn.

### Verify Task 3.4

```bash
npx vitest run src/lib/jobs/job-status.test.ts src/lib/chat/conversation-portability.test.ts src/adapters/ChatPresenter.test.ts src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx src/frameworks/ui/chat/plugins/system/system-card-family.test.tsx tests/plugin-integration.test.tsx tests/chat/chat-job-actions-route.test.ts
```

---

## Sprint 3 Verification Bundle

Before marking Sprint 3 complete, run:

```bash
npx vitest run src/lib/jobs/job-progress-state.test.ts src/lib/jobs/deferred-job-runtime.test.ts tests/deferred-job-worker.test.ts tests/deferred-blog-job-flow.test.ts src/lib/jobs/job-status.test.ts src/lib/jobs/deferred-job-result.test.ts src/lib/jobs/job-read-model.test.ts tests/deferred-job-repository.test.ts src/lib/jobs/job-event-stream.test.ts src/adapters/chat/EventParserStrategy.test.ts src/lib/chat/StreamStrategy.test.ts src/lib/chat/conversation-portability.test.ts src/hooks/chat/useChatJobEvents.test.tsx src/app/api/chat/jobs/route.test.ts src/app/api/chat/events/route.test.ts src/adapters/ChatPresenter.test.ts src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx src/frameworks/ui/chat/plugins/system/system-card-family.test.tsx tests/plugin-integration.test.tsx tests/chat/chat-job-actions-route.test.ts
npm run build
```

And keep markdown diagnostics clean in:

1. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md`
2. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/README.md`
3. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-3-job-phase-model-and-transcript-durability.md`

---

## Completion Checklist

- [ ] one shared phase-normalization seam exists and is reused instead of duplicated across worker, snapshot, and stream code
- [ ] at least one deferred capability emits stable phased progress end to end
- [ ] latest-renderable-event selection is centralized instead of reimplemented in multiple consumers
- [ ] live SSE updates and snapshot reconciliation preserve the same normalized `JobStatusMessagePart` fidelity
- [ ] audit-only events no longer degrade phased progress or replay fidelity
- [ ] imported conversations preserve `resultEnvelope` and replay-safe job metadata
- [ ] accessibility copy and transcript export preserve active phase detail for phased running jobs
- [ ] whole-job retry and cancel affordances stay policy-correct and lineage-aware
- [ ] markdown diagnostics are clean in all touched docs

---

## Sprint 3 Exit Criteria

Sprint 3 is complete only when the repository has one trustworthy answer to all of the following:

1. how a deferred capability declares and emits stable phase progress
2. how the current conversation receives that phase state over both snapshot and SSE paths without fidelity loss
3. how audit-only job events avoid mutating user-facing job history while still preserving the last renderable snapshot
4. how whole-job retry lineage stays visible in transcript playback instead of only in `/jobs`
5. how exported and re-imported conversations retain the same replay-safe job card fidelity as the original transcript

If Sprint 4 still needs to rediscover any of those answers while building the global progress strip, Sprint 3 is not complete.
