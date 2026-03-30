# Sprint 1 — Foundations And Shell Partition

> **Goal:** Split design tokens, shell primitives, and reusable utilities away from feature-owned surface styling.
> **Spec ref:** §2, §3.1, §3.2, §4
> **Prerequisite:** Sprint 0

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/app/globals.css` | currently contains both foundational tokens and route-specific surface rules |
| shell component tests | protect shell route mode, nav tone, and related visual contracts |

---

## Task 1.1 — Separate tokens from surface rules

**What:** Move root variables, density controls, and global resets into a clear foundational partition.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/globals.css` |
| **Create or Modify** | extracted CSS files for tokens and global base rules |
| **Spec** | Goal 1, Goal 2, §3.1 |

### Work items

1. keep `globals.css` as the global entrypoint if that minimizes integration risk
2. extract token and reset concerns first because they have the broadest blast radius
3. preserve import order explicitly so token availability and utility generation do not drift

### Verify Task 1.1

```bash
npm run lint:css
npm run build
```

Verification status:

1. Completed. Foundational tokens, density controls, theme overrides, and base
	resets now live in `src/app/styles/foundation.css`.
2. `src/app/globals.css` remains the single imported entrypoint from the app
	layout, but now delegates foundational ownership through ordered imports.

---

## Task 1.2 — Separate shell primitives from feature-owned surfaces

**What:** Move shell and navigation styling into its own concern boundary instead of keeping it beside editorial or chat rules.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/globals.css` |
| **Create or Modify** | extracted shell-focused CSS partition |
| **Spec** | Goal 2, Goal 3, §3.1 |

### Verify Task 1.2

```bash
npx vitest run src/components/AppShell.test.tsx src/components/SiteNav.test.tsx tests/homepage-shell-ownership.test.tsx
npm run build
```

Verification status:

1. Completed for the extraction itself. Shell utilities and journal shell-tone
	selectors now live in `src/app/styles/shell.css`.
2. `src/components/AppShell.test.tsx` passed.
3. `src/components/SiteNav.test.tsx` passed.
4. `tests/homepage-shell-ownership.test.tsx` still has one existing nav-contract
	assertion expecting the homepage to omit a `Library` link, while the current
	runtime nav output still includes it.
5. `npm run build` passed after the extraction.

---

## Task 1.3 — Separate shared utilities from route surfaces

**What:** Keep reusable utility helpers in a shared partition and stop mixing them with feature-owned classes.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/globals.css` |
| **Create or Modify** | extracted utilities-focused CSS partition |
| **Spec** | Goal 1, Goal 3 |

### Verify Task 1.3

```bash
npm run lint:css
```

Verification status:

1. Completed. Shared focus, motion, button, form, safe-area, glass, and helper
	utilities now live in `src/app/styles/utilities.css`.
2. `npm run lint:css` passed after the partition and stylelint config update.

---

## Completion Checklist

- [x] Tokens and global base rules are partitioned cleanly
- [x] Shell styling no longer lives beside unrelated feature surfaces
- [x] Shared utilities have a distinct ownership layer

## QA Deviations

1. The broad homepage shell test still reports a nav-contract mismatch unrelated
	to this CSS refactor: `tests/homepage-shell-ownership.test.tsx` expects the
	homepage nav to omit `Library`, but the current rendered nav still includes
	that link.