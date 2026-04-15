# Sprint 1 — Route Assembly Alignment

> **Goal:** Ensure chat routes and provider assembly consume the corrected
> summary context contract cleanly.
> **Spec ref:** §3.2, §6
> **Prerequisite:** Sprint 0 complete

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/app/api/chat/stream/route.ts` | builds `systemPrompt`, calls `buildContextWindow()`, passes `messages` and `systemPrompt` into `runClaudeAgentLoopStream()` |
| `src/app/api/chat/route.ts` | non-stream route builds Anthropic provider with `systemPrompt` + `tools` |
| `src/lib/chat/anthropic-client.ts` | provider wrapper owns message submission to Anthropic |

---

## Task 1.1 — Update stream route summary handling

**What:** Consume the new context-window shape without reintroducing fake
conversation turns.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/api/chat/stream/route.ts` |
| **Spec** | Goal 1, Goal 4 |

### Implementation notes

1. If summary content cannot live in the message list, append it to
   `systemPrompt` in a clearly delimited server-controlled block that marks the
   summary as quoted historical data, not executable instructions.
2. Preserve the existing `hasSummary` signal only if it still adds value after
   the contract change.

### Verify Task 1.1

```bash
npm run typecheck
```

---

## Task 1.2 — Audit non-stream chat path for parity

**What:** Confirm the non-stream route either already avoids this issue or is
updated to match the new summary contract.

| Item | Detail |
| --- | --- |
| **Modify if needed** | `src/app/api/chat/route.ts` |
| **Spec** | Goal 2 |

### Verify Task 1.2

```bash
npx vitest run
```
