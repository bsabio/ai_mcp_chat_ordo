# Strategic Remediation Plan

Status: Phases 0–6 complete. Phase 7 deferred pending production measurement.
Date: 2026-04-09
Scope: Convert the audit findings and the `agent-runtime-hardening` program into one execution plan grounded in the current OrdoSite codebase.

---

## 1. Purpose

This document replaces the prior high-level audit memo with an implementation program.

The goal is not to import patterns mechanically. The goal is to improve the current system in the correct order, using the seams already present in the repository, while avoiding duplicate abstractions and speculative infrastructure work.

This plan uses three principles:

- Uncle Bob: harden boundaries first and keep business rules isolated from transport, provider, and UI concerns.
- Knuth: make runtime assembly deterministic, keep memory bounded, and optimize only where measurement or asymptotic risk justifies it.
- GoF: use patterns only where there is a real seam with multiple consumers. Prefer explicit, simple structures over clever frameworks.

---

## 2. Repository Reality Check

The repository is not starting from zero. Several items proposed in the audit or hardening specs already exist in partial form and should be extended rather than replaced.

Already present:

- SQLite WAL and busy timeout are already configured in `src/lib/db/index.ts`.
- Startup locking and single-instance protections already exist in `src/lib/db/startup-check.ts`.
- Tool middleware already exists in `src/core/tool-registry/ToolMiddleware.ts`.
- RBAC enforcement already exists in `src/core/tool-registry/RbacGuardMiddleware.ts`.
- Turn-level and meta-level summarization already exist in `src/core/use-cases/SummarizationInteractor.ts`.
- Context-window trimming already exists in `src/lib/chat/context-window.ts`, and the most recent summary is already injected through `SystemPromptBuilder.withConversationSummary(...)` rather than being inserted into `contextMessages`.
- A command registry already exists in `src/core/commands/CommandRegistry.ts`, but it is client-facing rather than chat-runtime-facing.
- Tool manifest sorting already exists in `src/lib/chat/runtime-manifest.ts`, but the live chat request path bypasses it.

Still missing or incomplete:

- A true hook pipeline for cross-cutting runtime concerns.
- Deterministic tool manifest ordering on the actual LLM request path.
- Server-side slash command interception before model execution.
- A transcript store separated from the context window.
- Warn and block states for context exhaustion over the existing trimmed context-window contract.
- Structured permission denial logging.
- A layered tool policy pipeline.
- An extension-agnostic tool composition root.
- Background current-page capture instead of synchronous send-time DOM cloning.
- Decomposition of `useGlobalChat` into smaller runtime concerns.

---

## 3. Execution Rules

These rules are mandatory for autonomous implementation.

1. Work in phase order. Do not start later phases before the prerequisites are complete.
2. Keep the repository green after each phase: `npm run test`, `npm run lint`, and `npm run build`.
3. Extend existing seams where they are valid. Do not create parallel implementations of middleware, command dispatch, summarization, or transcript logic.
4. Do not rewrite working subsystems unless the current shape blocks the next phase.
5. Document deviations from the hardening specs if implementation reality requires an adaptation.
6. Do not make infrastructure moves, such as database topology changes or provider circuit breakers, without production evidence that the current approach is insufficient.

---

## 4. Verification Strategy and Hard Test Requirements

This program must be driven by tests that are already close to the behavior being refactored. The goal is to extend the current suite first, then add new test modules only where the repository does not yet expose a meaningful harness.

### Verification rules

1. Every phase must ship positive, negative, and edge-case coverage for the seams it changes.
2. Every refactor-heavy phase must preserve existing behavior with before-and-after behavior tests, not just new unit tests for the replacement structure.
3. Structural refactors must also ship architecture guardrails so coupling does not quietly regress after the initial cleanup.
4. During implementation, run focused tests for the touched seam first. At phase completion, the full repository must pass `npm run test`, `npm run lint`, and `npm run build`.
5. Prefer extending an existing suite over creating a new one unless the new seam is materially different from any current test harness.

### Existing suite anchors to leverage

- Route and runtime orchestration: `tests/chat/chat-stream-route.test.ts` and `tests/stream-pipeline.test.ts` should be the primary harnesses for request validation, cancellation, idempotency, slash-command interception, hook sequencing, and stream lifecycle behavior.
- Prompt assembly and manifest determinism: `tests/system-prompt-assembly.test.ts`, `tests/system-prompt.test.ts`, and `tests/system-prompt-builder.test.ts` should own deterministic ordering, manifest stability, and prompt-prefix regression coverage.
- Context window and compaction: `src/lib/chat/context-window.test.ts` and `src/core/use-cases/SummarizationInteractor.test.ts` should be extended for warn thresholds, block thresholds, compaction markers, summary replay, and concurrent summarization suppression.
- Client runtime preservation: `src/hooks/useGlobalChat.test.tsx` plus the existing stream-runtime hook tests under `src/hooks/chat/` should preserve bootstrap, restore, retry, deferred-job, and navigation continuity behavior while client state is decomposed.
- Structural guardrails: `tests/architecture-cohesion-audit.test.ts` and `tests/solid-architecture-audit.test.ts` should enforce that the refactor actually moves dependencies and responsibilities in the intended direction.
- New seams that will likely need dedicated tests: hook runner behavior, transcript-store durability, tool policy precedence, and server-side slash command dispatch.

### Hard requirements by phase

#### Phase 0

- Positive: identical inputs produce identical tool-manifest order and prompt-prefix output across repeated runs.
- Negative: unsorted or duplicate manifest output fails determinism tests immediately.
- Edge: different registration order, repeated registry construction, and repeated prompt assembly still yield byte-stable ordering where intended.

#### Phase 1

- Positive: a valid stream request starts once, persists once, and cleans up once.
- Negative: invalid request bodies are rejected at the route boundary, and duplicate or overlapping stream starts do not create a second assistant turn.
- Edge: abort before provider start, abort during tool execution, and retry after partial stream output all leave the runtime in a consistent state.

#### Phase 2

- Positive: hooks fire in the documented order for inbound claims, request assembly, tool execution, and completion.
- Negative: a failing hook does not bypass RBAC, skip cleanup, or corrupt downstream runtime state.
- Edge: multiple hooks on one stage, no-op hooks, and short-circuit hooks all behave deterministically.

#### Phase 3

- Positive: transcript fidelity is preserved while summaries and meta-summaries remain replayable.
- Negative: silent context degradation is forbidden once warn and block thresholds are introduced.
- Edge: zero-message windows, exact threshold boundaries, one-over-threshold inputs, repeated compaction, and concurrent summarize requests all behave predictably.

#### Phase 4

- Positive: supported slash commands short-circuit without invoking the model, and filtered tool manifests still include tools required for the routed task.
- Negative: unsupported slash commands and denied tool use are handled predictably and logged structurally.
- Edge: ambiguous routing, empty command payloads, and repeated denials within one turn are covered.

#### Phase 5

- Positive: bundle descriptors register stable bundle IDs and policy precedence resolves correctly.
- Negative: unknown bundle targets, invalid policy targets, and forbidden bundle access fail safely.
- Edge: overlapping policy layers, deny-overrides-allow behavior, and multi-agent subset composition are covered.

#### Phase 6

- Positive: current-page context remains available without synchronous send-time DOM cloning, and chat behavior is preserved after provider decomposition.
- Negative: sending does not lose selection or snapshot state, and internal navigation does not tear down chat continuity where continuity is required.
- Edge: rapid route change during send, null snapshots, portal absence, and shadow-content absence are handled without crashes or stale context leakage.

### Definition of done for test coverage

A phase is not complete until:

- the affected behavior is covered by positive, negative, and edge tests,
- the pre-existing behavior harnesses still pass,
- any new abstraction introduced by the refactor has direct unit coverage,
- architecture tests enforce the intended dependency movement when the phase changes structural boundaries.

---

## 5. Strategic Position

The hardening package is the correct backbone, but it needs one adjustment for this repository: the plan must start from the actual foundation gaps, not from an assumed blank slate.

The correct order is:

1. Freeze behavior and add guardrails.
2. Harden request boundaries and make request assembly deterministic.
3. Introduce the lifecycle hook spine.
4. Rework session memory around transcript durability and bounded context.
5. Add the control surface: slash commands, tool prefiltering, denial logging.
6. Make tool composition and policy explicit.
7. Refactor client-side runtime state and current-page capture.
8. Defer scale-only infrastructure changes until measurement demands them.

---

## 6. Phased Implementation Program

### Phase 0: Safety Harness and Invariants

Objective: lock down current behavior before structural change.

Work:

- Add golden-path tests for tool manifest determinism and prompt prefix stability.
- Add regression tests for stream cancellation, duplicate stream-start attempts, transcript export fidelity, and active-stream cleanup.
- Add architecture tests for the future shape of hooks, transcript storage, and composition boundaries where practical.

Primary targets:

- `src/app/api/chat/stream/route.ts`
- `src/lib/chat/stream-pipeline.ts`
- `src/core/tool-registry/ToolRegistry.ts`
- `src/lib/chat/runtime-manifest.ts`
- relevant tests under `tests/` and `src/**/__tests__`

Exit criteria:

- There is a stable test harness for deterministic prompt assembly, abort cleanup, and transcript correctness.
- The repository is green before architecture changes begin.

Related specs:

- Prerequisite for all specs.

### Phase 1: Boundary Hardening and Deterministic Assembly

Objective: make the request path safe, deterministic, and retry-aware.

Work:

- Enforce strict schema validation on mutable chat and runtime entry points.
- Thread `request.signal` and internal abort signals through the stream path so hanging model or tool work can be terminated cleanly.
- Add idempotency or duplicate-request protection for stream starts and overlapping retries.
- Move tool manifest ordering into the live source of truth so `ToolRegistry.getSchemasForRole()` returns deterministic output.
- Add stable prompt assembly tests to ensure future block additions do not silently break cacheability.

Primary targets:

- `src/app/api/chat/stream/route.ts`
- `src/lib/chat/stream-pipeline.ts`
- `src/core/tool-registry/ToolRegistry.ts`
- `src/lib/chat/http-facade.ts`
- request schema modules under `src/lib/chat/` or `src/core/`

Exit criteria:

- Live tool manifests are deterministic.
- Duplicate stream-start attempts do not create overlapping assistant turns.
- Request cancellation reaches provider and runtime cleanup paths.
- Request validation is enforced at the route perimeter.

Related specs:

- Spec 02 is completed here.
- This phase also covers the audit items about weak route boundaries and hanging stream cleanup.

### Phase 2: Hook Pipeline Foundation

Objective: create the load-bearing lifecycle surface required by the remaining hardening work.

Work:

- Evolve the current middleware model into a true hook pipeline with explicit runtime stages.
- Introduce hook contexts for inbound claim, request assembly, tool execution, and turn completion.
- Migrate logging and RBAC from special middleware cases to first-class pipeline participants or compatible adapters.
- Make hook registration explicit and testable.

Primary targets:

- `src/core/tool-registry/ToolMiddleware.ts`
- `src/core/tool-registry/LoggingMiddleware.ts`
- `src/core/tool-registry/RbacGuardMiddleware.ts`
- `src/lib/chat/tool-composition-root.ts`
- runtime orchestration files under `src/lib/chat/`

Exit criteria:

- Cross-cutting concerns can attach without editing the stream route directly.
- Tool execution, runtime claims, and post-turn behavior have explicit extension points.
- The old middleware chain is either subsumed or reduced to thin adapters.

Related specs:

- Spec 01.
- This phase is a hard dependency for specs 04, 08, and most observability work.

### Phase 3: Session Memory Substrate

Objective: unify summarization, transcript durability, and bounded context into one coherent model.

Work:

- Extend `SummarizationInteractor` instead of replacing it.
- Introduce explicit compaction markers and a transcript store that preserves full fidelity independently of the context window.
- Preserve the existing summary and meta-summary semantics while adding durable event boundaries and replay support.
- Add warn and block thresholds to context-window management so degradation is visible instead of silent.

Primary targets:

- `src/core/use-cases/SummarizationInteractor.ts`
- `src/lib/chat/context-window.ts`
- transcript or portability modules under `src/lib/chat/`
- conversation persistence interfaces and data mappers

Exit criteria:

- Transcript fidelity no longer depends on the active prompt window.
- Compaction is explicit and replayable.
- The system can warn before hard context exhaustion and block when the limit is truly unsafe.

Related specs:

- Spec 03
- Spec 06
- Spec 07

### Phase 4: Control Surface and Capability Routing

Objective: give the runtime safe operator controls and reduce unnecessary model/tool load.

Work:

- Add server-side slash command interception before the LLM call path.
- Extend the existing command model instead of introducing a second unrelated registry.
- Implement heuristic tool prefiltering using existing routing signals where possible.
- Capture permission denials as structured turn data rather than exceptions alone.

Initial slash commands:

- `/clear`
- `/compact`
- `/export`
- `/status`

Primary targets:

- `src/core/commands/CommandRegistry.ts`
- `src/app/api/chat/stream/route.ts`
- `src/lib/chat/stream-pipeline.ts`
- `src/lib/chat/tool-composition-root.ts`
- routing and policy helpers under `src/core/entities/` and `src/lib/chat/`

Exit criteria:

- Slash commands can short-circuit the runtime without model invocation.
- Tool manifests are reduced when a narrower set of tools is clearly sufficient.
- Permission denials are queryable as structured data for auditing and curriculum insight.

Related specs:

- Spec 04
- Spec 05
- Spec 08

### Phase 5: Composition Root and Policy Pipeline

Objective: make tool composition explicit, stable, and ready for multi-agent growth.

Work:

- Replace hardcoded tool-bundle registration with explicit bundle descriptors and stable bundle identifiers.
- Build a layered policy cascade over those bundle IDs.
- Keep the first version explicit and static. Do not add reflection or magical auto-discovery until stable bundle contracts exist.

Recommended policy order:

- global
- role
- agent
- provider
- request

Primary targets:

- `src/lib/chat/tool-composition-root.ts`
- `src/lib/chat/tool-bundles/*`
- `src/core/tool-registry/ToolRegistry.ts`
- new policy modules under `src/core/tool-registry/` or `src/lib/chat/`

Exit criteria:

- New tool bundles can be added without editing core composition logic.
- Policies are expressed declaratively against stable bundle IDs.
- The runtime is ready for multiple named agent profiles without ad hoc branching.

Related specs:

- Spec 10 should lead this phase slightly because Spec 09 depends on stable bundle identity.
- Spec 09 completes on top of that foundation.

### Phase 6: Client Runtime Cleanup

Objective: remove the heaviest client-side architectural liabilities after the server/runtime contract is stable.

Work:

- Replace synchronous send-time DOM cloning with a background current-page memento or observer model.
- Decompose `useGlobalChat` into smaller state, actions, session, and event concerns.
- Remove any remaining hard-navigation behaviors that unnecessarily tear down transient chat state.

Primary targets:

- `src/lib/chat/collect-current-page-snapshot.ts`
- `src/hooks/useGlobalChat.tsx`
- related chat hooks under `src/hooks/chat/`
- shell and navigation components under `src/components/` and `src/frameworks/ui/`

Exit criteria:

- Sending a message does not synchronously clone the page DOM.
- Global chat state is no longer concentrated in one oversized provider.
- Navigation preserves chat continuity where the product requires it.

Related specs:

- This phase uses the runtime surfaces created earlier rather than inventing client-side workarounds.
- It also resolves the highest-value audit items around page capture and state concentration.

### Phase 7: Measured Scale Decisions

Objective: address scaling risks only where evidence justifies the complexity.

Work:

- Batch administrative or job queries only where measured N+1 patterns exist.
- Add provider circuit-breaker behavior only if telemetry shows real starvation or cascading failure risk.
- Revisit SQLite topology only if lock contention, concurrency, or deployment constraints prove the current configuration insufficient.

Primary targets:

- admin services under `src/lib/` and `src/core/`
- provider adapters under `src/adapters/`
- database/runtime infrastructure under `src/lib/db/`

Exit criteria:

- Infrastructure changes are backed by measured need rather than speculation.
- Complexity is only added where it buys a real operational outcome.

Related specs:

- This phase is intentionally deferred.

---

## 7. Sprint-by-Sprint Execution Checklist

This section converts each phase into sprint-sized implementation units. Each sprint names the primary code files, the tests to extend or add, and the acceptance criteria required to close the sprint.

### Phase 0 Sprints

#### Sprint 0.1: Deterministic Manifest and Prompt Baseline

Goal: freeze model-visible ordering and prompt-prefix stability before refactoring.

Code files:

- `src/core/tool-registry/ToolRegistry.ts`
- `src/lib/chat/runtime-manifest.ts`
- `src/lib/chat/tool-composition-root.ts`
- `src/lib/chat/policy.ts`

Tests to extend:

- `tests/system-prompt-assembly.test.ts`
- `tests/system-prompt.test.ts`
- `tests/system-prompt-builder.test.ts`
- `src/lib/chat/tool-composition-root.test.ts`

Acceptance criteria:

- identical registry inputs produce identical tool-manifest ordering across repeated runs,
- prompt-prefix tests fail if tool order or section order drifts,
- model-visible manifests remain free of removed tools such as `navigate`,
- role-specific tool counts and tool sets remain stable unless explicitly changed by the sprint.

#### Sprint 0.2: Stream Lifecycle Invariant Harness

Goal: lock down the current stream path before changing cancellation, idempotency, or hooks.

Code files:

- `src/app/api/chat/stream/route.ts`
- `src/lib/chat/stream-pipeline.ts`
- `src/lib/chat/active-stream-registry.ts`

Tests to extend:

- `tests/chat/chat-stream-route.test.ts`
- `tests/stream-pipeline.test.ts`
- `src/lib/chat/active-stream-registry.test.ts`

Acceptance criteria:

- the route harness proves one valid request yields one active stream lifecycle,
- duplicate-start and cleanup expectations are codified before behavior changes,
- stream registry cleanup is verified on completion, failure, and interruption paths,
- focused stream and route suites pass before Phase 1 code changes begin.

### Phase 1 Sprints

#### Sprint 1.1: Route Validation and Duplicate-Request Protection

Goal: harden request boundaries and prevent overlapping stream starts.

Code files:

- `src/app/api/chat/stream/route.ts`
- `src/lib/chat/stream-pipeline.ts`
- `src/lib/chat/http-facade.ts`
- `src/lib/chat/active-stream-registry.ts`

Tests to extend:

- `tests/chat/chat-stream-route.test.ts`
- `tests/stream-pipeline.test.ts`

Tests to add:

- `src/lib/chat/stream-request-guards.test.ts` if validation logic is extracted into its own module

Acceptance criteria:

- malformed bodies are rejected at the route boundary with stable error semantics,
- overlapping stream-start attempts do not persist a second assistant turn,
- duplicate requests are either deduped or explicitly rejected in a deterministic way,
- no valid existing route behavior regresses in the route or pipeline suites.

#### Sprint 1.2: Abort Propagation and Cleanup

Goal: make cancellation a real end-to-end contract.

Code files:

- `src/app/api/chat/stream/route.ts`
- `src/lib/chat/stream-pipeline.ts`
- `src/lib/chat/anthropic-stream.ts`
- `src/lib/chat/active-stream-registry.ts`

Tests to extend:

- `tests/chat/chat-stream-route.test.ts`
- `tests/chat/anthropic-stream.test.ts`
- `tests/stream-pipeline.test.ts`

Acceptance criteria:

- abort before provider start leaves no leaked active stream,
- abort during provider execution performs cleanup and preserves consistent persistence semantics,
- retry after a canceled or interrupted stream does not create corrupted assistant lifecycle state,
- the abort path is covered by positive, negative, and edge-case tests.

### Phase 2 Sprints

#### Sprint 2.1: Hook Runner Introduction

Goal: replace the single-purpose middleware shape with a general lifecycle runner.

Code files:

- `src/core/tool-registry/ToolMiddleware.ts`
- `src/lib/chat/stream-pipeline.ts`
- `src/lib/chat/tool-composition-root.ts`

Tests to extend:

- `tests/stream-pipeline.test.ts`

Tests to add:

- `src/core/tool-registry/HookPipeline.test.ts`

Acceptance criteria:

- hooks can be registered for at least inbound claim, tool execution, and completion stages,
- hook order is deterministic and test-covered,
- no-op hooks and short-circuit hooks behave predictably,
- runtime orchestration remains green with the new lifecycle surface present.

#### Sprint 2.2: Logging and RBAC Migration onto the Hook Surface

Goal: move existing cross-cutting behavior onto the new lifecycle contract without changing user-visible behavior.

Code files:

- `src/core/tool-registry/LoggingMiddleware.ts`
- `src/core/tool-registry/RbacGuardMiddleware.ts`
- `src/core/tool-registry/ToolRegistry.ts`
- `src/lib/chat/tool-composition-root.ts`

Tests to extend:

- `tests/chat/chat-stream-route.test.ts`
- `tests/stream-pipeline.test.ts`

Tests to add:

- `src/core/tool-registry/RbacHookAdapter.test.ts`

Acceptance criteria:

- RBAC still blocks forbidden tool access,
- logging and failure paths still emit the expected runtime behavior,
- a failing hook cannot bypass cleanup or authorization,
- the old middleware chain is reduced to adapters or removed without loss of coverage.

### Phase 3 Sprints

#### Sprint 3.1: Context Guard Thresholds

Goal: make context exhaustion visible and testable before transcript-store work lands.

Code files:

- `src/lib/chat/context-window.ts`
- `src/lib/chat/chat-config.ts`
- `src/lib/chat/stream-pipeline.ts`

Tests to extend:

- `src/lib/chat/context-window.test.ts`
- `tests/stream-pipeline.test.ts`

Acceptance criteria:

- warn and block thresholds are explicit rather than implicit,
- exact-threshold and one-over-threshold scenarios are covered,
- the current summary contract is preserved: `summaryText` continues through the prompt builder and is not re-inserted as a synthetic chat turn,
- the runtime never silently degrades once the guard is introduced,
- summary-aware context windows preserve current summary semantics.

#### Sprint 3.2: Transcript Durability and Compaction Markers

Goal: preserve full-fidelity transcript history while extending existing summarization behavior.

Current implementation note:

- Land this sprint first by deriving a `TranscriptStore` view from persisted conversation messages and by attaching explicit `compaction_marker` parts to `summary` and `meta_summary` messages. This preserves replayable compaction boundaries without requiring a separate transcript table in the initial implementation.

Code files:

- `src/core/use-cases/SummarizationInteractor.ts`
- `src/lib/chat/conversation-portability.ts`
- conversation persistence modules under `src/adapters/` and `src/core/use-cases/`

Tests to extend:

- `src/core/use-cases/SummarizationInteractor.test.ts`

Tests to add:

- `src/lib/chat/transcript-store.test.ts`
- `tests/chat/conversation-portability.test.ts`

Acceptance criteria:

- summaries and meta-summaries remain replayable and traceable to covered ranges,
- transcript export fidelity is preserved independently of prompt-window trimming,
- repeated compaction does not destroy or duplicate transcript history,
- concurrent summarize requests remain safely suppressed.

### Phase 4 Sprints

#### Sprint 4.1: Server-Side Slash Command Dispatch

Goal: allow command interception before model invocation.

Code files:

- `src/core/commands/CommandRegistry.ts`
- `src/lib/chat/stream-pipeline.ts`
- `src/app/api/chat/stream/route.ts`
- `src/lib/chat/policy.ts`

Tests to extend:

- `tests/chat/chat-stream-route.test.ts`
- `tests/stream-pipeline.test.ts`
- `tests/shell-command-parity.test.ts`

Tests to add:

- `src/core/commands/CommandRegistry.test.ts`
- `tests/chat/chat-slash-commands.test.ts`

Acceptance criteria:

- supported slash commands short-circuit before model execution,
- unsupported commands fail predictably,
- command ids remain aligned across shell and chat command surfaces where shared semantics exist,
- slash-command behavior is covered by positive, negative, and edge tests.

#### Sprint 4.2: Tool Prefiltering and Permission Denial Logging

Goal: reduce tool payload size and make access denials observable.

Code files:

- `src/lib/chat/tool-composition-root.ts`
- `src/core/entities/conversation-routing.ts`
- `src/core/tool-registry/ToolRegistry.ts`
- `src/core/tool-registry/errors.ts`

Tests to extend:

- `tests/chat/chat-stream-route.test.ts`
- `tests/system-prompt-assembly.test.ts`
- `src/lib/chat/tool-composition-root.test.ts`

Tests to add:

- `src/lib/chat/tool-prefilter.test.ts`
- `src/core/tool-registry/permission-denial-log.test.ts`

Acceptance criteria:

- routed requests can receive a reduced tool manifest without losing required capabilities,
- denied tool attempts are captured as structured runtime data,
- repeated denials within one turn are handled consistently,
- manifest reduction does not break prompt assembly or role-based tool guarantees.

### Phase 5 Sprints

#### Sprint 5.1: Bundle Descriptors and Stable Bundle Identity

Goal: make composition explicit before layering policies on top.

Code files:

- `src/lib/chat/tool-composition-root.ts`
- `src/lib/chat/tool-bundles/calculator-tools.ts`
- `src/lib/chat/tool-bundles/theme-tools.ts`
- `src/lib/chat/tool-bundles/corpus-tools.ts`
- `src/lib/chat/tool-bundles/conversation-tools.ts`
- `src/lib/chat/tool-bundles/admin-tools.ts`
- `src/lib/chat/tool-bundles/blog-tools.ts`
- `src/lib/chat/tool-bundles/profile-tools.ts`
- `src/lib/chat/tool-bundles/job-tools.ts`
- `src/lib/chat/tool-bundles/navigation-tools.ts`
- `src/lib/chat/tool-bundles/affiliate-tools.ts`

Tests to extend:

- `src/lib/chat/tool-composition-root.test.ts`
- `tests/system-prompt-assembly.test.ts`

Tests to add:

- `src/lib/chat/tool-bundle-descriptor.test.ts`

Acceptance criteria:

- each bundle exposes a stable identity that can be referenced by policy,
- tool composition no longer depends on an opaque hardcoded registration sequence,
- manifest and role tests still pass after bundle identity is introduced,
- adding a new bundle requires descriptor registration rather than ad hoc core surgery.

#### Sprint 5.2: Policy Cascade

Goal: enforce layered allow and deny rules over stable bundle identities.

Code files:

- `src/core/tool-registry/ToolRegistry.ts`
- `src/lib/chat/tool-composition-root.ts`
- new policy modules under `src/core/tool-registry/` or `src/lib/chat/`

Tests to extend:

- `src/lib/chat/tool-composition-root.test.ts`
- `tests/chat/chat-stream-route.test.ts`

Tests to add:

- `src/core/tool-registry/tool-policy-pipeline.test.ts`

Acceptance criteria:

- policy precedence is deterministic and documented,
- deny rules override allow rules in covered cases,
- unknown or invalid bundle targets fail safely,
- multi-agent or multi-profile composition can be expressed without branching inside the stream route.

### Phase 6 Sprints

#### Sprint 6.1: Background Current-Page Snapshot Pipeline

Goal: remove synchronous send-time DOM cloning while preserving useful page context.

Code files:

- `src/lib/chat/collect-current-page-snapshot.ts`
- `src/lib/chat/current-page-context.ts`
- `src/hooks/chat/useChatSend.ts`
- client orchestration modules under `src/hooks/chat/`

Tests to extend:

- `src/lib/chat/collect-current-page-snapshot.test.ts`
- `src/hooks/chat/useChatSend.test.tsx`
- `src/hooks/chat/useChatStreamRuntime.test.tsx`

Acceptance criteria:

- sending no longer performs synchronous full-content DOM cloning at the send boundary,
- null snapshots, missing portals, and absent shadow content do not crash the send path,
- useful page context remains available to the runtime,
- route changes during send do not leak stale snapshots into later turns.

#### Sprint 6.2: `useGlobalChat` Decomposition

Goal: split the current provider into smaller concerns while preserving behavior.

Code files:

- `src/hooks/useGlobalChat.tsx`
- `src/hooks/chat/useChatConversationSession.ts`
- `src/hooks/chat/useChatSend.ts`
- `src/hooks/chat/useChatJobEvents.ts`
- `src/hooks/chat/chatState.ts`

Tests to extend:

- `src/hooks/useGlobalChat.test.tsx`
- `src/hooks/chat/useChatSend.test.tsx`
- `src/hooks/chat/useChatJobEvents.test.tsx`
- `src/hooks/chat/chatBootstrap.test.ts`
- `src/hooks/chat/chatConversationApi.test.ts`

Acceptance criteria:

- bootstrap, restore, retry, deferred-job, and routing-snapshot behaviors are preserved,
- no user-visible chat behavior regresses as provider responsibilities are split,
- navigation continuity remains intact where the product depends on it,
- architecture tests can assert that state orchestration is no longer concentrated in one oversized provider.

### Phase 7 Sprint

#### Sprint 7.1: Measured Operational Hardening

Goal: make scale-oriented changes only after measurement.

Code files:

- `src/lib/db/index.ts`
- `src/lib/db/startup-check.ts`
- provider adapters under `src/adapters/`
- measured hot paths under `src/lib/` and `src/core/`

Tests to extend:

- existing seam-specific suites for the hot path being changed

Tests to add:

- only when a new operational seam is introduced by measured remediation work

Acceptance criteria:

- the change is justified by observed contention, latency, or failure data,
- the operational risk being addressed is described in the implementation notes,
- no scale-oriented complexity lands without a corresponding measurement story.

---

## 8. What Not To Do

The following are explicitly out of scope for the first implementation wave:

- Do not rewrite summarization from scratch. Extend the existing interactor.
- Do not create a second command system when the existing registry can be evolved.
- Do not implement auto-discovery magic before bundle descriptors and stable bundle IDs exist.
- Do not migrate away from SQLite before production evidence shows the current configuration is failing.
- Do not add a provider circuit breaker before request cancellation, idempotency, and lifecycle cleanup are working.

---

## 9. Immediate Implementation Backlog

If implementation starts now, the first work package should be:

1. Extend `tests/system-prompt-assembly.test.ts`, `tests/system-prompt.test.ts`, and `tests/system-prompt-builder.test.ts` so manifest ordering and prompt-prefix stability are hard requirements before refactoring.
2. Extend `tests/chat/chat-stream-route.test.ts` and `tests/stream-pipeline.test.ts` for duplicate-request protection, request validation, and abort propagation scenarios.
3. Add deterministic manifest ordering to `ToolRegistry.getSchemasForRole()` and keep the route path covered by the prompt and stream suites.
4. Thread abort signals from the route to provider, stream cleanup, and tool execution, with positive, negative, and edge coverage in the route and pipeline suites.
5. Introduce the first version of the hook runner and add direct unit tests for hook order, short-circuit behavior, and failure isolation before migrating logging and RBAC.

This package is the minimum viable foundation for the remaining hardening work.

---

## 10. Crosswalk

This audit plan and the `agent-runtime-hardening` program are now aligned as follows:

- Phase 0: pre-spec safety harness.
- Phase 1: Spec 02 plus route-boundary hardening.
- Phase 2: Spec 01.
- Phase 3: Specs 03, 06, and 07.
- Phase 4: Specs 04, 05, and 08.
- Phase 5: Specs 10 then 09.
- Phase 6: client-side audit remediation built on the stabilized runtime.
- Phase 7: measured infrastructure and scaling work only.

This order is the recommended path for autonomous execution.
