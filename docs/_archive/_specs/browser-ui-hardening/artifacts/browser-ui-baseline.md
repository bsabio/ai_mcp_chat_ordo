# Browser UI Baseline

## Objective

This note records the pre-hardening browser risks that justified the browser UI
 hardening package. It is the implementation baseline for measuring Sprint 0+
 improvements.

## Current High-Risk Areas

### 1. Viewport locking

The app shell currently uses nested viewport-height rules and floating chat uses
 direct `100dvh` math. This is expected to be most fragile on iOS Safari and
 Android Chrome when browser chrome or the software keyboard changes viewport
 height.

### 2. Multiple scroll owners

The root shell, chat shell, and message surface all participate in clipping or
 scrolling. This raises the risk of sticky headers failing, scroll chaining
 feeling inconsistent, and focus jumps during input-heavy flows.

### 3. Transform-centered overlays

The command palette, content modal, and expanded tool dialog use fixed-position
 transform centering. This works visually in desktop Chromium but is a known
 weak point on Safari mobile keyboard open/close paths.

### 4. Blur as a default assumption

The nav, chat header, floating shell, and overlays depend on backdrop blur for
 intended visual layering. This creates repaint cost pressure in Safari and may
 degrade differently in Firefox or lower-powered mobile browsers.

### 5. Overflow without physical fallback

Global layout uses logical overflow properties without physical `overflow-x` and
 `overflow-y` fallbacks. That increases compatibility risk in embedded or older
 browser contexts.

### 6. Touch behavior drift

Menus and popovers depend on fixed offsets and at least one menu dismissal path
 uses `mousedown`, which is not the strongest baseline for touch parity.

### 7. Heavy motion with no reduced-motion path

The UI uses pulses, reveal transitions, chip entrances, and transformed overlays
 but does not yet provide a reduced-motion branch.

### 8. Inline browser API decisions

The codebase uses `Audio`, stream readers, `IntersectionObserver`,
 `scrollIntoView`, and view transitions in component-local ways instead of via a
 shared compatibility layer.

## Baseline Validation Inputs

| Source | Purpose |
| --- | --- |
| `docs/_specs/browser-ui-hardening/spec.md` | Source requirement set |
| `lighthouse-prod.json` | Existing Chromium/mobile emulation baseline |
| Shell and chat component audit | Primary code-level evidence |

## Success Measure

Each later sprint should reduce one or more of these risks by replacing
 implicit browser assumptions with explicit fallback rules, clearer layout
 ownership, or regression coverage.

## Sprint 5 Re-baseline

Sprint 5 does not replace the original risk baseline; it records how the shell
 now behaves after Sprints 0 through 4 and what is protected by regression
 coverage.

### User-visible improvements since the original baseline

1. Shell and chat viewport behavior now use safe-area-aware sizing and fallback
   viewport math rather than assuming a single modern viewport model.
2. Command palette, content modal, and expanded tool modal no longer rely on
   transform-centering for correctness on smaller or keyboard-shifted viewports.
3. Menus and touch interactions now use pointer-safe dismissal and larger hit
   targets across chat and overlay controls.
4. Reduced-motion handling now suppresses high-amplitude UI motion while
   keeping state communication visible.
5. Blur and view transitions are now additive enhancements rather than layout
   requirements.
6. Audio, scroll scheduling, stream-reader usage, and observer behavior now
   have explicit browser fallbacks instead of implicit component-local
   assumptions.

### Regression coverage now in place

| Area | Evidence |
| --- | --- |
| Shared browser support helpers | `tests/browser-support.test.ts` |
| Overlay and popover behavior | `tests/browser-overlays.test.tsx` |
| Reduced-motion and view-transition behavior | `tests/browser-motion.test.tsx` |
| Audio and browser API fallbacks | `tests/browser-api-fallbacks.test.ts`, `src/components/AudioPlayer.test.tsx` |

### Lighthouse status

The canonical recorded Lighthouse baseline remains `lighthouse-prod.json`.
Sprint 5 adds a repeatable browser verification command path and documents the
comparison workflow, but it does not overwrite the canonical Lighthouse capture
 without an intentional fresh run.

### Current verification outcome

- Focused browser regression tests pass.
- Full application test suite passes.
- Production build passes.
- Manual cross-browser acceptance criteria are recorded in
   `docs/_specs/browser-ui-hardening/artifacts/browser-ui-verification-matrix.md`.
