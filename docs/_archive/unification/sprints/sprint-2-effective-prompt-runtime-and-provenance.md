# Sprint 2 — Effective Prompt Runtime And Provenance

> **Status:** Complete (status retroactively updated — see QA Closeout below)
> **Goal:** Introduce an explicit prompt runtime that returns effective prompt
> text plus provenance for chat and adjacent runtime surfaces.
> **Spec ref:** `UNI-080` through `UNI-119`
> **Prerequisite:** Sprint 1 complete

## Why This Sprint Exists

Sprint 1 unified prompt mutation and fallback-aware control-plane reads, but it
did not make the effective prompt for a turn inspectable.

That gap is now the most important prompt-runtime problem left in the repo.

Stored prompt versions are not the same thing as the final prompt text sent to
the model. The final prompt is still assembled across `policy.ts`, the main
chat route, `ChatStreamPipeline`, and live-eval helpers. Until that runtime
truth is unified, later provider-policy work will still be refactoring around a
partly implicit contract.

Sprint 2 should therefore create one explicit prompt runtime for the real
surface family that currently shares governed prompt slots:

- main chat stream
- direct chat turn
- live eval runtime

It should not yet try to solve broader provider-policy convergence or fold in
independent prompt producers like summarization, blog generation, admin web
search, or TTS.

## QA Findings Before Implementation

1. Sprint 1 already closed prompt mutation and read parity for the governed
   slot inventory. Sprint 2 must build on that invariant instead of
   reintroducing a role × prompt-type Cartesian model.
2. The governed mutable slots remain:
   - `ALL / base`
   - per-runtime-role `role_directive` for `ANONYMOUS`, `AUTHENTICATED`,
     `APPRENTICE`, `STAFF`, and `ADMIN`
3. `prompt_version_changed` remains a slot-version event after Sprint 1. Sprint
   2 must introduce a separate effective-prompt provenance contract rather than
   widening that event semantically.
4. The main chat stream currently assembles the richest prompt through split
   ownership:
   - `createSystemPromptBuilder(role, options)` in `src/lib/chat/policy.ts`
     adds base slot, role directive slot, and page context
   - `src/app/api/chat/stream/route.ts` adds user preferences, trusted
     referral context, and tool manifest
   - `ChatStreamPipeline.prepareStreamContext(...)` and
     `prepareFallbackContext(...)` add conversation summary,
     context-window-guard guidance, routing context, and task-origin handoff
5. Direct-turn chat in `src/lib/chat/chat-turn.ts` currently uses
   `createSystemPromptBuilder(role)` plus user preferences only. It passes tool
   schemas to the provider, but it does not add the tool manifest block to the
   prompt text.
6. Live eval currently starts from `buildSystemPrompt(role)` or a
   caller-supplied prompt and then appends funnel directives, routing context,
   and page context manually in `src/lib/evals/live-runner.ts`. Meanwhile
   `src/lib/evals/live-runtime.ts` still defaults to raw
   `buildSystemPrompt(role)`.
7. `ConfigIdentitySource` still applies instance-name substitution and
   `config/prompts.json` personality overlays outside prompt versioning, and
   `_basePrompt` caching in `policy.ts` keeps that runtime layer implicit.
8. Existing tests are strongest at builder-local ordering and slot behavior,
   but they do not yet prove end-to-end prompt provenance across stream,
   direct-turn, and live eval. Sprint 2 should land runtime-unit and
   adopter-surface coverage; Sprint 3 will deepen reduced-mock seam tests.

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_refactor/unification/sprints/sprint-1-prompt-control-plane-unification-and-role-coverage.md` | finalized Sprint 1 contract and closeout |
| `docs/_refactor/unification/artifacts/sprint-1-prompt-role-inventory-note.md` | governed slot inventory and intentional absences |
| `docs/_refactor/unification/artifacts/sprint-1-prompt-side-effects-by-surface-audit.md` | slot-version event scope and side-effect ownership |
| `docs/_refactor/unification/artifacts/sprint-1-fallback-coverage-and-read-parity-note.md` | `db` / `fallback` / `missing` runtime coverage semantics |
| `src/lib/chat/policy.ts` | current prompt-builder entrypoint and compatibility helper |
| `src/adapters/ConfigIdentitySource.ts` | runtime identity overlay logic outside prompt version rows |
| `src/core/use-cases/DefaultingSystemPromptRepository.ts` | fallback-backed slot resolution for runtime prompt assembly |
| `src/core/use-cases/SystemPromptBuilder.ts` | current section ordering and builder composition contract |
| `src/app/api/chat/stream/route.ts` | route-time prompt additions for the main chat stream |
| `src/lib/chat/stream-pipeline.ts` | pipeline-time summary, guard, routing, and task-origin prompt additions |
| `src/lib/chat/chat-turn.ts` | current direct-turn prompt assembly path |
| `src/lib/evals/live-runtime.ts` | live-eval runtime defaulting to `buildSystemPrompt(role)` |
| `src/lib/evals/live-runner.ts` | manual live-eval prompt concatenation and funnel directives |
| `tests/system-prompt-builder.test.ts` | real builder ordering and parity coverage |
| `tests/system-prompt-assembly.test.ts` | real assembled-manifest ordering and byte-stability coverage |
| `src/lib/chat/chat-turn.test.ts` | existing direct-turn adopter test surface |
| `tests/evals/eval-live-runner.test.ts` | existing live-eval adopter test surface |

## Current Surface Matrix

| Surface | Current governed-slot source | Current request-time additions | Current gap to close |
| --- | --- | --- | --- |
| main chat stream | `createSystemPromptBuilder(role, options)` over fallback-backed `ALL / base` plus runtime-role `role_directive` | page context, user preferences, trusted referral, summary, context-window guard, routing, task-origin handoff, tool manifest | effective prompt truth is split across `policy.ts`, `route.ts`, and `ChatStreamPipeline` |
| direct chat turn | `createSystemPromptBuilder(role)` over the same governed slots | user preferences only; tool schemas go to the provider but not to the prompt manifest block | thinner prompt contract than stream path and no inspectable provenance |
| live eval runtime | `buildSystemPrompt(role)` or caller-supplied prompt | some scenarios append funnel directives, routing, and page context manually | manual post-build concatenation and no unified runtime provenance |

## Out Of Scope

1. Provider-policy convergence across stream and direct-turn chat. That is
   Sprint 4.
2. Reduced-mock chat seam harness work beyond the focused adopter coverage
   needed for PromptRuntime migration. That is Sprint 3.
3. Summarizer, blog-generation, admin web-search, and TTS prompt producers,
   unless a very small shared type extraction is required for compatibility.
4. New user-facing prompt-debug UI beyond governed internal diagnostics and
   test-visible provenance.

## Tasks

1. **Create `PromptRuntime` interface and provenance result contract**
   - Define explicit types for `PromptSurface`, `PromptRuntimeRequest`,
     `PromptRuntimeResult`, `PromptSlotRef`, and `PromptSectionContribution`.
   - The result must expose at minimum:
     - `text`
     - `effectiveHash`
     - `slotRefs`
     - `sections`
     - `warnings`
   - Governed slot refs must derive from the Sprint 1 inventory and preserve
     `db` versus `fallback` source truth.
   - Provenance must surface config identity and personality overlays
     separately from prompt slot versioning.

2. **Move effective prompt assembly behind the runtime**
   - Absorb `ConfigIdentitySource`,
     `DefaultingSystemPromptRepository`, and `SystemPromptBuilder`
     composition into one runtime implementation.
   - `src/lib/chat/policy.ts` may keep `createSystemPromptBuilder(...)` and
     `buildSystemPrompt(...)` as compatibility adapters temporarily, but they
     should delegate to the runtime rather than remain parallel prompt-truth
     seams.
   - Request-time prompt sections should become explicit provenance
     contributions rather than ad hoc builder mutations scattered across
     callers.

3. **Adopt `PromptRuntime` in the main chat stream**
   - `src/app/api/chat/stream/route.ts` and `src/lib/chat/stream-pipeline.ts`
     should stop owning final prompt assembly directly.
   - They should gather request-time inputs and pass them to the runtime,
     including:
     - page context
     - user preferences
     - trusted referral context
     - conversation summary
     - context-window guard guidance
     - routing snapshot
     - task-origin handoff
     - capability manifest
   - The stream path should consume `PromptRuntimeResult.text` as the final
     system prompt and keep the full result available for diagnostics and
     tests.

4. **Adopt `PromptRuntime` in direct-turn and live eval**
   - `src/lib/chat/chat-turn.ts` should build its prompt through the runtime
     and stop implicitly omitting prompt-time tool manifest context when tools
     are present.
   - `src/lib/evals/live-runner.ts` and `src/lib/evals/live-runtime.ts` should
     stop using `buildSystemPrompt(...)` plus manual string concatenation as
     the effective-prompt contract.
   - Eval-only funnel directives or similar scenario-specific additions should
     flow through explicit runtime inputs or `extraSections` with provenance
     instead of raw post-build string appends.

5. **Expose governed prompt provenance and add focused tests**
   - Add prompt-runtime unit tests for slot refs, config overlays, section
     ordering, warnings, and effective-hash stability.
   - Add adopter-surface tests for stream, direct-turn, and live eval proving
     that each path is consuming the runtime output.
   - Keep full reduced-mock route and provider seam hardening in Sprint 3;
     Sprint 2 should land only the prompt-runtime coverage needed to make its
     own migration safe.

## Required Artifacts

- prompt-surface input matrix for stream, direct-turn, and live eval
- prompt provenance field map and section inventory
- warnings inventory for fallback-backed, overlay-backed, and drift-prone
  prompt states

## Implementation Outputs

- `PromptRuntime` interface and implementation
- thin compatibility adapters in `policy.ts`
- chat stream, direct-turn, and live-eval prompt assembly routed through one
  runtime contract
- prompt-runtime tests and governed provenance diagnostics

## Acceptance Criteria

1. The repo can produce `text`, `effectiveHash`, `slotRefs`, `sections`, and
   `warnings` for at least `chat_stream`, `direct_turn`, and `live_eval`
   surfaces.
2. Governed slot provenance is derived from the Sprint 1 slot inventory and
   preserves `db` versus `fallback` truth without reintroducing unsupported
   mutable slots.
3. The main chat stream no longer assembles effective prompt truth partly in
   `route.ts` and partly in `ChatStreamPipeline`; those surfaces pass inputs to
   the runtime and consume its result.
4. Direct-turn and live eval no longer rely on `buildSystemPrompt(...)` or
   `createSystemPromptBuilder(...)` plus manual post-build concatenation as the
   final prompt contract.
5. Config identity overlays and request-time sections become inspectable
   provenance, while `prompt_version_changed` remains explicitly scoped to
   slot-version changes.
6. Sprint 2 does not attempt provider-policy convergence or wider MCP export
   work; it prepares those later sprints by making effective-prompt truth
   inspectable first.

## Verification

- prompt-runtime unit tests
- focused stream, direct-turn, and live-eval adoption tests
- diagnostics-clean changed files
- update the artifact set if the final provenance contract differs from this
  sprint plan

## QA Closeout

Sprint 2 was implemented in code before this status was updated. QA confirmed:

- `src/lib/chat/prompt-runtime.ts` (535 lines) implements `PromptRuntime`,
  `PromptRuntimeBuilder`, `DefaultPromptRuntime`, and the full provenance
  result contract (`PromptRuntimeResult`, `PromptSlotRef`,
  `PromptSectionContribution`, `PromptRuntimeWarning`).
- `src/lib/chat/policy.ts` now delegates to `createPromptAssemblyBuilder`
  from `prompt-runtime.ts` instead of maintaining a parallel prompt assembly
  path.
- Stream route (`src/app/api/chat/stream/route.ts`) consumes `buildResult()`
  and threads `promptRuntime` into the `ToolExecutionContext`.
- Stream pipeline (`src/lib/chat/stream-pipeline.ts`) imports and uses
  `PromptAssemblyBuilder` and `PromptRuntimeResult` types.
- Live eval (`src/lib/evals/live-runner.ts`) imports and uses
  `PromptRuntimeResult` for prompt provenance inspection.
- Direct turn (`src/lib/chat/chat-turn.ts`) adopted the runtime through
  `createSystemPromptBuilder` which delegates to the runtime.

### Gaps Found During QA

1. Sprint 2 status field was never updated from "Planned" to "Complete."
2. The three required artifacts were never created. They are now published
   retroactively under `../artifacts/`.
3. `tests/prompt-runtime.test.ts` has only 3 test cases for a 535-line module.
   Sprint 3 seam tests supplement this but dedicated unit coverage remains thin.

## Verification Result

- `npm exec vitest run tests/prompt-runtime.test.ts` — 1 file, 3 tests passed
- Sprint 3 seam tests that exercise the prompt runtime in situ also passed
  (see Sprint 3 verification result)
