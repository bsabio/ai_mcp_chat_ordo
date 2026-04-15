# Agent Session Value And Retrieval Calibration — Refactor Spec

> **Status:** Planned
> **Date:** 2026-04-09
> **Scope:** Turn live operator feedback into governed interaction honesty,
> calibrated retrieval, and session-value instrumentation so the system stops
> sounding more complete, more certain, or more eager to continue than the
> runtime can justify.
> **Source letters:** `docs/_refactor/messages/letter.md`,
> `docs/_refactor/messages/search_letter.md`
> **Builds on:** `docs/_refactor/agent-runtime-truthfulness-and-retrieval-integrity/`
> **Affects:** `src/lib/chat/policy.ts`, `src/lib/corpus-vocabulary.ts`,
> `src/lib/chat/*`, `src/core/use-cases/tools/CorpusTools.ts`,
> `src/core/use-cases/tools/search-corpus.tool.ts`,
> `src/core/use-cases/tools/get-section.tool.ts`, retrieval/indexing scripts,
> `src/lib/evals/*`, config prompts, and release evidence docs.

---

## 1. Program Statement

Two live operator letters surfaced the same root defect from different angles.

1. The system keeps conversations moving even when the work is already done.
2. The retrieval stack lets the system sound confident even when the match is
   partial, thin, or only indirectly related.

The shared problem is calibration.

The runtime is already capable enough to produce useful answers. The missing
layer is disciplined behavior around:

- when to stop cleanly
- when to ask one precise question instead of generating padded chips
- when to surface retrieval strength versus retrieval weakness
- when to answer from source and when to admit the source is not strong enough

This workstream exists to make those behaviors explicit, testable, and release
gated.

---

## 2. Relation To Existing Workstreams

This package is not a duplicate of the already-landed truthfulness and
retrieval-integrity workstream.

That workstream repaired prompt drift, canonical links, runtime self-knowledge,
and output-contract integrity. This one is the behavior-calibration layer that
comes after those contracts are trustworthy.

Distinction:

- **Runtime Truthfulness And Retrieval Integrity**: make system claims and tool
  outputs derive from runtime truth.
- **Session Value And Retrieval Calibration**: make the agent behave honestly
  with that truth by changing how it closes, clarifies, suggests, and frames
  retrieval confidence.

---

## 3. Current Baseline

The codebase already contains useful primitives this program should build on
rather than replace.

### 3.1 Interaction Baseline

- `src/lib/corpus-vocabulary.ts` still contains a hard `__suggestions__`
  directive that enforces a fixed chip format.
- `src/adapters/ChatPresenter.ts` repairs and parses `__suggestions__` and
  `__actions__` but does not distinguish between open, closed, and
  needs-input responses.
- `src/hooks/chat/chatState.ts` and config prompts provide bootstrap
  suggestions, but those suggestions are still quantity-oriented rather than
  state-oriented.

### 3.2 Retrieval Baseline

- `search_corpus` already returns a structured payload with qualitative
  relevance (`high | medium | low`), canonical paths, RRF metadata, and a
  conditional prefetched section.
- `get_section` still returns plain text instead of a richer, structured
  response contract.
- `search_corpus` can prefetch the top section for authenticated roles, but the
  agent-facing contract still does not expose a normalized score or an explicit
  `retrieval_quality` state.

### 3.3 Integrity Baseline

- Current-page truthfulness, canonical corpus links, and runtime-manifest work
  already exist and should be treated as prerequisites.
- The new work is about using those substrates to govern behavior, not about
  re-solving runtime truth from scratch.

---

## 4. Program Goals

1. Replace unconditional follow-up suggestions with a governed response-state
   model: `open`, `closed`, `needs_input`.
2. Allow explicit closure responses without trailing momentum artifacts.
3. Tune clarification behavior so low-confidence routing only interrupts when
   the message is genuinely ambiguous, not merely hard to classify.
4. Reduce suggestion quantity pressure and prioritize quality over count.
5. Pass retrieval confidence signals to the agent in a structured form.
6. Make two-stage retrieval the default for strong corpus matches.
7. Return related sections and richer metadata so synthesis answers can stay
   grounded instead of memory-driven.
8. Audit and then improve chunk boundaries so retrieval quality is not limited
   by arbitrary fragmentation.
9. Add observability, evals, and release evidence focused on session value and
   calibrated retrieval rather than simple engagement volume.

---

## 5. Confirmed Issue Tracks

| Track | Primary risk | Canonical areas |
| --- | --- | --- |
| Response-state and closure discipline | the system extends conversations after meaningful completion | `src/lib/corpus-vocabulary.ts`, prompt assembly, presenter suggestion repair, chat UI chip rendering |
| Clarification and routing calibration | sophisticated requests trigger unnecessary clarifying turns | prompt builder, routing context, chat policy, tool-capability routing |
| Suggestion quality | padded chips dilute trust and teach users to ignore the feature | prompt directives, presenter repair, suggestion UI and evals |
| Retrieval confidence plumbing | the system infers match quality instead of reasoning from a signal | `CorpusTools.ts`, `search-corpus.tool.ts`, tool result formatter, eval runner |
| Retrieval orchestration | answers are sometimes framed from summaries when full-source reads are warranted | `search_corpus`, `get_section`, chat policy, corpus tool contracts |
| Chunking and query sensitivity | weak retrieval is caused upstream by fragment boundaries and brittle phrasing | indexing scripts, corpus metadata, search handler, QA audit scripts |
| Session-value observability | release gates overvalue engagement continuation and undervalue resolved outcomes | evals, runtime evidence, structured logging, QA intake |

---

## 6. Integration Requirements

### 6.1 Response-State Contract

| Concern | Required behavior |
| --- | --- |
| answer clearly complete | emit `response_state: "closed"`; no follow-up chips |
| answer opens real next steps | emit `response_state: "open"`; generate 1–3 follow-ups only |
| answer cannot proceed without user input | emit `response_state: "needs_input"`; ask one precise question |
| chip generation | generated from response state, not from unconditional prompt mandate |

### 6.2 Closure And Session-Resolution Contract

| Concern | Required behavior |
| --- | --- |
| finished work | allow explicit closure copy without re-opening the thread |
| meaningful outcome | emit a lightweight `session_resolution` signal for instrumentation |
| metrics | track resolved outputs per session in addition to turn count |

### 6.3 Clarification And Routing Contract

| Concern | Required behavior |
| --- | --- |
| low routing confidence | only interrupt below the governed threshold |
| coherent technical request | content-based override suppresses unnecessary clarifying turns |
| explainability | threshold and override behavior must be test-backed and documented |

### 6.4 Retrieval Result Contract

| Concern | Required behavior |
| --- | --- |
| result quality | include normalized score plus `retrieval_quality: "strong" | "partial" | "none"` |
| top result inspection | include chunk summary, canonical path, and match metadata |
| strong match | answer from full section content by default |
| partial or none | require explicit uncertainty framing instead of confident smoothing |

### 6.5 `get_section` Contract

| Concern | Required behavior |
| --- | --- |
| payload shape | return structured content + metadata, not only raw markdown text |
| related context | include 2–3 `related_sections` entries |
| slug validity | all citation targets must resolve or degrade safely |

### 6.6 Chunk And Index Contract

| Concern | Required behavior |
| --- | --- |
| boundary strategy | prefer section and concept-complete boundaries over fixed token windows |
| chunk metadata | include book, chapter, section, local position, and adjacency metadata |
| auditability | chunk census, overlap metrics, and coverage reports are reproducible artifacts |

### 6.7 Eval And Release Contract

| Concern | Required behavior |
| --- | --- |
| suggestion discipline | evals prove closure responses do not emit chips |
| clarification discipline | evals prove coherent asks are not derailed by low-confidence routing noise |
| retrieval confidence | evals prove weak matches are surfaced honestly |
| release evidence | session-value and retrieval-calibration checks must block release when red |

---

## 7. Delivery Sequence

| Sprint | Goal |
| --- | --- |
| 0 | Freeze baseline findings, current contracts, and audit harnesses |
| 1 | Add response-state gating and explicit closure behavior |
| 2 | Tune routing confidence, suggestion quality rules, and session-resolution signals |
| 3 | Surface normalized retrieval scores and confidence-aware answer framing |
| 4 | Default to two-stage retrieval and enrich `get_section` with related context and slug guarantees |
| 5 | Audit and improve chunk boundaries, query sensitivity, and coverage quality |
| 6 | Add observability, evals, release gates, and governance closeout |

### 7.1 Why This Order

1. The interaction layer is cheaper to fix and immediately visible to users.
2. Retrieval confidence plumbing should land before heavier indexing work so the
   system can already be more honest even on imperfect chunks.
3. Two-stage retrieval and related-sections should build on explicit scores, not
   on heuristic guesswork.
4. Chunking changes should be driven by audit data, not by intuition.
5. Evals and release gates should close the loop after the new contracts exist.

---

## 8. Verification Standard

The workstream is not complete until all categories below are green.

| Category | Minimum evidence |
| --- | --- |
| Static validation | diagnostics-clean changed files plus updated prompt/docs references |
| Interaction regression | closure, needs-input, suggestion-count, and routing-threshold suites pass |
| Retrieval calibration | score passthrough, two-stage reads, related sections, and weak-match framing suites pass |
| Audit evidence | chunk census, query sensitivity matrix, and coverage map artifacts are generated and reviewed |
| Release confidence | build, evals, and new calibration evidence complete without blockers |

Target closeout commands after implementation:

```bash
npm exec vitest run src/adapters/ChatPresenter.test.ts src/lib/corpus-vocabulary.test.ts src/core/use-cases/tools/search-corpus.tool.test.ts tests/config-bootstrap.test.ts tests/presenter-ast-boundary.test.ts
npm run qa:session-value
npm run qa:retrieval-calibration
npm run build
```

If those scripts do not exist yet, Sprint 6 must add them.

---

## 9. Non-Goals

1. This program does not change the brand persona or soften the voice.
2. It does not replace the existing tool registry architecture.
3. It does not promise perfect retrieval before the chunk audit is complete.
4. It does not optimize for longer conversations or higher chip click-through.
5. It does not expose raw internal prompts beyond governed summaries.

---

## 10. Done Criteria

1. The system can finish a complete answer without artificial continuation.
2. Follow-up suggestions are emitted only when the response genuinely opens new
   work, and the count is governed by value rather than quota.
3. Clarifying questions trigger only for truly ambiguous asks, not for coherent
   technical requests.
4. Retrieval results provide normalized confidence signals the agent can use.
5. Weak or partial corpus matches are surfaced honestly instead of being hidden
   behind confident prose.
6. `search_corpus` and `get_section` work together as a governed two-stage
   retrieval path with related context and validated citation targets.
7. Chunking quality is measured, documented, and improved through a reproducible
   audit instead of ad hoc tuning.
8. Release evidence includes calibration-specific regressions for conversation
   closure, suggestion discipline, retrieval confidence, and weak-match honesty.