# Sprint 3 — Dark-Mode Shadow And Surface Recalibration

> **Goal:** Recalibrate shadow intensities and surface-mix differentials across shell and chat CSS so elevation, depth, and z-layer stepping are perceptible on dark backgrounds. This is the system-wide depth pass that completes the visual hierarchy refactor.
> **Spec ref:** §7, §9.3
> **Prerequisite:** Sprint 0 (tokens), Sprint 1 (nav), Sprint 2 (chat) — Sprint 2's bubble shadow changes are a subset; this sprint covers every remaining shadow and surface mix value.

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_refactor/visual-hierarchy-and-proportional-balance/census.md` | baseline shadow and surface-mix values (§8, §9, §10) |
| `src/app/styles/shell.css` | shell rail, dropdown, account, glass shadows |
| `src/app/styles/chat.css` | chat header, composer, suggestion frame shadows |
| `src/app/styles/foundation.css` | token authority |

---

## Task 3.1 — Shell shadow intensity pass

**What:** Increase shadow opacity on shell surfaces to be perceptible in dark mode. The guiding rule: dark-mode shadow opacity should be approximately 2× the original light-mode intention.

**Modify:** `src/app/styles/shell.css`

### Shell rail (default, non-glass)

`.ui-shell-rail`:
- Change `shadow-base 4%` → `shadow-base 8%`

### Shell rail (glass / @supports)

`.ui-shell-rail` inside `@supports`:
- Change outer shadow from `shadow-base 18%` → `shadow-base 28%`
- Keep inset `highlight-base 18%` unchanged (inset highlights are additive and already effective)

### Shell dropdown

`.ui-shell-dropdown`:
- Change `shadow-base 28%` → `shadow-base 38%`

### Shell account avatar

`.ui-shell-account-avatar`:
- Change `shadow-base 10%` → `shadow-base 16%`

### Verification

- Shell rail has visible shadow separation from page content
- Dropdown casts a clear shadow in dark mode
- `npm run lint:css` passes

---

## Task 3.2 — Chat shadow intensity pass

**What:** Increase shadow opacity on chat surfaces not already adjusted in Sprint 2 (bubbles were handled there; this covers header, composer, and suggestion frames).

**Modify:** `src/app/styles/chat.css`

### Chat header (glass / @supports)

`.ui-chat-header-surface` inside `@supports`:
- Change outer shadow from `shadow-base 18%` → `shadow-base 28%`
- Keep inset `highlight-base 18%` unchanged

### Followup suggestion frame

`.ui-chat-followup-frame`:
- Change `shadow-base 18%` → `shadow-base 26%`

### Hero suggestion frame

`.ui-chat-hero-suggestion-frame`:
- Change `shadow-base 18%` → `shadow-base 26%`

### Composer frame

`.ui-chat-composer-frame`:
- Change `shadow-base 18%` → `shadow-base 26%`

### Composer focus

`.ui-chat-composer-frame-focus`:
- Change `shadow-base 24%` → `shadow-base 32%`

### Verification

- Composer frame has visible depth separation from transcript
- Suggestion frames appear as elevated panels
- Focused composer has stronger depth than idle state
- `npm run lint:css` passes

---

## Task 3.3 — Surface-mix differential widening

**What:** Widen the surface-mix percentages where the current values produce near-identical darkness across z-layers.

**Modify:** `src/app/styles/shell.css`, `src/app/styles/chat.css`

### Shell rail background (non-glass)

`.ui-shell-rail`:
- Change `var(--surface) 92%` → `var(--surface) 88%`

### Shell rail (glass / @supports)

`.ui-shell-rail` inside `@supports`:
- Change `var(--glass-sublayer) 78%` → `var(--glass-sublayer) 74%`

### Nav links container

`.ui-shell-nav-links`:
- Change `var(--surface) 72%` → `var(--surface) 68%`

### Chat transcript plane

`.ui-chat-transcript-plane`:
- Change `var(--surface) 98%` → `var(--surface) 94%`

### Verification

- In dark mode, each surface layer is distinguishable: background < transcript < nav links < shell rail
- In light mode, the differentials remain subtle and not harsh
- `npm run lint:css` passes

---

## Task 3.4 — Journal quiet-tone shadow alignment

**What:** The journal route applies its own shell-rail shadow and glass overrides. These should be recalibrated proportionally.

**Modify:** `src/app/styles/shell.css`

### Journal rail (non-glass)

`[data-shell-route-surface="journal"] [data-shell-nav-rail="true"][data-shell-nav-tone="quiet"]`:
- Change `shadow-base 8%` → `shadow-base 14%`

### Journal rail (glass / @supports)

`[data-shell-route-surface="journal"] [data-shell-nav-rail="true"][data-shell-nav-tone="quiet"]` inside `@supports`:
- Change `glass-sublayer 72%` → `glass-sublayer 68%`

### Verification

- Journal pages maintain their subtle atmospheric quality
- The nav rail is still distinguishable from the journal background gradient
- `npm run lint:css` passes

---

## Task 3.5 — Sprint 3 verification gate

### Required commands

1. `npm run typecheck`
2. `npm run lint:css`
3. `npm run spacing:audit`
4. Full test suite: `npm exec vitest run`
5. Quality pipeline: `npm run quality` (if available)

### Visual evidence checklist

- [ ] Shell rail casts a visible shadow in dark mode
- [ ] Shell dropdown has clear depth separation
- [ ] Chat header (fixed/glass) has visible elevation
- [ ] Composer frame floats visibly above the transcript
- [ ] Suggestion frames appear elevated, not flush
- [ ] Each z-layer in the interface is distinguishable at a glance
- [ ] Journal route retains its atmospheric quality with recalibrated shadows
- [ ] Light mode remains clean — no harsh shadows
- [ ] No existing tests have been modified or weakened

---

## Sprint 3 Deliverables Summary

| Deliverable | File | Change type |
| --- | --- | --- |
| Shell rail shadow ×2 | shell.css | opacity value update |
| Shell glass shadow increase | shell.css | opacity value update |
| Shell dropdown shadow increase | shell.css | opacity value update |
| Account avatar shadow increase | shell.css | opacity value update |
| Chat header glass shadow increase | chat.css | opacity value update |
| Followup frame shadow increase | chat.css | opacity value update |
| Hero suggestion shadow increase | chat.css | opacity value update |
| Composer frame shadow increase | chat.css | opacity value update |
| Composer focus shadow increase | chat.css | opacity value update |
| Shell rail surface-mix widened | shell.css | percentage update |
| Shell glass surface-mix widened | shell.css | percentage update |
| Nav links surface-mix widened | shell.css | percentage update |
| Chat transcript surface-mix widened | chat.css | percentage update |
| Journal quiet-tone alignment | shell.css | shadow + glass update |
| Verification gate | — | full pipeline pass |

---

## Package Completion

When Sprint 3 passes its verification gate, the Visual Hierarchy And Proportional Balance refactor is complete. The acceptance criteria from spec §13 should be reviewed and confirmed:

1. Five distinct typographic tiers established (brand, nav-label, body, helper, micro)
2. Brand mark renders at ≥48% of nav frame height
3. No consumed CSS custom property is undefined
4. All chat metadata above foreground/35
5. User and assistant bubbles are materially distinct
6. Dark-mode shadows produce visible elevation
7. Journal admin accessible from account menu
8. All tests pass without weakening
9. typecheck, lint:css, and spacing:audit pass at threshold 0
