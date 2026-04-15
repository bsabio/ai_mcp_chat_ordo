# Sprint 6 — Job Projection And Service Lifetime Clarification

> **Status:** Complete
> **Goal:** Introduce a more authoritative deferred-state publication model and
> make service lifetime ownership explicit enough to stop further composition
> drift.
> **Spec ref:** `UNI-200` through `UNI-249`
> **Prerequisite:** Sprint 5 complete ✅
> **Status note:** All prerequisites (Sprints 0–5) are landed. Sprint 5 shipped
> the capability catalog with `projectJobCapability()` already deriving
> `JobCapabilityDefinition` for 3 pilot capabilities (`draft_content`,
> `publish_content`, `compose_media`). The job-capability-registry now consumes
> catalog projections instead of hardcoded metadata for those entries.

## QA Findings Before Implementation

1. Sprint 5's `CAPABILITY_CATALOG` already contains `job` facets for 3
   capabilities. `JOB_CAPABILITY_REGISTRY` consumes these via
   `projectJobCapability()`. Sprint 6 job-projection work should build on this
   catalog pattern, not create a parallel projection model.
2. Sprint 4 established `emitProviderEvent()` as a structured observability
   contract for provider lifecycle events. Sprint 6 should adopt a similar
   pattern for job lifecycle events rather than inventing a new event shape.
3. The current job-state publication is spread across 5 distinct channels (see
   snapshot below). The core duplication is in how each channel independently
   calls `projectJobForEvent()` and `buildJobStatusPart()` to assemble the
   same `JobStatusMessagePart` shape. The shared projection exists but the
   channel-specific wrappers duplicate the assembly orchestration.
4. `RepositoryFactory.ts` uses 3 distinct lifetime patterns:
   - **Process-cached singletons**: 16 `let`-cached repository instances
     (lines 40–68)
   - **Request-scoped constructors**: `conversation-root.ts` and
     `deferred-job-projector-root.ts` create fresh repos per call
   - **Unmanaged direct `getDb()` calls**: 10+ route handlers bypass
     RepositoryFactory entirely
   Sprint 6 should document these patterns and declare which is canonical,
   not attempt to refactor all 60+ `getDb()` call sites.
5. There are **23 existing job-related test files**. Sprint 6 should extend
   existing test coverage rather than creating parallel test suites. Key files
   include `job-event-stream.test.ts` (9 tests), `job-status.test.ts`,
   `job-read-model.test.ts`, and `job-progress-state.test.ts`.

## Current Job-State Architecture Snapshot

### Publication Channels

| Channel | Route / File | Trigger | Projection Entry Point |
| --- | --- | --- | --- |
| Main-stream promotion | `stream-pipeline.ts:1023` | Tool result during SSE stream | `jobStatusSnapshotToStreamEvent()` |
| Chat events SSE | `/api/chat/events/route.ts` | Client SSE poll per conversation | `createJobEventStreamResponse()` → `mapJobEventPayload()` |
| Job events SSE | `/api/jobs/events/route.ts` | Client SSE poll for all user jobs | `createJobEventStreamResponse()` → `mapJobEventPayload()` |
| Per-job events SSE | `/api/jobs/[jobId]/events/route.ts` | Client SSE poll for one job | `createJobEventStreamResponse()` |
| Conversation projector | `deferred-job-conversation-projector.ts` | Worker writes job parts to message | `buildJobStatusPart()` via `projectJobForEvent()` |

### Shared Conversion Functions

| Function | File | Purpose |
| --- | --- | --- |
| `projectJobForEvent()` | `job-status.ts` | Merges job request + event into `JobStatusProjection` |
| `buildJobStatusPart()` | `job-status.ts` | Converts projection → `JobStatusMessagePart` |
| `buildJobStatusPartFromProjection()` | `job-status.ts` | Direct projection → part (skip event) |
| `buildSyntheticJobEvent()` | `job-read-model.ts` | Creates initial event from job request state |
| `jobStatusPartToStreamEvent()` | `job-status-snapshots.ts` | Wraps part as SSE-ready `StreamEvent` |
| `normalizeJobProgressState()` | `job-progress-state.ts` | Normalizes phased progress for multi-step jobs |

### Service Lifetime Patterns

| Pattern | Example | Scope |
| --- | --- | --- |
| Process-cached singleton | `RepositoryFactory.ts` let-bindings (16 repos) | First-access lazy init, lives until process restart |
| Request-scoped constructor | `conversation-root.ts`, `deferred-job-projector-root.ts` | Fresh per function call |
| Unmanaged direct getDb | Route handlers calling `getDb()` directly (10+ files) | Process-cached DB, but repo constructed inline |

## Why This Sprint Exists

The job UI currently works by converging several channels after the fact, and
the service graph still mixes request scope, process cache, and in-memory state
without one declared ownership policy.

This sprint addresses the architecture seam that remains after prompt,
provider, and capability-catalog contracts are better defined.

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_refactor/unification/sprints/sprint-5-capability-catalog-pilot-and-metadata-derivation.md` | **Complete** — catalog with `projectJobCapability()` for 3 pilot job capabilities |
| `docs/_refactor/unification/artifacts/sprint-5-unresolved-edge-cases.md` | 7 documented manual seams including hardcoded compose_media job route |
| `src/core/capability-catalog/catalog.ts` | Capability catalog with job facets |
| `src/lib/chat/provider-policy.ts` | Sprint 4 — `emitProviderEvent()` pattern for structured lifecycle events |
| `src/lib/jobs/job-status.ts` | Core job projection functions |
| `src/lib/jobs/job-read-model.ts` | Job snapshot and synthetic event builders |
| `src/lib/jobs/job-event-stream.ts` | SSE streaming for job events |
| `src/lib/jobs/job-status-snapshots.ts` | Stream-event conversion for job snapshots |
| `src/lib/jobs/deferred-job-conversation-projector.ts` | Worker-side conversation message writer |
| `src/lib/jobs/job-capability-registry.ts` | Job capability definitions (3 entries now catalog-derived) |
| `src/lib/jobs/job-progress-state.ts` | Phased progress normalization |
| `src/adapters/RepositoryFactory.ts` | 196-line factory with 16 cached singletons |
| `src/lib/chat/conversation-root.ts` | Request-scoped composition root |
| `src/lib/jobs/deferred-job-projector-root.ts` | Request-scoped job projector factory |

## Primary Areas

- `src/lib/jobs/*`
- `/api/chat/stream`, `/api/chat/events`, and `/api/chat/jobs`
- presenter/job snapshot conversion paths
- composition roots and `RepositoryFactory`
- service lifetime docs and tests

## Tasks

1. **Define job projection contract**
   - Establish a shared server-side representation for job-state publication so
     main-stream promotion, event routes, and snapshot routes can derive from a
     common model.
   - Build on Sprint 5's `projectJobCapability()` pattern for metadata; Sprint 6
     adds the runtime state projection.

2. **Refactor deferred-state publication toward the shared projection**
   - Reduce duplicated event-shaping logic across main stream, events route, and
     jobs snapshot route where practical.
   - Target: the 5 channels should converge on one shared orchestration function
     rather than independently calling into `projectJobForEvent()` + wrapper.

3. **Clarify browser rewrite boundaries**
   - Document which browser-side capability rewrites remain intentional and what
     server-side projections they must align with.
   - Reference Sprint 5's edge case log (hardcoded `compose_media` job route).

4. **Declare service lifetime policy**
   - Classify key services and repositories as request-scoped, process-cached,
     or process-memory coordination state by explicit rule.
   - Document the 3 existing patterns and declare which is canonical.
   - Do not attempt to migrate all 60+ `getDb()` callers — document the target
     state and mark direct callers for future migration.

5. **Reduce lifetime ambiguity in composition roots**
   - Move critical runtime seams toward named ownership rather than implicit
     `RepositoryFactory` access where needed.
   - Focus on the job projector and stream pipeline composition — these are the
     highest-risk sites where scope confusion causes bugs.

6. **Add projection and lifetime tests**
   - Verify job projection contracts and composition-root ownership assumptions.
   - Extend existing test files where possible (especially `job-status.test.ts`,
     `job-read-model.test.ts`, `job-event-stream.test.ts`).

## Out of Scope

1. Absorbing the hardcoded `compose_media` check in `/api/chat/jobs/route.ts`
   into generic dispatch. That is documented as Sprint 5 edge case #4.
2. Changing the job queue database schema or introducing new tables.
3. Replacing the SSE polling model with WebSockets or server-sent events push.
4. Introducing a CQRS event store or event-sourcing pattern.
5. Migrating all 60+ `getDb()` direct callers — only documenting the target
   pattern and migrating highest-risk sites.
6. Reopening capability-catalog structure from Sprint 5.

## Required Artifacts

- job-state publication map (channels → projection functions → shared contract)
- service lifetime map (every key service → declared lifetime → rationale)
- documented browser rewrite boundary notes

## Implementation Outputs

- shared job projection service or equivalent contract
- reduced duplication in deferred-state shaping
- explicit service lifetime documentation and tests

## Acceptance Criteria

1. All 5 job-state publication channels produce identical `JobStatusMessagePart`
   shapes through a shared projection function, verified by tests.
2. Service lifetime policy is documented for every composition root and every
   `RepositoryFactory` export, with declared canonicity.
3. Browser rewrite boundaries for `compose_media` are documented with explicit
   alignment requirements against server-side projections.
4. Existing job tests remain green after projection unification.
5. At least one composition root is refactored from implicit `RepositoryFactory`
   access to explicit named ownership.

## Verification

- job-projection seam tests verifying all channels produce identical shapes
- service lifetime contract tests or assertions
- `src/lib/chat/registry-sync.test.ts` remains green (6 tests)
- `src/core/capability-catalog/catalog.test.ts` remains green (27 tests)
- `src/lib/chat/provider-policy.test.ts` remains green (43 tests)
- diagnostics-clean changed files

## QA Closeout

### Acceptance Criteria Results

| # | Criterion | Result |
| --- | --- | --- |
| 1 | All 5 channels produce identical shapes through shared projection | ✅ `buildJobPublication()` is the single entry-point; channel equivalence verified by test |
| 2 | Service lifetime documented for every composition root and RepositoryFactory export | ✅ `@lifetime` JSDoc on all 19 exports, lifetime policy block added to factory comment |
| 3 | Browser rewrite boundaries documented with alignment requirements | ✅ `sprint-6-browser-rewrite-boundaries.md` with compose_media alignment matrix |
| 4 | Existing job tests remain green | ✅ 9 existing tests pass (3 job-status + 2 job-read-model + 4 job-event-stream) |
| 5 | At least one composition root refactored from implicit RepositoryFactory access | ✅ `deferred-job-projector-root.ts` now uses `getConversationDataMapper()`/`getMessageDataMapper()` |

### Test Summary

| Test File | Tests | Status |
| --- | --- | --- |
| `src/lib/jobs/job-publication.test.ts` | 9 | ✅ NEW |
| `src/lib/jobs/job-status.test.ts` | 3 | ✅ pass |
| `src/lib/jobs/job-read-model.test.ts` | 2 | ✅ pass |
| `src/lib/jobs/job-event-stream.test.ts` | 4 | ✅ pass |
| `src/core/capability-catalog/catalog.test.ts` | 27 | ✅ pass |
| `src/lib/chat/registry-sync.test.ts` | 6 | ✅ pass |
| `src/lib/chat/provider-policy.test.ts` | 43 | ✅ pass |
| **Total** | **94** | **✅ all green** |

### Files Changed

| File | Change |
| --- | --- |
| `src/lib/jobs/job-publication.ts` | NEW — unified publication contract with `buildJobPublication()` |
| `src/lib/jobs/job-publication.test.ts` | NEW — 9 publication contract tests |
| `src/lib/jobs/job-read-model.ts` | MODIFIED — delegates to `buildJobPublication()` |
| `src/lib/jobs/job-event-stream.ts` | MODIFIED — delegates to `buildJobPublication()` |
| `src/lib/jobs/deferred-job-conversation-projector.ts` | MODIFIED — delegates to `buildJobPublication()` |
| `src/lib/jobs/deferred-job-projector-root.ts` | MODIFIED — uses RepositoryFactory instead of direct getDb() |
| `src/adapters/RepositoryFactory.ts` | MODIFIED — lifetime policy docs + @lifetime JSDoc on all exports |

### Artifacts

| Artifact | File |
| --- | --- |
| Service lifetime map | `sprint-6-service-lifetime-map.md` |
| Browser rewrite boundaries | `sprint-6-browser-rewrite-boundaries.md` |
| Job publication map | `sprint-6-job-publication-map.md` |
