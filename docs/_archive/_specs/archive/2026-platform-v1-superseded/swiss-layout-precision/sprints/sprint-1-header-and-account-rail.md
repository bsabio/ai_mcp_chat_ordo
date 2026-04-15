# Sprint 1 - Header And Account Rail

> **Goal:** Rebuild the shell header as a precise Swiss-inspired rail and unify anonymous/authenticated account affordances into one coherent subsystem.
> **Spec sections:** `SLP-020` through `SLP-042`, `SLP-090` through `SLP-113`
> **Prerequisite:** Sprint 0 complete and committed

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/components/SiteNav.tsx` | Header rail with `ShellBrand`, `PRIMARY_NAV_ITEMS.map(...)`, and `<AccountMenu user={user} />` |
| `src/components/shell/ShellBrand.tsx` | `export function ShellBrand({ href, showWordmark, className }: ShellBrandProps)` with `shell-brand-row` and `shell-brand-mark` |
| `src/components/AccountMenu.tsx` | Anonymous branch with `Sign In`/`Register`; authenticated branch with user trigger, route links, legibility controls, simulation controls, and sign-out |
| `src/lib/shell/shell-navigation.ts` | Canonical route truth via `PRIMARY_NAV_ITEMS`, `ACCOUNT_MENU_ROUTE_IDS`, `resolveAccountMenuRoutes()` |
| `tests/shell-acceptance.test.tsx` | Acceptance assertions for canonical nav links and footer links |
| `tests/shell-visual-system.test.tsx` | Visual-role assertions for brand, footer, account menu, and chat header role classes |

---

## Tasks

### 1. Recompose `SiteNav` as a true three-part rail

Required work:

1. Treat brand, nav, and account access as distinct regions sharing one vertical center.
2. Keep primary navigation intentionally sparse and on one line.
3. Preserve canonical active-state behavior from `isShellRouteActive`.

Verify:

```bash
npm run test -- tests/shell-acceptance.test.tsx tests/browser-motion.test.tsx
```

### 2. Refine `ShellBrand` and nav typography

Required work:

1. Increase typographic authority without making the shell heavy.
2. Prevent brand and nav labels from wrapping unpredictably.
3. Ensure brand spacing and wordmark scale come from shared token roles.

Verify:

```bash
npm run test -- tests/shell-visual-system.test.tsx
```

### 3. Unify anonymous and authenticated account rails in `AccountMenu`

Required work:

1. Align anonymous `Sign In`/`Register` controls to the same rail height and spacing budget as the authenticated trigger.
2. Refine the authenticated trigger hierarchy: user name, role/meta text, and avatar mark.
3. Preserve the existing route-truth behavior and dropdown dismissal behavior.

Verify:

```bash
npm run test -- tests/browser-overlays.test.tsx tests/shell-visual-system.test.tsx
```

### 4. Tighten dropdown precision without altering menu capabilities

Required work:

1. Re-space the dropdown header, sections, route links, and action rows around shared tokens.
2. Do not add or remove menu features in this sprint.
3. Keep the menu readable on narrow widths.

Verify:

```bash
npx eslint src/components/SiteNav.tsx src/components/AccountMenu.tsx src/components/shell/ShellBrand.tsx
```

---

## Completion Checklist

- [x] `SiteNav` reads as a controlled three-part rail
- [x] Brand/nav typography refined and non-wrapping
- [x] Anonymous/authenticated account rail unified
- [x] Account dropdown spacing and hierarchy refined without capability drift
- [x] Verification commands passed

## QA Deviations

None. Verification passed with `npm run test -- tests/shell-acceptance.test.tsx tests/browser-motion.test.tsx`, `npm run test -- tests/shell-visual-system.test.tsx`, `npm run test -- tests/browser-overlays.test.tsx tests/shell-visual-system.test.tsx`, `npx eslint src/components/SiteNav.tsx src/components/AccountMenu.tsx src/components/shell/ShellBrand.tsx`, and full `npm run quality`.