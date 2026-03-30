# Sprint 2 - Sections And Back Issues

> **Goal:** Differentiate essay, briefing, and archive reading modes so the journal is organized like a strict index rather than a single card feed.
> **Spec ref:** `JPR-032`, `JPR-035`, `JPR-060` through `JPR-063`, `JPR-110`, `JPR-111`
> **Prerequisite:** Sprint 1
> **Test count target:** Focused journal rendering tests updated for section-specific presentation remain green.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/lib/blog/journal-taxonomy.ts` | Derived journal structure already separates `latestEssays`, `practicalBriefings`, and `archiveGroups` |
| `src/components/journal/JournalLayout.tsx` | `JournalStoryCard`, `JournalArchiveNavigation`, and `JournalArchiveCard` are the primary section/entry primitives |
| `src/app/blog/page.tsx` | Current index already renders the three logical shelves and back-issues sections |
| `docs/_specs/journal-publication-redesign/artifacts/sprint-1-cover-composition.md` | Sprint 1 evidence already confirms thin-content duplication is visible and should be resolved in Sprint 2 |

---

## QA Findings Before Implementation

1. Cross-shelf duplication was a real Sprint 1 carryover risk, but the current implementation already removes silent backfill between `latestEssays` and `practicalBriefings`. Sprint 2 sign-off must preserve that behavior with direct regression coverage.
2. The implementation already separates essay, briefing, and archive composition, but the focused tests do not make those layout contracts explicit enough to prevent accidental visual collapse back into one generic card/feed system.
3. Browser evidence is required because section differentiation and archive chronology are visual contracts; screenshot notes remain part of sign-off even when JSX and Vitest checks are green.

---

## Task 2.1 - Give essays and briefings distinct layout systems

**What:** Make section identity visually legible through composition, density, and rhythm rather than only through copy labels.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/journal/JournalLayout.tsx` |
| **Modify** | `src/app/blog/page.tsx` |
| **Spec** | `JPR-032`, `JPR-060`, `JPR-061`, `JPR-111` |

### Task 2.1 Notes

Essays should feel slower and more literary; briefings should feel tighter and more operational. This distinction should be obvious even before reading the labels.

Art-direction requirements:

1. Essays should not read as compact cards in a feed. Prefer taller, more open row or ledger compositions with stronger headline scale, more generous text measure, and slower vertical rhythm.
2. Briefings should not reuse essay proportions. Prefer denser, more index-like or ledger-like entries with faster scanning and less ornamental whitespace.
3. If one section lacks enough posts, the UI may not silently duplicate entries from the other section at equal emphasis. Any fallback must be explicit, minimal, and visually secondary.
4. Section identity should be legible from silhouette and spacing alone before the reader parses the section label.
5. Do not use gradients, glass, decorative chips, or rounded card walls to create the sense of difference between sections.

### Task 2.1 Verify

```bash
npm exec vitest run tests/blog-hero-rendering.test.tsx
```

Browser verification should capture `/blog` after section differentiation lands and record whether essay and briefing shelves are still visually confusable.

---

## Task 2.2 - Rebuild the archive as back issues rather than a card gallery

**What:** Make the archive behave like chronology and issue continuity, with stronger year structure and less dependence on repeated image cards.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/journal/JournalLayout.tsx` |
| **Modify** | `src/app/blog/page.tsx` |
| **Spec** | `JPR-035`, `JPR-062`, `JPR-102` |

### Task 2.2 Notes

The output may still use cards in places, but the overall interaction should read like back issues or a finding aid rather than a feed.

Art-direction requirements:

1. The archive should privilege chronology and issue continuity over thumbnail repetition.
2. Repeated hero-image cards should be treated as a likely removal candidate for archive entries unless they materially improve chronology.
3. Year groups should feel like issue bands, ledgers, or reading tables rather than another gallery grid.
4. Archive entries should keep their real derived section identity visible without competing with chronology.
5. Archive rows must exclude any entries already promoted into the live essay or briefing shelves on the same page.

### Task 2.2 Verify

```bash
npm exec vitest run tests/blog-hero-rendering.test.tsx
```

Browser verification should capture the back-issues section and confirm it no longer reads like a miscellaneous card wall.

---

## Task 2.3 - Record browser evidence for section and archive differentiation

**What:** Capture feature-owned evidence showing the section split and back-issues redesign in a real browser.

| Item | Detail |
| --- | --- |
| **Create or Modify** | `docs/_specs/journal-publication-redesign/artifacts/` |
| **Spec** | `JPR-037`, `JPR-114`, `JPR-116` |

### Task 2.3 Notes

At minimum record:

1. one `/blog` screenshot showing both essay and briefing treatments
2. one screenshot or markdown note focused on the archive/back-issues section
3. a short note explaining whether cross-shelf duplication still exists and, if so, why
4. a short note naming which decorative or fictional patterns were removed in the redesign

### Task 2.3 Verify

```bash
test -d docs/_specs/journal-publication-redesign/artifacts
```

---

## Completion Checklist

- [x] Essays and briefings are visually distinct reading modes
- [x] Archive behaves like back issues and chronology
- [x] Cross-shelf duplication is eliminated or explicitly justified as secondary fallback behavior
- [x] Section identity remains grounded in real derived data
- [x] Browser evidence is recorded for the new section and archive compositions

## QA Deviations

- The current implementation already satisfies the no-duplication requirement; Sprint 2 work primarily hardened the explicit section-layout and archive-contract assertions around that behavior.
