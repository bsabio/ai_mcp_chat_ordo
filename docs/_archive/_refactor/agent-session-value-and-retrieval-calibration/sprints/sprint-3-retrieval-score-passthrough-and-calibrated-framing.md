# Sprint 3 — Retrieval Score Passthrough And Calibrated Framing

> **Status:** Planned
> **Goal:** Expose retrieval confidence explicitly and require response framing
> that matches the strength of the retrieved evidence.

## Problem

The current retrieval stack already carries useful metadata, but the agent does
not receive a clean, normalized confidence signal it can reason about.

That is the core reason weak matches can still be narrated with unjustified
confidence.

## Primary Areas

- `src/core/use-cases/tools/CorpusTools.ts`
- `src/core/use-cases/tools/search-corpus.tool.ts`
- `src/core/tool-registry/ToolResultFormatter.ts`
- prompt guidance in `src/lib/corpus-vocabulary.ts`
- eval runner and live scenarios under `src/lib/evals/`

## Tasks

1. **Normalized score passthrough**
   - Add a numeric relevance score to the agent-facing `search_corpus` payload.
   - Preserve existing rank metadata where useful; do not throw away already
     helpful signals.

2. **Retrieval-quality enum**
   - Add `retrieval_quality: "strong" | "partial" | "none"` to the payload.
   - Define this enum from explicit thresholds rather than prose.

3. **Framing rules**
   - Strong: answer directly from retrieved evidence.
   - Partial: answer with an explicit “strong related section / adjacent content
     may still matter” frame.
   - None: state that the corpus lacks a strong match and distinguish reasoning
     from first principles versus source-grounded retrieval.

4. **Prompt and formatter alignment**
   - Ensure the prompt tells the model how to use the new score/quality fields.
   - Ensure tool formatters preserve the new contract without flattening it away.

## Acceptance Criteria

1. `search_corpus` returns normalized score plus `retrieval_quality`.
2. The agent can distinguish strong, partial, and none without guessing.
3. Weak matches are surfaced honestly in deterministic evals.

## Verification

- Expand `search-corpus.tool.test.ts` to assert score and quality fields.
- Add eval cases for partial and no-strong-match responses.
- Add regression tests preventing tool formatters from stripping the new fields.