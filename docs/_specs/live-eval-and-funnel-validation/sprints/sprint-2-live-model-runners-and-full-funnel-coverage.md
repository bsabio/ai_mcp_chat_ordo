# Sprint 2 - Live Model Runners And Full Funnel Coverage

> **Goal:** Close the documented Sprint 1 deterministic carryover, then add live-model eval execution for customer journeys and MCP tool behavior using the real chat runtime, explicit environment gating, structured observation capture, and thorough positive, negative, and edge-case tests.
> **Spec ref:** `EVAL-001` through `EVAL-005`, `EVAL-020` through `EVAL-026`, `EVAL-031`, `EVAL-033`, `EVAL-039` through `EVAL-058`, `EVAL-060` through `EVAL-077`, `EVAL-080` through `EVAL-092`, `EVAL-100` through `EVAL-120`
> **Prerequisite:** Sprint 1 complete with documented carryover
> **Status:** Implemented on 2026-03-20 with mock-backed automation complete and manual real-key verification executed for the three signed-in customer funnel scenarios

---

## Sprint 2 Intent

Sprint 1 established deterministic contracts, seeded scenario lookup, scoring, and report generation. Sprint 2 must do two things without conflating them:

1. finish the deterministic funnel coverage that Sprint 1 intentionally left partial
2. add a real-model execution layer that runs through the actual chat and tool runtime while preserving CI-safe automated tests through mocks and fixtures

The sprint is successful when the repo can:

1. inflate named downstream funnel seed packs with leads, consultation requests, deals, training paths, and conversation events where the scenario requires them
2. execute interactor-backed deterministic funnel scenarios that prove real downstream record creation and customer-visible approved next steps
3. run live-model eval scenarios through an eval-specific composition root that reuses the real Anthropic and tool runtime while accepting injected seeded workspace state and emitting structured message, tool, transition, and stop-reason observations
4. score and serialize live-model runs with the existing Sprint 0 report contract
5. verify all new behavior with explicit positive, negative, and edge-case tests that remain CI-safe without making real network calls

Sprint 2 is not responsible for browser-driven staging canaries or release gates. Those remain Sprint 3 scope.

## Active Remediation Tracker

- [x] Close deterministic downstream carryover from Sprint 1
- [x] Add injected live runtime seam with structured stop-reason and tool observations
- [x] Add live scenario fixtures and live runner branches for anonymous, buyer, learner, development, and MCP flows
- [x] Expand live tests to cover positive, negative, and edge cases for all required live scenario families
- [x] Implement real streaming model fallback and record the actual selected model in reports
- [x] Add an operator-facing local live eval command with explicit usage examples
- [x] Update top-level spec and sprint docs to reflect the landed scope truthfully
- [x] Re-run typecheck, targeted eval coverage, full test suite, and production build
- [x] Run explicit real-key local eval commands for the signed-in customer funnel scenarios

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/lib/evals/config.ts` | `resolveEvalRuntimeConfig()` already enforces deterministic-vs-live mode, local-vs-ci-vs-staging targeting, and Anthropic-key fail-closed behavior for live runs |
| `src/lib/evals/scenarios.ts` | The live-model catalog entries already exist for `organization-buyer-funnel`, `individual-learner-funnel`, `development-prospect-funnel`, `mcp-tool-choice-and-recovery`, and `mcp-multi-tool-synthesis` |
| `src/lib/evals/reporting.ts` | `buildEvalRunReport()`, `summarizeEvalRun()`, and `serializeEvalRunReport()` already provide the durable report shape Sprint 2 should reuse |
| `src/lib/evals/workspace.ts` | The deterministic workspace already exposes real repositories, seed helpers, conversation-event reads, `CreateDealFromWorkflowInteractor`, `CreateTrainingPathFromWorkflowInteractor`, and the calculator tool surface |
| `src/lib/evals/runner.ts` | The deterministic runner already emits normalized message, transition, checkpoint, tool, and summary observations that Sprint 2 should extend rather than replace |
| `src/lib/chat/anthropic-stream.ts` | `runClaudeAgentLoopStream()` already emits `onDelta`, `onToolCall`, and `onToolResult` callbacks around the real Anthropic streaming tool loop, but it does not yet expose final stop reason, final assembled assistant text, or model metadata |
| `src/lib/chat/anthropic-client.ts` | `createMessageWithModelFallback()` and `createAnthropicProvider()` already provide the non-streaming Anthropic execution surface with retry, timeout, and model-fallback behavior |
| `src/app/api/chat/stream/route.ts` | The streaming route already assembles system prompt, routing context, tool schemas, tool executor, persisted messages, and SSE callbacks using the real chat runtime, but it is wired through app-global composition roots rather than an injected eval workspace |
| `tests/chat-stream-route.test.ts` | The repo already has a proven mock strategy for `runClaudeAgentLoopStream()`, routing analysis, tool execution, and persisted conversation assertions without live network calls |
| `tests/anthropic-client.test.ts` | The Anthropic provider already has tests for model fallback, transient failures, and timeout normalization that Sprint 2 can mirror for live-eval execution boundaries |
| `tests/customer-workflow-evals.test.ts` | Existing workflow proofs already demonstrate the downstream product records and founder-approved visibility states that Sprint 2 needs to exercise through eval infrastructure |

---

## Non-Goals

Sprint 2 must not expand into later-sprint work.

1. Do not introduce browser automation or deployed-environment canaries.
2. Do not make live-network calls from normal CI tests.
3. Do not bypass the existing chat and tool runtime with eval-only fake model logic.
4. Do not redesign the Sprint 0 domain model unless live observation capture exposes a concrete contract gap.
5. Do not stretch into release policy or pass/fail deployment gates yet.

---

## Task 2.1 - Close deterministic carryover for downstream funnel scenarios

**What:** Extend the deterministic seed and runner layer so the eval system can prove full downstream funnel execution for the scenarios that do not require live-model judgment.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/evals/seeding.ts` |
| **Modify** | `src/lib/evals/runner.ts` |
| **Modify** | `src/lib/evals/workspace.ts` only if small helper methods are needed to inspect created downstream records cleanly |
| **Create or Modify** | `tests/evals/eval-fixtures.test.ts` |
| **Create or Modify** | `tests/evals/eval-runner.test.ts` |
| **Create or Modify** | `tests/evals/eval-integration.test.ts` |
| **Spec** | `EVAL-039` through `EVAL-047`, `EVAL-051` through `EVAL-058`, `EVAL-114` through `EVAL-117` |

### Task 2.1 Notes

Sprint 2 should close the three documented Sprint 1 gaps directly.

Required changes:

1. add named seeded downstream records where the scenario requires them, including conversation events plus at least one lead, consultation request, deal, or training path in the relevant scenarios
2. add interactor-backed deterministic execution for the downstream buyer and learner funnel paths if the product runtime can already support them cleanly
3. strengthen anonymous signup continuity so the scenario proves a post-signup continued exchange rather than only ownership migration

Testing must include:

1. positive cases where downstream records are created and customer-visible approved next steps become inspectable
2. negative cases where an expected downstream record is absent or approval is missing and the checkpoint fails clearly
3. edge cases where seeded records already exist, routing begins ambiguous, or continuity metadata is partially present but insufficient

### Task 2.1 Verify

```bash
npx vitest run tests/evals/eval-fixtures.test.ts tests/evals/eval-runner.test.ts tests/evals/eval-integration.test.ts
npm run typecheck
```

---

## Task 2.2 - Add an injectable live-runtime seam and structured observation capture

**What:** Extend the current live runtime boundary so Sprint 2 can reuse the real Anthropic and tool loop while capturing the structured data the eval contracts require.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/chat/anthropic-stream.ts` |
| **Create** | `src/lib/evals/live-runtime.ts` or a similarly narrow injected runtime adapter |
| **Create** | `tests/evals/eval-live-runner.test.ts` |
| **Modify** | `src/lib/evals/domain.ts` only if a small additional observation detail field is required for live stop reasons or tool-error capture |
| **Modify** | `src/lib/evals/reporting.ts` only if live execution exposes a real report-contract hole |
| **Spec** | `EVAL-031`, `EVAL-060` through `EVAL-077`, `EVAL-115`, `EVAL-117`, `EVAL-120` |

### Task 2.2 Notes

Sprint 2 cannot rely on the current stream callbacks alone because the eval contracts require exportable final-state and stop-reason evidence.

Recommended approach:

1. resolve the run configuration through `resolveEvalRuntimeConfig()` and fail fast when a live scenario is requested in CI or without a valid Anthropic key
2. extend the streaming runtime so it can return or callback the final assistant text, stop reason, tool-round count, and selected model without requiring route-level SSE persistence
3. create an eval-specific live runtime adapter that accepts injected seeded workspace state and reusable chat/tool dependencies instead of going through app-global route composition
4. invoke the real model and tool loop through that injected runtime boundary and collect `onDelta`, `onToolCall`, `onToolResult`, final assistant output, and stop-reason data as observations
5. normalize tool failures, empty-model responses, and stop reasons into the shared eval observation contract

Testing must include:

1. positive cases where tool calls, tool results, and final assistant output are all captured in order
2. negative cases for live-disabled mode, missing API key, and local scenario requests targeting CI
3. edge cases for tool failure, empty final text, max-tool-round exhaustion, and model fallback after a transient upstream error

No automated test in this sprint should require a real Anthropic request. Mock the live boundary in tests and reserve real-key validation for explicit local verification commands.

### Task 2.2 Verify

```bash
npx vitest run tests/evals/eval-live-runner.test.ts tests/evals/eval-config.test.ts
npm run typecheck
```

---

## Task 2.3 - Create the live-model eval runner and required scenario family

**What:** Wire the live-model scenario family to the new runner so the eval package can exercise the real product funnel against realistic seeded state.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/evals/live-runner.ts` |
| **Modify** | `src/lib/evals/scenarios.ts` |
| **Create** | `src/lib/evals/live-scenarios.ts` or extend `src/lib/evals/seeding.ts` with scenario-specific live prompts and fixtures |
| **Create or Modify** | `tests/evals/eval-scenarios.test.ts` |
| **Create or Modify** | `tests/evals/eval-live-runner.test.ts` |
| **Spec** | `EVAL-080` through `EVAL-092`, `EVAL-118` through `EVAL-120` |

### Task 2.3 Notes

Sprint 2 should cover the first meaningful live-model scenario family, not every imaginable journey.

Required live scenarios:

1. anonymous high-intent loss
2. anonymous signup continuity
3. organization buyer funnel
4. individual learner funnel
5. development prospect funnel
6. MCP tool choice and recovery

Optional if implementation remains clean:

1. MCP multi-tool synthesis

Each scenario should define:

1. seeded starting state
2. the user prompt or prompt sequence to send into the live runner
3. required checkpoints and score dimensions
4. the exact downstream records or visibility states that count as success

Testing must include:

1. positive cases for each required scenario family using mocked live responses and deterministic downstream assertions
2. negative cases where the model chooses no tool when one is required, chooses the wrong tool, drops before signup, or fails to create the downstream record expected by the scenario
3. edge cases where the model partially satisfies a journey, reroutes mid-run, continues after signup with incomplete state, or recovers after a recoverable tool error

### Task 2.3 Verify

```bash
npx vitest run tests/evals/eval-scenarios.test.ts tests/evals/eval-live-runner.test.ts
npm run typecheck
```

---

## Task 2.4 - Add live-model scoring, integration proofs, and manual verification hooks

**What:** Prove that live-model eval runs can seed, execute, score, and serialize end to end while keeping automated tests deterministic and local-key verification explicit.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/evals/scoring.ts` |
| **Create** | `tests/evals/eval-live-integration.test.ts` |
| **Modify** | `tests/evals/eval-scoring.test.ts` |
| **Modify** | `docs/_specs/live-eval-and-funnel-validation/spec.md` after implementation if shipped scope differs from the sprint plan |
| **Spec** | `EVAL-022`, `EVAL-023`, `EVAL-048` through `EVAL-050`, `EVAL-074` through `EVAL-077`, `EVAL-116` through `EVAL-120` |

### Task 2.4 Notes

The Sprint 2 proof should show both automated evidence and an explicit local-only live verification path.

Automated integration coverage must demonstrate:

1. a seeded live-model scenario resolves from the catalog
2. the live runner emits structured observations including final assistant output and stop reason
3. scoring produces a reusable scorecard from those observations
4. report generation emits artifact-safe JSON
5. failures include concrete reasons when a required tool, signup continuation, or downstream conversion does not occur

Manual verification coverage should document one or more explicit local commands for:

1. a live customer-journey run with `EVAL_LIVE_ENABLED=true`
2. an MCP tool-choice or recovery run with a real Anthropic key

Current implementation note:

1. `npm run eval:live -- --scenario organization-buyer-funnel`
2. `npm run eval:live -- --scenario mcp-tool-choice-and-recovery`

These commands are documented and runnable locally, but they were not executed during implementation QA because Sprint 2 automated verification remains intentionally mock-backed and CI-safe.

Testing must include:

1. positive end-to-end report generation for at least one customer funnel and one tool-oriented scenario
2. negative end-to-end report generation when a required checkpoint fails
3. edge cases where some score dimensions pass and others fail, producing a mixed scorecard instead of a binary-only result

### Task 2.4 Verify

```bash
npx vitest run tests/evals/eval-scoring.test.ts tests/evals/eval-live-integration.test.ts tests/evals/eval-reporting.test.ts
npm run typecheck
```

---

## Task 2.5 - Record implementation truthfully and preserve testing boundaries

**What:** Update the sprint and top-level spec only with the scope that actually lands, including the final test matrix.

| Item | Detail |
| --- | --- |
| **Modify** | this sprint doc |
| **Modify** | `docs/_specs/live-eval-and-funnel-validation/spec.md` |
| **Modify** | `docs/_specs/README.md` only if feature status or planned sprint count changes materially |
| **Spec** | `EVAL-005`, `EVAL-025`, `EVAL-033` |

### Task 2.5 Notes

Do not mark live-model coverage complete if only mock-backed proof exists for a scenario family.

If one or more live scenarios remain manual-only at the end of the sprint, document that precisely and preserve the gap for Sprint 3 rather than smoothing it over.

The test matrix recorded in the doc should explicitly call out positive, negative, and edge-case coverage so QA can audit it mechanically.

### Task 2.5 Verify

```bash
npm run typecheck
npx vitest run tests/evals/eval-fixtures.test.ts tests/evals/eval-runner.test.ts tests/evals/eval-live-runner.test.ts tests/evals/eval-live-integration.test.ts tests/evals/eval-scoring.test.ts tests/evals/eval-reporting.test.ts
```

---

## Recommended File Targets

### New runtime files

1. `src/lib/evals/live-runtime.ts` or a similarly narrow injected runtime adapter
2. `src/lib/evals/live-runner.ts`
3. `src/lib/evals/live-scenarios.ts` or a similarly narrow live-fixture helper

### Expected supporting modifications

1. `src/lib/evals/seeding.ts`
2. `src/lib/evals/workspace.ts`
3. `src/lib/evals/runner.ts`
4. `src/lib/evals/scenarios.ts`
5. `src/lib/evals/scoring.ts`
6. `src/lib/chat/anthropic-stream.ts`
7. `src/lib/evals/reporting.ts` only if a real contract gap appears

### New or expanded tests

1. `tests/evals/eval-fixtures.test.ts`
2. `tests/evals/eval-runner.test.ts`
3. `tests/evals/eval-live-runner.test.ts`
4. `tests/evals/eval-live-integration.test.ts`
5. `tests/evals/eval-scenarios.test.ts`
6. `tests/evals/eval-scoring.test.ts`
7. `tests/chat/anthropic-stream.test.ts`

---

## Completion Checklist

- [x] Deterministic seed packs cover downstream leads, consultation requests, deals, training paths, and conversation events for the scenarios that require them
- [x] Deterministic funnel execution exercises the real downstream workflow interactors where the product runtime already supports them
- [x] Anonymous signup continuity proves a continued post-signup exchange
- [x] Live anonymous-loss and anonymous-signup scenarios are covered in the required live-model scenario set
- [x] Live-model runner captures messages, tool calls, tool results, transitions, and stop reasons in the shared eval observation format
- [x] Live runtime exposes the final assistant output, stop reason, and related metadata needed by the eval observation contract
- [x] Required live-model customer-journey scenarios run through the real model runtime with reusable scoring and report generation
- [x] Automated tests cover positive, negative, and edge-case behavior for deterministic carryover and live-model execution without requiring real network calls
- [x] Manual local verification steps exist for at least one live funnel scenario and one tool-oriented scenario

## Verification Log

- `npm run typecheck` passed on 2026-03-20
- `npm test -- --run tests/chat/anthropic-stream.test.ts tests/evals/eval-live-runner.test.ts tests/evals/eval-live-integration.test.ts tests/evals/eval-scoring.test.ts tests/evals/eval-scenarios.test.ts` passed on 2026-03-20
- `npm test` passed on 2026-03-20 with 160 test files and 919 tests green
- `npm run build` passed on 2026-03-20
- `EVAL_LIVE_ENABLED=true node --env-file=.env.local --import tsx scripts/run-live-eval.ts --scenario organization-buyer-funnel` passed on 2026-03-20 with 6/6 points on `claude-sonnet-4-6`
- `EVAL_LIVE_ENABLED=true node --env-file=.env.local --import tsx scripts/run-live-eval.ts --scenario individual-learner-funnel` passed on 2026-03-20 with 6/6 points on `claude-sonnet-4-6`
- `EVAL_LIVE_ENABLED=true node --env-file=.env.local --import tsx scripts/run-live-eval.ts --scenario development-prospect-funnel` passed on 2026-03-20 with 5/5 points on `claude-sonnet-4-6`

## Implementation Notes

- The repo now includes a local live-eval command through `npm run eval:live -- --scenario <scenario-id>`.
- The live test matrix now covers anonymous, organization buyer, individual learner, development prospect, MCP recovery, and MCP multi-tool synthesis with positive, negative, and edge-case cases.
- Reporting now preserves the model that actually executed after any fallback rather than only the configured preferred model.
- Streaming runtime fallback now retries transient upstream failures and advances to the next configured model when the current model is unavailable.
- Live funnel scenarios now inject the same routing context block used by production streaming chat and add a funnel-specific directive so real-key customer journeys behave like product conversations instead of drifting into corpus research.
- Live org, learner, and development funnel scenarios now run with a narrowed tool surface during eval execution so the model stays on conversion and approved next-step behavior rather than spending tool rounds on unrelated content retrieval.

---

## QA Focus For Sprint 2

When Sprint 2 is implemented, QA should verify these risk areas first.

1. live-eval code bypasses the actual chat and tool runtime instead of reusing it
2. test coverage over-indexes on happy paths and misses failure or partial-success scoring
3. live scenarios create downstream records without proving the approved customer-visible state
4. tool-recovery coverage records the failure but not the final user-facing recovery behavior
5. environment gating allows live execution in CI or without a valid Anthropic key
6. documentation overstates real-key coverage when the shipped proof remains mock-backed or manual-only
7. the live runner silently depends on app-global route composition instead of an injected eval runtime and seeded workspace

---

## QA Deviations

- 2026-03-20 planning QA: Sprint 2 must include live anonymous-loss and anonymous-signup continuity coverage to satisfy `EVAL-118`; the earlier draft omitted that family from the required live scenarios.
- 2026-03-20 planning QA: The current `runClaudeAgentLoopStream()` boundary exposes deltas and tool callbacks but not final assistant output, stop reason, or model metadata. Sprint 2 therefore needs an explicit runtime-extension task before the live runner can satisfy the eval observation contract.
- 2026-03-20 planning QA: The app streaming route is currently composed through app-global dependencies rather than an injected eval workspace. Sprint 2 must introduce an eval-specific injected runtime seam instead of assuming seeded workspace state can flow into the existing route unchanged.
- 2026-03-20 implementation QA: Automated Sprint 2 verification remained CI-safe and mock-backed, then explicit real-key local verification was run manually for `organization-buyer-funnel`, `individual-learner-funnel`, and `development-prospect-funnel` using `.env.local` credentials.
- 2026-03-20 implementation QA: The first real-key organization-buyer run exposed prompt-shape drift into corpus research. The shipped fix was to inject production-style routing context plus a funnel-specific live-eval directive and to narrow the tool surface for signed-in funnel scenarios; the org, learner, and development reruns all passed after that change.