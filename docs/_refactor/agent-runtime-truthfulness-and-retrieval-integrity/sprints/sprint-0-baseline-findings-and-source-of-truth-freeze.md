# Sprint 0 — Baseline Findings And Source-Of-Truth Freeze

> **Goal:** Freeze the exact issue inventory, record the already-landed baseline
> fixes, and identify the authoritative sources for every prompt-visible fact
> the agent is allowed to state.
> **Spec ref:** §1, §2, §5, §7, §9
> **Prerequisite:** None

---

## Task 0.1 — Lock the issue inventory

**What:** Confirm the workstream covers every issue surfaced by the live
letter-based audit plus the additional findings from deeper code review.

This includes:

1. stale corpus counts and prompt text
2. retrieval/citation canonicality gaps
3. duplicate navigation tool exposure
4. self-knowledge and fourth-wall honesty drift
5. `__actions__` / `__suggestions__` runtime-contract weakness
6. audio result opacity
7. README/public-doc drift

### Verify Task 0.1

```bash
sed -n '1,260p' docs/_refactor/agent-runtime-truthfulness-and-retrieval-integrity/spec.md
sed -n '1,220p' docs/_refactor/README.md
```

---

## Task 0.2 — Freeze truth sources

**What:** Record one canonical source for each class of runtime fact before any
prompt or README edits start.

Required truth sources:

1. corpus counts and labels → `src/lib/corpus-vocabulary.ts`
2. role-visible tools → `ToolRegistry` composed via `src/lib/chat/tool-composition-root.ts`
3. route validity and labels → `SHELL_ROUTES`
4. page context truth → `src/lib/chat/current-page-context.ts`
5. config defaults and role prompts → `src/lib/config/defaults.ts` and role directive sources

### Verify Task 0.2

```bash
sed -n '1,220p' src/lib/corpus-vocabulary.ts
sed -n '1,220p' src/lib/chat/tool-composition-root.ts
sed -n '1,220p' src/lib/chat/current-page-context.ts
sed -n '1,220p' src/lib/config/defaults.ts
```

---

## Task 0.3 — Freeze the verification bar

**What:** Define the exact test, eval, and release evidence gates that later
work must satisfy.

Minimum gate categories:

1. prompt drift tests
2. tool-manifest and registry invariants
3. canonical corpus-link and resolver tests
4. output-contract rendering tests
5. live eval and release evidence

### Verify Task 0.3

```bash
sed -n '1,220p' docs/_refactor/agent-runtime-truthfulness-and-retrieval-integrity/sprints/README.md
sed -n '1,220p' package.json
```
