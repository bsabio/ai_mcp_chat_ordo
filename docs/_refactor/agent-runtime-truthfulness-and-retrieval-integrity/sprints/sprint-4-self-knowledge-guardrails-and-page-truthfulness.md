# Sprint 4 — Self-Knowledge Guardrails And Page Truthfulness

> **Goal:** Make fourth-wall answers bounded, truthful, and testable rather
> than letting the model improvise about hidden system state.
> **Spec ref:** §3, §5.2, §5.1, §7, §9
> **Prerequisite:** Sprint 3

---

## Task 4.1 — Distinguish verified facts from inference in the prompt contract

**What:** Update the base prompt and any role directives so self-descriptive
answers explicitly separate:

1. verified runtime facts
2. facts supplied by server-owned context
3. inference or uncertainty

### Verify Task 4.1

```bash
npm exec vitest run src/lib/corpus-vocabulary.test.ts src/lib/chat/routing-context.test.ts
```

---

## Task 4.2 — Govern prompt disclosure

**What:** Add policy for fourth-wall questions that allows high-level capability
summary but does not let the model casually dump raw prompt text or internal
implementation metadata unless an explicit inspection surface authorizes it.

### Verify Task 4.2

```bash
npm run eval:live
```

Verification note:
The live eval catalog should include at least one meta question that probes for
raw prompt disclosure and checks the bounded response policy.

---

## Task 4.3 — Make current page truth authoritative in meta answers

**What:** Add regression coverage for conflicts between stale assistant memory
and authoritative current-page context.

### Verify Task 4.3

```bash
npm exec vitest run src/lib/chat/routing-context.test.ts src/adapters/ChatPresenter.test.ts
```

---

## Task 4.4 — Add fourth-wall eval scenarios

**What:** Extend deterministic and live eval catalogs with explicit scenarios
for:

1. self-knowledge honesty
2. current-page truthfulness
3. prompt-disclosure boundaries
4. canonical-tool-description accuracy

### Verify Task 4.4

```bash
npm run eval:live
```
