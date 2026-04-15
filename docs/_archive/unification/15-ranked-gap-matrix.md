# 15 Ranked Gap Matrix
> **Historical snapshot.** This document describes the pre-unification system
> state and was used as research input for the sprint program. For current
> architecture, see `02-post-unification-architecture.md` and
> `04-fully-unified-architecture.md`.
This document ranks the highest-value next moves across the unification research set.

The ranking is based on two factors:

- reliability gain
- migration risk

It is not identical to dependency order.

Some items with the highest long-term architectural importance still rank below lower-risk moves that deliver faster reliability improvement.

## 1. Scoring Model

### Reliability gain

- `5` = closes a high-pressure production seam or removes a major source of drift
- `4` = materially improves consistency across core subsystems
- `3` = meaningful but narrower improvement
- `2` = useful cleanup or guardrail
- `1` = marginal near-term reliability effect

### Migration risk

- `1` = small blast radius, mostly additive
- `2` = limited surface-area change with clear rollback path
- `3` = moderate cross-file migration with manageable runtime risk
- `4` = touches critical path or multi-surface behavior
- `5` = broad platform-level cutover with high coordination cost

## 2. Ranked Matrix

| Rank | Gap-closure move | Evidence docs | Reliability gain | Migration risk | Why it ranks here | First concrete deliverable |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Unify prompt mutation behind one domain service for admin, MCP, and scripts | [12](12-prompt-equivalence-and-control-plane-audit.md), [10](10-current-works-vs-doesnt-work.md), [09](09-service-lifetime-and-control-plane-seams.md) | 5 | 2 | It closes a live control-plane split with relatively low blast radius and creates one side-effect contract before deeper runtime work | `PromptControlPlaneService` plus shared role inventory and mutation-equivalence tests |
| 2 | Introduce effective-prompt provenance as a first-class runtime output | [12](12-prompt-equivalence-and-control-plane-audit.md), [03](03-target-architecture.md), [05](05-provider-and-prompt-unification.md) | 5 | 3 | It makes runtime truth inspectable and reduces ambiguity before provider changes land | `PromptRuntime.build(...)` returning `text + provenance` for chat and eval |
| 3 | Add seam-level integration tests around real route, prompt, and provider composition | [13](13-test-reality-inventory.md), [10](10-current-works-vs-doesnt-work.md), [06](06-test-and-verification-strategy.md) | 5 | 3 | The current suite is strongest locally but weakest at the duplicated seams; additive seam tests reduce blind spots immediately | reduced-mock chat route and prompt-control equivalence tests |
| 4 | Extract one shared provider-policy core for streaming and direct-turn chat | [11](11-provider-runtime-path-matrix.md), [05](05-provider-and-prompt-unification.md), [13](13-test-reality-inventory.md) | 5 | 4 | This is the highest-value runtime convergence in chat, but it touches the most sensitive path and should follow prompt-truth work | `ProviderRuntime.resolvePolicy(...)` adopted by both `anthropic-stream.ts` and `chat-turn.ts` |
| 5 | Normalize prompt slot coverage and defaults for all real runtime roles, especially `APPRENTICE` | [12](12-prompt-equivalence-and-control-plane-audit.md) | 3 | 1 | It is a clear blind spot with low migration cost and should be folded into the control-plane cleanup immediately | one authoritative prompt-role inventory used by seeds, admin, and MCP |
| 6 | Pilot a derived capability catalog for the highest-drift deferred content tools | [04](04-capability-unification.md), [07](07-migration-roadmap.md), [10](10-current-works-vs-doesnt-work.md) | 4 | 3 | It attacks metadata duplication where runtime, job, and UI contracts already drift, without requiring a repo-wide cutover | catalog-driven definitions for `draft_content`, `publish_content`, `compose_media`, and `admin_web_search` |
| 7 | Extend shared provider runtime policy to summarization, blog, image, and TTS flows | [11](11-provider-runtime-path-matrix.md), [03](03-target-architecture.md) | 3 | 3 | Useful after chat convergence proves the provider contract, but lower-value than fixing the main chat split first | provider adapters for summarizer, blog article, blog image, and TTS use cases |
| 8 | Establish one authoritative deferred-job projection path for UI state | [08](08-chat-runtime-event-topology.md), [10](10-current-works-vs-doesnt-work.md) | 4 | 4 | It addresses a major reliability seam, but the event topology is multi-channel and riskier to change than prompt-control or provider-policy work | one job-state projection service feeding stream promotion, events route, jobs route, and presenter |
| 9 | Declare and enforce service lifetime policy across request scope, process cache, and process memory | [09](09-service-lifetime-and-control-plane-seams.md), [10](10-current-works-vs-doesnt-work.md), [13](13-test-reality-inventory.md) | 3 | 4 | Important for long-term clarity, but more structural than immediately stabilizing unless tied to a concrete runtime migration | lifetime map plus composition-root ownership rules |
| 10 | Derive MCP tool exposure from shared capability definitions instead of hand-maintained server lists | [03](03-target-architecture.md), [04](04-capability-unification.md), [07](07-migration-roadmap.md), [10](10-current-works-vs-doesnt-work.md) | 3 | 5 | High strategic value, but it should follow capability-catalog proof and prompt/provider convergence rather than lead them | one generated MCP export slice from the capability catalog |

## 3. What The Ranking Means In Practice

### Highest gain-to-risk moves now

The strongest near-term moves are:

1. unify prompt mutation semantics
2. surface effective prompt provenance
3. add seam-level integration tests

These do not solve every architectural split, but they change the repo from “hard to reason about” to “inspectable enough to refactor safely.”

### Highest raw-value move with higher execution risk

The single biggest runtime convergence move is shared provider policy across chat stream and direct turn.

It does not rank first because it touches the highest-pressure path and should not be attempted while effective prompt truth and seam-level tests are still weak.

### Important but not first

Capability-catalog derivation, authoritative job projection, lifetime cleanup, and MCP export derivation all matter.

They are not first because they either:

- depend on earlier contract unification
- touch broader surfaces
- or improve consistency more than immediate reliability

## 4. Recommended Waves

### Wave A

- unify prompt mutation service
- normalize prompt role coverage
- introduce prompt provenance
- add seam-level integration tests

### Wave B

- extract shared chat provider policy
- pilot capability catalog derivation for deferred content tools

### Wave C

- extend provider runtime beyond chat
- introduce authoritative deferred-job projection
- declare service lifetime policy
- derive MCP exports from the shared catalog

## 5. Success Reading

This ranking should be considered correct if it helps the repo do two things at once:

1. reduce real drift now
2. create safer conditions for the heavier architectural moves later

That is the purpose of the matrix.
