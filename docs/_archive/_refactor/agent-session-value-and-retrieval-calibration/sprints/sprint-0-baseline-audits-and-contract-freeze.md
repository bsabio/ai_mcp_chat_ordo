# Sprint 0 — Baseline Audits And Contract Freeze

> **Status:** Implemented
> **Goal:** Establish the real current behavior for suggestions, clarification,
> retrieval, and chunking before changing any contract.

## Why This Sprint Exists

The source letters are directionally correct, but several important questions
are empirical:

- where suggestions are mandated versus merely repaired
- whether routing confidence exists as a runtime value or only as a concept
- what retrieval metadata already exists and what is still missing
- whether retrieval quality failures are upstream chunking failures or
  downstream search/ranking failures

Without that baseline, later sprints risk solving the wrong layer.

## Primary Areas

- `src/lib/corpus-vocabulary.ts`
- `src/adapters/ChatPresenter.ts`
- `src/core/entities/MessageFactory.ts`
- `src/frameworks/ui/MessageList.tsx`
- `src/lib/chat/policy.ts`
- `src/core/use-cases/tools/CorpusTools.ts`
- `src/core/use-cases/tools/search-corpus.tool.ts`
- `src/core/use-cases/tools/get-section.tool.ts`
- indexing/build scripts under `scripts/`
- current eval coverage under `src/lib/evals/`

## Tasks

1. **Suggestion contract audit**
   - Trace where `__suggestions__` is mandated, repaired, parsed, and rendered.
   - Record which parts are prompt-only and which parts are runtime-enforced.

2. **Clarification/routing audit**
   - Determine whether a numeric routing-confidence signal already exists for
     chat orchestration.
   - If it does not exist, document the actual gating mechanisms that currently
     lead to clarifying questions.

3. **Retrieval payload audit**
   - Inventory the exact `search_corpus` and `get_section` payload shapes.
   - Record what confidence metadata already exists (`relevance`, `rrfScore`,
     rank metadata, prefetched-section state) and what is missing.

4. **Chunk boundary audit**
   - Produce a reproducible chunk census with average size, overlap, and
     boundary source (section heading, paragraph break, token window, etc.).
   - Record at least 5 concepts that span multiple chunks.

5. **Query sensitivity mini-benchmark**
   - Take 10 representative corpus concepts and run 3–5 phrasings for each.
   - Save top results and note variance by phrasing.

6. **Coverage map baseline**
   - Choose a representative sample of chapters from the 10 books.
   - For each, run multiple queries and record top-3 recall quality.

7. **Contract freeze document**
   - Write down the baseline response-state, suggestion, retrieval, and chunk
     schemas that later sprints will intentionally change.

## Required Artifacts

- `docs/_refactor/agent-session-value-and-retrieval-calibration/baseline-audit.md`
  or equivalent appendix added during implementation
- query sensitivity matrix
- chunk census summary
- retrieval payload snapshots

## Implementation Outputs

- `docs/_refactor/agent-session-value-and-retrieval-calibration/baseline-audit.md`
- `docs/_refactor/agent-session-value-and-retrieval-calibration/artifacts/chunk-census.json`
- `docs/_refactor/agent-session-value-and-retrieval-calibration/artifacts/query-sensitivity-matrix.json`
- `docs/_refactor/agent-session-value-and-retrieval-calibration/artifacts/coverage-map.json`
- `docs/_refactor/agent-session-value-and-retrieval-calibration/artifacts/retrieval-payload-snapshots.json`
- `scripts/run-session-value-baseline.ts`
- `npm run qa:session-value-baseline`

## Acceptance Criteria

1. The team can point to the exact current suggestion mandate and render path.
2. The team knows whether routing confidence is a real runtime primitive or a
   planned concept.
3. The current retrieval payloads are documented field-by-field.
4. Chunking quality is measured rather than assumed.
5. Later sprint work can reference a frozen baseline instead of hand-wavy
   descriptions.

## Verification

- Add or update audit tests for current payload shapes.
- Preserve baseline artifacts in source control.
- Do not change production behavior in this sprint except for optional logging
  hooks needed to gather evidence.
- Regenerate artifacts with `npm run qa:session-value-baseline`.