# Sprint 3 - Staging Canaries, Release Reporting, And QA Evidence

> **Goal:** Add a release-facing staging validation layer that runs explicitly under staging gating, records durable evidence beside the existing release manifest, and gives QA a clear pass/fail review workflow before release.
> **Spec ref:** `EVAL-020`, `EVAL-025`, `EVAL-032`, `EVAL-074` through `EVAL-077`, `EVAL-101` through `EVAL-104`, `EVAL-121`
> **Prerequisite:** Sprint 2 complete with truthful local live-model verification already documented
> **Status:** Implemented on 2026-03-20 with staging-gated canary tooling, release evidence artifacts, CI-safe automated coverage, and local operator verification of the staging-gated command path. Real execution against an actual deployed staging app remains operator-driven and environment-dependent.

---

## Sprint 3 Intent

Sprint 2 proved the local deterministic and live-model layers. Sprint 3 should add the missing release-confidence layer without reworking the foundations that already exist.

The sprint is successful when the repo can:

1. run explicit staging-target canaries under `EVAL_TARGET_ENV=staging` using the existing eval contracts and environment gating
2. capture release-facing evidence that combines release metadata, environment health, and canary outcomes into durable artifacts under `release/`
3. document a QA verification path that shows what was checked, which scenarios ran, what passed or failed, and what remains manual-only
4. preserve safety boundaries so staging canaries never become an unguarded production mutation path or a CI default

Sprint 3 is not about inventing a second eval system. It should reuse the Sprint 0 through Sprint 2 contracts, reports, and scenario catalog wherever possible.

This shipped sprint does that through a staging-gated canary wrapper around the live eval runner plus release evidence generation. It does not claim a browser-driven deployed-app harness that the repo still does not implement.

## Active Delivery Tracker

- [x] Add a staging canary runner that targets staging-gated execution explicitly
- [x] Reuse existing live scenario scoring and reporting for staging-target runs
- [x] Generate release-facing evidence artifacts beside `release/manifest.json`
- [x] Add QA review documentation and a repeatable verification checklist
- [x] Cover the new release-reporting path with CI-safe tests and fixtures
- [x] Record positive, negative, and edge-case coverage expectations in the sprint doc and shipped test matrix
- [x] Verify the final code path locally without requiring automatic real-key CI execution

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/lib/evals/config.ts` | Already supports `targetEnvironment: "staging"` and fail-closed live-eval environment gating |
| `src/lib/evals/live-runner.ts` | Already seeds, runs, scores, and reports live customer-journey scenarios with structured observations |
| `scripts/run-live-eval.ts` | Already provides the operator-facing entrypoint that Sprint 3 should extend or reuse rather than replace |
| `scripts/generate-release-manifest.mjs` | Already writes durable release metadata into `release/manifest.json` |
| `scripts/validate-release-manifest.mjs` | Already enforces release-manifest presence and required keys |
| `scripts/admin-health-sweep.ts` | Already exposes a machine-readable health summary suitable for release evidence capture |
| `tests/release-manifest.test.ts` | Already verifies release metadata expectations against the generated artifact |
| `tests/health-routes.test.ts` | Already covers live and ready route behavior for healthy and unhealthy states |
| `tests/evals/eval-config.test.ts` | Already asserts staging-target live config behavior and now anchors Sprint 3 environment gating coverage |
| `docs/operations/environment-matrix.md` | Documents the environment profile expectations and now complements the Sprint 3 QA guide |

These assets are enough to ground Sprint 3 in concrete repo surfaces. There is no checked-in `operations/` directory in the current workspace, so this sprint should keep its operational documentation inside the existing spec tree unless a new shared ops path is intentionally created.

---

## Non-Goals

Sprint 3 should stay narrow.

1. Do not redesign the Sprint 2 live runner or its scoring model unless staging evidence exposes a real contract hole.
2. Do not make staging canaries a default part of `npm test`, `npm run quality`, or any normal CI path.
3. Do not target production data or live customer accounts.
4. Do not block release on subjective narrative review without machine-readable evidence.
5. Do not assume browser automation, auth fixtures, or staging secrets already exist if the repo has not implemented them yet.

---

## QA Strategy

Sprint 3 should be reviewed as three linked quality boundaries rather than one generic release task.

1. execution boundary: does the staging canary runner fail closed, target the right environment, and emit a complete outcome even when a scenario fails
2. artifact boundary: do release artifacts remain machine-readable, complete, and safe when inputs are healthy, degraded, or partially missing
3. sign-off boundary: can QA review one release candidate and determine approved, conditional, or blocked status without reconstructing context from terminal logs

The sprint is not complete if only happy-path staging output exists. Each boundary must ship with explicit positive, negative, and edge-case coverage.

---

## Task 3.1 - Add an explicit staging canary execution path

**What:** Add a staging-target runner that reuses the existing live eval contracts but is clearly separated from local-only live runs and standard CI-safe tests.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/evals/staging-canary.ts` |
| **Create** | `scripts/run-staging-canary.ts` |
| **Modify** | `scripts/run-live-eval.ts` only if a shared argument parser or scenario-resolution helper avoids duplication cleanly |
| **Create or Modify** | `tests/evals/eval-staging-canary.test.ts` |
| **Create or Modify** | `tests/evals/eval-config.test.ts` |
| **Spec** | `EVAL-020`, `EVAL-024`, `EVAL-032`, `EVAL-060` through `EVAL-064`, `EVAL-121` |

### Task 3.1 Notes

The staging path should be explicit and fail closed.

Required changes:

1. require `EVAL_LIVE_ENABLED=true` plus `EVAL_TARGET_ENV=staging` before any staging canary runs
2. resolve a small curated scenario set for staging canaries instead of defaulting to the entire catalog
3. keep scenario selection focused on the highest-signal journeys:
   - organization buyer funnel
   - individual learner funnel
   - development prospect funnel
   - one MCP tool-choice or recovery scenario if staging tool infrastructure is available
4. record the intended staging base URL, target environment, selected model, scenario id, and timestamp as part of the canary artifact
5. keep destructive or ambiguous actions disabled unless the scenario uses clearly isolated test fixtures

Testing must include:

1. positive cases where staging-target config resolves correctly and the canary runner requests the expected scenario set
2. negative cases where staging runs are attempted without explicit enablement or required secrets
3. edge cases where one scenario fails but the runner still emits a complete summary for release review

Recommended test matrix:

1. positive: a staging-target run with an allowed scenario set emits per-scenario results, selected model, base URL, and a final summary status
2. positive: a curated subset run such as one buyer scenario plus one MCP scenario respects explicit CLI selection without silently expanding scope
3. negative: `EVAL_TARGET_ENV=local` with a staging command fails before any runtime call begins
4. negative: missing staging base URL or missing Anthropic key produces a clear configuration error instead of a partial artifact
5. negative: a scenario id outside the curated canary allowlist is rejected explicitly
6. edge case: one scenario times out or exhausts tool rounds but the overall canary run still serializes the completed scenarios plus the failure reason
7. edge case: a staging response returns no final assistant text but still records stop reason and scenario failure evidence cleanly
8. edge case: a rerun for the same release candidate overwrites or versions artifacts deterministically instead of leaving ambiguous duplicate outputs

### Task 3.1 Verify

```bash
npx vitest run tests/evals/eval-staging-canary.test.ts tests/evals/eval-config.test.ts
npm run typecheck
```

---

## Task 3.2 - Generate release-facing evidence artifacts

**What:** Produce durable release artifacts that combine manifest metadata, health checks, and staging canary results under the existing `release/` directory.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/evals/release-evidence.ts` |
| **Create** | `scripts/generate-release-evidence.ts` |
| **Modify** | `scripts/generate-release-manifest.mjs` only if a minimal shared artifact helper keeps release metadata generation coherent |
| **Modify** | `scripts/validate-release-manifest.mjs` or add a sibling validator if the release process should assert evidence artifact presence separately |
| **Create or Modify** | `tests/evals/eval-release-evidence.test.ts` |
| **Create or Modify** | `tests/release-manifest.test.ts` |
| **Spec** | `EVAL-025`, `EVAL-062`, `EVAL-074` through `EVAL-077`, `EVAL-104` |

### Task 3.2 Notes

Sprint 3 should not leave release evidence trapped in console output.

Required artifacts:

1. `release/manifest.json` remains the release metadata source of truth
2. `release/canary-summary.json` records per-scenario staging results, scorecards, failure reasons, selected model, and target URL
3. `release/qa-evidence.json` records the health sweep output, release manifest metadata, and canary summary references in one review-friendly object

Recommended implementation:

1. reuse the existing eval reporting contract rather than inventing a second summary format
2. call the health sweep as a library or process step so its JSON lands in the evidence artifact
3. keep artifact contents safe for source control or CI storage by excluding secrets and raw credential values
4. separate manifest validation from canary validation so operators can tell whether the failure is build metadata, environment health, or customer-process behavior

Testing must include:

1. positive artifact generation with stable fixture inputs
2. negative validation when required evidence keys or scenario outcomes are missing
3. edge cases where health is green but one canary fails, producing a mixed release summary instead of a binary-only result

Recommended test matrix:

1. positive: release evidence generation writes all expected files under `release/` with stable top-level keys and safe JSON
2. positive: evidence output includes release manifest metadata, health sweep summary, scenario scorecards, and review timestamps in one consistent structure
3. negative: missing `release/manifest.json` fails validation separately from canary-result failures
4. negative: malformed canary output or missing scenario results causes evidence generation to fail with a concrete reason
5. negative: a health sweep status of `error` marks the release evidence as blocked even if all canaries pass
6. edge case: health is green and only one scenario fails, producing a conditional or blocked summary without dropping the successful scenario evidence
7. edge case: no staging canary was run yet, but manifest and health artifacts exist; validation should report incomplete evidence rather than a false pass
8. edge case: existing evidence files are regenerated for a new candidate and preserve deterministic shape without leaking stale scenario results

### Task 3.2 Verify

```bash
npx vitest run tests/evals/eval-release-evidence.test.ts tests/release-manifest.test.ts
npm run typecheck
```

---

## Task 3.3 - Add QA review workflow and sign-off evidence

**What:** Define a repeatable QA process that turns the release artifacts into an auditable pass/fail review instead of an informal manual check.

| Item | Detail |
| --- | --- |
| **Create** | `docs/_specs/live-eval-and-funnel-validation/qa/sprint-3-release-verification.md` |
| **Modify** | `README.md` only if one short pointer to the release verification flow is needed for discoverability |
| **Create or Modify** | `docs/_specs/live-eval-and-funnel-validation/spec.md` after implementation if the shipped release gate differs from this plan |
| **Spec** | `EVAL-019`, `EVAL-025`, `EVAL-076`, `EVAL-077`, `EVAL-121` |

### Task 3.3 Notes

The QA flow should answer four operational questions clearly:

1. what environment was tested
2. which scenarios ran
3. what evidence artifacts were produced
4. who can decide whether the release is blocked, conditional, or approved

The QA guide should include:

1. prerequisite environment variables and secret expectations
2. the exact command sequence for release preparation, health sweep, staging canary execution, and evidence generation
3. a checklist for reviewing partial failures, known acceptable deviations, and manual-only validations that remain outside automation
4. a place to append verification notes for a specific release candidate without rewriting the core sprint spec

The QA guide should also define review outcomes explicitly:

1. approved: all required health and canary evidence is present and all required scenarios pass
2. conditional: evidence is complete but one or more documented non-blocking deviations require explicit reviewer acknowledgement
3. blocked: required evidence is missing, health is failing, or a required customer-process scenario fails

Testing and review coverage should include:

1. positive: a fully green release candidate can be reviewed from artifacts alone without consulting raw terminal output
2. negative: missing evidence files or missing reviewer fields make the QA checklist fail closed
3. negative: undocumented manual-only validation steps are treated as incomplete QA rather than implied approval
4. edge case: one scenario is intentionally deferred or waived for a release candidate and the waiver is recorded explicitly in the review artifact
5. edge case: a release candidate is re-run after remediation and the QA doc supports a second review entry without losing the first one

This document should stay inside the existing spec tree unless the repo later adds a durable shared ops handbook path.

### Task 3.3 Verify

```bash
npm run release:prepare
npm run release:verify
npm run admin:health
node --import tsx scripts/run-staging-canary.ts --help
node --import tsx scripts/generate-release-evidence.ts --help
```

The real staging command sequence now lives in `docs/_specs/live-eval-and-funnel-validation/qa/sprint-3-release-verification.md`.

---

## Suggested Delivery Order

1. land the staging canary runner and its gating first so the execution boundary is explicit
2. add release evidence generation second so the canary output has a durable home under `release/`
3. finish with the QA review guide after the actual commands and artifacts are settled

This order keeps the sprint honest: execution path first, release artifact second, process documentation last.

---

## Recommended File Targets

### New runtime and reporting files

1. `src/lib/evals/staging-canary.ts`
2. `src/lib/evals/release-evidence.ts`
3. `scripts/run-staging-canary.ts`
4. `scripts/generate-release-evidence.ts`

### Expected supporting modifications

1. `src/lib/evals/config.ts`
2. `src/lib/evals/live-runner.ts` only if shared helpers are needed for staging-target execution
3. `src/lib/evals/reporting.ts` only if the existing report contract needs a small release-artifact extension
4. `scripts/run-live-eval.ts` only if shared CLI parsing or scenario resolution avoids duplication cleanly
5. `scripts/validate-release-manifest.mjs` or a sibling validator for evidence completeness
6. `README.md` only if one short release-verification pointer improves discoverability

### New or expanded tests

1. `tests/evals/eval-staging-canary.test.ts`
2. `tests/evals/eval-release-evidence.test.ts`
3. `tests/evals/eval-config.test.ts`
4. `tests/evals/eval-reporting.test.ts` if artifact serialization extends the shared report contract
5. `tests/release-manifest.test.ts`
6. `tests/health-routes.test.ts`

---

## QA Focus For Sprint 3

When Sprint 3 lands, QA should verify these risks first.

1. the staging canary path silently targets the wrong environment or accepts `local` and `staging` interchangeably
2. the canary runner only reports the first failure and drops evidence from other completed scenarios
3. release artifacts present a green-looking summary while health, canary, or evidence completeness is actually degraded
4. one missing file under `release/` causes downstream review ambiguity instead of a fail-closed validation result
5. the QA guide assumes staging secrets, auth fixtures, or browser support that do not actually exist in the shipped repo
6. reruns for the same release candidate overwrite evidence in a way that destroys reviewer history or makes provenance unclear
7. documentation overstates automation and hides manual-only checks that still require explicit reviewer acknowledgement

---

## Acceptance Test Matrix

The final shipped test matrix should make positive, negative, and edge-case coverage auditable at a glance.

### Positive coverage

1. staging canary runner accepts explicit staging config and executes the curated scenario set
2. per-scenario canary output includes scorecard, stop reason, selected model, and target metadata
3. release evidence generation writes `release/canary-summary.json` and `release/qa-evidence.json` with stable keys
4. QA review flow supports a fully green release candidate with complete evidence

### Negative coverage

1. staging canary command rejects missing enablement, wrong environment, missing base URL, and missing provider key
2. canary runner rejects scenarios outside the allowlisted release set
3. release evidence validation fails when manifest, health, or canary inputs are missing or malformed
4. QA review fails closed when required reviewer fields or explicit waiver notes are absent

### Edge-case coverage

1. one failing or timed-out scenario still produces a complete mixed-result canary artifact
2. health failure plus canary success still blocks release evidence summary correctly
3. rerunning a release candidate preserves deterministic artifact behavior and review provenance
4. partial manual waiver or deferred scenario handling is recorded explicitly rather than hidden in prose

---

## Completion Checklist

- [x] Staging canary command exists and fails closed without explicit enablement
- [x] Staging-target scenario set is small, curated, and documented
- [x] Release evidence artifacts are written under `release/` with safe machine-readable JSON
- [x] Health and canary results can be reviewed together for a release decision
- [x] CI-safe tests cover positive, negative, and edge-case behavior for config, artifact generation, and mixed pass/fail reporting
- [x] QA guide documents the real command sequence and remaining manual boundaries

## Verification Log

- `npm test -- --run tests/evals/eval-staging-canary.test.ts tests/evals/eval-release-evidence.test.ts tests/evals/eval-config.test.ts tests/evals/eval-reporting.test.ts` passed on 2026-03-20 with 4 files and 16 tests green
- `npm run typecheck` passed on 2026-03-20 after the Sprint 3 implementation landed
- `node --import tsx scripts/run-staging-canary.ts --help` printed usage successfully on 2026-03-20
- `node --import tsx scripts/generate-release-evidence.ts --help` printed usage successfully on 2026-03-20
- `EVAL_LIVE_ENABLED=true EVAL_TARGET_ENV=staging EVAL_DEPLOYED_BASE_URL=https://www.studioordo.com node --env-file=.env.local --import tsx scripts/run-staging-canary.ts` passed on 2026-03-20 with 4/4 scenarios green in the staging-gated live-eval harness
- `node --env-file=.env.local --import tsx scripts/generate-release-evidence.ts` produced `release/qa-evidence.json` with status `approved` on 2026-03-20

## Implementation Notes

- Sprint 3 now adds `src/lib/evals/staging-canary.ts` as the staging-gated canary wrapper around the existing live eval runner.
- `runLiveEvalScenario()` now accepts a target-environment override so staging canaries can preserve the existing scenario catalog without cloning scenario definitions.
- The staging canary now records real execution timestamps per scenario instead of falling back to the fixed live-runner default timestamp.
- Sprint 3 now adds `src/lib/evals/release-evidence.ts` plus `scripts/generate-release-evidence.ts` to generate `release/canary-summary.json` and `release/qa-evidence.json`.
- `scripts/run-staging-canary.ts` writes a durable canary artifact and exits non-zero when any required canary scenario fails.
- The MCP recovery fixture now supplies explicit calculator operands and injects a one-time tool failure so the recovery scenario exercises deterministic retry behavior instead of relying on underspecified prompting.
- `docs/_specs/live-eval-and-funnel-validation/qa/sprint-3-release-verification.md` now defines the review commands, artifact expectations, and approved versus conditional versus blocked outcomes.

## QA Deviations

- 2026-03-20 implementation QA: the repo now ships staging-gated canary tooling and release evidence generation, but it still does not ship a browser-driven deployed-app canary harness with real auth and persistence. The QA guide and top-level spec now describe that boundary explicitly.
- 2026-03-20 implementation QA: the staging-gated canary and evidence commands were executed locally with `.env.local` credentials and a deployed target URL captured through `EVAL_DEPLOYED_BASE_URL` with legacy fallback support for `EVAL_STAGING_BASE_URL`. This verifies the shipped harness and artifact path, but it is still not a browser-driven deployed-app staging proof.
- 2026-03-20 implementation QA: release review fails closed when canary evidence is missing, when health reports `error`, or when any required canary scenario fails.
