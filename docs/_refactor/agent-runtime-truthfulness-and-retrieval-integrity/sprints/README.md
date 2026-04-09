# Implementation Plan — Agent Runtime Truthfulness And Retrieval Integrity

> **Status:** Ready for implementation
> **Source:** `docs/_refactor/agent-runtime-truthfulness-and-retrieval-integrity/spec.md`
> **Focus:** Keep the agent truthful about its own runtime, make corpus
> references canonical, harden chat output contracts, and close drift between
> prompts, tools, retrieval, and docs.

## Shipped Baseline

The following defects were already remediated before this program was written:

1. Shell hydration drift from render-time viewport branching.
2. Markdown action-link rendering failures inside bold text.
3. Partial streamed markdown/action-link fragments appearing raw.
4. Shorthand corpus aliases failing to resolve to canonical library chapters.
5. `MarkdownProse` figure nesting causing hydration failure on reading pages.

These sprint files focus on the remaining upstream integrity work.

## Sprint Files

| Sprint | File | Description |
| --- | --- | --- |
| 0 | [sprint-0-baseline-findings-and-source-of-truth-freeze.md](sprint-0-baseline-findings-and-source-of-truth-freeze.md) | Lock findings, authoritative sources, and verification gates |
| 1 | [sprint-1-prompt-doc-and-manifest-drift-elimination.md](sprint-1-prompt-doc-and-manifest-drift-elimination.md) | Remove stale prompt and documentation claims and add drift tests |
| 2 | [sprint-2-retrieval-orchestration-and-canonical-citation-contract.md](sprint-2-retrieval-orchestration-and-canonical-citation-contract.md) | Make retrieval, corpus links, and anonymous-safe reference metadata canonical |
| 3 | [sprint-3-tool-surface-hygiene-navigation-and-runtime-introspection.md](sprint-3-tool-surface-hygiene-navigation-and-runtime-introspection.md) | Remove model-facing ambiguity and add truthful runtime inspection surfaces |
| 4 | [sprint-4-self-knowledge-guardrails-and-page-truthfulness.md](sprint-4-self-knowledge-guardrails-and-page-truthfulness.md) | Govern fourth-wall answers and enforce verified-vs-inferred self-description |
| 5 | [sprint-5-output-contracts-audio-result-structure-and-render-hardening.md](sprint-5-output-contracts-audio-result-structure-and-render-hardening.md) | Move chips, audio, and action rendering from prompt convention to runtime contract |
| 6 | [sprint-6-eval-expansion-release-gates-and-qa-ingestion.md](sprint-6-eval-expansion-release-gates-and-qa-ingestion.md) | Turn new integrity risks into blocking evals and structured QA intake |
| 7 | [sprint-7-readme-open-source-proof-story-and-governance-closeout.md](sprint-7-readme-open-source-proof-story-and-governance-closeout.md) | Align the public repo story, contribution docs, and governance closeout |

## Dependency Graph

```text
Sprint 0 (baseline + truth sources)
  └──→ Sprint 1 (prompt/doc drift)
         └──→ Sprint 2 (retrieval + canonical citations)
                └──→ Sprint 3 (tool surface + introspection)
                       └──→ Sprint 4 (self-knowledge guardrails)
                              └──→ Sprint 5 (output contracts + audio)
                                     └──→ Sprint 6 (evals + release gates + QA ingestion)
                                            └──→ Sprint 7 (README + governance closeout)
```

## Release Rule

Do not treat this program as complete when the prompt text merely sounds
better. The closeout bar is that the runtime, prompts, docs, link targets, and
eval evidence all tell the same story.
