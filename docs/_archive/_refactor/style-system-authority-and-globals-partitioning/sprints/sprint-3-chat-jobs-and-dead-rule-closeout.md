# Sprint 3 — Chat, Jobs, And Dead-Rule Closeout

> **Goal:** Partition the remaining interactive surfaces, remove proven dead rules, and close the refactor with regression and build confidence.
> **Spec ref:** §2, §3.2, §3.4, §4, §6
> **Prerequisite:** Sprint 2

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/app/globals.css` | still holds chat and jobs surface styling alongside broader app concerns |
| `src/components/jobs/JobsPagePanel.tsx` | active jobs surface with focused rendering coverage |
| chat and browser tests | protect high-traffic interactive surfaces from silent styling regressions |

---

## Task 3.1 — Partition chat and jobs surfaces

**What:** Move interactive app surfaces into clearer concern-owned partitions.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/globals.css` |
| **Create or Modify** | extracted chat and jobs CSS partitions |
| **Spec** | Goal 2, Goal 3 |

### Verify Task 3.1

```bash
npm run lint:css
npx vitest run src/components/jobs/JobsPagePanel.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-overlays.test.tsx
```

Verification status: passed on 2026-03-26 after extracting `src/app/styles/chat.css` and `src/app/styles/jobs.css` and importing both from `src/app/globals.css`.

---

## Task 3.2 — Remove proven dead rules

**What:** Use the authority map and focused search to remove selectors that no longer have live ownership.

| Item | Detail |
| --- | --- |
| **Modify** | extracted CSS partitions and `src/app/globals.css` aggregator |
| **Spec** | Goal 5, §3.4 |

### Work items

1. search for live references before deletion
2. verify suspicious rules against tests and route ownership
3. prefer small removals with fast validation over large speculative purges

Completed cleanup:

1. Removed one duplicate floating-chat header-leading selector whose earlier `gap` declaration was immediately overwritten by a later identical selector in the same ownership block.
2. Left the remaining chat selectors in place because code search still showed live ownership through the chat surface components and browser coverage.

### Verify Task 3.2

```bash
npm run lint:css
npm run build
```

Verification status: passed on 2026-03-26.

---

## Task 3.3 — Close the workstream with focused QA

**What:** Prove the partitioned style system still behaves correctly after the structural cleanup.

| Item | Detail |
| --- | --- |
| **Modify** | workstream QA notes as needed |
| **Spec** | §4, §6 |

### Verify Task 3.3

```bash
npm run lint:css
npx vitest run src/components/MarkdownProse.test.tsx tests/blog-hero-rendering.test.tsx src/components/jobs/JobsPagePanel.test.tsx
npm run build
```

Verification status: passed on 2026-03-26. The final focused regression run also included `tests/browser-fab-chat-flow.test.tsx` and `tests/browser-overlays.test.tsx` to cover the extracted chat surface.

---

## Completion Checklist

- [x] Chat and jobs surfaces have clear ownership boundaries
- [x] Proven dead rules are removed without visual regressions
- [x] CSS lint, focused tests, and build verification are all green

## QA Notes

- `npm run lint:css` passed
- `npx vitest run src/components/MarkdownProse.test.tsx tests/blog-hero-rendering.test.tsx src/components/jobs/JobsPagePanel.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-overlays.test.tsx` passed
- `npm run build` passed