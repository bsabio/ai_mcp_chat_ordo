# TD-C3 — Technical Debt: Orchestration and Operational Hardening

> **Parent spec:** [Platform V1](spec.md) §9.4
> **Scope:** Address the highest-leverage residual code-quality issues after TD-C2: dashboard loader sprawl, stream-route post-stream reliability gaps, client fetch/error duplication, composition-root instance churn, stale env-mutation test patterns, and justified chat-streaming performance optimizations.
> **Depends On:** [TD-C2](td-c2.md) — completed
> **Baseline:** Typecheck clean, focused policy/librarian regression slice green (`53/53`), TD-C2 hotspots remediated.
> **Historical note (2026-03-24):** TD-C3 captured the residual debt as it existed before convergence closure. Its dashboard-loader decomposition work landed, but TD-C4 later completed the migration by removing the `src/lib/dashboard/` compatibility layer entirely and moving the active business boundary into `src/lib/operator/`. References below to `dashboard-loaders.ts` and related split modules should therefore be read as historical TD-C3 implementation context, not the current runtime boundary.

---

## §1 Current State

### §1.1 Post-TD-C2 baseline

TD-C2 removed the most obvious schema, route-structure, and env-access debt. The codebase is in a materially better state, but the next layer of debt is now clearer: large orchestration modules, inconsistent post-stream failure handling, and stale client/test patterns that still make debugging and future refactors harder than they should be.

### §1.2 Residual audit signals

| Metric | Value | Notes |
| --- | --- | --- |
| Largest production file in `src/` | `src/lib/dashboard/dashboard-loaders.ts` — 1468 lines at the time of the audit | Historical largest God-module signal that later drove the operator convergence work |
| Chat stream route size | `src/app/api/chat/stream/route.ts` — 525 lines | Better than TD-C2 baseline, still operationally dense |
| Bare `catch {}` sites in `src/` | 26 | Mostly intentional fallback inventory, but still noisy |
| Direct `process.env = ...` mutations in `tests/` | 24 matches across 6 files | Stale test-isolation pattern remains |
| Direct `process.env.*` reads in `src/` | 14 matches | Most are `NODE_ENV`, but a few remain worth review |
| Message append fan-out | ~7-8 DB operations per appended message | `findById` + `count` + insert/fetch + metadata updates + event record |
| Post-stream refresh pattern | 1 extra HTTP round-trip after successful stream | Client re-fetches conversation it just streamed |
| Streaming delta update pattern | 1 full state-array copy per `APPEND_TEXT` event | Hot path during long assistant responses |

### §1.3 Quality assessment summary

This audit is narrower than TD-C2. It focuses on residual leverage, not broad code-smell inventory. The strongest findings fall into three groups:

| Area | Rating | Key Issue |
| --- | --- | --- |
| Orchestration boundaries | Adequate | The then-active `dashboard-loaders.ts` mixed block contracts, auth guards, SQL, analytics shaping, and queue scoring |
| Operational reliability | Adequate | stream route still tolerates persistence/analytics failures too quietly after streaming begins |
| Client/test hygiene | Adequate | duplicated fetch/fallback logic and manual env mutation patterns persist |
| Chat-path performance | Adequate | repeated full-conversation loads, append query fan-out, redundant refreshes, and per-delta UI churn remain |

---

## §2 Audit Methodology

The audit reviewed the post-TD-C2 hotspots and then scanned the rest of `src/` and `tests/` for the next highest-leverage structural issues.

Each finding is graded by blast radius and change payoff:

| Severity | Meaning |
| --- | --- |
| **High** | Integrity, debugging, or maintenance risk in high-traffic production paths. Must be fixed in TD-C3. |
| **Medium** | Structural debt or stale patterns that increase future cost. Should be fixed in TD-C3. |
| **Low** | Minor cleanup or documentation-only follow-up. Fix opportunistically or record clearly. |

This spec deliberately excludes already-accepted TD-C2 exceptions unless the remaining implementation is incomplete or still obscures intent.

### §2.1 Knuth filter for performance work

Performance work in TD-C3 must satisfy a stricter bar than structural cleanup:

1. The code must sit on the user-visible hot path for chat streaming or message restore.
2. The cost must repeat per message, per delta, or per request.
3. The change must reduce measurable work such as query count, JSON parsing volume, render churn, or extra network round-trips.
4. TD-C3 should explicitly avoid speculative micro-optimizations unless a real hot-path bottleneck has already been removed.

### §2.2 Non-negotiable invariants

The following invariants apply to every TD-C3 implementation, especially F2 and F7-F10:

1. **Server truth wins:** persisted conversation state remains authoritative over client-supplied message history whenever the server can read it.
2. **No silent transcript loss:** if the user sees assistant output, TD-C3 must not make it easier for the persisted transcript to diverge silently from that output.
3. **Append-only stream semantics:** text deltas, tool calls, and tool results must preserve emission order and must not be coalesced across semantic event boundaries.
4. **No limit bypass:** message-limit enforcement and conversation ownership checks must remain authoritative after any write-path optimization.
5. **No hidden behavior change:** performance optimizations may reduce work, but they must not change visible chat content, search results, routing metadata correctness, or attachment ownership rules.
6. **Fallbacks stay explicit:** if an optimization introduces a degraded-mode fallback, that fallback must be documented inline and covered by a test.

---

## §3 Audit Findings

### Finding F1 — Historical `dashboard-loaders.ts` orchestration God module (SRP)

| Attribute | Value |
| --- | --- |
| **Principle** | SRP |
| **Severity** | High |
| **File** | `src/lib/dashboard/dashboard-loaders.ts` (1468 lines at audit time) |

**Description:** This file now concentrates too many reasons to change:

| # | Responsibility | Evidence |
| --- | --- | --- |
| 1 | Shared dashboard payload types and row contracts | top-of-file type block |
| 2 | Link building and auth guards | `buildConversationHref`, `assertSignedInUser`, `assertAdminUser` |
| 3 | Queue scoring and theme inference heuristics | `calculateLeadPriorityScore`, `inferTheme`, `inferFrictionReason` |
| 4 | Direct DB query orchestration | `getLeadQueueSummary`, block-specific SQL sections |
| 5 | Analytics-tool integration | `conversationAnalytics` usage in routing/funnel loaders |
| 6 | Ten exported dashboard block loaders | `loadConversationWorkspaceBlock` through `loadTrainingPathQueueBlock` |

The module currently owns customer, admin, analytics, funnel, lead, deal, and training-path dashboard concerns in one place. A change to any one dashboard block forces readers to parse unrelated scoring, SQL, and type contracts.

**Remediation at the time:** Split by dashboard domain and responsibility:

1. **`src/lib/dashboard/dashboard-contracts.ts`** — shared dashboard payload types and row contracts.
2. **`src/lib/dashboard/dashboard-helpers.ts`** — common href builders, auth guards, theme inference, friction reasoning, and lead-priority scoring.
3. **`src/lib/dashboard/loaders/customer-loaders.ts`** — thin customer barrel over conversation and workflow modules.
4. **`src/lib/dashboard/loaders/admin-loaders.ts`** — thin admin barrel over review, queue, and health modules.
5. **`src/lib/dashboard/loaders/analytics-loaders.ts`** — thin analytics barrel over opportunity, theme, and funnel modules.
6. Keep thin **`dashboard-shared.ts`** and **`dashboard-loaders.ts`** barrels that preserve the stable public API while re-exporting the deeper split.

No behavior should change. The goal is decomposition, not redesign.

Current-state note: TD-C3 landed the decomposition, and TD-C4 later finished the convergence by deleting the dashboard-named compatibility layer after active callers were removed.

### Finding F2 — Stream route still treats critical post-stream mutations as best-effort (Operational reliability)

| Attribute | Value |
| --- | --- |
| **Principle** | Error Handling, Operational Integrity |
| **Severity** | High |
| **File** | `src/app/api/chat/stream/route.ts` |

**Description:** TD-C2 decomposed the route structurally, but the response stream still quietly tolerates failures in key post-stream mutations:

| Line | Operation | Current behavior |
| --- | --- | --- |
| L344–L345 | `recordToolUsed(...)` | log-only `.catch(...)` |
| L357–L367 | assistant `appendMessage(...)` | logs persistence failure and continues |
| L371–L372 | `summarizeIfNeeded(...)` | log-only `.catch(...)` |

These are not equivalent in importance. Summarization can be best-effort; assistant-message persistence cannot. If the user receives the assistant answer but the message never persists, the conversation transcript becomes internally inconsistent.

**Remediation:** Introduce explicit mutation criticality and failure policy:

1. **Critical write:** assistant `appendMessage(...)` must be handled as a first-class failure.
   - Log with `conversationId`, `userId`, and operation name.
   - Emit a terminal SSE error chunk before close when persistence fails after content generation.
   - Add a clear inline contract comment explaining post-stream error semantics.
2. **Operational write:** `recordToolUsed(...)` should log with structured context and increment an observable metric or event counter.
3. **Best-effort async:** `summarizeIfNeeded(...)` may remain asynchronous, but must be wrapped in a shared helper that records failures consistently.
4. Replace ad hoc `.catch(console.error)` chains with a named helper such as `reportBackgroundFailure(operation, error, context)`.

**Implementation invariants:**

1. Once SSE streaming has begun, the route must not switch to a JSON error response shape.
2. The first successful stream event remains `conversation_id` so the client can stabilize local state before further deltas.
3. Assistant-message persistence failure must be visible in-stream and in logs, not just logs.
4. Tool-usage recording failure must never corrupt or reorder the user-visible stream.
5. Summarization failure must never block stream close.

### Finding F3 — `chatConversationApi.ts` duplicates fetch/error handling and still masks client failures (Error Handling, DRY)

| Attribute | Value |
| --- | --- |
| **Principle** | DRY, Error Handling |
| **Severity** | Medium |
| **File** | `src/hooks/chat/chatConversationApi.ts` |

**Description:** The file still carries a duplicated `fetch -> status mapping -> JSON parse -> fallback` pattern across restore/archive helpers. It also uses two bare catch fallbacks:

| Line | Function | Current fallback |
| --- | --- | --- |
| L26–L57 | `restoreConversationFromPath()` | `network-error` for any thrown failure |
| L70–L85 | `archiveActiveConversation()` | `false` |

The comments added in TD-C2 document intent, but the structure is still weak: transport failures, aborted requests, and unexpected runtime failures all collapse into the same opaque fallback shape.

**Remediation:**

1. Extract a shared client helper such as **`src/hooks/chat/fetchJson.ts`** or **`src/hooks/chat/chatRequest.ts`**.
2. Distinguish expected transport/offline failures from unexpected runtime failures.
3. Standardize return contracts so callers can tell apart:
   - explicit server rejection (`401`, `404`, `500`),
   - offline/network failure,
   - local unexpected failure.
4. Preserve current UX behavior, but centralize the mapping logic and error reporting in one place.

### Finding F4 — `conversation-root.ts` recreates the same graph repeatedly (Composition Root)

| Attribute | Value |
| --- | --- |
| **Principle** | Composition Root Clarity |
| **Severity** | Medium |
| **File** | `src/lib/chat/conversation-root.ts` |

**Description:** The composition root is small enough to read, but it rebuilds the same object graph on every getter call:

| Getter | Recreated dependencies |
| --- | --- |
| `getConversationInteractor()` | `ConversationDataMapper`, `MessageDataMapper`, `ConversationEventDataMapper`, `ConversationEventRecorder` |
| `getSummarizationInteractor()` | `MessageDataMapper`, `ConversationEventDataMapper`, `ConversationEventRecorder`, `AnthropicSummarizer` |
| workflow getters | repeated `getDb()` + mapper/repository construction |

This obscures lifecycle semantics. The name `getConversationInteractor()` reads like retrieval, but the function actually means “construct a fresh graph.” That is defensible for request scoping, but the intent should be explicit and duplication should be reduced.

**Remediation:**

1. Introduce internal builder helpers for shared dependency groups, for example:
   - `createConversationPersistence(db)`
   - `createEventRecorder(db)`
   - `createWorkflowRepositories(db)`
2. Decide and document lifecycle explicitly:
   - request-scoped construction, or
   - cached singleton adapters around a shared DB handle.
3. Keep public exports stable, but remove repeated mapper wiring from each getter.

### Finding F5 — Test env mutation hygiene is still inconsistent outside TD-C2 scope (Test Isolation)

| Attribute | Value |
| --- | --- |
| **Principle** | Test Isolation |
| **Severity** | Medium |
| **Files** | `tests/admin-processes.test.ts`, `tests/env-config.test.ts`, `tests/health-routes.test.ts`, `tests/health-probes.test.ts`, `tests/chat-policy.test.ts`, `tests/chat-stream-route.test.ts` |

**Description:** TD-C2 cleaned `tests/chat-route.test.ts`, but the broader test suite still uses direct environment replacement patterns:

```typescript
const ORIGINAL_ENV = process.env;

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});
```

This pattern appears in multiple files, and `process.env = ...` matches still appear throughout `tests/`. It is noisier, easier to get wrong, and less idiomatic than `vi.stubEnv()` / `vi.unstubAllEnvs()`.

**Remediation:**

1. Replace manual env replacement with `vi.stubEnv(...)` and `vi.unstubAllEnvs()`.
2. Add a small test helper or convention note if multiple suites need the same env setup.
3. Add a static test or grep-based assertion preventing new `process.env = { ... }` patterns in tests.

### Finding F6 — Remaining intentional bare catches need final cleanup or codified acceptance (Error Handling)

| Attribute | Value |
| --- | --- |
| **Principle** | Error Handling |
| **Severity** | Low |
| **Files** | Multiple `src/` files listed in TD-C2 inventory |

**Description:** A `grep` still finds 26 bare `catch {}` blocks in `src/`. Many of these are the accepted TD-C2 inventory: parse fallback, missing-resource fallback, browser-API constraints, or UI degradation paths. That is acceptable, but the codebase still carries enough bare catches that future review noise remains high.

**Remediation:** Choose one of two explicit end states:

1. Add the remaining short inline intent comments everywhere TD-C2 categorized a catch as acceptable fallback.
2. Or codify the accepted inventory in a static audit test that names the allowed files/contexts so new bare catches fail review automatically.

Option 2 is preferable because it converts tribal knowledge into enforceable policy.

### Finding F7 — Stream preparation still loads and parses the full conversation on every request (Performance)

| Attribute | Value |
| --- | --- |
| **Principle** | Performance, Data Access |
| **Severity** | High |
| **Files** | `src/app/api/chat/stream/route.ts`, `src/core/use-cases/ConversationInteractor.ts`, `src/adapters/MessageDataMapper.ts`, `src/lib/chat/context-window.ts` |

**Description:** The stream route still prepares context by loading the full conversation and parsing every message part:

1. `prepareStreamContext()` calls `interactor.get(conversationId, userId)`.
2. `ConversationInteractor.get()` loads the conversation plus **all** messages for that conversation.
3. `MessageDataMapper.listByConversation()` parses `parts` JSON for every row.
4. `buildContextWindow()` then selects only the subset actually needed for the model context.

With the current `MAX_MESSAGES_PER_CONVERSATION = 200`, this means a hot-path stream request can parse up to 200 persisted messages even when the model only needs the most recent summary boundary and recent turns.

**Remediation:**

1. Add a targeted repository/query path for context building, for example recent messages plus the latest summary boundary instead of unconditional full-history load.
2. Avoid parsing `parts` for rows that are not needed to build the context window.
3. Preserve correctness of summary-aware context selection before optimizing aggressively.
4. Add measurement around message-count and parse-volume so the optimization is verifiable.

**Implementation invariants:**

1. Context-window construction must continue to honor the latest persisted summary boundary exactly as before.
2. The optimized query path must not trust client-supplied `incomingMessages` when persisted history is available.
3. If the narrowed query cannot prove correctness for a conversation shape, the code must fall back to the safe full-history path rather than guessing.
4. Routing analysis and context-window generation must continue to operate over the same logical conversation state.

### Finding F8 — Message append path fans out into too many DB operations (Performance)

| Attribute | Value |
| --- | --- |
| **Principle** | Performance, Write Path Efficiency |
| **Severity** | High |
| **Files** | `src/core/use-cases/ConversationInteractor.ts`, `src/adapters/MessageDataMapper.ts` |

**Description:** A single appended message currently triggers a chain of database operations:

1. conversation existence/ownership lookup
2. message-count query
3. message insert
4. inserted-row readback
5. optional title update
6. denormalized message-count update
7. first-message timestamp update
8. conversation touch/update
9. optional event insert

This is acceptable functionally, but it is an expensive write path for the most common operation in the system.

**Remediation:**

1. Reduce round-trips by batching denormalized metadata updates where practical.
2. Re-evaluate whether `countByConversation()` must remain a separate query or whether the denormalized counter can become the guard source.
3. Avoid immediate readback after insert if the returned message can be constructed deterministically from known values.
4. Keep transaction boundaries explicit so the optimization does not weaken integrity.

**Implementation invariants:**

1. Ownership checks must still happen before any write is committed.
2. Message-limit enforcement must remain correct even if denormalized counters drift; if the optimization depends on the counter, it must also define a repair/verification path.
3. Message insert and conversation metadata updates should succeed or fail as a unit where feasible.
4. First-message titleing and timestamp semantics must remain unchanged for the first user message.

### Finding F9 — Successful streams still pay for a redundant full refresh (Performance, UX latency)

| Attribute | Value |
| --- | --- |
| **Principle** | Performance, UX Latency |
| **Severity** | Medium |
| **Files** | `src/hooks/chat/useChatSend.ts`, `src/hooks/chat/useChatConversationSession.ts`, `src/hooks/chat/chatConversationApi.ts` |

**Description:** After the client has already received the assistant response incrementally via the stream, `useChatSend()` still calls `refreshConversation(resolvedConversationId)`, which triggers a full conversation restore request and message replacement.

This adds one more HTTP round-trip and one more full message reload after a successful stream, even though the client already holds the just-streamed state.

**Remediation:**

1. Make post-stream refresh conditional instead of unconditional.
2. Only re-fetch when the stream indicates server-side state the client cannot reconstruct locally.
3. Preserve the race-condition fallback for newly created conversations, but narrow it to the cases that actually need canonical reconciliation.

**Implementation invariants:**

1. The client must still reconcile canonical server state when conversation creation races with restore endpoints.
2. Skipping refresh is allowed only when the client already has all UI-visible state needed for the completed turn.
3. If the server mutates metadata not represented in the stream but needed immediately by the client, that path must still trigger refresh.
4. The optimization must not introduce duplicate assistant messages or stale conversation IDs in local state.

### Finding F10 — Streaming UI does full-list work too often during delta updates (Performance, Rendering)

| Attribute | Value |
| --- | --- |
| **Principle** | Performance, Rendering |
| **Severity** | Medium |
| **Files** | `src/hooks/chat/chatState.ts`, `src/frameworks/ui/MessageList.tsx`, `src/hooks/chat/useChatStreamRuntime.ts` |

**Description:** The client stream path currently does repeated work during long assistant responses:

1. Every `APPEND_TEXT` action clones the whole message array and the active message parts array.
2. `MessageList` recomputes filtered message state from the full message list on each render.
3. When search is active, `extractRichContentText()` walks rich content trees for each message during filtering.

These costs are acceptable for small transcripts, but they are on the streaming hot path and can compound during long responses.

**Remediation:**

1. Reduce per-delta state churn by making the streaming assistant update path cheaper.
2. Memoize expensive message filtering/search derivations in `MessageList` so they are not recomputed on every unrelated delta.
3. Keep the optimization focused on high-frequency paths; do not over-engineer low-frequency UI code.

**Implementation invariants:**

1. Assistant text must remain append-only and ordered exactly as streamed.
2. Tool call/result display order must remain stable relative to text deltas.
3. Search results in `MessageList` must remain identical before and after memoization.
4. UI optimizations must not rely on mutating React state in place.

### Finding F11 — Some apparent stream optimizations should be explicitly deferred (Performance)

| Attribute | Value |
| --- | --- |
| **Principle** | Performance Discipline |
| **Severity** | Low |
| **Files** | `src/adapters/ChatStreamAdapter.ts`, attachment validation path in `src/app/api/chat/stream/route.ts` |

**Description:** The audit surfaced a few possible micro-optimizations that do **not** currently clear the bar for TD-C3:

1. Replacing the SSE event parser strategy lookup with a hand-written switch.
2. Optimizing parser instantiation/allocation in `ChatStreamAdapter`.
3. Parallelizing attachment validation for the rare file-upload path.

These may be measurable in isolation, but they are not currently the highest-leverage bottlenecks compared with full-conversation loading, append query fan-out, redundant refreshes, and per-delta state churn.

**Remediation:** Document them as deferred and do not prioritize them ahead of F7–F10 unless profiling later proves otherwise.

---

## §4 Remediation Plan

### §4.1 Phase 1 — Dashboard decomposition (F1)

Decompose `dashboard-loaders.ts` into domain-focused modules while preserving the current exported API surface.

**Required outcomes:**

1. No single dashboard loader file exceeds ~450 lines without justification.
2. Shared payload contracts and helper functions move out of block-specific modules.
3. Each loader module groups a coherent dashboard domain.

**Status:** Implemented, then superseded by TD-C4 convergence closure.

1. `dashboard-loaders.ts` was reduced to a thin public barrel during TD-C3.
2. Shared contracts and heuristics were split between `dashboard-contracts.ts` and `dashboard-helpers.ts`, with `dashboard-shared.ts` preserved as a thin compatibility barrel.
3. Loader implementations were split into finer-grained customer, admin, and analytics modules under `src/lib/dashboard/loaders/`, with `customer-loaders.ts`, `admin-loaders.ts`, and `analytics-loaders.ts` preserved as thin barrels.
4. Repeated signed-in/admin DB access and loader-side row/theme mapping were shared through helper modules instead of being reimplemented across customer, queue, and analytics modules.
5. TD-C4 later retired these dashboard-named split modules once the active public/runtime boundary moved fully into `src/lib/operator/`.

### §4.2 Phase 2 — Stream mutation policy hardening (F2)

Clarify and implement three error tiers inside the chat stream response path:

1. **Critical:** assistant persistence
2. **Operational but non-blocking:** tool-usage recording
3. **Best-effort background:** summarization

**Required outcomes:**

1. Critical persistence failure is surfaced explicitly in-stream and logged with context.
2. Background failures use a shared reporting helper instead of ad hoc `.catch(console.error)`.
3. Route comments explain when errors become HTTP responses versus SSE error chunks.

### §4.3 Phase 3 — Client request helper consolidation (F3)

Create a shared request helper for chat conversation restore/archive flows.

**Required outcomes:**

1. Duplicate fetch/status/fallback code is removed from `chatConversationApi.ts`.
2. Result types distinguish transport failure from server-side rejection.
3. Existing UI behavior remains unchanged.

**Status:** Implemented.

1. Chat conversation restore/archive requests now share `src/hooks/chat/chatRequest.ts`.
2. Restore responses distinguish `network-error`, `aborted`, and `unexpected-error` from HTTP rejections.
3. Restore hooks preserve existing UI behavior while logging only the genuinely unexpected case.

### §4.4 Phase 4 — Composition-root cleanup (F4)

Refactor `conversation-root.ts` to make lifecycle and wiring explicit.

**Required outcomes:**

1. Shared mapper/recorder construction is extracted.
2. Public getter names remain stable unless a strong reason exists to change them.
3. Lifecycle semantics are documented inline.

**Status:** Implemented.

1. `conversation-root.ts` now builds shared dependency groups with named helpers for persistence, workflow repositories, event recording, and summarizer construction.
2. Public getters remain unchanged.
3. Request-scoped construction is now explicit from the helper boundaries rather than being repeated ad hoc in each getter.

### §4.5 Phase 5 — Test env standardization and bare-catch policy (F5, F6)

**Required outcomes:**

1. Manual `process.env = { ... }` restoration patterns are removed from the targeted suites.
2. A static test or audit assertion prevents the pattern from returning.
3. Accepted bare catches are either commented consistently or enforced via allowlist test.

**Status:** Implemented.

1. Targeted env-sensitive suites now use `vi.stubEnv()` / `vi.unstubAllEnvs()`.
2. `tests/td-c3-hardening-audit.test.ts` fails on new `process.env =` mutations in `tests/`.
3. The same audit codifies the accepted bare-catch inventory in `src/` so future additions are explicit.

### §4.6 Phase 6 — Chat-path performance hardening (F7, F8, F9, F10, F11)

**Required outcomes:**

1. Stream context preparation no longer requires unconditional full-history message loading.
2. Message append write-path query fan-out is reduced without weakening integrity guarantees.
3. Post-stream full conversation refresh is no longer unconditional on successful streams.
4. The client streaming path reduces repeated full-list work during text delta updates.
5. Deferred micro-optimizations are recorded explicitly so they do not distract from the real wins.
6. At least one lightweight measurement or assertion exists for each performance change class so future regressions are visible.

**Suggested implementation order:**

1. F2 and F9 together, because stream-success semantics and refresh strategy are coupled.
2. F7 next, because context loading dominates per-request server work.
3. F8 after F7, because write-path batching is easier to reason about once read-path semantics are fixed.
4. F10 last, after server-side correctness and round-trip reductions are stable.
5. F11 remains deferred unless measurements show it matters.

**Status so far:** In progress.

1. F7 implemented: stream context now uses a bounded recent-message path with safe fallback to full history when no summary boundary is present.
2. F8 implemented in four safe slices: denormalized conversation metadata updates are batched, message creation no longer performs an immediate inserted-row readback, the hot-path limit check can now be enforced inside the insert statement instead of via a separate round trip when the mapper supports it, and the DB-backed user append path can record conversation metadata plus `message_sent` in one transaction.
3. F9 implemented: successful same-thread streams no longer force an unconditional conversation refresh.
4. F10 further implemented: `MessageList` memoizes transcript-derived state and caches per-message searchable text, `useChatStreamRuntime` batches contiguous text deltas until the next semantic boundary or timer flush to reduce reducer churn without changing stream order and now delegates stream adapter acquisition, buffering policy, conversation-id dispatch policy, and stream strategy assembly to dedicated helpers, `chatState` now centralizes append-path message updates behind shared reducer helpers, `useGlobalChat` bootstrap policy is extracted into dedicated helper functions so the provider mostly composes state and effects, and `useChatSend` now delegates send validation and optimistic message assembly to pure helper functions.
5. F11 remains deferred.

---

## §5 Test Specification

### §5.1 Positive tests

1. Dashboard loader tests still pass with the split modules and stable payload shapes.
2. Chat stream tests confirm assistant persistence failures emit the expected terminal SSE error behavior.
3. Chat restore/archive tests confirm the shared request helper preserves current status mapping.
4. Composition-root tests verify public getters still return working interactors after wiring cleanup.
5. Env-sensitive test suites pass using `vi.stubEnv()` rather than manual `process.env` replacement.
6. Chat streaming tests confirm the optimized path preserves final transcript correctness and conversation restore behavior.

**Target files to extend first:**

1. `tests/chat-stream-route.test.ts`
2. `tests/browser-fab-chat-flow.test.tsx`
3. `tests/chat-surface.test.tsx`
4. `tests/chat/anthropic-stream.test.ts`
5. operator loader behavior tests and the historical dashboard-loader tests that existed at TD-C3 time

### §5.2 Negative tests

1. A source-level test fails if a new `process.env = { ... }` pattern is introduced in `tests/`.
2. A source-level test fails if unapproved bare `catch {}` blocks are added outside the accepted inventory.
3. A source-level test fails if the active operator-owned loading surface regains a single God-module implementation boundary.
4. Performance-focused tests or assertions fail if the stream path regresses to unconditional post-stream full refresh where it is no longer needed.
5. Stream tests fail if `conversation_id` is no longer emitted before later stream events.
6. Write-path tests fail if optimized append logic can produce a persisted message without the corresponding denormalized conversation updates.

### §5.3 Edge tests

1. Stream route still closes cleanly when summarization fails.
2. Stream route logs structured context when tool-usage recording fails.
3. Restore/archive helper still reports offline state without breaking the UI when `fetch` throws.
4. Dashboard block loaders preserve empty-state behavior for users with no data.
5. Context-window preparation still honors summary boundaries after the query path is narrowed.
6. Streaming UI still renders correct final assistant content after delta-path optimizations.
7. Fallback-to-full-history path still works when optimized context queries cannot satisfy the summary-boundary invariant.
8. Conditional refresh still reconciles a newly created conversation when the stream ID arrives before the restore endpoint reflects it.

---

## §6 Acceptance Criteria

TD-C3 is complete when all of the following are true:

1. The active business-loading boundary is decomposed rather than concentrated in a single God module. TD-C3 satisfied this first through dashboard-layer decomposition, and TD-C4 later completed it by converging the active boundary into `src/lib/operator/`.
2. `src/app/api/chat/stream/route.ts` no longer uses ad hoc log-only `.catch(...)` chains for post-stream mutations.
3. `src/hooks/chat/chatConversationApi.ts` uses a shared request helper and clearer error/result semantics.
4. `src/lib/chat/conversation-root.ts` no longer repeats the same mapper/recorder wiring in each getter without abstraction.
5. Targeted env-sensitive tests use `vi.stubEnv()` / `vi.unstubAllEnvs()` instead of manual `process.env` replacement.
6. Remaining accepted bare catches are either explicitly documented inline or enforced via a static allowlist test.
7. Typecheck remains clean and the affected targeted test slices pass.
8. Chat streaming and messaging performance work lands only for F7-F10 class hot paths; F11 class micro-optimizations remain deferred unless profiling evidence is added.
9. The implemented optimizations preserve the invariants in §2.2.

---

## §7 Implementation Notes

1. TD-C3 should preserve runtime behavior wherever possible; this is a maintainability and operational-hardening pass, not a feature change.
2. Prefer decomposition and explicit contracts over introducing new abstraction layers that hide control flow.
3. If the stream route needs stronger failure signaling, preserve backward compatibility for existing clients by extending SSE semantics rather than redesigning the route contract wholesale.
4. Apply the Knuth filter rigorously: remove repeated hot-path work first, and do not spend TD-C3 budget on parser micro-optimizations or rare attachment-path tuning unless profiling later justifies it.
5. For F7-F10, prefer adding narrow helper APIs and query methods over changing the public shape of core entities or broad hook contracts.

### §7.1 Landed TD-C3 slices

1. **F1:** the historical dashboard loader implementation was decomposed into thin barrels plus shared contracts/helpers and finer-grained customer, admin, and analytics modules; TD-C4 later completed the convergence by deleting that compatibility layer and preserving the active implementation under `src/lib/operator/`.
2. **F2:** assistant persistence failure is surfaced in-stream, while summarization remains non-blocking.
3. **F3:** chat restore/archive transport logic is centralized behind a shared request helper with clearer failure semantics.
4. **F4:** conversation-root wiring is grouped into named request-scoped builders.
5. **F5/F6:** env mutation and accepted bare-catch policy are enforced by static audit coverage.
6. **F7:** stream preparation can use recent persisted history when a summary boundary is present.
7. **F8:** append-path metadata writes are batched, message creation avoids insert readback, the mapper can enforce the message limit inside the insert path, and DB-backed user append effects can land metadata plus `message_sent` together.
8. **F9:** post-stream refresh is conditional rather than unconditional.
9. **F10:** transcript-derived UI state is memoized, per-message search text is cached by object identity, contiguous text deltas are batched until a semantic boundary before hitting the reducer, stream adapter acquisition, text buffering, conversation-id dispatch policy, stream event-loop execution, and stream strategy assembly are factored into dedicated helpers, reducer-side append logic is centralized in shared helpers, global chat bootstrap decisions are factored into dedicated helper utilities, and chat-send validation plus optimistic transcript assembly now live in pure policy helpers.
