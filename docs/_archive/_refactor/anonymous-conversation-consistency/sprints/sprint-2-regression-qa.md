# Sprint 2 — Regression QA

> **Goal:** Lock the new contract in with regression checks and concise docs.
> **Spec ref:** §5, §7
> **Prerequisite:** Sprint 1 complete

---

## Task 2.1 — End-to-end anonymous restore verification

**What:** Verify the full lifecycle: anonymous user starts chatting, refreshes,
restores the active conversation, archives it, and starts fresh.

| Item | Detail |
| --- | --- |
| **Exercise** | `/api/chat/stream`, `/api/conversations/active`, `/api/conversations/active/archive` |
| **Spec** | Done Criteria 1 |

### Verify Task 2.1

```bash
npx vitest run
npm run build
```

---

## Task 2.2 — Add short policy note to refactor and conversation-memory docs

**What:** Document that active conversation restore/archive supports anonymous
cookie identity while list/detail routes remain authenticated.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_refactor/anonymous-conversation-consistency/spec.md` if needed |
| **Modify** | `docs/_specs/conversation-memory/spec.md` if implementation changes contract wording |
| **Spec** | Done Criteria 4 |

### Verify Task 2.2

```bash
rg "active conversation" docs/_refactor docs/_specs/conversation-memory
```

---

## Task 2.3 — Final route matrix audit

**What:** Re-check that no new route is accidentally protected or exposed.

### Verify Task 2.3

```bash
rg "/api/conversations" src/proxy.ts src/app/api/conversations -n
```
