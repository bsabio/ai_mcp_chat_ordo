# Summary Context Hardening — Refactor Spec

> **Status:** Planned
> **Date:** 2026-03-15
> **Scope:** Make rolling conversation summaries server-owned context rather
> than synthetic user/assistant turns, harden summary replay as quoted server
> data, and add regression tests to protect the prompt boundary.
> **Affects:** `src/lib/chat/context-window.ts`,
> `src/app/api/chat/stream/route.ts`, `src/app/api/chat/route.ts`,
> `src/core/use-cases/SummarizationInteractor.ts`, prompt assembly and
> context-window tests

---

## 1. Problem Statement

The context-window helper says summary context should remain server-owned, but
the current implementation still injects raw summary text back into the live
system prompt.

Verified evidence:

1. The stored summary is generated from raw conversation text.
2. `buildContextWindow()` returns that summary as `summaryText`.
3. The chat stream route appends `summaryText` directly into `systemPrompt`.

Result: summary replay stays structurally separate from dialogue, but hostile or
malformed prior content can still persist as trusted future prompt material.

---

## 2. Design Goals

1. Summary context must be represented as server-owned context.
2. The returned message shape must match actual downstream provider contracts.
3. No synthetic assistant acknowledgement should be needed.
4. Prompt assembly should remain understandable and auditable.
5. Summary replay must be quoted and explicitly treated as historical data, not
   fresh instructions.
6. Concurrent stream completions must not emit duplicate summary messages for
   the same conversation.
7. Tests must fail if summaries regress back into user-authored turns or raw
   prompt injection.

---

## 3. Architecture Direction

### 3.1 Context Window Contract

`buildContextWindow(messages)` should return:

| Segment | Role |
| --- | --- |
| most recent summary | `system` |
| subsequent real conversation turns | `user` / `assistant` |

### 3.2 Route Assembly

Routes that consume the context window should pass summary context through to
the provider without converting it into synthetic dialogue. If the provider or
transport does not accept `system` inside the message list, route assembly
should lift summary text into the dedicated `systemPrompt` path inside a clearly
delimited server-owned block that marks the content as historical data rather
than executable instructions.

### 3.3 Prompt Boundary Rule

Server-generated summaries are instruction-bearing context, not model-visible
pretend dialogue.

### 3.4 Concurrency Rule

Summarization should behave as a per-conversation singleton within a running
server process so overlapping stream completions do not create duplicate
summary messages.

---

## 4. Testing Strategy

| Area | Tests |
| --- | --- |
| Unit | `buildContextWindow()` returns `system` summary messages |
| Route | summary-aware route assembly preserves a quoted server-owned summary block |
| Regression | no synthetic acknowledgement string in built context |
| Safety | later user content cannot overwrite the summary contract |
| Concurrency | repeated summarize triggers for one conversation create at most one summary |

Expected scope: 6-10 tests.

---

## 5. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Correct the context-window contract |
| 1 | Align chat route/provider assembly with the corrected contract |
| 2 | Add prompt-safety and concurrency guardrails |

---

## 6. Done Criteria

1. Summary replay is represented as server-owned context.
2. No fake user or fake assistant summary messages remain.
3. Summary text is replayed only inside a delimited server-owned block.
4. Duplicate summary writes are prevented for overlapping same-conversation runs.
5. Tests encode the distinction between summary context and real dialogue.
