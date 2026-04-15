# Sprint 2 — Retrieval Orchestration And Canonical Citation Contract

> **Goal:** Make corpus references canonical by default and stop relying on the
> model to invent valid chapter targets from memory.
> **Spec ref:** §3, §4, §5.3, §7, §9
> **Prerequisite:** Sprint 1

---

## Task 2.1 — Introduce a canonical corpus reference helper

**What:** Create one helper or service that maps corpus search results,
validated aliases, and route targets into a canonical chapter reference shape.

Required fields:

1. `bookSlug`
2. `chapterSlug`
3. safe user-facing label
4. fallback route or search target when canonical resolution fails

### Verify Task 2.1

```bash
npm exec vitest run 'src/app/library/section/[slug]/page.test.ts' 'src/app/corpus/section/[slug]/page.test.ts'
```

---

## Task 2.2 — Add two-stage retrieval by default for grounded answers

**What:** When corpus search returns a strong winner, automatically read the
winning section or surface reduced confidence instead of answering from a thin
search summary.

### Verify Task 2.2

```bash
npm exec vitest run src/core/use-cases/tools/search-corpus.tool.test.ts src/core/use-cases/tools/get-section.tool.test.ts
```

Verification note:
If the exact test files do not exist yet, they should be created as part of the
sprint. The closeout bar is coverage for the orchestration rule, not just the
two tools independently.

---

## Task 2.3 — Preserve anonymous-safe canonical metadata

**What:** Anonymous users should still receive safe canonical targets for links
and chips even when full section content is gated.

### Verify Task 2.3

```bash
npm exec vitest run src/core/tool-registry/ToolResultFormatter.test.ts
```

---

## Task 2.4 — Make unresolved citations degrade gracefully

**What:** If canonical validation fails, the response should fall back to a
search or summary action instead of emitting a dead corpus link.

### Verify Task 2.4

```bash
npm exec vitest run src/adapters/MarkdownParserService.test.ts src/adapters/ChatPresenter.test.ts
```

---

## Task 2.5 — Surface retrieval confidence honestly

**What:** Add a machine-readable confidence or retrieval-quality signal so the
agent can distinguish “I read the section” from “I found a partial match.”

### Verify Task 2.5

```bash
npm run eval:live
```
