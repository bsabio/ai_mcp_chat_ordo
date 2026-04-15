# Sprint 2 — Regression And Safety

> **Goal:** Add guardrails so summary context cannot drift back into pretend
> dialogue, route assembly remains explicit, and overlapping summarization does
> not create duplicate summary records.
> **Spec ref:** §4, §6
> **Prerequisite:** Sprint 1 complete

---

## Task 2.1 — Add regression assertions for synthetic summary text

**What:** Encode that the old acknowledgement string and summary-as-user pattern
must not reappear.

### Verify Task 2.1

```bash
npx vitest run src/lib/chat/context-window.test.ts
```

---

## Task 2.2 — Add prompt-boundary safety coverage

**What:** Add tests verifying server summary context remains distinct from user
authored content in route assembly.

| Item | Detail |
| --- | --- |
| **Create or modify** | stream/chat route tests |
| **Spec** | Goal 5 |

### Verify Task 2.2

```bash
npx vitest run
```

---

## Task 2.3 — Add summarization concurrency coverage

**What:** Prove same-conversation overlapping summarize triggers do not create
duplicate summary messages inside one process.

| Item | Detail |
| --- | --- |
| **Modify** | `src/core/use-cases/SummarizationInteractor.test.ts` |
| **Spec** | Goal 6 |

### Verify Task 2.3

```bash
npx vitest run src/core/use-cases/SummarizationInteractor.test.ts
```

---

## Task 2.4 — Final build and contract audit

**What:** Re-run the full suite and grep for the old synthetic acknowledgement
string to prevent silent reintroduction.

### Verify Task 2.4

```bash
rg "Understood\. I have context from our earlier discussion\." src docs -n
npx vitest run
npm run build
```
