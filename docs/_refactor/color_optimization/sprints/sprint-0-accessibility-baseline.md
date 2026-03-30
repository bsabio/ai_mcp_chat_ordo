# Sprint 0 — Critical Accessibility & Cognitive Safety Baseline

> **Goal:** Fix every live WCAG failure and peripheral-vision discrimination collapse before any design identity work begins. This sprint has zero aesthetic opinion — it is a safety pass. After this sprint, the system must have no contrast failures, no status-token parity violations, and no `.dark` maintenance hazards.
>
> **Spec Reference:** [`spec.md`](../spec.md) — Part 5 Priority 1 / Part 3 Sections 3.3 and 3.4 / Part 4 Colorblind Accommodation
>
> **Source Files:** `src/app/styles/foundation.css`
>
> **Estimated Effort:** 5h

---

## Tasks

1. **Merge the `.dark` double-definition** in `foundation.css`. The two separate `.dark` blocks (currently at lines 225 and 297) must be collapsed into a single consolidated block. Properties from the first block (`--shadow-base`, `--highlight-base`) must be merged into the single definition. All per-theme `.dark` overrides (`.theme-bauhaus.dark`, etc.) remain unchanged.

2. **Fix the Bauhaus accent contrast failure.** Change `--accent` in `.theme-bauhaus` from `oklch(0.56 0.19 24)` to `oklch(0.48 0.20 15)`. This moves from an estimated ~4.3:1 (FAILS AA) to ~7.1:1. Verify in Chrome DevTools Accessibility panel before marking complete.

   > **`--accent-foreground` note**: The existing `--accent-foreground: oklch(1 0 0)` (white) requires no change. White on the new darker accent `oklch(0.48 0.20 15)` gives ~5.6:1 ✅ AA. Do not modify this token.

3. **Fix the status token lightness parity and contrast failures.**
   - `--status-success`: `oklch(0.6 0.18 155)` → `oklch(0.62 0.20 155)`
   - `--status-error`: `oklch(0.6 0.22 25)` → `oklch(0.47 0.24 15)`
   - This establishes a ΔL of 0.15 between tokens, enabling peripheral discrimination without hue dependency. Error token contrast on light backgrounds rises from ~4.2:1 to ~6.8:1.

4. **Strengthen colorblind mode overrides.** In the `[data-color-blind]` blocks in `foundation.css`:
   - Deuteranopia/Protanopia success: raise chroma from `C: 0.19` → `C: 0.25`
   - Deuteranopia/Protanopia error: `oklch(0.70 0.15 65)` → `oklch(0.62 0.25 65)` — lightness drops from `L: 0.70` to match the success token's `L: 0.62`. **This results in ΔL = 0 between success and error for this mode.** That is intentional: for deuteranopes the primary discriminator is Δhue = 175° (blue `hue: 250°` vs yellow `hue: 65°`), which is preserved. The blue-yellow axis is unaffected by deuteranopia, so hue reliably distinguishes the two tokens without a lightness crutch. Do not introduce a forced lightness differential here.
   - Tritanopia success: `oklch(0.7 0.15 25)` → `oklch(0.68 0.22 25)`
   - Tritanopia error: `oklch(0.62 0.19 330)` → `oklch(0.58 0.22 355)` — shifts to luminance-primary discrimination via ΔL of 0.10

---

## Completion Checklist

- [x] Single consolidated `.dark` block in `foundation.css`
- [x] `.theme-bauhaus` `--accent` changed to `oklch(0.48 0.20 15)`
- [ ] Bauhaus accent contrast verified ≥ 4.5:1 in browser (Chrome DevTools)
- [x] `--status-success` changed to `oklch(0.62 0.20 155)`
- [x] `--status-error` changed to `oklch(0.47 0.24 15)`
- [ ] Status-error contrast verified ≥ 4.5:1 on light backgrounds in browser
- [ ] Status-error contrast verified ≥ 4.5:1 on dark backgrounds in browser (test against Fluid dark `oklch(0.12)` and Bauhaus dark `oklch(0.12)`)
- [x] ΔL between success and error confirmed ≥ 0.15
- [x] Deuteranopia/Protanopia chroma raised to `C: 0.25`
- [x] Tritanopia tokens updated to luminance-primary strategy
- [ ] All theme-switching smoke tests still pass

---

## QA Deviations

**None permitted in this sprint.** These are safety-critical changes. If a browser contrast check produces a result more than ±0.3 from the spec's estimated ratio, do not mark the task complete — re-derive the correct `L` value using Chrome DevTools and update the spec before closing.

---

## Verification

```bash
# Full test suite — confirm no regressions across all themes and tokens
npm run test

# RBAC and tool-registry integration — confirms no token-layer breakage
npm run qa:roles

# Full quality gate (typecheck + lint + lint:css + test)
npm run quality
```

**Manual browser steps** (required before sprint close):
1. Apply each theme class (`theme-bauhaus`, `theme-swiss`, `theme-skeuomorphic`, `theme-fluid`) to `<html>` in DevTools.
2. For each theme in both light and dark mode, open DevTools Accessibility panel and confirm no contrast failures on: accent buttons, status success/error badges, nav labels.
3. Simulate each `data-color-blind` mode and confirm success/error badges are visually distinct.
