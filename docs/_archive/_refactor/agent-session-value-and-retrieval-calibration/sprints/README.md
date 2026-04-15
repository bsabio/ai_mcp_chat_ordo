# Implementation Plan — Agent Session Value And Retrieval Calibration

> **Status:** Ready for implementation
> **Source:** `docs/_refactor/agent-session-value-and-retrieval-calibration/spec.md`
> **Focus:** Make the system finish cleanly, ask better clarifying questions,
> surface retrieval confidence explicitly, and improve chunk/retrieval quality
> using audited evidence instead of guesswork.

## Why This Package Exists

The source letters identified two distinct but connected problems:

1. conversation flow is optimized to keep going
2. retrieval behavior is optimized to sound confident rather than to signal
   confidence honestly

These sprint files turn that feedback into a governed implementation sequence.

## Sprint Files

| Sprint | File | Description |
| --- | --- | --- |
| 0 | [sprint-0-baseline-audits-and-contract-freeze.md](sprint-0-baseline-audits-and-contract-freeze.md) | Audit current suggestion, routing, retrieval, and chunking behavior before changing contracts |
| 1 | [sprint-1-response-state-gating-and-closure-contract.md](sprint-1-response-state-gating-and-closure-contract.md) | Introduce `open / closed / needs_input` response-state handling and explicit closure behavior |
| 2 | [sprint-2-routing-confidence-suggestion-quality-and-session-resolution.md](sprint-2-routing-confidence-suggestion-quality-and-session-resolution.md) | Tune clarification behavior, remove suggestion quota pressure, and add session-resolution instrumentation |
| 3 | [sprint-3-retrieval-score-passthrough-and-calibrated-framing.md](sprint-3-retrieval-score-passthrough-and-calibrated-framing.md) | Surface normalized retrieval scores and require score-aware answer framing |
| 4 | [sprint-4-two-stage-retrieval-related-sections-and-slug-integrity.md](sprint-4-two-stage-retrieval-related-sections-and-slug-integrity.md) | Make locate-then-read the default path and enrich retrieval payloads with related context |
| 5 | [sprint-5-semantic-chunking-query-sensitivity-and-coverage-mapping.md](sprint-5-semantic-chunking-query-sensitivity-and-coverage-mapping.md) | Audit and improve chunk boundaries, query sensitivity, and corpus coverage |
| 6 | [sprint-6-observability-evals-and-governance-closeout.md](sprint-6-observability-evals-and-governance-closeout.md) | Add QA artifacts, evals, and release gates for session value and retrieval calibration |

## Dependency Graph

```text
Sprint 0 (baseline + contract freeze)
  └──→ Sprint 1 (response-state gating + closure)
         └──→ Sprint 2 (routing + suggestion quality + session resolution)
                └──→ Sprint 3 (retrieval score passthrough + framing)
                       └──→ Sprint 4 (two-stage retrieval + related sections + slug integrity)
                              └──→ Sprint 5 (chunking + query sensitivity + coverage)
                                     └──→ Sprint 6 (observability + evals + release gates)
```

## Release Rule

Do not call this work complete because the prompt text sounds more disciplined.
The closeout bar is that the runtime, retrieval payloads, UI behavior, and eval
artifacts all enforce the same calibration story.