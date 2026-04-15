# Sprint 7 — README, Open-Source Proof Story, And Governance Closeout

> **Goal:** Make the public repository tell the truth about the system that now
> exists and close the program with governance that keeps the story, prompts,
> and runtime aligned.
> **Spec ref:** §3, §4, §7, §9
> **Prerequisite:** Sprint 6

---

## Task 7.1 — Rewrite the README opening around the actual proof story

**What:** Update `README.md` so it foregrounds the strongest real claim:

1. solo agentic build
2. governed tool/runtime architecture
3. real QA loop with student/manual issue intake
4. open-source contribution surface

### Verify Task 7.1

```bash
sed -n '1,220p' README.md
```

---

## Task 7.2 — Auto-generate volatile inventories

**What:** Stop hand-maintaining facts that the code already knows how to answer.

Target inventories:

1. role-visible tool lists
2. corpus counts
3. route inventories or navigation capability summaries

### Verify Task 7.2

```bash
npm exec vitest run src/lib/corpus-vocabulary.test.ts
```

---

## Task 7.3 — Add contribution and governance notes for truthfulness work

**What:** Document:

1. how to update prompt-visible facts safely
2. how to add new tools without causing manifest drift
3. how to file meta/runtime-truth bugs
4. how to convert manual QA findings into evals

### Verify Task 7.3

```bash
sed -n '1,260p' docs/_refactor/agent-runtime-truthfulness-and-retrieval-integrity/spec.md
sed -n '1,220p' README.md
```

---

## Task 7.4 — Program closeout

**What:** Close the workstream only when the runtime, prompt text, README, and
release evidence all describe the same system.

### Verify Task 7.4

```bash
npm exec vitest run src/lib/corpus-vocabulary.test.ts src/adapters/ChatPresenter.test.ts src/components/AudioPlayer.test.tsx
npm run eval:live
npm run build
npm run release:evidence
```
