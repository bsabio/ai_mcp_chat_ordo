# Sprint 2 — Journal and Jobs Migration

> **Goal:** Aggressively eradicate literal-spacing drift from the highest-priority content surfaces—the Admin Journal, the editorial layouts, and the Jobs panels—converting their ad-hoc Tailwind classes to governed layout shells.
> **Spec ref:** §4, §5, §6
> **Prerequisite:** Sprint 1 — Shell and Chat Migration

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_refactor/spacing_refactor/spec.md` | canonical spacing refactor contract |
| `src/app/admin/journal/page.tsx` | heavily drifted surface containing multiple literal grids/gaps |
| `src/app/library/page.tsx` | content surface |
| `src/components/journal/JournalLayout.tsx` | editorial surface requiring governed rhythm |
| `src/components/jobs/JobsPagePanel.tsx` | data-dense panel with heavy util utility mapping |

---

## Task 2.1 — Refactor Admin Journal Workspace

**What:** The Admin Journal list surface is a primary offender of scattered literal utilities.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/admin/journal/page.tsx` |
| **Modify** | `src/app/admin/journal/[id]/page.tsx` |
| **Modify** | `src/app/admin/journal/preview/[slug]/page.tsx` |

### Admin journal implementation

1. Replace `gap-8`, `py-10`, `px-4`, `p-5` with semantic hooks natively.
2. Align table boundaries and card padding with `--space-inset-panel`.
3. Standardize the "Journal workspace" header rhythm using `--space-section-default`.

---

## Task 2.2 — Refactor Jobs Surface Panel

**What:** Update the Jobs feed and detail panels.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/jobs/JobsPagePanel.tsx` |

### Jobs implementation

1. Use Compact density rules natively for job row stacking.
2. Unify form filtering rows to share identical component spacing as the Journal Admin filter rows.

---

## Task 2.3 — Map Editorial Surfaces (Library/Journal)

**What:** The public-facing reading interfaces must embody structural rhythm.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/journal/JournalLayout.tsx` |
| **Modify** | `src/app/library/page.tsx` |
| **Modify** | `src/components/MarkdownProse.tsx` (optional if text block spacing is driven by CSS) |

### Editorial implementation

1. Map article wrapper widths and block padding to Relaxed density variants of `--space-frame-wide`.
2. Standardize typography rhythm (margin-top/bottom on headers vs paragraphs) against the spacing ladder rather than scattered em/px values in `MarkdownProse.tsx` and `PublicJournalPages.tsx`.
3. Normalize the vertical rhythm of article detail headers.

### Sprint 2 implementation closeout

Sprint 2 is complete with the following verified outcomes:

1. the admin journal workspace now avoids unsupported ladder steps in its page-frame rhythm
2. jobs, journal, profile, mentions, tool-card, and rich-content surfaces no longer rely on unsupported spacing token variants such as `--space-2.5`, `--space-1.5`, `--space-0.5`, `--space-5`, or `--space-14`
3. `foundation.css` now exposes `--space-inset-tight` as a governed semantic inset role for compact inline controls and code treatments
4. the spacing audit now governs the Sprint 2 panel/editorial surface set and flags unsupported spacing-token variants in addition to raw numeric spacing utilities

---

## Completion Checklist

- [x] All instances of `p-5`, `gap-8`, and similar literals removed from `admin/journal/*`.
- [x] Jobs panels spacing migrated to semantic classes.
- [x] Journal editorial rhythms governed by strict spacing ladder rules.
- [x] The `spacing:audit` command reports a drastic drop in literal utility violations.

## Verification Result

Verified on 2026-03-27:

1. `npm run spacing:audit` passed with `0` spacing violations across `14` governed targets
2. `npm run typecheck` passed
3. `npm exec vitest run tests/journal-public-route-convergence.test.ts tests/journal-taxonomy-metadata.test.ts tests/process-deferred-jobs-entrypoint.test.ts` passed with `6` tests green
4. `npx playwright test tests/browser-ui/jobs-page.spec.ts` passed with `1` live-browser test green

## Sprint 2 Exit Criteria

Sprint 2 is complete when the highest-traffic "inner" application content surfaces have caught up with the structural authority installed by Sprint 1 on the outer shell.
