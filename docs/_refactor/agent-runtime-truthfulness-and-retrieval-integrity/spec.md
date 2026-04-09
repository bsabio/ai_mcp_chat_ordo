# Agent Runtime Truthfulness And Retrieval Integrity — Refactor Spec

> **Status:** Implemented
> **Date:** 2026-04-08
> **Scope:** Eliminate drift between prompt-visible claims, runtime tool
> manifests, corpus retrieval behavior, canonical citations, and public
> documentation so the agent stops sounding more certain than the system really
> is.
> **Affects:** `src/lib/corpus-vocabulary.ts`, `src/lib/chat/policy.ts`,
> `src/lib/chat/tool-composition-root.ts`, `src/core/tool-registry/*`,
> `src/core/use-cases/tools/*`, `src/adapters/ChatPresenter.ts`,
> `src/frameworks/ui/*`, `src/lib/evals/*`, `README.md`, and
> `docs/_refactor/*`

---

## 1. Program Statement

A live fourth-wall conversation exposed a class of defects that sit above any
single rendering bug.

The system answered confidently about its own prompts, routing, corpus, and
tooling, but several of those claims were either stale, partly inferred, or
dependent on prompt convention rather than runtime truth.

Confirmed issue groups:

1. Prompt-visible facts drifted from runtime truth.
2. The model could describe internal state more confidently than the runtime
   could actually verify.
3. Corpus retrieval and citation links were not canonical by default.
4. The model-facing tool surface contained unnecessary ambiguity and bundle
   hygiene drift.
5. Output contracts such as `__actions__`, `__suggestions__`, and audio blocks
   were more prompt-enforced than runtime-enforced.
6. Release and eval coverage did not explicitly guard against fourth-wall
   hallucination, prompt drift, canonical-link regressions, or output-contract
   omissions.
7. Public docs and README copy were allowed to drift from the live system.

This workstream exists to treat those as one integrity program rather than as a
collection of local prompt or UI patches.

---

## 2. Already-Landed Baseline

The following user-visible issues were already fixed during the live audit that
triggered this workstream:

1. Shared-shell hydration drift caused by render-time `matchMedia()` branching.
2. Literal markdown links rendering in chat when nested inside bold text.
3. Partial streamed action-link syntax appearing raw during incremental output.
4. Shorthand corpus aliases such as `the-magician` failing to resolve to the
   canonical chapter route.
5. Invalid `p > figure > figcaption` nesting in `MarkdownProse` causing
   hydration failure on reading routes.

Those fixes are the baseline. This program addresses the upstream architectural
contracts that allowed those failures to exist.

---

## 3. Program Goals

1. Make all prompt-visible corpus, route, and tool facts derive from one
   authoritative runtime source.
2. Ensure corpus references use canonical targets or validated aliases before
   the user sees them.
3. Reduce model-facing tool ambiguity without regressing role-aware access.
4. Distinguish verified runtime facts from model inference in self-descriptive
   or fourth-wall answers.
5. Move chat output contracts from prompt etiquette toward runtime-enforced
   structure and repair.
6. Make audio, navigation, and other UI-producing tools return structured
   results that can be inspected, rendered, and tested.
7. Expand deterministic and live eval coverage so prompt drift, canonical-link
   regressions, and fourth-wall hallucinations block release.
8. Align README and public documentation with the actual solo-build, open-source,
   and tool/runtime story of the system.

---

## 4. Confirmed Issue Tracks

| Track | Primary risk | Canonical areas |
| --- | --- | --- |
| Prompt and documentation drift | agent states stale counts, stale inventories, or outdated behavior as truth | `src/lib/corpus-vocabulary.ts`, `README.md`, prompt tests, docs drift checks |
| Retrieval and canonical citation integrity | plausible-sounding corpus references degrade trust | corpus tools, formatters, resolver routes, action-link generation |
| Tool surface ambiguity and bundle hygiene | model wastes turns on duplicate or legacy choices | tool bundles, registry composition, navigation tools, role manifests |
| Self-knowledge and fourth-wall honesty | agent confuses inferred internal state with verified state | prompt builder, routing context, current-page context, admin/runtime inspection |
| Output contract hardening | chips, inline actions, and audio behavior drift from parser/render expectations | `ChatPresenter`, stream pipeline, rich content renderer, audio tool/result payloads |
| Eval and release guardrails | regressions ship because honesty and link correctness are not release blockers | `src/lib/evals/*`, release evidence, sprint QA scripts |
| README and open-source proof drift | repository story undersells or misstates the system being shipped | `README.md`, contribution docs, generated inventories |

---

## 5. Integration Requirements

### 5.1 Truth-Source Contract

| Fact type | Required source of truth |
| --- | --- |
| corpus counts and labels | `corpusConfig` or generated corpus metadata |
| tool names and role access | live `ToolRegistry` role manifests |
| route labels and path validity | `SHELL_ROUTES` and validated navigation helpers |
| current page and visible context | authoritative page context blocks or runtime inspection |
| README volatile inventories | generated output or test-backed synchronization |

### 5.2 Self-Knowledge Contract

| Question type | Required behavior |
| --- | --- |
| “what tools do you have” | answer only from runtime manifest or inspection tool |
| “what page am I on” | prefer authoritative page context over model memory |
| “what is your confidence/lane” | answer only if supplied by server-owned context for the current session |
| “what does your system prompt say” | summarize governed high-level policy; do not freehand raw prompt disclosure |
| unknown internal state | explicitly label as unknown or inferred |

### 5.3 Corpus Reference Contract

| Concern | Required behavior |
| --- | --- |
| inline corpus link | use canonical book/chapter target or validated alias |
| anonymous search result | include safe canonical target metadata without leaking gated content |
| retrieval answer based only on search summary | either auto-read the winning section or surface reduced confidence |
| unresolved corpus slug | degrade gracefully to search or summary route, never dead-link |

### 5.4 Tool Manifest Contract

| Concern | Required behavior |
| --- | --- |
| model-facing navigation | one canonical navigation tool only |
| bundle composition | registration file matches concern; no hidden cross-category drift |
| role manifest | covered by snapshot or invariant tests |
| context-aware manifests | optional follow-on; gate behind instrumentation and feature flag |

### 5.5 Output Contract

| Surface | Required behavior |
| --- | --- |
| `__actions__` | parse, validate, normalize, or drop safely |
| `__suggestions__` | enforce presence and sane shape at final answer boundary |
| inline action links | preserve nested formatting and canonical targets |
| audio blocks | render from structured tool result, not just request args |

### 5.6 QA Intake And Artifact Contract

| Concern | Required artifact or path |
| --- | --- |
| generated volatile inventories | `npm run runtime:inventory` -> `release/runtime-inventory.json` |
| focused integrity QA closeout | `npm run qa:runtime-integrity` -> `release/runtime-integrity-evidence.json` |
| release blocker ingestion | `npm run release:evidence` must fail closed if the integrity artifact is missing or failed |
| manual QA intake | `.github/ISSUE_TEMPLATE/agent-runtime-integrity.yml` |

### 5.7 Manual QA To Coverage Mapping

| Issue bucket | Required first destination |
| --- | --- |
| prompt/runtime truth drift | `live-runtime-self-knowledge-honesty`, `live-current-page-truthfulness`, `src/lib/chat/current-page-context.test.ts`, `src/lib/corpus-vocabulary.test.ts` |
| retrieval/citation/link correctness | `integrity-canonical-corpus-reference-deterministic`, `src/core/use-cases/tools/search-corpus.tool.test.ts`, `src/core/tool-registry/ToolResultFormatter.test.ts` |
| output/render contract failure | `integrity-audio-recovery-deterministic`, `integrity-malformed-ui-tags-deterministic`, `src/adapters/ChatPresenter.test.ts`, `src/frameworks/ui/RichContentRenderer.test.tsx`, `src/components/AudioPlayer.test.tsx` |
| navigation tool drift | `live-duplicate-navigation-avoidance`, `src/lib/chat/tool-composition-root.test.ts` |

---

## 6. Delivery Sequence

| Sprint | Goal |
| --- | --- |
| 0 | Freeze findings, sources of truth, and acceptance gates |
| 1 | Remove prompt, doc, and manifest drift |
| 2 | Make retrieval and corpus citations canonical by default |
| 3 | Reduce tool ambiguity and add runtime inspection |
| 4 | Add self-knowledge guardrails and governed fourth-wall behavior |
| 5 | Harden output contracts, action repair, and audio results |
| 6 | Expand evals, release evidence, and QA ingestion |
| 7 | Align README, contribution docs, and governance closeout |

### 6.1 Why This Order

1. Drift must be removed before the system is asked to describe itself.
2. Retrieval and canonical reference fixes must land before link-heavy output
   contracts are considered closed.
3. Tool cleanup and inspection should precede fourth-wall honesty work so the
   agent has a truthful substrate to talk about.
4. Eval expansion and release gating should happen after the new contracts
   exist, not before.
5. README and open-source proof work should reflect the repaired runtime rather
   than race ahead of it.

---

## 7. Verification Standard

The program is not complete until all four categories below are green.

| Category | Minimum evidence |
| --- | --- |
| Static validation | diagnostics-clean changed files plus updated docs/spec references |
| Focused regression tests | prompt drift, registry composition, corpus links, rendering, audio, and action-contract suites pass |
| Eval confidence | deterministic and live scenarios cover fourth-wall questions, canonical corpus linking, and current-page truthfulness |
| Release confidence | `npm run build`, `npm run eval:live`, and release evidence checks complete without integrity blockers |

Recommended closeout commands:

```bash
npm run runtime:inventory
npm run qa:runtime-integrity
npm exec vitest run src/lib/corpus-vocabulary.test.ts src/adapters/ChatPresenter.test.ts src/adapters/MarkdownParserService.test.ts src/frameworks/ui/RichContentRenderer.test.tsx src/hooks/chat/chatStreamTextBuffer.test.ts src/hooks/chat/useChatStreamRuntime.test.tsx 'src/app/library/section/[slug]/page.test.ts' 'src/app/corpus/section/[slug]/page.test.ts' src/components/AudioPlayer.test.tsx
npm run eval:live
npm run build
npm run release:evidence
```

---

## 8. Non-Goals

1. This workstream does not replace role-based RBAC with an entirely new access
   model.
2. It does not promise full lane-scoped tool manifests in the first pass.
3. It does not remove fourth-wall answers entirely; it makes them bounded,
   truthful, and testable.
4. It does not introduce new product surfaces unless they directly reduce an
   integrity or governance risk.

---

## 9. Done Criteria

1. Prompt-visible corpus counts, tool access stories, and route references are
   synchronized with authoritative runtime sources.
2. Canonical corpus references are validated before the user sees them.
3. Duplicate or legacy model-facing navigation paths are removed.
4. The system can answer self-descriptive questions without inventing hidden
   internal state.
5. `__actions__`, `__suggestions__`, inline links, and audio blocks are backed
   by runtime contracts rather than prompt convention alone.
6. Release evidence includes guards for prompt drift, corpus-link correctness,
   fourth-wall truthfulness, and output-contract regressions through the
   runtime-integrity artifact.
7. README and public-facing docs tell the truth about the shipped system, the
   solo open-source build story, and the repeatable QA intake path.
