# Sprint 1 - Journal Cover And Index Composition

> **Goal:** Rebuild the top of the journal so the first screen reads like a strict publishing index with a factual header and restrained lead entry rather than metadata theater and generic cards.
> **Spec ref:** `JPR-030`, `JPR-031`, `JPR-040` through `JPR-053`, `JPR-110`, `JPR-114`
> **Prerequisite:** Sprint 0
> **Test count target:** Existing focused journal suite plus any added index-structure assertions remain green.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/app/blog/page.tsx` | Journal index already builds lead story, essay shelf, briefing shelf, and archive groups from real post data |
| `src/components/journal/JournalLayout.tsx` | Shared intro and lead-entry primitives exist and should be simplified into ruled index surfaces rather than boxed feature cards |
| `src/lib/blog/hero-images.ts` | `loadPublishedHeroAssets(posts)` and `getBlogAssetUrl(id)` provide lead-story image support |
| `tests/blog-hero-rendering.test.tsx` | Current tests already render the public index and can be extended for restrained lead-entry expectations |

---

## QA Findings Before Reconciliation

1. The current header copy was already factual, but the intro still rendered as a boxed surface rather than a stripped index header, which weakened `JPR-042`.
2. The current lead still behaved like a feature card through oversized boxed treatment, explicit `Lead` support copy, and explanatory rhetoric about why it led the page. That violated `JPR-050` through `JPR-054`.
3. The focused index test had drifted with the implementation and was asserting `editorial theater` copy, which meant the regression suite was protecting the wrong Sprint 1 contract.

---

## Task 1.1 - Replace the current masthead with a factual journal header

**What:** Recompose the journal header so it behaves like a factual index header instead of a right-rail ledger plus cramped title block.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/journal/JournalLayout.tsx` |
| **Modify** | `src/app/blog/page.tsx` |
| **Spec** | `JPR-030`, `JPR-041`, `JPR-042`, `JPR-050` |

### Task 1.1 Notes

The header should likely include:

1. a simple section label or title
2. one short statement of purpose
3. factual metadata only if it helps orientation
4. enough vertical economy that the lead entry begins on the first screen

The current `Issue desk` / `Journal at a glance` structure should be treated as removal candidates, not redesign prompts.

Explicitly avoid:

1. fictional issue language
2. decorative chips
3. long proposition copy
4. card styling used to fake hierarchy

### Task 1.1 Verify

```bash
npm exec vitest run tests/blog-hero-rendering.test.tsx
```

---

## Task 1.2 - Turn the lead story into a restrained lead entry

**What:** Replace the current feature-card feel with a restrained lead-entry composition that makes the newest article the first meaningful row on the page.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/journal/JournalLayout.tsx` |
| **Modify** | `src/app/blog/page.tsx` |
| **Spec** | `JPR-031`, `JPR-050` through `JPR-053` |

### Task 1.2 Notes

The lead entry should establish:

1. stronger hierarchy than standard rows
2. authority through sequence and type rather than spectacle
3. compatibility with image-light or image-free publishing

If no hero image exists, the fallback should still feel complete rather than like a broken hero.

The reconciled implementation should prefer a simple ruled row when no hero image is available. It should not add placeholder hero copy to explain away the missing image.

### Task 1.2 Verify

```bash
npm exec vitest run tests/blog-hero-rendering.test.tsx
```

---

## Completion Checklist

- [x] Journal header reads like a factual publishing index header
- [x] Lead story begins within the first-screen reading sequence
- [x] Lead entry has a distinct composition from shelf rows without becoming theatrical
- [x] Focused tests assert restrained lead-entry behavior instead of legacy support copy

## QA Deviations

1. Browser capture of `/blog` still surfaces the existing shared chat event-stream interruption during page load. That console error predates Sprint 1 and did not block journal rendering or route integrity during this sprint.
