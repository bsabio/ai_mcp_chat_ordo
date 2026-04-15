# BUG: Chat Stream Timeout Cascade and Consecutive User Message Corruption

> **Reported:** 2026-04-07
> **Resolved:** 2026-04-07
> **Severity:** High
> **Status:** Fixed
> **Affected Route:** `/api/chat/stream`
> **Reproduction Account:** keith@firehose360.com
> **Conversation ID:** `conv_5878113a-e317-4914-891f-a322e2480a2d`

---

## Summary

Two related bugs degrade the chat experience when users paste large content
or send multiple messages without receiving a reply. A large user message
(23 KB) causes a provider timeout, the retry mechanism amplifies the wait to
137 seconds, the assistant response is never persisted, and subsequent
messages accumulate as consecutive `user` rows. These break Anthropic's
role-alternation requirement, causing silent stream failures and hallucinated
responses ("Let me draft this as a full journal article now" repeated twice
when the user asked "what can you do").

---

## Bug 1: Timeout Retry Amplification on Large Payloads

### Observed Behavior

Request `360b2186` at 20:06:05 UTC:

1. Stream round 1 succeeds in 1.5s — Claude calls the `calculator` tool.
2. Round 2 sends tool result + full 23 KB conversation context back to
   Anthropic.
3. Round 2 **times out at 45s**, treated as transient by
   `isTransientProviderError()`.
4. **Retried 3× at 45s each** = **135s total wall time** before the error
   surfaces.
5. User sees a spinner for 2+ minutes, then a generic error.

### Root Cause

`isTransientProviderError()` in
[anthropic-stream.ts](../src/lib/chat/anthropic-stream.ts) matches
`"timed out"` and returns true. The retry loop interprets this as a
network blip and retries with the **same oversized payload**, which will
always time out again.

```
isTransientProviderError("Provider request timed out.") → true
→ retry 1 (45s timeout) → retry 2 (45s timeout) → retry 3 (45s timeout)
→ total: 135s
```

### Log Evidence

```json
{"timestamp":"2026-04-07T20:06:07.376Z","event":"provider.call","requestId":"360b2186","durationMs":1578,"isError":false}
{"timestamp":"2026-04-07T20:08:22.830Z","event":"provider.call","requestId":"360b2186","durationMs":135452,"isError":true}
{"timestamp":"2026-04-07T20:08:22.831Z","event":"request.error","requestId":"360b2186","durationMs":137057,"errorCode":"PROVIDER_ERROR","message":"Anthropic provider error: Provider request timed out."}
```

### Expected Behavior

When a provider call times out after a previous round succeeded (meaning the
payload grew due to tool results, not a network issue), do **not** retry. A
deterministic timeout on the same payload is not transient.

### Fix Options

**Option A — Don't retry timeouts when the previous round succeeded:**

Track whether at least one round completed successfully. If so, treat
timeout as non-transient on the same attempt.

**Option B — Cap total request duration:**

Add a total wall-time budget (e.g., 90s) spanning all retries, not just
per-round.

**Option C — Cap context window size:**

`buildContextWindow()` in `context-window.ts` has no character or message
budget. When no summary exists, ALL messages go to Anthropic. Adding a cap
(e.g., last 20 messages or 50K chars) would prevent unbounded payloads.

---

## Bug 2: Consecutive User Messages Corrupt Conversation State

### Observed Behavior

After the timeout in Bug 1, no assistant response was persisted. The user
sent 4 more messages, producing 5 consecutive `user` rows:

```
Message 12: [user] 23029 chars — "create a journal article about..."
Message 13: [user]  2537 chars — "hey lets discuss this for making..."
Message 14: [user]     5 chars — "hello"
Message 15: [user]    16 chars — "what can you do?"
Message 16: [user]    15 chars — "what can you do"
```

Role sequence: `...assistant, user, user, user, user, user`

When message 16 triggered a stream, Claude received consecutive `user`
messages, which violates Anthropic's API contract requiring strict
`user`/`assistant` alternation. The result was:

- The response hallucinated context from message 12 (the large article
  paste), responding "Let me draft this as a full journal article now"
  **duplicated** — despite the user asking "what can you do"
- The stream request (`e338bd80`) logged `request.start` but never logged
  `request.success`, `request.error`, or `provider.call` — the stream
  crashed silently without hitting the error handler

### Root Cause

Two problems combine:

1. **No assistant placeholder on timeout:** When the provider times out, the
   user message is already persisted (line 72 of `stream/route.ts`) but no
   assistant message is saved. The conversation has a dangling user message.

2. **No message-alternation normalization:** `buildContextWindow()` returns
   messages in storage order. `createStreamResponse()` passes them directly
   to `runClaudeAgentLoopStream()` as `Anthropic.MessageParam[]`. There is
   no step that merges or alternates consecutive same-role messages before
   sending to the API.

### Additional Log Evidence

Requests with `request.start` but NO completion event (silently lost):

```
2c3d2ffd — 20:24:34 (message 13)
daf6e191 — 20:26:21 (message 14, aborted)
9cca8e3c — 20:39:44 (message 15)
e338bd80 — 20:40:18 (message 16 — produced garbled response)
```

Three separate `UNKNOWN_ROUTE_ERROR` events visible in the same window:

```json
{"timestamp":"2026-04-07T20:26:13.952Z","event":"UNKNOWN_ROUTE_ERROR","message":"Request was aborted."}
{"timestamp":"2026-04-07T20:28:36.693Z","event":"UNKNOWN_ROUTE_ERROR","message":"Provider request timed out after 45000ms."}
{"timestamp":"2026-04-07T20:40:12.257Z","event":"UNKNOWN_ROUTE_ERROR","message":"Request was aborted."}
```

### Expected Behavior

1. Consecutive user messages should be merged into a single `user` turn
   before being sent to Anthropic (concatenate content with newlines).
2. Alternatively, synthetic placeholder assistant messages should be
   injected between consecutive user messages.
3. When a stream fails, a minimal assistant error message should be
   persisted so the conversation doesn't enter a corrupt state.

### Fix Options

**Option A — Merge consecutive same-role messages in context window:**

Add a normalization step in `buildContextWindow()` or before the
`runClaudeAgentLoopStream` call that merges consecutive `user` messages into
one and consecutive `assistant` messages into one.

**Option B — Persist error placeholder on stream failure:**

When `createStreamResponse` catches an error, persist a minimal assistant
message like `"I'm sorry, I wasn't able to respond. Please try again."` so
the conversation maintains alternation.

**Option C — Both A and B (recommended):**

Merging is a safety net for any edge case that produces consecutive messages.
Persisting error placeholders prevents the corruption from occurring in the
first place.

---

## Additional Issues Observed

### Validation errors — empty message arrays

Five requests at 12:05 and 12:48 UTC returned:

```json
{"errorCode":"VALIDATION_ERROR","status":400,"message":"messages must be a non-empty array."}
```

Likely caused by rapid re-submits or the client sending before the message
array was populated. Not critical but indicates the client may need
debouncing.

### Image cache directory missing

```
⨯ Failed to write image to cache [...] Error: ENOENT: no such file or directory, mkdir '/app/.next/cache/images'
```

The Docker container's `.next/cache/images` directory does not exist. Not
related to chat but should be fixed in the Dockerfile or volume mount.

---

## Reproduction Steps

1. Log in as keith@firehose360.com on studioordo.com
2. Open conversation "hello" (conv_5878113a)
3. Send any message — the 5 consecutive user messages will be included in
   context, and the response will be garbled or the stream will fail silently

To reproduce from scratch:
1. Start a new conversation
2. Send a normal message, get a response
3. Paste a large (20K+ char) message — this will timeout
4. Before getting a response, send 2-3 more messages
5. The conversation is now in a corrupt state

---

## Affected Files

| File | Issue |
| --- | --- |
| `src/lib/chat/anthropic-stream.ts` | `isTransientProviderError` retries deterministic timeouts |
| `src/lib/chat/context-window.ts` | No message count/size cap, no alternation normalization |
| `src/lib/chat/stream-pipeline.ts` | No error-placeholder persistence on stream failure |
| `src/lib/chat/anthropic-client.ts` | Same retry issue in non-streaming path |

---

## Priority

**High** — this is a data-corruption bug that makes conversations
permanently broken after a single timeout. Every subsequent message in the
conversation will either fail silently or produce hallucinated responses.
The retry amplification makes the UX worse by adding 90+ seconds of
unnecessary waiting.

---

## Resolution

All three fix options were implemented (Option C — both A and B — for Bug 2):

### Bug 1 — Timeout Retry Guard

**File:** `src/lib/chat/anthropic-stream.ts` (lines 251-254)

After a successful tool round (`completedRounds > 0`), timeout errors throw
immediately instead of being retried. First-round timeouts
(`completedRounds === 0`) are still retried as potentially transient.

Additionally, `buildContextWindow()` now enforces `maxContextMessages: 40`
and `maxContextCharacters: 80,000` via `trimToLimits()`, preventing
unbounded payload growth.

### Bug 2A — Message Alternation Normalization

**File:** `src/lib/chat/context-window.ts` (lines 15-30)

`normalizeAlternation()` merges consecutive same-role messages with `\n\n`
separators before the context window is sent to Anthropic. Called
automatically by `buildContextWindow()`.

### Bug 2B — Error Placeholder Persistence

**File:** `src/lib/chat/stream-pipeline.ts` (lines 535-554)

When the streaming agent loop throws, the pipeline persists an assistant
placeholder message containing:
- `content`: partial `assistantText` if any was streamed, or a fallback
  message ("I'm sorry, I wasn't able to complete that response.")
- `parts`: includes a `{ type: "error" }` marker, and `{ type: "text" }`
  with any partial content that was streamed before the failure.

This ensures the conversation maintains user/assistant alternation even
after a stream failure.

### Non-Streaming Path

**File:** `src/lib/chat/anthropic-client.ts`

The non-streaming `transientRetryHandler` was already correctly skipping
retries on timeout (`isTimeoutError → return null`).

### QA Tests

| Test File | Tests | Coverage |
| --- | --- | --- |
| `tests/chat-timeout-and-corruption.test.ts` | 8 | Bug 1 retry guard, Bug 2A normalization |
| `tests/chat-error-placeholder.test.ts` | 3 | Bug 2B placeholder persistence |
| `tests/chat/anthropic-stream.test.ts` | 3 | Model fallback, transient retry, timeout guard |
| `src/lib/chat/context-window.test.ts` | 12 | Full context window with normalization |

**Validation:** `tsc --noEmit` clean, 2709 tests passing, 13 pre-existing
failures unchanged.
