# Sprint 1 — Prompt, Doc, And Manifest Drift Elimination

> **Goal:** Remove stale prompt and documentation claims and add tests so the
> system cannot silently drift away from its own runtime reality again.
> **Spec ref:** §3, §5.1, §7, §9
> **Prerequisite:** Sprint 0

---

## Task 1.1 — Remove hand-maintained corpus facts from the base prompt

**What:** Replace hardcoded corpus counts and stale chapter inventory language in
`buildCorpusBasePrompt()` with generated or config-backed facts derived from the
same runtime source the tools use.

### Verify Task 1.1

```bash
npm exec vitest run src/lib/corpus-vocabulary.test.ts
```

Verification note:
Add explicit assertions that the prompt no longer hardcodes stale corpus counts
or outdated chapter totals.

---

## Task 1.2 — Add prompt-to-runtime drift tests

**What:** Add coverage that compares prompt-visible claims against authoritative
sources instead of only checking for string presence.

Target invariants:

1. corpus counts in prompt == `corpusConfig`
2. prompt examples reference supported action types only
3. role-level prompt guidance does not claim capabilities absent from the
   runtime manifest

### Verify Task 1.2

```bash
npm exec vitest run src/lib/corpus-vocabulary.test.ts src/lib/chat/routing-context.test.ts
```

---

## Task 1.3 — Bring README and public docs under the same truth contract

**What:** Update `README.md` so volatile inventories such as tool lists, corpus
counts, and product/runtime claims are either generated or test-backed.

Required corrections:

1. tool inventory reflects the current registry
2. corpus counts reflect live config
3. public architecture story matches the shipped runtime

### Verify Task 1.3

```bash
sed -n '1,260p' README.md
npm run build
```

---

## Task 1.4 — Add a docs drift guard

**What:** Introduce one test or generated artifact that fails when README or
other prompt-visible docs diverge from runtime truth.

### Verify Task 1.4

```bash
npm exec vitest run src/lib/corpus-vocabulary.test.ts
```

Verification note:
The guard can be snapshot-based, generated markdown, or invariant-based, but it
must be part of CI rather than manual review.
