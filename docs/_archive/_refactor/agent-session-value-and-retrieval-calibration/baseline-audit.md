# Sprint 0 Baseline Audit

> **Status:** Implemented
> **Generated:** 2026-04-10
> **Workstream:** `docs/_refactor/agent-session-value-and-retrieval-calibration/`
> **Regenerate:** `npm run qa:session-value-baseline`

## Artifact Inventory

- `docs/_refactor/agent-session-value-and-retrieval-calibration/artifacts/chunk-census.json`
- `docs/_refactor/agent-session-value-and-retrieval-calibration/artifacts/query-sensitivity-matrix.json`
- `docs/_refactor/agent-session-value-and-retrieval-calibration/artifacts/coverage-map.json`
- `docs/_refactor/agent-session-value-and-retrieval-calibration/artifacts/retrieval-payload-snapshots.json`

## Suggestion Contract Baseline

The current system still treats follow-up suggestions as a mandatory output contract rather than a response-state decision.

- `src/lib/corpus-vocabulary.ts` still carries the explicit `DYNAMIC SUGGESTIONS (MANDATORY - never skip)` instruction and the exact `__suggestions__: ["Q1?","Q2?","Q3?","Q4?"]` shape.
- `src/core/entities/MessageFactory.ts` appends a `__suggestions__` tag to hero/bootstrap assistant messages unconditionally.
- `src/adapters/ChatPresenter.ts` strips tagged suggestion arrays out of assistant text, normalizes them, and repairs empty or malformed suggestion payloads with default suggestions when text is non-empty.
- `src/frameworks/ui/MessageList.tsx` renders those chips directly from the presented suggestion array when the last assistant turn is visible and not blocked by the sending state.

What is *not* present yet is equally important.

- The prompt does not mention `response_state`.
- The prompt does not mention `session_resolution`.
- There is no explicit closure-only output contract in the presenter or UI.

This means Sprint 1 will be changing a real, test-backed suggestion mandate rather than cleaning up optional behavior.

## Routing And Clarification Baseline

Routing confidence is already a real runtime primitive.

- `ConversationRoutingSnapshot` already contains `lane`, `confidence`, `recommendedNextStep`, and `detectedNeedSummary`.
- `src/lib/chat/routing-context.ts` injects `lane=<value>`, `confidence=<value>`, and a lane-specific `routing_instruction` into the prompt assembly path.
- The `uncertain` lane instruction already says to ask one brief clarifying question.
- Admin tool prefiltering already uses high-confidence routing as a runtime gate in `src/lib/chat/tool-capability-routing.ts`.

At the same time, the interaction-calibration layer is still missing.

- `src/lib/chat/policy.ts` composes identity, role directive, and page context only.
- There is no governed `open | closed | needs_input` contract.
- There is no thresholded clarification policy exposed as a first-class response-state system.

So the baseline is: confidence exists, prompt injection exists, tool scoping exists, but response-state calibration does not.

## Retrieval Payload Baseline

The retrieval stack is not starting from zero. `search_corpus` is already structured.

- `search_corpus` currently returns `query`, `groundingState`, `followUp`, `results`, and `prefetchedSection`.
- Result items already include canonical and resolver paths, qualitative `relevance`, and optional hybrid rank metadata such as `rrfScore`, `vectorRank`, `bm25Rank`, `matchSection`, and `passageOffset` when the backend supplies them.
- `get_section` still returns a single markdown string headed `# <book> - <title>` and truncates content over 4000 characters.

The generated payload snapshots show two important baseline facts.

- A strong authenticated query such as `printing press analogy` still resolved to `groundingState: "search_only"` rather than `prefetched_section` because multiple high-confidence sections competed.
- `get_section` is still a plain string contract with truncation, not a structured response with metadata or related sections.

That means later sprints should be framed as retrieval-contract enrichment, not a first introduction of structure.

## Chunking Baseline

The active corpus baseline is:

- 10 active documents
- 87 active sections
- 574 total chunks

Observed chunk mix from the generated census:

- `document`: 87
- `section`: 385
- `passage`: 102

Observed average word counts:

- `document`: 306.91
- `section`: 140.99
- `passage`: 42.21

Observed overlap behavior:

- 11 overlap pairs total
- all overlap is `section -> passage`
- no generalized sliding-window overlap showed up in the census

Observed boundary sources:

- `h2_heading`: 390
- `document_start`: 174
- `inline_offset`: 10

This matters because it confirms the chunker is already heading-aware rather than arbitrary fixed-window slicing. The dominant failure mode is not "flat token windows everywhere". The actual baseline is a layered document/section/passage strategy with a 400-word max and 50-word min default, plus atomic preservation for fenced code blocks, lists, blockquotes, and tables.

Representative multi-chunk concepts captured by the census:

- `sources-and-lineage/ch08-erikson-anderson`
- `sources-and-lineage/ch06-jung-mark-pearson`
- `sources-and-lineage/ch09-andreessen-pmf`
- `signal-and-deployment/ch03-meetup-ladder`
- `curriculum-architecture/ch02-eight-course-spine`

## Query Sensitivity And Coverage Baseline

The mini-benchmark sampled one representative chapter from each active book with three phrasings per concept.

Headline results:

- average top-1 hit rate: `0.60`
- average top-3 hit rate: `0.67`
- recall quality distribution: `7 strong / 3 partial / 0 weak`
- variance distribution: `2 high / 6 medium / 2 low`

The partial sample cases in the current coverage map are:

- `archetype-atlas/ch01-what-an-archetype-is`
- `signal-and-deployment/ch01-portfolio-as-product`
- `trust-proof-persuasion/ch01-trust-is-not-a-mood`

The archetype-definition case is the clearest warning sign. The sample produced high-variance top hits and often surfaced adjacent lineage or identity-table chapters before the direct definition chapter. That is exactly the kind of confidence drift the source letters warned about: semantically nearby material can look strong enough to answer from unless the system is explicitly calibrated.

The sample also shows that retrieval quality is uneven rather than universally weak. Several chapters already retrieve strongly across phrasing variants, which argues for targeted calibration and chunk/index improvements rather than broad replacement.

## Contract Freeze

The frozen baseline for later sprints is now explicit:

- prompt contract: fixed four-suggestion mandate, no `response_state`, no `session_resolution`
- bootstrap/hero contract: assistant bootstrap messages append `__suggestions__` directly
- presenter contract: empty or malformed suggestion payloads are repaired for non-empty assistant text
- routing contract: server-owned confidence and lane metadata already exist, but are not yet surfaced as a governed user-facing response-state system
- retrieval contract: `search_corpus` is structured, `get_section` is still plain string output
- chunk contract: heading-aware markdown chunking with `maxChunkWords = 400`, `minChunkWords = 50`, plus document/section/passage layers and atomic markdown block preservation

## Verification

- `npm run qa:session-value-baseline`
- `npm exec vitest run src/lib/corpus-vocabulary.test.ts src/core/entities/MessageFactory.test.ts src/core/use-cases/tools/search-corpus.tool.test.ts src/core/use-cases/tools/get-section.tool.test.ts tests/search/markdown-chunker.test.ts src/lib/chat/routing-context.test.ts`

Sprint 0 is complete when later work can point to these artifacts instead of arguing from assumptions.