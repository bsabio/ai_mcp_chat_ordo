# Sprint 0 — Context Window Contract

> **Goal:** Correct `buildContextWindow()` so summary replay is represented as
> server-owned context instead of synthetic dialogue.
> **Spec ref:** §2, §3.1
> **Prerequisite:** None

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/lib/chat/context-window.ts` | `buildContextWindow(messages)` returns `contextMessages` and `hasSummary` |
| `src/core/entities/conversation.ts` | `Message.role` stores user and assistant conversation turns |
| `src/app/api/chat/stream/route.ts` | route consumes `buildContextWindow()` and appends a `hasSummary` trust signal |

---

## Task 0.1 — Fix the summary message shape

**What:** Remove the synthetic summary-as-user and acknowledgement-as-assistant
messages. Return either a real `system` summary message or a richer structure
that routes can safely fold into `systemPrompt`.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/chat/context-window.ts` |
| **Spec** | Goal 1, Goal 2, Goal 3 |

### Verify Task 0.1

```bash
npm run typecheck
```

---

## Task 0.2 — Update unit tests around context-window output

**What:** Add or update tests proving summary context is not emitted as fake
dialogue.

| Item | Detail |
| --- | --- |
| **Modify or create** | `src/lib/chat/context-window.test.ts` |
| **Spec** | Testing Strategy |

### Required cases

| Case | Expected |
| --- | --- |
| no summary present | only real user/assistant messages |
| summary present | one server-owned summary segment |
| later messages preserved | order remains stable |

### Verify Task 0.2

```bash
npx vitest run src/lib/chat/context-window.test.ts
```
