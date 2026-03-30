# Sprint 1 — Navigation Proportional Hierarchy

> **Goal:** Apply the new brand and nav-label typography tiers to the shell navigation so the brand mark, wordmark, nav labels, account labels, and metadata each occupy a visually distinct size, creating a clear proportional hierarchy in the navigation bar.
> **Spec ref:** §4.1, §4.2, §4.4, §9.1
> **Prerequisite:** Sprint 0 (tokens defined)

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_refactor/visual-hierarchy-and-proportional-balance/census.md` | baseline values for all properties being changed |
| `src/app/styles/shell.css` | semantic CSS selectors for brand, nav, and account |
| `src/app/styles/foundation.css` | token authority (Sprint 0 tokens already defined) |
| `src/components/shell/ShellBrand.tsx` | brand mark and wordmark component |
| `src/components/SiteNav.tsx` | nav rail layout and brand link |
| `src/components/AccountMenu.tsx` | account trigger and dropdown |

---

## Task 1.1 — Rescale brand mark and wordmark

**What:** Update `.shell-brand-row` and `.shell-brand-mark` in shell.css and update the Image dimensions in ShellBrand.tsx to use the brand tier.

**Modify:** `src/app/styles/shell.css`, `src/components/shell/ShellBrand.tsx`

### shell.css changes

`.shell-brand-row`:
- Change `font-size: var(--tier-micro-size)` → `font-size: var(--tier-brand-size)`

`.shell-brand-mark`:
- Change `width: 1.618rem` → `width: 2.058rem`
- Change `height: 1.618rem` → `height: 2.058rem`

### ShellBrand.tsx changes

- Change `<Image ... width={26} height={26} ...>` → `width={33} height={33}`
- Change `rounded-[0.42rem]` → `rounded-[0.5rem]` on the mark container

### SiteNav.tsx changes

- Remove `opacity-90` from the ShellBrand className in SiteNav.tsx (brand should render at full presence)

### Verification

- Brand mark renders at ≈33px (48% of 4.236rem nav frame height)
- Wordmark text is visibly larger than nav labels
- `npm run typecheck` passes
- Shell tests pass

---

## Task 1.2 — Apply nav-label tier to primary navigation

**What:** Update `.shell-nav-label` in shell.css to use the new nav-label tier tokens instead of micro tier.

**Modify:** `src/app/styles/shell.css`

### Changes

`.shell-nav-label`:
- Change `font-size: var(--tier-micro-size)` → `font-size: var(--tier-nav-label-size)`
- Change `letter-spacing: var(--tier-micro-tracking)` → `letter-spacing: var(--tier-nav-label-tracking)`

### Verification

- Nav labels render at ~11.5px, visibly larger than metadata at 10.2px
- Labels remain uppercase and readable
- `npm run lint:css` passes

---

## Task 1.3 — Apply nav-label tier to account labels

**What:** Update `.shell-account-label` in shell.css to use the nav-label tier font size, keeping its existing letter-spacing (0.1em) which is distinct from the nav-label tracking.

**Modify:** `src/app/styles/shell.css`

### Changes

`.shell-account-label`:
- Change `font-size: var(--tier-micro-size)` → `font-size: var(--tier-nav-label-size)`

### Verification

- Account labels (user name, role label, route labels) render at nav-label size
- Account dropdown text is visibly distinct from timestamp metadata
- `npm run lint:css` passes

---

## Task 1.4 — Increase nav active-state contrast

**What:** The current active nav item background uses `foreground 4%` tint over surface, which is invisible in dark mode. Increase to a stronger but still subtle differentiation.

**Modify:** `src/app/styles/shell.css`

### Changes

`.ui-shell-nav-item-active`:
- Change `background: color-mix(in oklab, var(--foreground) 4%, var(--surface))` → `background: color-mix(in oklab, var(--foreground) 8%, var(--surface))`

### Verification

- Active nav item is visually distinguishable from idle items in dark mode
- The differentiation is subtle (not a harsh highlight) in both light and dark modes
- `npm run lint:css` passes

---

## Task 1.5 — Sprint 1 verification gate

### Required commands

1. `npm run typecheck`
2. `npm run lint:css`
3. `npm run spacing:audit`
4. Focused tests: shell visual system tests, SiteNav tests, AccountMenu tests

### Visual evidence checklist

- [ ] Brand mark is the largest visual element in the nav bar
- [ ] Brand wordmark text is larger than nav link text
- [ ] Nav link text (HOME, LIBRARY, JOURNAL) is larger than metadata/timestamp text
- [ ] Account name text matches nav link scale
- [ ] Active nav item has visible background differentiation in dark mode
- [ ] Journal admin link appears in account dropdown for admin users
- [ ] No existing tests have been modified or weakened

---

## Sprint 1 Deliverables Summary

| Deliverable | File | Change type |
| --- | --- | --- |
| Brand mark at 2.058rem | shell.css | CSS token reference update |
| Brand Image at 33×33 | ShellBrand.tsx | prop value update |
| Brand mark radius 0.5rem | ShellBrand.tsx | class update |
| Brand row at brand tier | shell.css | token reference update |
| Remove brand opacity | SiteNav.tsx | class removal |
| Nav labels at nav-label tier | shell.css | token reference update |
| Nav label tracking reduced | shell.css | token reference update |
| Account labels at nav-label tier | shell.css | token reference update |
| Active state at 8% tint | shell.css | value update |
| Verification gate | — | pipeline pass |
