# Sprint 2 — Editorial And Prose Consolidation

> **Goal:** Finish the editorial authority cleanup by keeping journal, article, and prose styling in one coherent shared layer.
> **Spec ref:** §1, §2, §3.1, §3.2, §3.4, §4
> **Prerequisite:** Sprint 1

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/components/journal/JournalLayout.tsx` | shared journal primitives already own much of the composition contract |
| `src/components/MarkdownProse.tsx` | now delegates more journal typography to shared CSS |
| `tests/blog-hero-rendering.test.tsx` | focused route coverage for journal index and article structure |
| `src/components/MarkdownProse.test.tsx` | focused coverage for journal prose ornaments |

---

## Task 2.1 — Finish journal and editorial extraction

**What:** Keep editorial surfaces together in a clear shared partition rather than split across broad global sections.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/globals.css` |
| **Create or Modify** | extracted editorial or journal-focused CSS partition |
| **Spec** | Goal 1, Goal 3 |

### Work items

1. move `editorial-paper-surface`, `journal-prose`, and related editorial classes into the same ownership zone
	- Completed by extracting the shared editorial, library, and prose block into `src/app/styles/editorial.css` and importing it from `src/app/globals.css`.
2. keep route and article hierarchy readable from the stylesheet structure alone
	- Completed by keeping the new partition scoped to route shells, editorial surfaces, and prose contracts only.
3. avoid reintroducing component-owned duplicate typography after extraction
	- Completed without component markup changes because `JournalLayout` and `MarkdownProse` were already consuming the shared classes.

### Verify Task 2.1

```bash
npm run lint:css
npx vitest run src/components/MarkdownProse.test.tsx tests/blog-hero-rendering.test.tsx
```

Verification status: passed on 2026-03-26 after extracting `src/app/styles/editorial.css`.

---

## Task 2.2 — Remove proven editorial duplication

**What:** Delete or de-authorize rules only after the shared replacement is clearly live.

| Item | Detail |
| --- | --- |
| **Modify** | shared editorial CSS and affected components as needed |
| **Spec** | Goal 5, §3.4 |

### Verify Task 2.2

```bash
npx vitest run src/components/MarkdownProse.test.tsx tests/blog-hero-rendering.test.tsx
npm run build
```

Verification status: passed on 2026-03-26. No additional component-local duplicate prose rules were needed after the shared extraction, so the safe removal step was satisfied by deleting the editorial/prose block from `src/app/globals.css`.

---

## Completion Checklist

- [x] Editorial and prose styling lives in one coherent shared partition
- [x] Journal component markup no longer duplicates shared prose responsibilities
- [x] Proven duplicate editorial rules are removed safely

## QA Notes

- `npm run lint:css` passed
- `npx vitest run src/components/MarkdownProse.test.tsx tests/blog-hero-rendering.test.tsx` passed
- `npm run build` passed