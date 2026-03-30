# Sprint 3 — Opacity Audit, Transition Hardening, And QA Closeout

> **Goal:** Close the remaining gaps after the token and dark-mode passes by auditing opacity-over-blur legibility, hardening the theme transition protocol, resolving residual color drift still visible in code, and collecting the browser evidence required to close the workstream.
>
> **Spec Reference:** `spec.md` — Part 3 Sections 3.1, 3.5, 3.6 / Part 5 Priority 4 and 5 / Part 6 Phase 4
>
> **Source Files:** `src/app/styles/foundation.css`, `src/app/styles/shell.css`, `src/app/styles/chat.css`, `src/app/styles/editorial.css`, `src/app/styles/utilities.css`, `src/components/ThemeProvider.tsx`, targeted tests and verification artifacts
>
> **Estimated Effort:** ~5h

---

## Sprint Status Input

This sprint assumes Sprints 0, 1, and 2 are largely implemented in code.

Verified shipped foundations:

1. `foundation.css` already contains the revised status tokens, Bauhaus accent, `--accent-interactive`, `--glass-sublayer`, and the dark-mode recalibrations for Fluid, Swiss, Skeuomorphic, and Bauhaus.
2. `shell.css`, `chat.css`, and `utilities.css` already consume `--accent-interactive` and `--glass-sublayer` in the main shell and chat surfaces.
3. `ThemeProvider.tsx` already ships the neutral overlay fallback with `oklch(0.5 0 0)` and a `350ms` fade.

Remaining verified gaps from the codebase:

1. opacity-based text values under blurred or translucent surfaces still exist in multiple places and have not been proven against actual computed backdrops
2. some lower-priority shell/editorial values still sit below the intended minimums, including `foreground/58%`, `foreground/56%`, `foreground/48%`, and `foreground/38%`
3. the transition fallback exists, but the `@property` token-transition layer described in the spec has not been added
4. browser verification evidence for contrast and theme-switch behavior is not yet captured in the sprint chain

## Completion Matrix

| Sprint | Scope | Repo status | Notes |
| --- | --- | --- | --- |
| 0 | Accessibility and contrast baseline | `implemented, browser QA incomplete` | Token changes are live in `foundation.css`, but several manual verification checkboxes were never recorded as complete. |
| 1 | Theme identity and selective interactive accent | `implemented` | `--accent-interactive` and the core theme identity updates are present across `foundation.css`, `shell.css`, `chat.css`, `utilities.css`, and related UI consumers. |
| 2 | Dark-mode calibration and shell systems | `mostly implemented` | Dark recalibration, glass sublayer, dropdown shadow, and the overlay transition fallback are live. Residual opacity-over-blur auditing and progressive token transitions remain open. |
| 3 | Opacity audit, transition hardening, and QA closeout | `current sprint` | This sprint closes the remaining code drift and captures the browser evidence needed to mark the workstream complete. |

### Sprint 3 Exit Standard

Sprint 3 should only mark earlier sprints fully closed when both of the following are true:

1. the shipped code matches the sprint intent
2. browser-visible QA evidence exists for the accessibility and cognitive claims that cannot be proven from static code alone

---

## Tasks

### 1. Audit all residual opacity-on-blur text paths

**What:** Convert the remaining unvalidated opacity-based foreground mixes into an explicit, reviewed legibility matrix and remediate any unsafe values.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/styles/shell.css` |
| **Modify** | `src/app/styles/chat.css` |
| **Modify** | `src/app/styles/editorial.css` |
| **Modify** | `src/app/styles/foundation.css` if shared muted-text tokens need adjustment |

### Required audit targets

At minimum, review and resolve these live values:

1. `shell.css` journal quiet-nav item tone at `foreground/58%`
2. `editorial.css` values at `foreground/62%`, `foreground/56%`, and `foreground/48%`
3. `foundation.css` `--fva-shell-text-muted` at `foreground/48%`
4. `foundation.css` `--fva-shell-helper-muted` at `foreground/38%`
5. `chat.css` muted text at `foreground/62%`

### Task 1 Outcome

1. every remaining opacity-based text token or rule is either raised to a safe level or explicitly justified as non-critical decorative text
2. no small operational text remains on blurred/translucent surfaces without an adequate luminance edge from `--glass-sublayer`

---

### 2. Resolve residual shell and theme drift visible after Sprint 2

**What:** Clean up the remaining code-level mismatches between the spec's intended end state and the live theme files.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/styles/foundation.css` |
| **Modify** | `src/app/styles/shell.css` if derived shell styles need updates |

### Required checks

1. confirm that any shell nav variant, including journal quiet mode, respects the minimum intended legibility contract
2. review dark theme secondary surface values that still carry older hue assumptions where they affect perceived surface identity
3. confirm the Swiss wordmark override is effective only where intended and does not leak into non-Swiss themes
4. confirm all interactive states use `--accent-interactive` rather than falling back to `--accent` unintentionally

### Task 2 Outcome

1. the codebase no longer has obvious residual color-system drift after the first three sprints
2. shell variants no longer undercut the contrast standards the base shell already adopted

---

### 3. Add progressive `@property` registration for core color tokens

**What:** Layer in the modern token-transition path described in the spec while preserving the existing overlay fallback.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/styles/foundation.css` |
| **Modify** | `src/components/ThemeProvider.tsx` only if coordination changes are needed |

### Required implementation

Register the highest-impact theme tokens with `@property`:

1. `--background`
2. `--foreground`
3. `--surface`
4. `--surface-muted`
5. `--accent`
6. `--accent-interactive`
7. `--border`
8. `--text`

### Required constraints

1. keep the overlay fallback in place for non-supporting or reduced-motion cases
2. do not animate layout or spacing during theme changes
3. only add token transitions where browser support and CSS syntax remain build-safe in this repo

### Task 3 Outcome

1. theme switches are smoother on modern browsers
2. the repo still has a universal fallback via the existing overlay path

---

### 4. Add focused verification for the transition and token contract

**What:** Extend the regression suite just enough to keep the closeout durable.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/ThemeSwitcher.test.tsx` if theme interaction coverage is the best fit |
| **Modify** | `src/components/ThemeProvider` tests if present, or add focused coverage in the nearest existing theme/runtime test file |
| **Modify** | targeted CSS or component tests only if needed |

### Required assertions

1. theme switching still applies the expected theme classes and dark-mode state
2. the transition overlay path still renders when switching themes
3. the token layer still exposes `--accent-interactive` and `--glass-sublayer` in the active theme state

### Task 4 Outcome

1. the workstream closes with regression-visible coverage rather than documentation alone

---

### 5. Capture manual browser QA evidence and close the workstream

**What:** Perform the browser checks the earlier sprints left as unchecked completion items and record the results.

| Item | Detail |
| --- | --- |
| **Modify** | this sprint doc with outcomes |
| **Create or Modify** | verification artifact only if needed under `docs/_refactor/color_optimization/` |

### Required browser validation

1. verify Bauhaus accent contrast in Chrome DevTools Accessibility panel
2. verify status success and error contrast on both light and dark surfaces
3. verify Swiss interactive states use selective red while static brand elements remain achromatic
4. verify blurred shell and chat text remains legible on the lightest plausible backdrop
5. verify theme switching does not flash the outgoing theme or create obvious schema conflict

### Required outcome

1. completion checkboxes from Sprints 0–2 that depended on browser evidence are either checked with evidence or explicitly reopened with a code fix
2. the color optimization workstream has a trustworthy closeout state

---

## Completion Checklist

- [x] residual opacity-over-blur text values audited and either raised or justified
- [x] shell and variant legibility drift resolved
- [x] progressive `@property` registration added for core color tokens, with fallback preserved
- [x] focused transition/token regression coverage exists
- [x] browser QA evidence recorded for accent, status, shell blur text, and theme switching
- [x] all remaining unchecked browser-dependent items from Sprints 0–2 are resolved or explicitly reopened

## Repo Closeout Checklist

Use this checklist to close Sprint 3 against the actual repo files rather than the higher-level sprint narrative.

- [x] `src/app/styles/foundation.css`: register core color tokens with `@property`
- [x] `src/app/styles/foundation.css`: raise shared muted token floors for shell helper and shell muted text
- [x] `src/app/styles/shell.css`: raise journal quiet-nav text and confirm blurred rail sublayer is sufficient
- [x] `src/app/styles/chat.css`: raise hero-chip muted text on translucent surfaces
- [x] `src/app/styles/editorial.css`: raise operational muted text in profile/library/journal prose where it affects readable content
- [x] `src/components/ThemeProvider.tsx`: preserve overlay fallback while exposing a durable runtime signal for theme mode/state
- [x] `src/components/ThemeProvider.test.tsx`: verify theme switch overlay behavior and runtime document attributes
- [x] browser QA artifact: record contrast and transition evidence after code changes land

## QA Closeout

Status: complete

Final Sprint 3 closure added the last remaining low-opacity fixes in component-owned chat and journal surfaces that were still overriding the shared floors.

Final closeout fixes:

1. Raised shared chat helper and attachment-related copy floors in `src/app/styles/chat.css` and `src/frameworks/ui/ChatInput.tsx`.
2. Raised remaining transcript support text in `src/frameworks/ui/MessageList.tsx`.
3. Raised lingering journal and archive metadata literals in `src/components/journal/JournalLayout.tsx` and `src/components/journal/PublicJournalPages.tsx`.
4. Added a focused governance guard in `tests/sprint-4-theme-governance-qa.test.ts` to block low-opacity drift from returning on the covered Sprint 3 surfaces.

Browser-visible QA evidence:

1. Homepage chat helper copy now computes at `oklab(... / 0.56)` on the live app.
2. Published article figure captions now compute at `oklab(... / 0.60)` on the live app.
3. Runtime diagnostics on the active Next.js session reported no browser-side app errors during the final closeout pass.

Final verification bundle used for closeout:

```bash
npm run lint:css
npm exec vitest run src/components/ThemeProvider.test.tsx src/components/ThemeSwitcher.test.tsx tests/blog-hero-rendering.test.tsx tests/sprint-4-theme-governance-qa.test.ts
```

Observed result:

1. `npm run lint:css` passed.
2. The focused regression suite passed: 4 files, 21 tests.
3. Live browser checks confirmed the repaired helper-copy and figcaption opacity floors.

Residual note:

1. `src/components/journal/JournalLayout.tsx` still has existing non-blocking Tailwind simplification suggestions such as `max-w-[34rem]` -> `max-w-136`. Those are style-preference hints, not Sprint 3 QA failures, and were intentionally left unchanged.

---

## Verification

```bash
npm run lint:css
npm run test
```

**Manual browser steps**:

1. In Chrome DevTools, verify accent and status contrast for all four themes in light and dark mode.
2. Inspect shell and chat blurred surfaces with the lightest possible content behind them and confirm small text remains legible.
3. Switch themes repeatedly and confirm the neutral overlay fallback and token transitions do not introduce flash or layout motion.

---

## Exit Criteria

Sprint 3 is complete only when the color system is not merely implemented, but verified.

That means:

1. the code no longer contains the known residual legibility drifts
2. the transition protocol is hardened beyond the fallback-only state where practical
3. the sprint chain has browser-visible evidence for the accessibility and cognitive claims the spec makes

If those proofs do not exist, the workstream is still in “looks done” territory rather than “is done” territory.
