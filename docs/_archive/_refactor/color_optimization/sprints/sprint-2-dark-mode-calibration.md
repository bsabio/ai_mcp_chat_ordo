# Sprint 2 — Dark Mode Calibration & Shell Systems

> **Goal:** Re-calibrate dark mode background hues across all themes to resolve circadian blue-light failures and standardize depth-cues for floating shell panels mapped to Phase 3 of the priority spec.
> 
> **Spec Reference:** `spec.md` — Part 5 Priority 3 & 4
> 
> **Source Files:** `src/app/styles/foundation.css`, `src/app/styles/utilities.css`, `src/app/styles/shell.css`, `src/app/styles/chat.css`
>
> **Estimated Effort:** ~4h

---

## Tasks

### 1. Re-calibrate Fluid Dark Backgrounds (Lavender-Violet)
In `foundation.css`, `.theme-fluid.dark` AND the base `.dark` fallback:
- **Background:** Shift from `oklch(0.14 0.01 250)` to `oklch(0.12 0.014 300)`.
- **Surface:** Shift from `oklch(0.21 0.01 250)` to `oklch(0.19 0.012 290)`.
- **Surface Muted:** Shift from `oklch(0.18 0.02 250)` to `oklch(0.16 0.012 290)`.
*(This steps Fluid out of the 440-480nm hazard band while preserving its iridescent glass identity).*

### 2. Re-calibrate Skeuomorphic Dark Background (Blue-Steel)
In `foundation.css`, `.theme-skeuomorphic.dark`:
- **Background:** Shift from `oklch(0.18 0.05 250)` to `oklch(0.16 0.04 215)`.
- **Surface:** Shift from `oklch(0.24 0.06 250)` to `oklch(0.22 0.04 215)`.

### 3. Register Glass Sub-Layer Token (Text Legibility over Blur)
In `foundation.css`:
- **Light Base:** Add `--glass-sublayer: oklch(0.95 0 0);` to `:root`.
- **Dark Base:** Add `--glass-sublayer: oklch(0.20 0 0);` to `.dark`.
*(Enforces a solid optical sub-layer for any frosted-glass elements to guarantee minimum luminance thresholds for small text).*

### 4. Nav Dropdown Shadow
In `utilities.css`, locate `.ui-shell-dropdown`:
- Update `box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);` to `box-shadow: 0 20px 50px color-mix(in srgb, var(--shadow-base) 28%, transparent);`

### 5. Audit & Upgrade Blurred Core Surfaces
In `utilities.css`, `shell.css`, `chat.css` and TSX where `backdrop-filter: blur(...)` is heavily used:
- Inject the `--glass-sublayer` into the background-color mix beneath translucent structural components to strictly respect Priority 4 of the cognitive audit.

### 6. Swiss Nav Separator & Brand Wordmark
In `foundation.css` or `shell.css`:
- **Nav Separator**: Override `--highlight-base` to `oklch(0.85 0 0)` in `.theme-swiss` to ensure the separator border is visible rather than transparent.
- **Wordmark**: Offset the brand wordmark luminance in `.theme-swiss.dark` to `oklch(0.95 0 0)` to prevent a 21:1 harsh optical vibration against pure black.

### 7. Nav Inactive Item Opacity Validation
In `shell.css`:
- Audit `.ui-shell-nav-item-idle` and `.ui-shell-account-ghost`.
- Ensure opacity is raised from `56%` to a minimum `foreground/68%` to guarantee 3.0:1 contrast against dynamic translucent backgrounds.

### 8. Theme Provider Transition Protocol
In `src/lib/theme/ThemeProvider.tsx` (or equivalent theme registry):
- Inject an opacity-based neutral-intermediate overlay `eval(oklch(0.5 0 0))` triggered precisely on theme-switch events.
- Fade from `opacity 1 -> 0` over `350ms` (`ease-in-out`) to synthetically disguise the instant CSS custom property swap and reduce cognitive schema-conflict.

---

## Completion Checklist

- [x] Fluid dark background shifted to `hue: 300`
- [x] Fluid dark surfaces shifted to `hue: 290`
- [x] Skeuomorphic dark background/surface shifted to `hue: 215`
- [x] `--glass-sublayer` registered globally across light and dark roots
- [x] `.ui-shell-dropdown` box-shadow purged of legacy `rgba()`
- [x] Core blurred surfaces (`@supports (backdrop-filter)`) given solid composite underlayers
- [x] Swiss nav separator overridden to `oklch(0.85)`
- [x] Swiss dark brand wordmark optical vibration mitigated
- [x] Idle Nav/Account opacities raised to `68%` minimum
- [x] Theme Transition overlay (`350ms`, `oklch(0.5)`) implemented in global provider

---

## QA Deviations
- **Glass Sublayer VWFA Resolution:** The original spec's command to inject a "solid sublayer" beneath backdrop-filters initially destroyed the optical transparency of the CSS layout since CSS layers are cumulative blocks. I solved this by substituting our theme dynamic variables (like `--surface`) with `--glass-sublayer` exclusively within the background `color-mix(..., transparent)` alpha-channels backing the `backdrop-filter`. This flawlessly guarantees a minimum physiological luminance edge without breaking the frosted glass.
