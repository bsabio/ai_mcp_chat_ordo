# Sprint 1 — Theme Chromatic Identity & Photostress Mitigation

> **Goal:** Rebuild the chromatic identity of all four themes according to the design specification: restoring perceptual warmth, mitigating visual photostress, implementing Swiss semantic differentiation, and creating true "glass" translucency for the Fluid theme.
>
> **Spec Reference:** [`spec.md`](../spec.md) — Part 5 Priority 2 / Appendices A & C
>
> **Source Files:** `src/app/styles/foundation.css`, `src/app/styles/utilities.css`, `src/app/styles/shell.css`, `src/app/styles/jobs.css`, `src/app/styles/chat.css`
>
> **Estimated Effort:** 9h

---

## Tasks

### 1. Rebuild Fluid Theme Chromatic Identity (Periwinkle & Translucency)
In `.theme-fluid` and `.theme-fluid.dark` defined in `foundation.css`:
- **Light Accent:** Change `--accent` to `oklch(0.42 0.12 280)`.
- **Light Surface Muted:** Change `--surface-muted` to `oklch(0.96 0.020 265)` to grant glass identity.
- **Dark Accent:** Change `--accent` to `oklch(0.78 0.10 290)`.
- **Dark Accent Foreground:** Change `--accent-foreground` to `oklch(0.12 0.01 290)`.
*(Note: Fluid dark surfaces and background rely on hue 290/300 and belong in the dark mode re-calibration phase, but keeping the accent consistent is done here).*

### 2. Rebuild Bauhaus Materiality
In `foundation.css`:
- **Light Muted Surface:** Change `.theme-bauhaus` `--surface-muted` to `oklch(0.955 0.018 80)` (warm paper quality).
- **Dark Accent:** Add `.theme-bauhaus.dark` `--accent` as `oklch(0.60 0.20 15)` (prevents contrast failure from inheriting light accent).
- **Dark Background:** Change `.theme-bauhaus.dark` `--background` to `oklch(0.12 0.012 70)` (warm near-black).
- **Dark Surface:** Change `.theme-bauhaus.dark` `--surface` to `oklch(0.17 0.010 70)`.

### 3. Offset Swiss Extremes (Photostress Risk)
In `foundation.css`:
- **Light Foreground:** Change `.theme-swiss` `--foreground` to `oklch(0.06 0 0)`.
- **Dark Background:** Change `.theme-swiss.dark` `--background` to `oklch(0.03 0 0)`.
- **Dark Foreground:** Change `.theme-swiss.dark` `--foreground` to `oklch(0.95 0 0)`.
*(Note: Swiss light mode surfaces remain at pure white).*

### 4. Implement Swiss Selective-Red Interactive Architecture (Critical)
This resolves the semantic collapse where the accent color equals the foreground color.
- Add `--accent-interactive` to **all themes**:
  - `foundation.css` `:root` (Fluid default): `--accent-interactive: var(--accent);`
  - `.theme-bauhaus`: `--accent-interactive: var(--accent);`
  - `.theme-skeuomorphic`: `--accent-interactive: var(--accent);`
  - `.theme-swiss`: `--accent-interactive: oklch(0.50 0.20 22);`
  - `.theme-swiss.dark`: `--accent-interactive: oklch(0.65 0.20 22);`
- Audit CSS files (`utilities.css`, `shell.css`, etc.) for `.btn-primary`, `.focus-ring`, `.ui-shell-menu-link-active`, and any other purely interactive element styling. Change their color mappings from `var(--accent)` to `var(--accent-interactive)`.
*(Note: Brand fills and static elements should remain bound to `--accent`)*.

### 5. Skeuomorphic Background Lightness & Shadows
In `foundation.css`:
- **Light Accent:** Change `.theme-skeuomorphic` `--accent` to `oklch(0.58 0.18 240)` to align with finalized palette.
- **Light Background:** Change `.theme-skeuomorphic` `--background` to `oklch(0.92 0.015 240)`.
- **Light Surface:** Change `.theme-skeuomorphic` `--surface` to `oklch(0.96 0.01 240)`.
- **Light Surface Muted:** Change `.theme-skeuomorphic` `--surface-muted` to `oklch(0.86 0.02 240)`.
- **Shadow Sub-layer:** Replace raw `rgba()` in `--shadow-sm`. Update `inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 2px 4px rgba(0, 0, 0, 0.4)` to theme-aware equivalent using `color-mix(in srgb, var(--highlight-base) 60%, transparent)` and `color-mix(in srgb, var(--shadow-base) 40%, transparent)`.

---

## Completion Checklist

- [x] Fluid accent updated to hue 280°/290° (Light/Dark)
- [x] Fluid light `--surface-muted` lifted to `C: 0.020`
- [x] Bauhaus light `--surface-muted` given warm chroma
- [x] Bauhaus dark `--accent` explicitly declared to maintain contrast
- [x] Bauhaus dark background and surface shifted to warm near-black
- [x] Swiss light `--foreground` and dark `--background`/`--foreground` offset from pure extremes
- [x] `--accent-interactive` registered globally across all theme declarations
- [x] Swiss `--accent-interactive` decoupled from `--accent` and mapped to selective red
- [x] CSS components audited and migrated from `--accent` to `--accent-interactive` for interactive states
- [x] Skeuomorphic light accent fine-tuned to `0.58` lightness
- [x] Skeuomorphic light background raised to `L: 0.92` to support specular highlights
- [x] Skeuomorphic shadows migrated from `rgba()` to `color-mix()`

---

## QA Deviations

No aesthetic deviations permitted. Valid contrast values must be maintained. If interactive elements lose visible focus rectangles or active text states on testing, it indicates incomplete migration to `--accent-interactive` and must be fully resolved.

---

## Verification

```bash
# Verify component CSS compilation
npm run lint:css

# Run component test suites to ensure no breakages
npm run test
```

**Manual browser steps**:
1. With the Swiss theme active, verify links, primary buttons, and focus rings correctly present the selective-red color, while the logo mark remains black/white.
2. In the Skeuomorphic theme, verify the inset bevel effect (`--shadow-sm`) renders distinctly.
3. Test all themes for standard contrast pass on new accent and surface values.
