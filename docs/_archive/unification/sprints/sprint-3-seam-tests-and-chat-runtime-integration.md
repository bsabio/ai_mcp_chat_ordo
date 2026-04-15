# Sprint 3 — Seam Tests And Chat Runtime Integration

> **Status:** Complete
> **Goal:** Add reduced-mock seam tests around chat stream, prompt runtime,
> and live runtime composition so later provider-policy refactors operate
> against trustworthy feedback instead of builder-local or route-local mocks.
> **Spec ref:** `UNI-280` through `UNI-319`
> **Prerequisite:** Sprint 2 complete

## QA Findings Before Implementation

1. Sprint 1 already closed prompt mutation equivalence, shared prompt role
   inventory, and fallback-aware control-plane read parity through
   `PromptControlPlaneService` plus dedicated tests. Sprint 3 must treat that
   work as a prerequisite regression bundle, not restate it as new scope.
2. Sprint 2 has already landed the real prompt-runtime seam in code:
   `src/lib/chat/prompt-runtime.ts`, compatibility delegation in
   `src/lib/chat/policy.ts`, and adoption in stream, direct-turn, and live
   eval. The remaining gap is no longer "create PromptRuntime"; it is
   "prove the real route and runtime seams consume it correctly with fewer
   mocks."
3. `inspect_runtime_context` now exposes `promptRuntime` when
   `includePrompt: true`, and `ToolExecutionContext.promptRuntime` is threaded
   through stream, direct-turn, and live-eval tool execution paths. This is
   now the least invasive governed diagnostics seam for prompt-provenance
   integration assertions.
4. The main stream path still has one critical final-prompt boundary that
   earlier tests did not cover well enough: `ChatStreamPipeline` can return a
   builder result, but the route rebuilds the final prompt after route-level
   tool selection so the post-tool-selection tool manifest is reflected in the
   actual system prompt. Sprint 3 must assert this final route-level prompt
   truth, not only pipeline-level builder output.
5. Current stream-route and pipeline tests still mock
   `createSystemPromptBuilder` and most runtime collaborators. They are useful
   for branch coverage and route decomposition, but they do not yet provide a
   reduced-mock safety net for real prompt runtime, diagnostics, and provider
   request-shape composition.
6. The strongest post-Sprint 2 coverage now lives in focused adopter tests,
   not in the route seam:
   - `src/lib/chat/chat-turn.test.ts`
   - `tests/evals/eval-live-runner.test.ts`
   - `src/core/use-cases/tools/inspect-runtime-context.tool.test.ts`
   Sprint 3 should build outward from these tests rather than duplicating them.
7. `tests/stream-pipeline.test.ts` remains a decomposition and boundary-shape
   harness. It should not be treated as evidence that the real stream route and
   real prompt runtime composition are already covered.

## Why This Sprint Exists

After Sprints 1 and 2, the repository is strongest at service seams, builder
contracts, and focused adopter surfaces.

The weakest area is still the composed chat runtime where route, pipeline,
prompt runtime, tool manifest selection, diagnostics, and provider invocation
meet.

Sprint 3 exists to reduce that mock blindness before Sprint 4 changes shared
provider policy across those same seams.

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_refactor/unification/sprints/sprint-1-prompt-control-plane-unification-and-role-coverage.md` | finalized Sprint 1 closeout and QA findings |
| `docs/_refactor/unification/sprints/sprint-1-file-level-implementation-backlog.md` | exact Sprint 1 work packets, boundaries, and verification targets |
| `docs/_refactor/unification/artifacts/sprint-1-prompt-mutation-equivalence-matrix.md` | already-shipped mutation equivalence contract that Sprint 3 must reuse rather than duplicate |
| `docs/_refactor/unification/artifacts/sprint-1-fallback-coverage-and-read-parity-note.md` | authoritative `db` / `fallback` / `missing` prompt-read semantics |
| `docs/_refactor/unification/sprints/sprint-2-effective-prompt-runtime-and-provenance.md` | prompt-runtime contract, adopter surfaces, and stated Sprint 3 handoff |
| `src/lib/chat/prompt-runtime.ts` | live `PromptRuntime`, `PromptRuntimeBuilder`, and provenance result contract |
| `src/lib/chat/policy.ts` | compatibility adapters now delegating through prompt runtime |
| `src/app/api/chat/stream/route.ts` | final post-tool-selection prompt boundary and stream tool-context attachment |
| `src/lib/chat/stream-pipeline.ts` | request-time prompt-section gathering and pipeline builder-result handoff |
| `src/core/tool-registry/ToolExecutionContext.ts` | prompt-provenance carrier for tool execution |
| `src/core/use-cases/tools/inspect-runtime-context.tool.ts` | governed runtime diagnostics seam for prompt provenance |
| `src/lib/chat/chat-turn.ts` | direct-turn runtime adopter |
| `src/lib/evals/live-runtime.ts` | live runtime adopter |
| `src/lib/evals/live-runner.ts` | live-runner prompt-runtime adopter and scenario harness |
| `src/app/api/chat/stream/route.test.ts` | current route-local test surface with heavy collaborator mocking |
| `tests/chat/chat-stream-route.test.ts` | current higher-level route behavior suite that still mocks prompt assembly |
| `tests/stream-pipeline.test.ts` | current stream-pipeline decomposition harness |
| `src/lib/chat/chat-turn.test.ts` | focused direct-turn prompt-runtime coverage |
| `tests/evals/eval-live-runner.test.ts` | focused live-eval prompt-runtime inspection coverage |
| `src/core/use-cases/tools/inspect-runtime-context.tool.test.ts` | prompt-provenance diagnostics coverage |

## Current Coverage And Remaining Gaps

| Area | Already covered | Remaining Sprint 3 gap |
| --- | --- | --- |
| prompt mutation and read parity | Sprint 1 service, equivalence, and read-parity suites | treat as regression coverage only; do not reimplement as new Sprint 3 work |
| prompt-runtime contract | `src/lib/chat/prompt-runtime.ts` and focused adopter coverage | prove real route and pipeline seams consume that contract with fewer mocks |
| direct-turn provenance | `src/lib/chat/chat-turn.test.ts` verifies tool manifest and `promptRuntime` tool context | still lacks a shared reduced-mock provider-boundary harness |
| live-eval provenance | `tests/evals/eval-live-runner.test.ts` verifies runtime inspection and prompt provenance | still lacks a shared harness story for later provider-policy work |
| stream route behavior | route tests cover branching, stop flows, and event behavior | they do not currently exercise `buildResult`, `promptRuntime`, or `inspect_runtime_context` prompt assertions |
| stream pipeline behavior | pipeline tests cover decomposition and shape | they still mock the prompt builder and should not be treated as final route-prompt proof |

## Primary Areas

- `src/app/api/chat/stream/route.ts`
- `src/app/api/chat/stream/route.test.ts`
- `tests/chat/chat-stream-route.test.ts`
- `src/lib/chat/stream-pipeline.ts`
- `tests/stream-pipeline.test.ts`
- `src/lib/chat/prompt-runtime.ts`
- `src/core/use-cases/tools/inspect-runtime-context.tool.ts`
- `src/lib/chat/chat-turn.test.ts`
- `src/lib/evals/live-runtime.ts`
- `src/lib/evals/live-runner.ts`
- `tests/evals/eval-live-runner.test.ts`
- any new shared chat seam fixtures needed for reduced-mock provider-boundary tests

## Out Of Scope

1. Repeating Sprint 1 prompt-control equivalence work as if it were still
   unlanded.
2. Provider-policy convergence itself. That is Sprint 4.
3. Summarization, blog-generation, admin web-search, TTS, or other
   non-chat prompt producers unless a tiny shared harness extraction is needed
   to keep chat seam tests sane.
4. Full end-to-end live model calls. Deterministic external-boundary doubles
   remain acceptable; the point is to stop mocking away the internal chat
   seams.
5. New user-facing prompt-debug UI beyond governed diagnostics and test-visible
   provenance assertions.

## Tasks

1. **Add reduced-mock stream-route tests around the real prompt runtime**
   - Exercise the main chat route with the real `PromptRuntime` and real
     `createSystemPromptBuilder(...)` delegation path where practical.
   - Keep deterministic doubles only at true external boundaries such as the
     model stream or provider transport.
   - Assert the route consumes final prompt truth from the post-tool-selection
     builder path rather than only proving `build()` was called.

2. **Add stream-pipeline seam tests for request-time prompt section gathering**
   - Strengthen pipeline coverage so summary, context-window guard,
     routing snapshot, trusted referral context, and task-origin handoff are
     proven as real prompt-runtime inputs rather than mocked builder-only side
     effects.
   - Keep the distinction explicit: pipeline tests prove gathered inputs and
     intermediate prompt-runtime results; route tests prove the final
     post-tool-selection prompt boundary.

3. **Use `inspect_runtime_context` as the governed prompt-provenance assertion seam**
   - Add integration assertions that call `inspect_runtime_context` with
     `includePrompt: true` through direct-turn, live eval, and at least one
     stream-path tool execution.
   - Verify returned prompt provenance includes the expected surface,
     `effectiveHash`, and key section identifiers.
   - For the main stream path, assert prompt provenance after route-level tool
     selection so the final capability or tool manifest is represented in the
     inspected result.

4. **Create shared provider-boundary harnesses for Sprint 4**
   - Introduce deterministic doubles that preserve the real request shape,
     tool-executor contract, stop-reason handling, and stream-event envelope
     without mocking away route, prompt, or tool composition.
   - Reuse those harnesses across stream-route and live-runtime tests where
     possible so Sprint 4 can change provider policy without rebuilding test
     scaffolding from scratch.

5. **Document remaining blind spots explicitly**
   - Record what still is not covered even after Sprint 3, such as true live
     Anthropic transport behavior, full repository-factory composition, or
     non-chat prompt producers.
   - Make the remaining gap list explicit enough that Sprint 4 can tell the
     difference between acceptable external-boundary doubles and a return to
     route-wide mock blindness.

## Required Artifacts

- [../artifacts/sprint-3-seam-coverage-map.md](../artifacts/sprint-3-seam-coverage-map.md)
- [../artifacts/sprint-3-chat-route-harness-notes.md](../artifacts/sprint-3-chat-route-harness-notes.md)
- [../artifacts/sprint-3-remaining-blind-spots.md](../artifacts/sprint-3-remaining-blind-spots.md)

## Implementation Outputs

- reduced-mock stream-route and pipeline seam tests using the real prompt
  runtime where practical
- prompt-provenance integration assertions routed through
  `inspect_runtime_context`
- shared deterministic provider-boundary harnesses for later Sprint 4 work
- an updated verification package that keeps Sprint 1 regression coverage in
  the bundle while adding Sprint 3 seam tests on top
- concrete harness files landed in `tests/helpers/provider-boundary-harness.ts`,
   `tests/chat/chat-stream-route.prompt-runtime-seam.test.ts`, and
   `tests/stream-pipeline.prompt-runtime-seam.test.ts`

## Acceptance Criteria

1. Sprint 3 does not duplicate Sprint 1 control-plane equivalence work; the
   existing service, equivalence, and read-parity suites remain in the
   verification bundle as prerequisite coverage.
2. The main chat route is no longer verified only through route-local mocks of
   prompt assembly; at least one reduced-mock route harness proves the real
   prompt-runtime path and final post-tool-selection prompt boundary.
3. Stream, direct-turn, and live-eval prompt provenance can each be asserted
   through governed runtime inspection rather than bespoke test-only hooks.
4. Shared provider-boundary harnesses preserve actual request shape and tool
   executor behavior closely enough to support Sprint 4 provider-policy work.
5. Remaining seam-level blind spots are documented explicitly instead of being
   left implicit in test structure.

## Verification

- `npm exec vitest run tests/prompt-control-plane.service.test.ts tests/prompt-control-plane-equivalence.test.ts tests/prompt-control-plane-read-parity.test.ts src/core/use-cases/tools/inspect-runtime-context.tool.test.ts src/lib/chat/chat-turn.test.ts src/app/api/chat/stream/route.test.ts tests/chat/chat-stream-route.test.ts tests/chat/chat-stream-route.prompt-runtime-seam.test.ts tests/stream-pipeline.test.ts tests/stream-pipeline.prompt-runtime-seam.test.ts tests/evals/eval-live-runner.test.ts`
- diagnostics-clean changed files
- `npm run build` not required for this closeout because Sprint 3 landed test-only seams and artifact documentation; no shared production runtime helpers changed

## QA Result

Status: complete

Observed verification result for the shipped Sprint 3 bundle:

1. 11 files passed.
2. 98 tests passed.
3. The new reduced-mock route seam proved that `inspect_runtime_context` sees the same final prompt text sent to the provider after route-level tool selection.
4. The new pipeline seam proved that summary, context-window guard, referral context, routing metadata, current-page context, and task-origin handoff all become real prompt-runtime sections.

Note: the 98 tests across 11 files includes the full Sprint 1 regression bundle
and pre-existing route and pipeline suites. Sprint 3 itself added 4 net-new
seam test cases (3 in `chat-stream-route.prompt-runtime-seam.test.ts`, 1 in
`stream-pipeline.prompt-runtime-seam.test.ts`) plus the shared
`provider-boundary-harness.ts` fixture for Sprint 4 consumption.
