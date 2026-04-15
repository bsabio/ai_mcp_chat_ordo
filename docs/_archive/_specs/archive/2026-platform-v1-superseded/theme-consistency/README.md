# Theme Consistency Spec — Implementation Package

> **Status:** Ready for implementation
> **Scope:** 4 themes (Fluid, Bauhaus, Swiss, Skeuomorphic) × 2 schemes (Light, Dark) = 8 visual states
> **Goal:** Every component renders correctly and on-brand in all 8 states. Zero hardcoded colors/radii/shadows.

---

## Spec 1: Shadow Token System

### Problem
Every component hardcodes `rgba(15, 23, 42, …)` — a cool slate shadow that only matches Fluid Light. In dark modes shadows are invisible. Swiss theme defines `--shadow-sm: none` but no component uses it.

### Design

Add four semantic shadow tokens to `:root` and override per theme/scheme:

```css
:root {
  --shadow-color: 250 15% 15%;          /* oklch base for shadows */
  --shadow-bubble: 0 14px 28px -26px oklch(var(--shadow-color) / 0.08);
  --shadow-chip: 0 8px 18px -18px oklch(var(--shadow-color) / 0.08);
  --shadow-composer: 0 18px 36px -32px oklch(var(--shadow-color) / 0.08);
  --shadow-brand: 0 12px 22px -16px oklch(var(--shadow-color) / 0.34);
  --shadow-inset-highlight: inset 0 1px 0 color-mix(in oklab, var(--surface) 80%, white);
}
```

Per-theme overrides:

| Theme | `--shadow-color` | `--shadow-inset-highlight` | Notes |
|-------|-----------------|---------------------------|-------|
| **Fluid** | `250 15% 15%` | white-mix | Cool slate base |
| **Bauhaus** | `80 15% 15%` | warm white-mix | Warm tone |
| **Swiss** | — | — | ALL shadow tokens = `none` |
| **Skeuomorphic** | `240 20% 15%` | `inset 0 1px 0 rgba(255,255,255,0.6)` | Blue-tinted, preserve texture |

Dark mode overrides (all themes):

```css
.dark {
  --shadow-inset-highlight: inset 0 1px 0 color-mix(in oklab, var(--surface) 60%, transparent);
  /* shadow-color stays same — just works at lower contrast on dark bg */
}
```

### Files to change

| File | Lines | What |
|------|-------|------|
| `globals.css` `:root` (L19+) | +6 | Add 5 new shadow tokens |
| `globals.css` per `.theme-*` (L519, L550, L584, L618) | +32 | Override per theme (×4 themes × 2 schemes) |
| `MessageList.tsx` (L182, L250, L265, L326, L333) | ~7 edits | Replace `shadow-[…rgba(15,23,42…]` with `shadow-(--shadow-*)` |
| `ChatInput.tsx` (L142, L175, L194) | ~10 edits | Replace shadow + inset-highlight chains |
| `ChatMessageViewport.tsx` (L53) | ~1 edit | Replace scroll CTA shadow |
| `ShellBrand.tsx` (L65) | ~1 edit | Replace brand mark shadow `rgba(15,23,42,0.34)` |
| `ChatHeader.tsx` | ~2 edits | Replace header shadows |

### Acceptance criteria
- [ ] Swiss theme shows zero drop shadows on bubbles, chips, composer
- [ ] Dark mode shadows are visible but subtle (not invisible)
- [ ] Bauhaus shadows use warm-toned base
- [ ] All 594 tests pass

---

## Spec 2: Highlight / Overlay Inversion

### Problem
Components use `rgba(255, 255, 255, …)` for "inner glow" and radial gradients. This creates bright artifacts in dark mode and mismatched tones in warm themes.

### Design

Add two highlight tokens:

```css
:root {
  --highlight: color-mix(in oklab, var(--surface) 80%, white);
  --highlight-subtle: color-mix(in oklab, var(--surface) 95%, white);
}

.dark {
  --highlight: color-mix(in oklab, var(--surface) 70%, var(--foreground));
  --highlight-subtle: color-mix(in oklab, var(--surface) 90%, var(--foreground));
}
```

### Files to change

| File | Lines | What |
|------|-------|------|
| `globals.css` `:root` + `.dark` | +4 | Add 2 new highlight tokens |
| `ChatInput.tsx` (L142, L145, L175, L194) | ~6 edits | Replace `rgba(255,255,255,0.06/0.08/0.18/0.22/0.72/0.82)` and radial gradient |
| `ChatMessageViewport.tsx` (L53) | ~1 edit | Replace `rgba(255,255,255,0.45)` radial gradient |
| `globals.css` | ~3 edits | Replace `color-mix(…white)` in `.homepage-chat-atmosphere`, `.library-page-shell`, `.library-reading-panel` |

### Acceptance criteria
- [ ] No `rgba(255, 255, 255` in component TSX files (only in globals.css theme definitions)
- [ ] Dark mode shows no bright white artifacts on composer, viewport, or bubbles
- [ ] Light mode preserves the subtle highlight/gloss effect

---

## Spec 3: Avatar Theme Adaptation

### Problem
`ordo-avatar.png` is white-eye-on-black. In dark modes (Fluid, Bauhaus, Swiss, Skeuomorphic), the black background merges into the dark page surface, making the avatar invisible.

### Design

**Option A (recommended): CSS ring + dark-mode adaptation**

Add a subtle ring that appears only when needed:

```tsx
// MessageList.tsx avatar container
<div className="… rounded-full ring-1 ring-foreground/10 …">
  <img src="/ordo-avatar.png" … />
</div>
```

The `ring-foreground/10` uses the theme's foreground color at 10% opacity:
- Light mode: dark ring on light bg — barely visible (already high contrast)  
- Dark mode: light ring on dark bg — gives the avatar a visible border

Same treatment for ShellBrand.tsx and ChatHeader.tsx.

**Option B (alternative): Dual avatars**

Generate a second `ordo-avatar-light.png` (dark eye on light/transparent bg) and swap via CSS `dark:` class. More complex but perfect contrast.

**Option C (simplest): Return to SVG**

Use `EyeOfOrdoMark` (which uses `currentColor` and automatically adapts to theme) with the avatar image only for the navbar brand mark. The SVG is already proven theme-safe.

### Recommendation
**Implement Option A first** (ring treatment) — it's 3 lines of code. If the brand team wants pixel-perfect avatars, pursue Option B later.

### Files to change

| File | What |
|------|------|
| `MessageList.tsx` | Add `ring-1 ring-foreground/10` to avatar container |
| `ChatHeader.tsx` | Same for both floating + docked header avatars |
| `ShellBrand.tsx` | Same for navbar brand mark |

### Acceptance criteria
- [ ] Avatar is discernible in all 8 theme×scheme states
- [ ] Ring is invisible/barely-visible in light modes (doesn't add visual weight)
- [ ] Ring provides enough contrast in dark modes to define the circle

---

## Spec 4: Radius Token Compliance

### Problem
Many components hardcode border radius values (`rounded-[28px]`, `rounded-2xl`, `rounded-[0.42rem]`). Swiss theme defines `--border-radius: 2px` but gets 28px pill shapes everywhere.

### Design

Define radius scale based on the theme's base `--border-radius`:

```css
:root {
  --radius-xs: calc(var(--border-radius) * 0.25);
  --radius-sm: calc(var(--border-radius) * 0.5);
  --radius-md: var(--border-radius);
  --radius-lg: calc(var(--border-radius) * 1.5);
  --radius-xl: calc(var(--border-radius) * 2);
  --radius-full: 9999px;  /* always pill — for avatars, badges */
}
```

Result per theme:

| Token | Fluid (1.25rem) | Bauhaus (10px) | Swiss (2px) | Skeuomorphic (12px) |
|-------|-----------------|----------------|-------------|---------------------|
| `--radius-xs` | 0.3125rem | 2.5px | 0.5px | 3px |
| `--radius-sm` | 0.625rem | 5px | 1px | 6px |
| `--radius-md` | 1.25rem | 10px | 2px | 12px |
| `--radius-lg` | 1.875rem | 15px | 3px | 18px |
| `--radius-xl` | 2.5rem | 20px | 4px | 24px |
| `--radius-full` | 9999px | 9999px | 9999px | 9999px |

> **Note:** `:root` default `--border-radius` is `1rem`. Fluid overrides to `1.25rem`.

### Files to change

| File | Lines | What |
|------|-------|------|
| `globals.css` `:root` | +6 | Add 6 radius scale tokens |
| `ShellBrand.tsx` (L65) | 1 edit | `rounded-[0.42rem]` → `rounded-(--radius-sm)` |
| `CommandPalette.tsx` (L77) | 1 edit | `rounded-[28px]` → `rounded-(--radius-xl)` |
| `ContentModal.tsx` (L44) | 1 edit | `rounded-[32px]` → `rounded-(--radius-xl)` |
| `ChatContainer.tsx` (L122) | 1 edit | `rounded-[32px]` → `rounded-(--radius-xl)` |
| `ToolCard.tsx` (L50) | 1 edit | `rounded-[28px]` → `rounded-(--radius-xl)` |
| `MentionsMenu.tsx` (L33) | 1 edit | `rounded-[24px]` → `rounded-(--radius-xl)` |
| `globals.css` library utilities | ~4 edits | Replace hardcoded `1.75rem`, `2rem`, `1.25rem`, `1rem` with `--radius-lg` / `--radius-xl` |

### Acceptance criteria
- [ ] Swiss theme shows sharp corners (≤4px) on all panels, modals, menus, cards
- [ ] Fluid theme preserves its soft pill-like radii
- [ ] Avatars and badges ALWAYS use `--radius-full` (round regardless of theme)
- [ ] Chat bubbles use the calculated suggestion-frame-radius (already correct)

---

## Spec 5: Code Block & Alert Theme Alignment

### Problem
`code-chrome` utility hardcodes `oklch(0.14 0.01 250)` — only correct for Fluid. `alert-error` and `field-error` hardcode `oklch(0.6 0.22 25)` instead of using `--status-error`.

### Design

```css
@utility code-chrome {
  background-color: color-mix(in oklab, var(--foreground) 94%, var(--surface));
  color: color-mix(in oklab, var(--foreground) 45%, var(--surface));
  /* dark override naturally works — foreground/surface swap */
}

@utility alert-error {
  color: var(--status-error);
  border-color: color-mix(in oklab, var(--status-error) 30%, transparent);
}

@utility field-error {
  border-color: var(--status-error);
}
```

### Files to change

| File | Lines | What |
|------|-------|------|
| `globals.css` (L360, L454, L465) | ~15 lines | Rewrite `code-chrome`, `alert-error`, `field-error` utilities |

### Acceptance criteria
- [ ] Code blocks use theme-appropriate dark/light tones in all 8 states
- [ ] Error styles respect `--status-error` (color-blind safe when override active)

---

## Spec 6: Glass Surface Theme Alignment

### Problem
`.glass-surface` and `.glass-overlay` use raw `rgb(15 23 42 / …)` and `rgb(255 255 255 / …)` — hardcoded to Fluid's cool palette.

### Design

Replace with `color-mix` using theme tokens:

```css
@utility glass-surface {
  background: color-mix(in oklab, var(--surface) 70%, transparent);
  backdrop-filter: blur(20px) saturate(1.4);
  box-shadow:
    inset 0 1px 0 var(--highlight-subtle),
    0 1px 3px color-mix(in oklab, var(--foreground) 4%, transparent);
}
```

### Files to change

| File | Lines | What |
|------|-------|------|
| `globals.css` (L734–L756) | ~20 lines | Rewrite `glass-surface` and `glass-overlay` utilities |

### Acceptance criteria
- [ ] Glass surfaces pick up theme tint (warm for Bauhaus, neutral for Swiss, blue for Skeuomorphic)
- [ ] No visible `rgb()` or `rgba()` literals in glass utilities

---

## Spec 7: Bauhaus Accent Alignment (Optional — Brand Decision)

### Problem
Bauhaus accent `oklch(0.56 0.19 24)` is a red-orange. This is historically accurate but clashes with Ordo's neutral/cool brand identity. The accent colors CTA buttons, links, focus rings, and the badge dot.

### Options

| Option | Change | Impact |
|--------|--------|--------|
| **A: Keep red** | No change | Authentic to Bauhaus era. Users choosing Bauhaus expect it. |
| **B: Shift to warm neutral** | `oklch(0.56 0.08 24)` (desaturated warm) | Retains warmth, less jarring against Ordo brand |
| **C: Match Fluid accent** | `oklch(0.24 0.04 260)` | Loses Bauhaus identity entirely |

### Recommendation
**Option B** — desaturate by 50%. The Bauhaus theme keeps its warm character but doesn't scream "different brand" on accent elements.

### Decision required
This is a brand direction call. Implementation is one line in `globals.css`.

---

## Implementation Order

| Phase | Specs | Risk | Estimated file edits |
|-------|-------|------|---------------------|
| **Phase 1** | Spec 1 (Shadows) + Spec 2 (Highlights) | High — touches every component | ~15 files |
| **Phase 2** | Spec 4 (Radius tokens) | Medium — structural, many files | ~10 files |
| **Phase 3** | Spec 3 (Avatar ring) + Spec 5 (Code/Alert) + Spec 6 (Glass) | Low — isolated | ~5 files |
| **Phase 4** | Spec 7 (Bauhaus accent) | Brand decision | 1 file |

### Testing strategy

After each phase:
1. `npm test -- --run` — all 594 tests must pass
2. Visual check in browser: cycle through all 8 theme×scheme states using chat command `set theme {name}` + `light mode` / `dark mode`
3. Key screens to verify: hero state, active conversation, library index, chapter reading

### Validation matrix

Each spec must be verified across this grid:

|  | Fluid L | Fluid D | Bauhaus L | Bauhaus D | Swiss L | Swiss D | Skeu L | Skeu D |
|--|---------|---------|-----------|-----------|---------|---------|--------|--------|
| Shadows | ○ | ○ | ○ | ○ | ○ (none) | ○ (none) | ○ | ○ |
| Highlights | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| Avatar | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| Radii | ○ | ○ | ○ | ○ | ○ (sharp) | ○ (sharp) | ○ | ○ |
| Code blocks | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| Glass | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |

`○` = must verify visually. Fill with `✓` as checked.
