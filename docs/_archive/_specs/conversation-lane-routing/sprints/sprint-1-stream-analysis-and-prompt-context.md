# Sprint 1 - Stream Analysis And Prompt Context

> **Goal:** Run lane analysis during the chat stream lifecycle and inject a compact, server-controlled routing context before the assistant generates its next response.
> **Spec ref:** `CLR-032`, `CLR-058` through `CLR-067`, `CLR-080` through `CLR-084`
> **Prerequisite:** Sprint 0 complete
> **Test count target:** 619 existing + 7 new = 626 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/app/api/chat/stream/route.ts` | The stream route already persists the latest user message, rebuilds a context window from stored messages, appends summary context through `buildSummaryContextBlock(...)`, and then invokes `runClaudeAgentLoopStream(...)` |
| `src/core/use-cases/ConversationInteractor.ts` | Sprint 0 added `updateRoutingSnapshot(conversationId, userId, snapshot)` plus canonical `lane_analyzed`, `lane_changed`, and `lane_uncertain` events |
| `src/lib/chat/policy.ts` | `buildSystemPrompt(role)` is already the server-controlled prompt entry point |
| `src/lib/chat/summary-context.ts` | Existing summary-context helper establishes the preferred pattern for injecting server-owned prompt annotations |
| `src/lib/chat/conversation-root.ts` | Conversation runtime dependencies are currently composed here and can host a routing analyzer factory without leaking mapper details into the route |
| `src/hooks/chat/useChatSend.ts` | The client currently sends only conversation history text plus attachments, which means routing state must stay server-derived |
| `src/hooks/chat/useChatStreamRuntime.ts` | Stream processing already accepts SSE events but has no routing-specific event contract yet |
| `tests/chat-stream-route.test.ts` | Existing route tests already cover math delegation, summary-context prompt assembly, attachment persistence, and mock wiring for the stream route |

---

## Task 1.1 - Add a server-side routing analyzer contract

**What:** Create a narrow analysis component that inspects persisted conversation state and returns a `ConversationRoutingSnapshot` for the stream route to persist.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/use-cases/ConversationRoutingAnalyzer.ts` or `src/lib/chat/routing-analysis.ts` |
| **Modify** | `src/lib/chat/conversation-root.ts` |
| **Spec** | `CLR-032`, `CLR-058`, `CLR-061`, `CLR-065` |

### Task 1.1 Notes

Keep the analyzer server-owned and deterministic enough for tests.

Sprint 1 does not need a full ML classifier. A rules-based or heuristic analyzer is acceptable if it:

1. inspects recent user turns and conversation metadata
2. returns one of `organization`, `individual`, or `uncertain`
3. sets `confidence`, `recommendedNextStep`, and `detectedNeedSummary`
4. stamps `lastAnalyzedAt`

Prefer an interface close to:

```ts
export interface ConversationRoutingAnalyzer {
  analyze(input: {
    conversation: Conversation;
    messages: Message[];
    latestUserText: string;
  }): Promise<ConversationRoutingSnapshot>;
}
```

The analyzer should not mutate persistence directly. It should only return the snapshot.

### Task 1.1 Verify

```bash
npm run typecheck
```

---

## Task 1.2 - Run routing analysis in the stream lifecycle

**What:** After persisting the latest user message and rebuilding the active context window, analyze the conversation and persist the updated routing snapshot before the assistant response is generated.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/api/chat/stream/route.ts` |
| **Modify** | `src/lib/chat/conversation-root.ts` |
| **Spec** | `CLR-058` through `CLR-063` |

### Task 1.2 Notes

The intended order for Sprint 1 is:

1. persist the latest user message
2. reload the active conversation state and messages
3. run routing analysis on the server
4. persist the returned snapshot through `ConversationInteractor.updateRoutingSnapshot(...)`
5. build routing-aware prompt context
6. invoke `runClaudeAgentLoopStream(...)`

Do not trust any client-provided lane value. `useChatSend()` and `useChatStreamRuntime()` should remain transport-only for this sprint.

If analysis fails, prefer a safe fallback to the previously persisted snapshot or `uncertain` rather than breaking the stream route.

### Task 1.2 Verify

```bash
npx vitest run tests/chat-stream-route.test.ts
```

---

## Task 1.3 - Add a routing-context prompt helper

**What:** Inject routing state into the system prompt using the same server-controlled pattern already used for summary context.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/chat/routing-context.ts` |
| **Modify** | `src/app/api/chat/stream/route.ts` |
| **Spec** | `CLR-064` through `CLR-067` |

### Task 1.3 Notes

Create a helper equivalent in spirit to `buildSummaryContextBlock(...)`, for example:

```ts
buildRoutingContextBlock(snapshot: ConversationRoutingSnapshot): string
```

The output should:

1. identify the block as server routing metadata
2. keep content compact and operational
3. instruct the model to ask clarifying questions when lane is `uncertain`
4. include `recommendedNextStep` only when present

Do not leak verbose internal reasoning into the prompt.

### Task 1.3 Verify

```bash
npx vitest run tests/chat-stream-route.test.ts
```

---

## Task 1.4 - Add focused stream-route and analyzer regressions

**What:** Lock the routing integration with route-level tests before any client-visible lane UX is added.

| Item | Detail |
| --- | --- |
| **Modify** | `tests/chat-stream-route.test.ts` |
| **Create** | `src/lib/chat/routing-analysis.test.ts` or equivalent |
| **Spec** | `CLR-080` through `CLR-084` |

### Task 1.4 Notes

Cover at minimum:

1. organizational sample input yields an `organization` snapshot and prompt block
2. individual sample input yields an `individual` snapshot and prompt block
3. ambiguous input yields `uncertain` and prompt guidance to ask clarifying questions
4. the stream route persists routing updates through `ConversationInteractor.updateRoutingSnapshot(...)`
5. the client payload is not allowed to override lane state

If route tests become too broad, keep the classifier cases in a dedicated analyzer test file and reserve `tests/chat-stream-route.test.ts` for integration assertions.

### Task 1.4 Verify

```bash
npx vitest run tests/chat-stream-route.test.ts src/lib/chat/routing-analysis.test.ts
```

---

## Task 1.5 - Record Sprint 1 boundaries in the artifact

**What:** Preserve implementation-time choices about fallback behavior, heuristic rules, and prompt block format so Sprint 2 UX work consumes a stable contract.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/conversation-lane-routing/sprints/sprint-1-stream-analysis-and-prompt-context.md` |
| **Spec** | `CLR-032`, `CLR-065` through `CLR-067` |

### Task 1.5 Notes

Document any of the following if they shift during implementation:

1. analyzer location or naming
2. fallback behavior when analysis throws
3. prompt-block wording needed to fit current prompt conventions
4. whether `training_path_recommended` remains deferred to Sprint 2

### Task 1.5 Verify

```bash
npm run typecheck
```

---

## Completion Checklist

- [x] Server-side routing analyzer returns a `ConversationRoutingSnapshot`
- [x] Stream route analyzes the conversation after persisting the latest user turn
- [x] Routing snapshot is persisted before assistant generation
- [x] System prompt includes a compact routing-context block controlled only by the server
- [x] Focused regressions cover organization, individual, and uncertain routing outcomes

## QA Deviations

None.

Implementation notes:

- The heuristic analyzer lives in `src/lib/chat/routing-analysis.ts` and is composed through `getConversationRoutingAnalyzer()` in `src/lib/chat/conversation-root.ts`.
- If analysis throws during the stream lifecycle, the route falls back to the previously persisted routing snapshot instead of breaking response generation.
- `training_path_recommended` remains deferred to Sprint 2, where lane-aware UI and downstream workflow consumption will be introduced.
