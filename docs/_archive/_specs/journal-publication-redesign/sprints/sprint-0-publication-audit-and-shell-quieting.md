# Sprint 0 - Publication Audit And Shell Quieting

> **Goal:** Establish the verified journal publishing contract, reduce shell interference on journal routes, and create the implementation baseline for index/article redesign work.
> **Spec ref:** `JPR-010` through `JPR-026`, `JPR-030` through `JPR-045A`, `JPR-080` through `JPR-082`, `JPR-100` through `JPR-103`, `JPR-120`
> **Prerequisite:** None
> **Test count target:** Existing focused journal suite remains green; add focused route/shell regression coverage only if new route-aware shell behavior is introduced.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/app/journal/page.tsx` | Canonical public journal index server component using `getBlogPostRepository().listPublished()`, `loadPublishedHeroAssets(posts)`, and `buildJournalPublicationStructure(posts)` |
| `src/app/journal/[slug]/page.tsx` | Canonical public article server component using `findBySlug(slug)`, `loadPublishedHeroAsset(post)`, `splitJournalStandfirst()`, and `MarkdownProse` journal rendering |
| `src/components/journal/JournalLayout.tsx` | Shared journal primitives currently define the journal header, lead entry, section headers, archive navigation, article header, and longform ornaments |
| `src/components/MarkdownProse.tsx` | Journal markdown rendering already supports pull quotes, side notes, and figure variants via shared journal primitives |
| `src/lib/blog/journal-taxonomy.ts` | Derived journal classification currently returns `leadStory`, `latestEssays`, `practicalBriefings`, and chronological `archiveGroups` |
| `src/components/AppShell.tsx` | App shell already distinguishes homepage viewport-stage mode from non-home document-flow routes |
| `src/components/SiteNav.tsx` | Sticky global nav remains active on journal routes and currently uses the same visual emphasis as the rest of the app shell |
| `tests/blog-hero-rendering.test.tsx` | Focused journal route tests already assert sectioned publication rendering and hero behavior |

---

## Task 0.1 - Document the actual journal failure modes and publication contract

**What:** Convert the current critique into explicit, code-verified implementation notes in the spec and sprint docs so design decisions stop living in chat history.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/journal-publication-redesign/spec.md` |
| **Modify** | `docs/_specs/journal-publication-redesign/sprints/sprint-0-publication-audit-and-shell-quieting.md` |
| **Spec** | `JPR-010` through `JPR-024`, `JPR-030` through `JPR-043` |

### Task 0.1 Notes

Capture at minimum:

1. the masthead hierarchy failure
2. the metadata-first opening problem
3. the application-chrome vs publication-surface conflict
4. the archive/gallery mismatch
5. the distinct role expected for essays, briefings, and the lead entry

Because Sprint 0 artifacts are historical baselines, they may retain older terms such as `cover story` where those words describe the captured UI. Any retained historical language should be explicitly marked as baseline vocabulary rather than current target direction.

This task is complete when the doc set explains the problem well enough that a fresh implementation agent could continue without relying on the original chat context.

### Task 0.1 Verify

```bash
test -f docs/_specs/journal-publication-redesign/spec.md
```

---

## Task 0.2 - Quiet shell emphasis on journal routes without destabilizing navigation

**What:** Adjust shell or nav presentation on journal routes so the publication surface owns the page atmosphere while navigation remains persistent and truthful.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/SiteNav.tsx` |
| **Modify** | `src/components/AppShell.tsx` or journal route surface primitives if route-aware chrome is better applied there |
| **Create or Modify** | Focused shell/journal regression tests as needed |
| **Spec** | `JPR-033`, `JPR-080` through `JPR-082`, `JPR-115` |

### Task 0.2 Notes

Acceptable outcomes include:

1. reduced visual weight for the nav on journal routes
2. route-aware shell spacing or background behavior that favors editorial content
3. explicit review of the floating chat FAB's visual interference on the journal index

Sprint 0 implementation baseline:

1. `AppShell` exposes `data-shell-route-surface="journal"` on the canonical journal route family
2. `SiteNav` exposes `data-shell-nav-tone="quiet"` on journal routes so the nav rail can be de-emphasized without removing it
3. floating chat launcher and open floating shell expose `data-chat-route-tone="quiet"` on journal routes so FAB weight can be reduced without changing behavior

These hooks still exist in the current implementation and should be treated as the canonical Sprint 0 shell baseline unless intentionally replaced later.

Do not remove the menu. This sprint is about quieting shell emphasis, not reintroducing the earlier shell regression.

### Task 0.2 Verify

```bash
npm exec vitest run src/components/AppShell.test.tsx tests/chat-surface.test.tsx tests/blog-hero-rendering.test.tsx
```

---

## Task 0.3 - Establish browser-verifiable journal evidence workflow

**What:** Define how rendered journal screenshots and browser verification will be captured and stored as feature-owned evidence for later sprints.

| Item | Detail |
| --- | --- |
| **Create** | `docs/_specs/journal-publication-redesign/artifacts/` as needed when evidence begins landing |
| **Modify** | This sprint doc with the chosen verification pattern |
| **Spec** | `JPR-037`, `JPR-114`, `JPR-116` |

### Task 0.3 Notes

At minimum record:

1. baseline routes: `/journal` and one representative `/journal/[slug]`, with older evidence allowed to note the pre-cutover `/blog` baseline explicitly
2. retained evidence format: screenshots plus DOM/assertion notes in feature-owned artifacts
3. cadence: capture a fresh evidence pass at Sprint 0 baseline and after each substantive publication-layout or shell-emphasis change
4. whether an artifact is purely historical baseline evidence or reflects the current target direction

Sprint 0 records the workflow in `docs/_specs/journal-publication-redesign/artifacts/README.md`.

### Task 0.3 Verify

```bash
test -f docs/_specs/journal-publication-redesign/artifacts/README.md
```

---

## Completion Checklist

- [x] Journal failure modes are documented as a verified publishing problem, not a taste complaint
- [x] Shell interference plan for journal routes is defined and implemented or explicitly deferred with rationale
- [x] Journal verification/evidence workflow is recorded for later sprints

## QA Deviations

None.
