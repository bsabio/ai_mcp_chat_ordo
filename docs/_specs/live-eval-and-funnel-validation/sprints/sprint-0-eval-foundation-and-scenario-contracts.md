# Sprint 0 - Eval Foundation And Scenario Contracts

> **Goal:** Define the minimal evaluation runtime contract so later sprints can seed realistic customer journeys, run live-model scenarios, and score whole-funnel behavior without improvising the framework.
> **Spec ref:** `EVAL-001` through `EVAL-005`, `EVAL-020` through `EVAL-038`, `EVAL-060` through `EVAL-077`, `EVAL-100` through `EVAL-117`
> **Prerequisite:** None
> **Status:** Completed on 2026-03-20

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `tests/customer-workflow-evals.test.ts` | Existing deterministic customer workflow evals already cover organization, individual, development, customer continuity, and founder dashboard scenarios, so Sprint 0 can extend a known eval pattern instead of inventing one from scratch |
| `tests/helpers/customerWorkflowEvalHarness.ts` | The repo already has a lightweight scenario report helper that can inspire a richer eval result model |
| `mcp/` | MCP servers and tools already exist and provide a real tool surface for future tool-selection and tool-quality evaluation |
| `src/lib/chat/` and workflow routes under `src/app/api/` | The app already exposes the core funnel surfaces that future eval runners need to exercise |
| `src/lib/db/schema.ts` | The schema already supports seeded conversations, leads, consultation requests, deals, training paths, and conversation events |

### Sprint 0 QA Adjustments

Pre-implementation QA found one concrete blueprint issue: the original verify steps used placeholder test paths, which made the sprint doc non-executable. Sprint 0 is therefore pinned to the concrete file targets below.

### Sprint 0 Implementation Outcome

Sprint 0 shipped the initial eval package foundation in `src/lib/evals/*` and `tests/evals/*`.

Delivered artifacts:

1. `src/lib/evals/domain.ts` defines the core cohort, scenario, run, observation, scorecard, and report contracts plus validation helpers.
2. `src/lib/evals/config.ts` adds fail-closed live-eval gating with explicit opt-in, target-environment handling, and Anthropic-key validation.
3. `src/lib/evals/scenarios.ts` adds the first-wave synthetic cohorts and scenario catalog for anonymous loss, continuity, buyer, learner, development, reroute, and MCP tool flows.
4. `src/lib/evals/reporting.ts` adds run-summary, observation normalization, and artifact serialization helpers.
5. `tests/evals/*.test.ts` verifies the new domain, config, scenario, observation, and reporting contracts.

---

## Task 0.1 - Define the eval package domain model

**What:** Create the base types and contracts for cohorts, scenarios, observations, run metadata, and scorecards.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/evals/domain.ts` |
| **Create** | `tests/evals/eval-domain.test.ts` |
| **Spec** | `EVAL-034` through `EVAL-038`, `EVAL-063` through `EVAL-077`, `EVAL-110` through `EVAL-112` |

### Task 0.1 Notes

Keep the first domain model small.

At minimum define:

1. `EvalCohort`
2. `EvalScenario`
3. `EvalRunConfig`
4. `EvalObservation`
5. `EvalScorecard`
6. `EvalRunReport`

The initial shape should be expressive enough to support both deterministic and live-model runs later.

### Task 0.1 Verify

```bash
npx vitest run tests/evals/eval-domain.test.ts
npm run typecheck
```

---

## Task 0.2 - Define safe environment gating for live-model evals

**What:** Add a minimal environment contract that clearly separates deterministic runs from real-key live evals.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/evals/config.ts` |
| **Create** | `tests/evals/eval-config.test.ts` |
| **Spec** | `EVAL-024`, `EVAL-060` through `EVAL-062`, `EVAL-100` through `EVAL-104`, `EVAL-113` |

### Task 0.2 Notes

The package must fail closed by default.

Required behavior:

1. deterministic evals run without external credentials
2. live evals require explicit opt-in
3. live eval config records model, environment, and timestamp
4. unsafe or missing configuration blocks execution rather than silently downgrading

### Task 0.2 Verify

```bash
npx vitest run tests/evals/eval-config.test.ts
npm run typecheck
```

---

## Task 0.3 - Define seeded cohort and funnel-scenario contracts

**What:** Create the seedable cohort catalog and a first set of scenario definitions that cover the whole customer process.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/evals/scenarios.ts` |
| **Create** | scenario definitions for anonymous loss, anonymous signup continuity, organization buyer, individual learner, development prospect, and MCP tool flows |
| **Create** | `tests/evals/eval-scenarios.test.ts` |
| **Spec** | `EVAL-021`, `EVAL-023`, `EVAL-039` through `EVAL-058`, `EVAL-080` through `EVAL-092`, `EVAL-110`, `EVAL-114`, `EVAL-116` |

### Task 0.3 Notes

Start with a small but representative matrix.

Required first-wave scenarios:

1. anonymous high-intent dropout
2. anonymous-to-signed-in continuity
3. organization buyer funnel
4. individual learner funnel
5. development prospect funnel
6. misclassification and reroute
7. MCP-specific tool choice and recovery
8. MCP no-tool avoidance
9. MCP multi-tool synthesis

These can remain definitions in Sprint 0; execution comes later.

### Task 0.3 Verify

```bash
npx vitest run tests/evals/eval-scenarios.test.ts
npm run typecheck
```

---

## Task 0.4 - Define report and artifact conventions

**What:** Establish the reporting format that later live-model and staging runs must emit.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/evals/reporting.ts` |
| **Create** | `tests/evals/eval-reporting.test.ts` |
| **Spec** | `EVAL-025`, `EVAL-026`, `EVAL-074` through `EVAL-077`, `EVAL-117` |

### Task 0.4 Notes

Each report should capture:

1. run metadata
2. scenario id and cohort id
3. per-checkpoint outcomes
4. tool observations
5. scorecard dimensions
6. final pass/fail status
7. failure reasons

Sprint 0 should stop at defining and validating the format. Do not build the full live runner yet.

### Task 0.4 Verify

```bash
npx vitest run tests/evals/eval-reporting.test.ts
npm run typecheck
```

---

## Completion Checklist

- [x] Eval domain objects are defined and validated
- [x] Live-eval environment gating fails closed by default
- [x] Seeded cohorts and scenario definitions cover the required customer and tool families
- [x] Report schema supports both human-readable and machine-readable output
- [x] New tests pass and typecheck stays green

## Verification Evidence

```bash
npx vitest run tests/evals/eval-domain.test.ts tests/evals/eval-config.test.ts tests/evals/eval-scenarios.test.ts tests/evals/eval-reporting.test.ts
npm run typecheck
```

---

## QA Deviations

Pre-implementation QA replaced placeholder verify commands with concrete repo paths and pinned Sprint 0 to `src/lib/evals/*` plus `tests/evals/*`.