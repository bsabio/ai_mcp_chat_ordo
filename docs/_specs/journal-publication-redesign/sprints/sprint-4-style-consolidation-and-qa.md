# Sprint 4 - Style Consolidation And QA

> **Goal:** Consolidate styling authority, remove stale journal styling paths, and finish the redesign with browser evidence, factual identity readiness, and regression QA.
> **Spec ref:** `JPR-037`, `JPR-090` through `JPR-096`, `JPR-114` through `JPR-118`
> **Prerequisite:** Sprint 3
> **Test count target:** Focused journal tests remain green and browser evidence is recorded.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/app/globals.css` | Contains older journal-specific class rules that may no longer be authoritative after the shared primitive rewrite |
| `src/components/journal/JournalLayout.tsx` | Current journal rendering now relies primarily on shared typed components and utility composition |
| `tests/blog-hero-rendering.test.tsx` | Focused journal route assertions remain the main static regression guard |
| Browser automation / screenshot workflow | Available for live route verification when needed |

---

## QA Findings Before Reconciliation

1. `src/app/globals.css` still carried a large legacy `.journal-*` rule set from earlier card-led passes even though the live journal routes were already owned by typed journal primitives and route-local utility composition.
2. The real owner-controlled LinkedIn destination had now been provided and needed to be exercised in both live verification and focused route assertions so Sprint 4 could close `JPR-093` and `JPR-094` against the actual destination.
3. Final sign-off still required browser evidence plus a green `npm run build`, which surfaced unrelated strict conversation-context guards in the job routes during verification.

---

## Task 4.1 - Consolidate journal styling authority

**What:** Remove or deprecate stale journal-specific CSS paths so the publication system has one clear source of styling truth.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/globals.css` |
| **Modify** | journal component files as needed |
| **Spec** | `JPR-090` through `JPR-092` |

### Task 4.1 Notes

Do not remove legacy rules blindly. Only remove or de-authorize rules once the new journal primitives fully own the same responsibility.

Be specific about the ownership outcome:

1. identify which selectors are now stale
2. identify which component or utility now owns that responsibility
3. remove or de-authorize only after the replacement is confirmed in browser QA

### Task 4.1 Verify

```bash
npm run build
```

---

## Task 4.2 - Capture browser evidence and complete QA

**What:** Verify the redesigned journal in a real browser and record the resulting evidence under this feature folder.

| Item | Detail |
| --- | --- |
| **Create** | `docs/_specs/journal-publication-redesign/artifacts/` as needed |
| **Modify** | relevant sprint docs with QA notes |
| **Spec** | `JPR-037`, `JPR-114` through `JPR-116` |

### Task 4.2 Notes

At minimum verify:

1. journal index first-screen composition
2. restrained lead-entry hierarchy
3. section differentiation
4. article opening sequence
5. persistence of navigation and shell integrity
6. no regression back toward fictional issue framing or decorative publication rhetoric
7. archive rows do not repeat live shelf entries
8. identity links, if present, remain quiet and useful rather than becoming promotional chrome

If LinkedIn identity links land before or during this sprint, include them in browser QA and focused route assertions.

If podcast/feed support is still future work, verify at least that the final article layout leaves a quiet place for later metadata without forcing another structural rewrite.

QA notes should name:

1. what was removed
2. what still feels too decorative, if anything
3. whether the route now reads like an index or reading surface instead of a product landing page

### Task 4.2 Verify

```bash
npm exec vitest run src/components/MarkdownProse.test.tsx tests/blog-hero-rendering.test.tsx tests/sprint-7-blog-pipeline.test.ts
npm run build
```

---

## Completion Checklist

- [x] Journal styling authority is consolidated
- [x] Browser evidence exists for the redesigned journal routes
- [x] Focused journal regression suite is green
- [x] QA notes match the implemented state
- [x] Identity and future distribution hooks are accounted for without cluttering the journal surface

## QA Deviations

1. Browser evidence was captured with the local Playwright CLI screenshots rather than the shared browser MCP session because the shared profile remained intermittently locked during this pass.
2. `npm run build` passed after adding missing conversation-context guards in `src/app/api/chat/jobs/[jobId]/route.ts` and `src/app/api/jobs/[jobId]/route.ts`; those fixes were unrelated to journal rendering but blocked Sprint 4 verification until resolved.
