# Sprint 6 — Eval Expansion, Release Gates, And QA Ingestion

> **Goal:** Turn the new honesty, retrieval, and output contracts into release
> blockers and create a structured path from manual QA findings into reproducible
> eval coverage.
> **Spec ref:** §3, §7, §9
> **Prerequisite:** Sprint 5

---

## Task 6.1 — Expand deterministic and live eval coverage

**What:** Add scenarios for:

1. fourth-wall honesty
2. canonical corpus reference generation
3. current-page truth overriding stale assistant memory
4. duplicate navigation avoidance
5. audio failure and recovery behavior
6. missing or malformed action/suggestion tags

### Verify Task 6.1

```bash
npm run eval:live
```

---

## Task 6.2 — Make release evidence aware of integrity regressions

**What:** Extend release evidence generation so prompt drift, corpus-link
failures, and output-contract regressions block release instead of relying on
manual reviewer intuition.

### Verify Task 6.2

```bash
npm run release:evidence
npm run release:verify
```

---

## Task 6.3 — Normalize student/manual QA intake

**What:** Turn GitHub issues filed by students or manual QA into structured
evidence that can be triaged into one of three buckets:

1. prompt/runtime truth drift
2. retrieval/citation/link correctness
3. output/render contract failure

Required artifacts:

1. issue labels or templates
2. minimum reproduction fields
3. mapping from recurring issue class to eval scenario or regression test

### Verify Task 6.3

```bash
sed -n '1,240p' .github/copilot-instructions.md
sed -n '1,260p' docs/_refactor/agent-runtime-truthfulness-and-retrieval-integrity/spec.md
```

Verification note:
The exact QA-template location can change, but the sprint should end with a
repeatable path from human-found bug to durable regression coverage.

---

## Task 6.4 — Add one focused sprint QA bundle

**What:** Create a dedicated QA entrypoint for this workstream so closeout does
not depend on manually reassembling commands from multiple notes.

### Verify Task 6.4

```bash
npm run build
```
