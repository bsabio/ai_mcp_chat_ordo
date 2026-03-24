# Live Eval And Funnel Validation

> **Status:** Implemented v0.4
> **Date:** 2026-03-20
> **Implementation Priority:** High
> **Scope:** Define a production-like evaluation system that uses the real LLM key, realistic seeded data, MCP tools, and staged customer journeys to measure whether the product can move a user from anonymous conversation through signup, workflow qualification, founder review, and customer-visible next steps.
> **Business Context:** The app now supports routing, contact capture, consultation requests, deals, training paths, founder dashboard operations, and customer continuity for founder-approved downstream records. What it does not yet have is a trustworthy evaluation program that pressures the whole system with realistic demand, validates MCP tool usage, and measures whether the product can complete end-to-end customer processes instead of only passing deterministic unit and integration tests.
> **Requirement IDs:** `EVAL-XXX`

---

## 0. Simple Product Goals

This feature should stay anchored to four operational outcomes.

1. The team should be able to run realistic end-to-end evals that simulate anonymous visitors, signed-in users, founder review, and customer-visible follow-up. `[EVAL-001]`
2. The team should be able to measure whether the assistant uses MCP tools correctly and only when appropriate. `[EVAL-002]`
3. The team should be able to seed realistic synthetic data so the funnel can be stressed without relying on fragile manual setup. `[EVAL-003]`
4. The team should be able to compare runs over time and detect regressions in funnel completion, continuity, routing quality, and tool usage. `[EVAL-004]`

These goals exist to make the system testable as a customer process, not just as isolated API routes. `[EVAL-005]`

---

## 1. Problem Statement

### 1.1 Current System Audit

The current implementation now has a live-eval runner layer with signed-in customer funnel coverage verified under both mock-backed automation and explicit real-key local execution.

1. The repo already has deterministic workflow evals in `tests/customer-workflow-evals.test.ts`, but those evals use in-memory setup and direct repository calls rather than real model behavior. `[EVAL-010]`
2. MCP tools exist under `mcp/` and have tool-level tests, but the repo does not yet verify whether the model chooses the right tool, supplies correct arguments, and recovers from tool errors across real customer tasks. `[EVAL-011]`
3. Dashboard loaders, downstream workflow records, and customer continuity are now implemented, and the repo now includes a staging-gated canary harness plus release evidence artifacts for release review. The shipped canary path reuses the eval runtime and records intended staging target metadata, but it does not yet implement a browser-driven deployed-app harness with real auth and persistence. `[EVAL-012]`
4. Sprint 0 and Sprint 1 provide the deterministic eval foundation, Sprint 2 adds live runtime and runner support, and Sprint 3 now adds explicit staging-target canary commands, durable release evidence artifacts, and a QA verification guide. Real-key local execution was run manually for the organization buyer, individual learner, and development prospect journeys, and the staging-gated canary plus evidence path was executed locally with approved artifacts. A true deployed-app staging proof still remains operator-driven and environment-dependent. `[EVAL-013]`
5. The app can be tested locally and in CI through route tests, typecheck, build validation, and now CI-safe staging-canary and release-evidence tests, while live-model and staging-target evals remain guarded by explicit environment controls. `[EVAL-014]`

### 1.2 Why This Matters

Without a real evaluation package:

1. The system can appear correct while still failing to convert or correctly guide real users through the funnel. `[EVAL-015]`
2. MCP tools can individually work while still failing as part of model-driven workflows because tool selection and argument quality remain unmeasured. `[EVAL-016]`
3. Anonymous-to-signed-in continuity can regress in subtle ways that deterministic tests do not expose. `[EVAL-017]`
4. The founder workflow can remain operationally coherent while customer-facing behavior becomes unclear, delayed, or inconsistent. `[EVAL-018]`
5. Release confidence remains too dependent on local judgment instead of reproducible evaluation evidence. `[EVAL-019]`

---

## 2. Design Goals

1. **Layered evals.** Separate deterministic safety tests, live-model evals, and staging canaries instead of forcing one mechanism to do everything. `[EVAL-020]`
2. **Realistic cohorts.** Use synthetic but believable customer populations that cover anonymous, authenticated, founder-reviewed, ambiguous, and failure-path behaviors. `[EVAL-021]`
3. **Tool-aware scoring.** Evaluate both tool correctness and model tool-selection quality. `[EVAL-022]`
4. **Funnel completeness.** Measure whether the product can carry users from first contact to actionable downstream records and customer-visible next steps. `[EVAL-023]`
5. **Operational safety.** Keep evals deterministic where possible, isolate seeded data, and guard live-model runs with explicit environment controls. `[EVAL-024]`
6. **Regression visibility.** Produce machine-readable outputs so quality can be compared over time. `[EVAL-025]`
7. **No fake certainty.** Score behavior with rubrics and evidence instead of brittle exact-string assertions where model judgment is involved. `[EVAL-026]`

---

## 3. Evaluation Architecture

### 3.1 Eval Layers

The evaluation system should have three distinct layers.

1. **Deterministic workflow tests** validate contracts, transitions, RBAC, and repository behavior using existing unit and integration patterns. `[EVAL-030]`
2. **Live-model eval runs** use the real LLM key to exercise routing, prompt following, tool use, continuity, and customer-journey completion. `[EVAL-031]`
3. **Staging canary runs** exercise the deployed app with browser-driven flows, real auth, real persistence, and real MCP servers before release. `[EVAL-032]`

No single layer replaces the others. The purpose of this feature is to connect them into one evaluation program. `[EVAL-033]`

### 3.2 Core Eval Objects

The package should define a small set of durable concepts.

1. **Eval Cohort:** a family of synthetic customers with shared traits such as lane, urgency, budget clarity, technical maturity, and intent depth. `[EVAL-034]`
2. **Eval Scenario:** a specific journey, such as anonymous buyer dropout, rerouted development prospect, or individual learner conversion. `[EVAL-035]`
3. **Eval Run:** one execution of a scenario against a target environment using a specific model, prompt version, and seed set. `[EVAL-036]`
4. **Eval Observation:** a structured fact collected during the run, such as lane classification, tool call, status transition, signup event, or downstream record creation. `[EVAL-037]`
5. **Eval Scorecard:** rubric-based scoring for funnel completion, tool quality, safety, continuity, and operational outcome. `[EVAL-038]`

### 3.3 Data Inflation Model

The system should support realistic seeded data across the full funnel.

At minimum, seeded data should cover:

1. users and anonymous identities `[EVAL-039]`
2. conversations and message histories `[EVAL-040]`
3. routing snapshots and conversation events `[EVAL-041]`
4. lead records `[EVAL-042]`
5. consultation requests `[EVAL-043]`
6. deal records `[EVAL-044]`
7. training-path records `[EVAL-045]`
8. corpus and tool inputs required for MCP tasks `[EVAL-046]`

Seeded data must be synthetic and safe for repeated local and CI usage. `[EVAL-047]`

### 3.4 Tool Evaluation Model

Tool evaluation must distinguish two different questions.

1. Did the tool itself return the right result for the given input? `[EVAL-048]`
2. Did the model choose the right tool, pass valid arguments, and use the result correctly in its final response or workflow transition? `[EVAL-049]`

The eval system should score both. `[EVAL-050]`

### 3.5 Funnel Evaluation Model

The evaluation system should model the full customer process as a sequence of observable funnel checkpoints.

At minimum, the funnel should support:

1. anonymous discovery `[EVAL-051]`
2. anonymous dropout or continued engagement `[EVAL-052]`
3. signup and conversation continuity `[EVAL-053]`
4. lane-specific qualification `[EVAL-054]`
5. consultation or direct downstream conversion `[EVAL-055]`
6. founder review and approval `[EVAL-056]`
7. customer-visible next-step availability `[EVAL-057]`

An eval run does not need to complete every step, but it must record where the journey stopped and why. `[EVAL-058]`

---

## 4. Required Runtime Contracts

### 4.1 Environment Contract

Live evals must run only when explicitly enabled.

1. The package must require an explicit environment switch before using the real LLM key. `[EVAL-060]`
2. CI-safe deterministic tests must remain runnable without external credentials. `[EVAL-061]`
3. Live evals must record the model name, environment, seed set, and timestamp for each run. `[EVAL-062]`

### 4.2 Scenario Contract

Every scenario must define:

1. cohort identity `[EVAL-063]`
2. target environment `[EVAL-064]`
3. setup or seed requirements `[EVAL-065]`
4. expected funnel checkpoints `[EVAL-066]`
5. expected tool behavior when relevant `[EVAL-067]`
6. scoring rubric `[EVAL-068]`

### 4.3 Observation Contract

Every eval run must be able to record and export at minimum:

1. messages exchanged `[EVAL-069]`
2. tool calls and arguments `[EVAL-070]`
3. route or entity transitions triggered during the run `[EVAL-071]`
4. final lane or recommendation state `[EVAL-072]`
5. pass/fail and scored dimensions `[EVAL-073]`

### 4.4 Reporting Contract

The evaluation system should produce both human-readable and machine-readable output.

At minimum, each run should emit:

1. a concise run summary `[EVAL-074]`
2. a per-scenario scorecard `[EVAL-075]`
3. failure reasons with supporting observations `[EVAL-076]`
4. artifact-friendly JSON for trend comparison `[EVAL-077]`

---

## 5. Scenario Families

The spec requires scenario families broad enough to pressure the whole system.

### 5.1 Anonymous Conversion And Loss

The package should evaluate:

1. high-intent anonymous user who drops before signup but leaves enough signal for useful friction analysis `[EVAL-080]`
2. anonymous user who signs up and keeps continuity into the same journey `[EVAL-081]`
3. anonymous user who receives the wrong initial lane and is corrected after stronger evidence appears `[EVAL-082]`

### 5.2 Organization Buyer Flow

The package should evaluate:

1. organizational buyer who progresses from discovery to consultation to founder-reviewed deal `[EVAL-083]`
2. organizational buyer who receives an approved downstream next step and can see it as a signed-in user `[EVAL-084]`

### 5.3 Individual Learner Flow

The package should evaluate:

1. individual learner who progresses from discovery to qualification to founder-approved training recommendation `[EVAL-085]`
2. individual learner with apprenticeship ambiguity who requires founder screening judgment `[EVAL-086]`

### 5.4 Development Prospect Flow

The package should evaluate:

1. development prospect who supplies enough technical context to create a scoping-ready downstream record `[EVAL-087]`
2. development prospect who begins ambiguous and is rerouted after stronger implementation signals appear `[EVAL-088]`

### 5.5 MCP Tool Flow

The package should evaluate:

1. scenarios where the model should call a specific tool and does so correctly `[EVAL-089]`
2. scenarios where the model should not call a tool and avoids unnecessary tool use `[EVAL-090]`
3. scenarios where a tool fails and the model recovers coherently `[EVAL-091]`
4. multi-tool scenarios where the final answer depends on combining tool outputs correctly `[EVAL-092]`

---

## 6. Security And Safety

1. Synthetic data must not contain real customer PII, secrets, or production-only identifiers. `[EVAL-100]`
2. Live evals must never run automatically in environments where real customer data could be mutated without explicit approval. `[EVAL-101]`
3. Eval runs must isolate seeded data from normal user activity through environment, namespace, or fixture conventions. `[EVAL-102]`
4. Tool evals must avoid destructive operations unless the scenario explicitly targets safe test fixtures. `[EVAL-103]`
5. Reports must be safe to store in the repo or CI artifacts without leaking secrets or customer data. `[EVAL-104]`

---

## 7. Testing Strategy

This feature requires verification at three levels.

### 7.1 Unit Tests

Add focused tests for:

1. cohort and scenario schema validation `[EVAL-110]`
2. scoring rubric computation `[EVAL-111]`
3. observation normalization and export formatting `[EVAL-112]`
4. environment gating for live-model runs `[EVAL-113]`

### 7.2 Integration Tests

Add integration tests for:

1. seeded-data inflation across workflow entities `[EVAL-114]`
2. tool-observation capture during eval runs `[EVAL-115]`
3. funnel checkpoint scoring from seeded scenario outcomes `[EVAL-116]`
4. machine-readable report generation `[EVAL-117]`

### 7.3 Live Evals And Canaries

Add live evaluation coverage for:

1. anonymous-loss and anonymous-to-signup continuity scenarios `[EVAL-118]`
2. organization, individual, and development customer journeys `[EVAL-119]`
3. MCP tool selection and recovery scenarios `[EVAL-120]`
4. staging canary runs that validate the deployed customer process end to end `[EVAL-121]`

---

## 8. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Define the eval domain model, scenario schema, seeded cohort strategy, and safe environment gating for live-model runs. Completed on 2026-03-20 with the initial `src/lib/evals/*` foundation and `tests/evals/*` contract coverage. |
| 1 | Implement the first deterministic eval infrastructure layer. Completed on 2026-03-20 with deterministic seed packs, in-memory workspace composition, scenario execution, scoring, integration reporting, and CI-safe tool-observation coverage in `src/lib/evals/*` plus `tests/evals/*`. Downstream full-funnel seeded scenarios, real interactor-backed downstream execution, and stronger signup continuity proof carry into Sprint 2. |
| 2 | Close deterministic carryover, then add real-model MCP and customer-journey eval runners with structured observations, rubric-based reporting, and thorough positive, negative, and edge-case automated coverage |
| 3 | Add staging canaries, release-facing reporting, and QA evidence for end-to-end customer-process validation. Implemented on 2026-03-20 with `src/lib/evals/staging-canary.ts`, `src/lib/evals/release-evidence.ts`, operator CLI entrypoints, the QA guide in `docs/_specs/live-eval-and-funnel-validation/qa/sprint-3-release-verification.md`, and local operator verification of the staging-gated canary plus approved release evidence artifacts. The target URL is now configurable through `EVAL_DEPLOYED_BASE_URL` with legacy fallback support for `EVAL_STAGING_BASE_URL`; real browser-driven execution against a live deployed target remains a manual environment-dependent step. |

---

## 9. Future Considerations

1. Historical trend dashboards for eval quality and funnel regression tracking
2. Automated dataset generation for new synthetic cohorts
3. Multi-model comparison runs across different model versions
4. Release gates that require live-eval thresholds before deployment
5. Longitudinal retention and repeat-customer eval scenarios after the core funnel is stable
