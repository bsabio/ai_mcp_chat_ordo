# Sprint 6 — Observability, Evals, And Governance Closeout

> **Status:** Planned
> **Goal:** Turn session-value and retrieval-calibration behaviors into
> measurable, blocking quality gates.

## Problem

Without dedicated evidence, the system can regress back toward padded
engagement behavior or confident weak-retrieval behavior while still passing
generic functional tests.

## Primary Areas

- `src/lib/evals/*`
- structured logging and release evidence scripts
- QA intake docs and issue templates
- `docs/_refactor/README.md` and related governance docs

## Tasks

1. **Session-value evals**
   - Add scenarios for `closed`, `open`, and `needs_input` responses.
   - Verify closed responses do not emit suggestion chips.

2. **Retrieval-calibration evals**
   - Add scenarios for strong, partial, and no-strong-match retrieval.
   - Verify low-confidence retrieval is framed honestly.

3. **Observability**
   - Log retrieval score distributions, weak-match counts, and
     session-resolution events.

4. **QA ingestion**
   - Add a lightweight path for student or operator issues to be tagged as
     retrieval-calibration failures or conversation-calibration failures.

5. **Release gates**
   - Add scripts or evidence checks such as `qa:session-value` and
     `qa:retrieval-calibration`.

6. **Governance closeout**
   - Update docs to reflect the new response-state and retrieval contracts.
   - Ensure the final workstream story is visible in the `_refactor` index.

## Acceptance Criteria

1. Session-value and retrieval-calibration regressions are represented in evals.
2. Weak retrieval behavior and padded continuation behavior can block release.
3. Operators have a structured path to feed failures back into the program.
4. Documentation reflects the governed behavior rather than the pre-refactor
   assumptions.

## Verification

- Live and deterministic eval runs include new calibration scenarios.
- Release evidence fails closed if calibration artifacts are missing or red.
- Closeout docs link back to the spec and sprint package.