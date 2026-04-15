# Sprint 1 - Deterministic Runner And Seeded Data

> **Goal:** Build the deterministic evaluation layer on top of the Sprint 0 eval contracts so the repo can seed realistic synthetic funnel state, execute scenario-specific deterministic runs against a real in-memory workflow stack, and emit scored reports without using a live LLM key.
> **Spec ref:** `EVAL-001` through `EVAL-005`, `EVAL-020`, `EVAL-023` through `EVAL-025`, `EVAL-030`, `EVAL-033`, `EVAL-039` through `EVAL-058`, `EVAL-065` through `EVAL-077`, `EVAL-100` through `EVAL-117`
> **Prerequisite:** Sprint 0 complete
> **Status:** Completed on 2026-03-20 with documented carryover into Sprint 2

---

## Sprint 1 Intent

Sprint 0 defined the contracts. Sprint 1 must make those contracts executable for deterministic, CI-safe evals.

The sprint is successful when the repo can:

1. inflate deterministic-first synthetic funnel state into an isolated in-memory database
2. execute deterministic scenarios against real workflow repositories and schema constraints, with downstream interactor-backed funnel execution carried into Sprint 2
3. capture structured observations and funnel checkpoint outcomes from those runs
4. score the outcomes and emit machine-readable reports using the Sprint 0 reporting format

Sprint 1 is not responsible for real-model execution or staging browser canaries. Those remain Sprint 2 and Sprint 3 scope.

### Sprint 1 Implementation Outcome

Sprint 1 shipped the first deterministic eval execution layer under `src/lib/evals/*`.

Delivered artifacts:

1. `src/lib/evals/seeding.ts` defines deterministic seed packs keyed by scenario id for the first shipped scenario subset and fails clearly for live-model scenarios.
2. `src/lib/evals/workspace.ts` creates an in-memory deterministic workspace with the real schema, real data mappers, exposed workflow interactors, and a fixture-backed calculator tool surface.
3. `src/lib/evals/runner.ts` executes the deterministic-first scenario subset and emits normalized observations, checkpoint outcomes, stop reasons, and final state summaries.
4. `src/lib/evals/scoring.ts` turns deterministic evidence into reusable rubric-driven score dimensions.
5. `src/lib/evals/scenarios.ts` now includes the deterministic positive calculator must-use scenario needed to prove positive tool-call capture before Sprint 2 live-model execution exists.
6. `tests/evals/*.test.ts` now cover seed packs, workspace inflation, deterministic execution, scoring, integration reporting, and the updated scenario catalog for the shipped first-wave deterministic scenarios.

Carryover into Sprint 2:

1. named deterministic seed packs do not yet populate downstream leads, consultation requests, deals, or training paths for full-funnel seeded scenarios
2. the deterministic runner does not yet exercise `CreateDealFromWorkflowInteractor` or `CreateTrainingPathFromWorkflowInteractor`
3. signup continuity currently proves ownership migration and active-thread continuity markers, but not a true post-signup continued exchange

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/lib/evals/domain.ts` | Sprint 0 already defines the cohort, scenario, run, observation, scorecard, and report contracts plus validation helpers that Sprint 1 should execute rather than redesign |
| `src/lib/evals/config.ts` | Deterministic-vs-live environment gating already fails closed, so Sprint 1 can stay entirely CI-safe |
| `src/lib/evals/scenarios.ts` | The first-wave scenario catalog now covers anonymous loss, continuity, buyer, learner, development, reroute, MCP must-use, avoid, recovery, and multi-tool synthesis families |
| `src/lib/evals/reporting.ts` | Run summary and artifact serialization already exist, so Sprint 1 should feed them real deterministic observations instead of inventing a second report shape |
| `tests/customer-workflow-evals.test.ts` | The repo already has deterministic workflow proofs that create conversations, leads, consultation requests, deals, training paths, and founder-visible blocks against an in-memory SQLite database |
| `tests/helpers/customerWorkflowEvalHarness.ts` | There is already a simple scenario-check pattern that Sprint 1 can supersede or borrow from while moving to the new eval contracts |
| `src/lib/db/schema.ts` | The schema already supports the required funnel records: users, conversations, messages, conversation events, lead records, consultation requests, deal records, and training-path records |
| `src/adapters/*DataMapper.ts` | Existing mappers provide the real persistence surface needed for seeded deterministic runs instead of fake stub repositories |
| `src/core/use-cases/CreateDealFromWorkflowInteractor.ts` and `src/core/use-cases/CreateTrainingPathFromWorkflowInteractor.ts` | Deterministic scenarios can already exercise real founder-side workflow transitions through existing interactors |
| `mcp/` | MCP tools and servers already exist, so Sprint 1 can seed tool fixtures and tool observations even before Sprint 2 introduces real-model selection |

---

## Non-Goals

Sprint 1 must not expand into later-sprint work.

1. Do not run a real LLM or require API keys.
2. Do not add browser-driven staging canaries.
3. Do not build a release gate yet.
4. Do not redesign the Sprint 0 domain model unless deterministic execution reveals a concrete contract hole.
5. Do not replace existing customer-workflow tests; compose with them or reuse their setup patterns.

---

## Task 1.1 - Add deterministic seed-pack and inflation utilities

**What:** Create the seeded data model and inflation helpers that turn a scenario definition into a reproducible synthetic workflow state.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/evals/fixtures.ts` or `src/lib/evals/seeding.ts` |
| **Create** | `tests/evals/eval-fixtures.test.ts` |
| **Modify** | `src/lib/evals/domain.ts` only if an additional deterministic-only seed type is required |
| **Spec** | `EVAL-003`, `EVAL-021`, `EVAL-039` through `EVAL-047`, `EVAL-065`, `EVAL-102`, `EVAL-114` |

### Task 1.1 Notes

The seed layer should be small, explicit, and synthetic.

Sprint 1 seed packs are only required for scenarios whose execution mode is deterministic. Live-model scenarios may keep their fixture declarations in the catalog, but Sprint 1 does not need to inflate or execute them.

At minimum support inflation for:

1. users and anonymous identities
2. conversations and routing snapshots
3. conversation events
4. leads
5. consultation requests
6. deals
7. training paths
8. MCP-oriented tool fixtures or corpus references

Use deterministic ids and timestamps so reports remain comparable across runs.

The seed API should accept named seed packs keyed by scenario id rather than a pile of ad hoc helper arguments. The runner should be able to ask for one scenario seed pack and get everything it needs.

If the scenario catalog contains `live_model` scenarios, the seeding layer should either:

1. expose no deterministic seed pack for them and fail clearly when asked to inflate them in Sprint 1, or
2. expose fixture metadata only, without claiming they are executable in the deterministic runner

Do not force Sprint 1 to provide runnable seed packs for the live-only buyer, learner, development, or MCP live-model scenarios.

Seed packs must isolate their data through explicit ids, namespaces, or scenario-prefixed fixtures so they cannot be confused with ordinary app traffic if the same patterns are later reused outside pure unit tests.

### Task 1.1 Verify

```bash
npx vitest run tests/evals/eval-fixtures.test.ts
npm run typecheck
```

---

## Task 1.2 - Add a deterministic eval workspace and composition harness

**What:** Create the in-memory runtime harness that applies schema, wires the real repositories and use cases, and exposes a stable execution surface for deterministic eval scenarios.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/evals/workspace.ts` or `src/lib/evals/harness.ts` |
| **Create** | `tests/evals/eval-workspace.test.ts` |
| **Reuse** | `ensureSchema()` from `src/lib/db/schema.ts` and the existing `*DataMapper` classes |
| **Spec** | `EVAL-020`, `EVAL-030`, `EVAL-033`, `EVAL-041` through `EVAL-045`, `EVAL-071`, `EVAL-102`, `EVAL-114` |

### Task 1.2 Notes

The workspace should be the deterministic equivalent of a mini application composition root.

Recommended responsibilities:

1. create a fresh in-memory SQLite database
2. call `ensureSchema()`
3. expose the real data mappers needed by funnel scenarios
4. expose existing workflow interactors where downstream conversion is already implemented
5. provide a small helper for querying emitted conversation events and persisted records after scenario steps run

Do not hide everything behind mocks. The point of Sprint 1 is to run deterministic evals against real repository behavior and real schema constraints.

Keep the harness test-first and cheap enough to run in CI as part of the normal Vitest suite.

### Task 1.2 Verify

```bash
npx vitest run tests/evals/eval-workspace.test.ts
npm run typecheck
```

---

## Task 1.3 - Implement deterministic scenario execution and observation capture

**What:** Add the deterministic runner that takes a Sprint 0 scenario plus a seed pack, executes the relevant workflow steps, and emits normalized observations and checkpoint outcomes.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/evals/runner.ts` |
| **Create** | `tests/evals/eval-runner.test.ts` |
| **Modify** | `src/lib/evals/reporting.ts` only if runner output reveals a missing deterministic reporting helper |
| **Modify** | `src/lib/evals/scenarios.ts` to add one deterministic fixture-backed positive tool-call scenario if the current catalog does not expose one |
| **Spec** | `EVAL-001`, `EVAL-020`, `EVAL-023`, `EVAL-030`, `EVAL-051` through `EVAL-058`, `EVAL-069` through `EVAL-077`, `EVAL-115`, `EVAL-116`, `EVAL-117` |

### Task 1.3 Notes

Sprint 1 should support deterministic execution for the scenarios that can already be exercised without a live model.

Required first-wave deterministic execution targets:

1. anonymous high-intent dropout
2. anonymous signup continuity
3. misclassification and reroute
4. MCP tool avoidance
5. one deterministic fixture-backed MCP must-use scenario that records a real tool call plus arguments

Optional but desirable if runtime reuse stays simple:

1. organization buyer funnel via existing consultation-request and deal workflow
2. individual learner funnel via existing lead and training-path workflow

Each run must be able to emit observations for at least:

1. messages or message-like synthetic steps
2. tool calls and tool arguments when the scenario includes tool behavior
3. route or entity transitions
4. checkpoint pass/fail events
5. final summary state

Sprint 1 must prove both sides of tool-observation capture:

1. an `avoid` case where no tool call is emitted and that absence is meaningful
2. a `must_use` case where an actual fixture-backed tool call and its arguments are recorded in observations

The runner should record where a journey stopped and why, even if the scenario fails before the final checkpoint.

### Task 1.3 Verify

```bash
npx vitest run tests/evals/eval-runner.test.ts
npm run typecheck
```

---

## Task 1.4 - Add deterministic scoring and rubric evaluation

**What:** Turn deterministic scenario outcomes into score dimensions and scorecards using the Sprint 0 contracts instead of one-off assertions.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/evals/scoring.ts` |
| **Create** | `tests/evals/eval-scoring.test.ts` |
| **Modify** | `src/lib/evals/scenarios.ts` if score dimensions need stronger deterministic rubric hints |
| **Spec** | `EVAL-022`, `EVAL-023`, `EVAL-026`, `EVAL-038`, `EVAL-048` through `EVAL-050`, `EVAL-068`, `EVAL-073` through `EVAL-077`, `EVAL-111`, `EVAL-116`, `EVAL-117` |

### Task 1.4 Notes

Sprint 1 scoring should remain evidence-based and deterministic.

At minimum support scoring dimensions for:

1. funnel completion
2. continuity
3. routing quality
4. tool selection
5. tool correctness
6. recovery
7. customer clarity
8. safety

The scoring layer should accept structured checkpoint and observation data from the runner and produce `EvalScoreDimension[]` plus an `EvalScorecard`.

Do not bake scoring logic into test files. The point is to make the rubric executable and reusable by Sprint 2 live-model runs.

### Task 1.4 Verify

```bash
npx vitest run tests/evals/eval-scoring.test.ts tests/evals/eval-reporting.test.ts
npm run typecheck
```

---

## Task 1.5 - Add full deterministic integration coverage for seeded scenarios

**What:** Prove that the deterministic layer can seed, run, score, and serialize end-to-end scenarios using the new infrastructure instead of ad hoc test-local setup.

| Item | Detail |
| --- | --- |
| **Create** | `tests/evals/eval-integration.test.ts` |
| **Modify** | `tests/customer-workflow-evals.test.ts` only if selective reuse or migration reduces duplication without losing clarity |
| **Spec** | `EVAL-004`, `EVAL-030`, `EVAL-033`, `EVAL-051` through `EVAL-058`, `EVAL-074` through `EVAL-077`, `EVAL-114` through `EVAL-117` |

### Task 1.5 Notes

This is the sprint proof, not just unit coverage.

The integration test should demonstrate that a deterministic scenario can:

1. resolve its scenario definition from the Sprint 0 catalog
2. inflate its seed pack into a fresh workspace
3. execute the deterministic runner
4. score the resulting observations
5. emit a valid `EvalRunReport`
6. serialize the report to artifact-safe JSON
7. demonstrate at least one positive tool-call observation and one no-tool observation across the deterministic-first scenario set

Prefer asserting on structured report content instead of exact prose strings.

If `tests/customer-workflow-evals.test.ts` remains more readable as a product-facing proof, keep it. Sprint 1 does not need to delete earlier tests to be successful.

### Task 1.5 Verify

```bash
npx vitest run tests/evals/eval-integration.test.ts tests/customer-workflow-evals.test.ts
npm run typecheck
```

---

## Task 1.6 - Record implementation truthfully and preserve rollout boundaries

**What:** Update the sprint and top-level spec only with the implementation that actually lands.

| Item | Detail |
| --- | --- |
| **Modify** | this sprint doc |
| **Modify** | `docs/_specs/live-eval-and-funnel-validation/spec.md` after implementation if Sprint 1 scope, status, or sequencing changes materially |
| **Spec** | `EVAL-005`, `EVAL-025`, `EVAL-029` style truthfulness requirement applied to this package |

### Task 1.6 Notes

If deterministic execution lands for fewer scenarios than planned, record that precisely instead of marking the whole layer complete by default.

If implementation reveals that one of the remaining buyer or learner paths cannot yet be executed without product-runtime gaps, carry that forward explicitly into Sprint 2 instead of stretching Sprint 1 scope.

### Task 1.6 Verify

```bash
npm run typecheck
npx vitest run tests/evals/eval-fixtures.test.ts tests/evals/eval-workspace.test.ts tests/evals/eval-runner.test.ts tests/evals/eval-scoring.test.ts tests/evals/eval-integration.test.ts
```

---

## Recommended File Targets

These are the expected primary implementation targets unless QA reveals a simpler existing surface to extend.

### New runtime files

1. `src/lib/evals/fixtures.ts` or `src/lib/evals/seeding.ts`
2. `src/lib/evals/workspace.ts` or `src/lib/evals/harness.ts`
3. `src/lib/evals/runner.ts`
4. `src/lib/evals/scoring.ts`

### Expected supporting modifications

1. `src/lib/evals/domain.ts`
2. `src/lib/evals/scenarios.ts`
3. `src/lib/evals/reporting.ts`

### New tests

1. `tests/evals/eval-fixtures.test.ts`
2. `tests/evals/eval-workspace.test.ts`
3. `tests/evals/eval-runner.test.ts`
4. `tests/evals/eval-scoring.test.ts`
5. `tests/evals/eval-integration.test.ts`

---

## Completion Checklist

- [x] Seed packs can inflate deterministic-first synthetic funnel state into an isolated in-memory database
- [x] Deterministic eval workspace uses real schema and real workflow repositories instead of fake stub persistence
- [x] Deterministic runner emits normalized observations, checkpoint results, and stop reasons
- [x] Scoring logic produces reusable score dimensions and scorecards from deterministic evidence
- [x] At least the deterministic-first scenario set runs end to end and serializes valid `EvalRunReport` artifacts
- [x] Sprint 1 stays CI-safe and does not require a real LLM key
- [ ] Named deterministic seed packs cover downstream lead, consultation request, deal, and training-path state for full-funnel seeded scenarios
- [ ] Deterministic scenario execution exercises downstream workflow interactors for deal and training-path creation
- [ ] Signup continuity proves a continued post-signup conversation, not only ownership migration

---

## Verification Evidence

```bash
npx vitest run tests/evals/eval-domain.test.ts tests/evals/eval-config.test.ts tests/evals/eval-scenarios.test.ts tests/evals/eval-reporting.test.ts tests/evals/eval-fixtures.test.ts tests/evals/eval-workspace.test.ts tests/evals/eval-runner.test.ts tests/evals/eval-scoring.test.ts tests/evals/eval-integration.test.ts
npm run typecheck
```

---

## QA Focus For Sprint 1

When Sprint 1 is implemented, QA should verify these likely risk areas first.

1. seed packs drift from the scenario catalog and silently stop matching checkpoint expectations
2. deterministic harness code falls back to mocks and stops exercising real schema constraints
3. report generation succeeds even when a run never records where the journey stopped
4. tool-observation coverage only records positive tool calls and misses avoid/recovery behavior
5. scenario scoring collapses back into hard-coded test assertions instead of reusable rubric logic
6. deterministic seed-pack lookup quietly accepts live-model scenarios instead of failing clearly or deferring them to Sprint 2

---

## QA Deviations

- 2026-03-20 planning QA: Sprint 1 must build on `src/lib/evals/*` from Sprint 0 rather than introducing a second eval package or test-only contract layer.
- 2026-03-20 planning QA: The repo already contains strong deterministic workflow setup in `tests/customer-workflow-evals.test.ts`; Sprint 1 should reuse those patterns and real data mappers instead of inventing a parallel fake funnel model.
- 2026-03-20 planning QA: The live-model buyer, learner, development, and MCP must-use/recovery scenarios exist in the catalog, but Sprint 1 should only execute the subset that can be proven deterministically without stretching into Sprint 2 live-model responsibilities.
- 2026-03-20 planning QA: Sprint 1 needs one deterministic fixture-backed positive tool-call scenario in addition to tool avoidance so `EVAL-115` is actually covered before Sprint 2 live-model runs exist.
- 2026-03-20 planning QA: Seed packs keyed by scenario id must distinguish deterministic scenarios from live-model scenarios explicitly; otherwise the Sprint 1 seeding contract implies live-scenario support that the sprint intentionally does not deliver.
- 2026-03-20 implementation QA: Sprint 1 shipped the deterministic-first subset cleanly, but the doc originally overstated full-funnel seeded-data coverage. Downstream seeded lead, consultation request, deal, and training-path scenarios remain Sprint 2 work.
- 2026-03-20 implementation QA: `src/lib/evals/workspace.ts` exposes real workflow interactors, but the shipped runner does not invoke them yet. Real interactor-backed downstream funnel execution is carried into Sprint 2.
- 2026-03-20 implementation QA: Anonymous signup continuity currently validates ownership transfer and active conversation continuity markers, but it does not yet prove a post-signup continued exchange. Sprint 2 should close that gap.