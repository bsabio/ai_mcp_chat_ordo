# System Integrity Remediation Program — Refactor Spec

> **Status:** Planned
> **Date:** 2026-03-15
> **Scope:** Coordinate remediation for all confirmed repository audit findings
> under one delivery plan so auth, conversation ownership, anonymous restore,
> and summary safety changes land with explicit sequencing and verification.
> **Affects:** `docs/_refactor/*`, auth/session helpers, conversation restore
> routes, anonymous migration flow, conversation-search indexing, summary
> replay, summarization trigger path, and regression test coverage

---

## 1. Program Statement

Repository review confirmed a small set of cross-cutting defects that are too
related to treat as isolated bugfixes.

Confirmed issue groups:

1. Session identity could drift across the real-session boundary through the
   mock-role cookie.
2. Anonymous conversation persistence worked in some write paths but not all
   restore and authentication-success paths.
3. Anonymous-to-authenticated conversation migration could leave search index
   ownership stale.
4. Summary replay and summarization execution needed stronger prompt-boundary
   and concurrency guarantees.

This program spec exists to make those tracks land as one coherent integrity
pass rather than as unrelated local fixes.

---

## 2. Program Goals

1. Make authenticated identity derive only from validated sessions.
2. Make anonymous conversation create, restore, archive, and migrate flows
   follow one consistent ownership model.
3. Keep SQL conversation ownership and search ownership aligned across
   registration and login transitions.
4. Treat replayed summaries as quoted server-owned historical data, not live
   executable instructions.
5. Encode the resulting contracts in route tests, use-case tests, and build
   verification so regressions become visible immediately.

---

## 3. Confirmed Workstreams

| Workstream | Primary risk | Canonical spec |
| --- | --- | --- |
| Session Identity Boundary Hardening | simulated auth escapes real session boundary | `../session-identity-boundary-hardening/spec.md` |
| Anonymous Conversation Consistency | guest conversation restore/archive contract mismatch | `../anonymous-conversation-consistency/spec.md` |
| Conversation Search Migration Integrity | migrated conversations disappear from conversation recall | `../conversation-search-migration-integrity/spec.md` |
| Summary Context Hardening | replayed summaries act like trusted fresh instructions | `../summary-context-hardening/spec.md` |

Each issue-specific spec owns implementation detail. This umbrella spec owns
sequence, integration expectations, and final acceptance.

---

## 4. Delivery Sequence

### 4.1 Identity and Ownership First

Identity rules and conversation ownership must be stable before any summary or
search safety work is considered complete.

Required order:

1. Anonymous Conversation Consistency
2. Session Identity Boundary Hardening
3. Conversation Search Migration Integrity
4. Summary Context Hardening

### 4.2 Why This Order

| Step | Reason |
| --- | --- |
| Anonymous restore consistency first | establishes one user-resolution contract for guest persistence |
| Session identity second | prevents auth ambiguity while guest/auth transitions are hardened |
| Migration integrity third | depends on stable ownership rules for both anonymous and authenticated users |
| Summary hardening last | should reflect final conversation ownership and persistence boundaries |

---

## 5. Integration Requirements

### 5.1 Identity Contract

| Condition | Required behavior |
| --- | --- |
| valid real session | user is authenticated; role simulation may overlay |
| invalid real session | stale auth cookies are cleared; user becomes anonymous |
| mock-role cookie without real session | anonymous only |

### 5.2 Conversation Ownership Contract

| Lifecycle event | Required behavior |
| --- | --- |
| anonymous message append | owned by cookie-backed anonymous identity |
| active restore | uses the same identity source as write path |
| archive active conversation | archives current active conversation without widening access |
| registration or login success | migrates anonymous conversations and clears anonymous session |

### 5.3 Search Ownership Contract

| Data source | Canonical owner |
| --- | --- |
| `conversations.user_id` | source of truth |
| conversation embedding `source_id` | must match canonical owner prefix |
| conversation search tool results | must show only canonical-owner records |

### 5.4 Summary Contract

| Summary concern | Required behavior |
| --- | --- |
| summary generation | produce factual historical notes only |
| summary replay | inject only inside explicit server-owned quoted block |
| concurrent summarize triggers | at most one active summarize run per conversation in one process |

---

## 6. Verification Standard

The program is not complete until all four categories below are green.

| Category | Minimum evidence |
| --- | --- |
| Static validation | changed files are diagnostics-clean and lint-clean |
| Focused regression tests | auth routes, proxy/restore flows, chat stream, summarization, and conversation-search coverage pass |
| Integration confidence | login/registration migration, active restore flows, and client restore behavior are exercised by targeted verification |
| Release confidence | production build completes successfully |

Recommended verification commands:

```bash
npx vitest run src/app/api/auth/auth-routes.test.ts src/proxy.test.ts src/app/api/conversations/active/route.test.ts src/hooks/useGlobalChat.test.tsx tests/chat-stream-route.test.ts src/core/use-cases/SummarizationInteractor.test.ts src/core/use-cases/tools/search-my-conversations.tool.test.ts src/lib/chat/embed-conversation.test.ts src/adapters/AnthropicSummarizer.test.ts
npm run repair:conversation-indexes
npm run build
```

The repair command must be paired with direct repair-helper coverage because it
can legitimately report zero repaired rows on an empty local dataset while the
underlying repair logic remains unexercised.

---

## 7. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Establish program-level contract, rollout order, and acceptance criteria |
| 1 | Complete identity and anonymous conversation boundary fixes |
| 2 | Complete migration/search ownership alignment |
| 3 | Complete summary replay and summarization safety hardening |

Issue-specific sprint files live in the linked workstream folders.

---

## 8. Done Criteria

1. All confirmed audit findings are mapped to a named workstream under
   `docs/_refactor/`.
2. Session identity, anonymous persistence, migration, and summary replay rules
   no longer contradict one another.
3. Registration and login produce the same ownership outcome for migrated
   anonymous conversations.
4. Focused regression coverage exists for each confirmed issue class.
5. The production build passes after the integrity fixes land.