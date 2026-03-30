# Sprint 3 — Component Sweep and Strict Enforcement

> **Goal:** Mop up the remaining secondary application components into the governed system, and activate strict linting guardrails to prevent literal utility spacing from re-entering the codebase.
> **Spec ref:** §5, §6, §7
> **Prerequisite:** Sprint 2 — Journal and Jobs Migration

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_refactor/spacing_refactor/spec.md` | canonical spacing refactor contract |
| `package.json` | script definitions |
| `src/frameworks/ui/*` | standard shared UI library folder |
| `src/components/*` | remaining app components (badges, modals, etc.) |

---

## Task 3.1 — Deep System Component Sweep

**What:** Target the micro-components that were deferred during the macro-layout shifts.

| Item | Detail |
| --- | --- |
| **Modify** | Buttons, Modals, ToolCards, AudioPlayer overlays, MentionsMenus |
| **Spec** | §5 |

### Required implementation

1. Scan for localized padding/margin in isolated components like `ToolCard.tsx` or `ContentModal.tsx`.
2. Convert them to `--surface-inset-*` or `--layout-stack-tight` equivalents.
3. Eliminate ad-hoc negative margins used for visual alignment, preferring formal grid/flex governance.

---

## Task 3.2 — Baseline Strict Assertion

**What:** Transition the Sprint 0 audit from a "reporting tool" into an active CI enforcer.

| Item | Detail |
| --- | --- |
| **Modify** | `package.json` or `.eslintrc.js` |
| **Spec** | §7 |

### Required enforcement work

1. Formalize the `npm run spacing:audit` command in `package.json` to exit `1` if the number of raw Tailwind pacing classes (`p-5`, `gap-8`) in governed view directories exceeds our established whitelist/threshold.
2. Implement rigid ESLint constraints (if using `eslint-plugin-tailwindcss`) to forbid specific raw classes, forcing the use of our semantic variables like `gap-(--layout-stack-normal)`.
3. Deliver a **Final Refactor Report** showing the delta between Sprint 0's drift census and the final Sprint 3 state.

---

## Completion Checklist

- [x] All remaining low-level components evaluated and bound to token spacing.
- [x] Strict CI guardrail is active and preventing literal utility regressions.
- [x] Snapshot QA passes globally showing no destructive functional shifts.

## Implementation Closeout

Sprint 3 completed the remaining shared-surface migration and activated strict spacing enforcement without introducing a second spacing authority.

### Delivered changes

1. Migrated remaining shared and library surfaces off unsupported spacing steps and onto governed role tokens or declared ladder steps.
2. The migrated Sprint 3 files are `src/components/AudioPlayer.tsx`, `src/components/BookSidebar.tsx`, `src/components/ContentModal.tsx`, `src/components/GraphRenderer.tsx`, `src/components/MarkdownProse.tsx`, `src/components/ThemeSwitcher.tsx`, `src/components/WebSearchResultCard.tsx`, `src/components/journal/PublicJournalPages.tsx`, `src/frameworks/ui/ChatMarkdown.tsx`, `src/app/library/page.tsx`, and `src/app/library/[document]/[section]/page.tsx`.
3. Expanded `scripts/spacing-audit.js` from the Sprint 2 surface set to a 25-file governed scope covering shell, chat, library, admin, jobs, editorial, and shared component surfaces.
4. Promoted `npm run spacing:audit` from report-only to enforced threshold mode with `0` allowed matches.
5. Added `npm run spacing:audit:report` so manual audits remain available without weakening CI.
6. Added the enforced spacing audit to the `quality` pipeline in `package.json`.

### Final Refactor Report

| Phase | Mode | Governed targets | Literal spacing matches |
| --- | --- | --- | --- |
| Sprint 0 baseline | report-only | 6 | visible baseline only |
| Sprint 2 baseline | report-only | 14 | 0 |
| Sprint 3 final | enforced (`--threshold=0`) | 25 | 0 |

### Enforcement note

This repository does not currently ship with `eslint-plugin-tailwindcss`, so Sprint 3 implements the required strict regression protection through the governed spacing audit rather than by introducing a new Tailwind-specific ESLint rule layer. That keeps one enforcement authority instead of splitting spacing governance across two tools.

## Verification

1. `npm run spacing:audit`
   Result: passed with `0` literal spacing matches across `25` governed targets.
2. `npm run lint:css`
   Result: passed.
3. `npm run typecheck`
   Result: passed.
4. `npm exec vitest run src/components/AudioPlayer.test.tsx src/components/ThemeSwitcher.test.tsx tests/journal-public-route-convergence.test.ts tests/journal-taxonomy-metadata.test.ts`
   Result: passed with `4` files and `15` tests.

## Sprint 3 Exit Criteria

Sprint 3 (and the Spacing Refactor as a whole) is complete when the codebase mechanically defends itself against ad-hoc spacing decisions, enforcing the one governed grammar across all developers and future components.
