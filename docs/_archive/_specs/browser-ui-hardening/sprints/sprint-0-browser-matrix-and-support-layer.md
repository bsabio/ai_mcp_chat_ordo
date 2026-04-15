# Sprint 0 - Browser Matrix And Support Layer

> **Goal:** Create a shared browser-hardening foundation: support helpers,
> fallback CSS primitives, and a concrete browser acceptance matrix.
> **Spec ref:** `BUI-110`, `BUI-140`, `BUI-170`, `BUI-180`, `BUI-200`,
> `BUI-201`, `BUI-240` through `BUI-255`
> **Prerequisite:** None

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `package.json` | Scripts already available: `lint`, `test`, `build`, `typecheck`, `lhci`, `lhci:dev` |
| `src/components/ThemeProvider.tsx` | `ThemeProvider({ children })` and `useTheme()` already centralize UI state and feature-check `document.startViewTransition` |
| `src/app/globals.css` | Global tokens and utility layers already exist and can host new browser fallback utilities |
| `src/app/layout.tsx` | Root shell currently owns the global layout contract |
| `lighthouse-prod.json` | Existing Chromium/mobile emulation baseline available for comparison |

---

## Task 0.1 - Define the browser support contract

**What:** Create a shared support module for feature checks and browser-oriented
layout constants.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/ui/browserSupport.ts` |
| **Create** | `tests/browser-support.test.ts` |
| **Spec** | `BUI-140`, `BUI-200`, `BUI-230` |

### Task 0.1 Notes

Create small, framework-agnostic helpers such as:

- `supportsViewTransitions()`
- `supportsBackdropBlur()`
- `getSafeAreaInsetVar(edge)`
- `getViewportUnitFallback()`
- `getAutoScrollBehavior()`

The goal is not browser sniffing. Prefer capability checks and stable fallback
constants.

### Task 0.1 Verify

```bash
npm run test -- tests/browser-support.test.ts
```

---

## Task 0.2 - Add fallback CSS primitives

**What:** Extend global CSS so browser-safe utilities exist before shell and
component refactors start.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/globals.css` |
| **Spec** | `BUI-050`, `BUI-090`, `BUI-203` |

### Task 0.2 Notes

Add utilities or root variables for:

- Physical overflow fallbacks alongside `overflow-inline` and `overflow-block`
- Safe-area padding variables for top and bottom anchored UI
- Reduced-motion utility hooks
- Blur-fallback utility classes with non-blur backgrounds
- Shared viewport-height token strategy so inline `100dvh` math can be reduced
  in later sprints

Keep this sprint limited to infrastructure. Do not yet change all consuming
components.

### Task 0.2 Verify

```bash
npm run lint -- src/app/globals.css
```

---

## Task 0.3 - Document the browser verification matrix

**What:** Create a project-facing verification checklist that future sprints can
execute against.

| Item | Detail |
| --- | --- |
| **Create** | `docs/_specs/browser-ui-hardening/artifacts/browser-ui-verification-matrix.md` |
| **Spec** | `BUI-170`, `BUI-240` through `BUI-255` |

### Task 0.3 Notes

Document at minimum:

- Safari / iOS Safari checks
- Chrome desktop checks
- Android Chrome checks
- Firefox desktop checks
- Layout, dialog, popover, media, motion, and keyboard/focus scenarios

This must be written as a release artifact, not an informal note.

### Task 0.3 Verify

```bash
npm run lint
```

---

## Task 0.4 - Establish a baseline audit note

**What:** Capture the known high-risk browser findings in a single implementation
note so future sprint diffs can be judged against the same baseline.

| Item | Detail |
| --- | --- |
| **Create** | `docs/_specs/browser-ui-hardening/artifacts/browser-ui-baseline.md` |
| **Spec** | `BUI-010` through `BUI-100` |

### Task 0.4 Notes

Summarize current risks with references to the existing shell, overlay, motion,
 and media components. This should mirror the system spec but be shorter and
 implementation-oriented.

### Task 0.4 Verify

```bash
npm run build
```
