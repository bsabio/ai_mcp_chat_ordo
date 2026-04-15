# Sprint 0 - Route Truth And Shell Model

> **Goal:** Establish the canonical shell information model so header, footer,
> and command surfaces stop inventing routes and labels independently.
> **Spec ref:** `SND-010` through `SND-021`, `SND-030`, `SND-031`, `SND-040`
> through `SND-043`, `SND-100`, `SND-103`
> **Prerequisite:** None
> **Test count target:** 565 existing + 5 new = 570 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/components/SiteNav.tsx` | `SiteNav({ user })` imports `usePathname()` but does not use pathname-derived state; it currently renders only brand plus `AccountMenu` |
| `src/components/SiteFooter.tsx` | `SiteFooter()` hardcodes grouped links including `/training`, `/studio`, `/docs`, `/patterns`, `/api`, `/privacy`, and `/terms` |
| `src/components/CommandPalette.tsx` | `CommandPalette()` builds a local `commands` array with `NavigationCommand` and `ThemeCommand` instances inside a `useMemo()` |
| `src/hooks/useCommandRegistry.ts` | `useCommandRegistry()` builds a second local command array and returns `{ executeCommand, findCommands }` |
| `src/core/commands/NavigationCommands.ts` | `new NavigationCommand(id, title, category, navigate, path)` executes a framework-provided navigate callback |
| `src/core/commands/ThemeCommands.ts` | `new ThemeCommand(id, title, category, setTheme, themeName)` executes a typed theme setter |
| `src/app/` route surface | Verified page routes currently include `/`, `/dashboard`, `/profile`, `/login`, `/register`, `/corpus`, `/corpus/[document]`, `/corpus/[document]/[section]`, `/corpus/section/[slug]`, plus legacy `/books/*` and `/book/[chapter]` routes |

---

## Task 0.1 - Create the canonical shell navigation model

**What:** Add a shell configuration module that defines canonical brand metadata,
primary navigation items, footer groups, and command-safe navigation metadata.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/shell/shell-navigation.ts` |
| **Spec** | `SND-030`, `SND-040` through `SND-043`, `SND-100`, `SND-103` |

### Task 0.1 Notes

The new module should define typed data structures, not component markup.

Use a shape close to the following so later sprints can project the same data
into header, footer, and command surfaces without redefining meaning:

```ts
export type ShellRouteKind = "internal" | "external";

export interface ShellRouteDefinition {
   id: string;
   label: string;
   href: string;
   kind: ShellRouteKind;
   isLegacy?: boolean;
   showInHeader?: boolean;
   showInFooter?: boolean;
   showInCommandPalette?: boolean;
}

export interface ShellFooterGroup {
   id: string;
   label: string;
   routeIds: string[];
}

export interface ShellBrandMetadata {
   name: string;
   shortName: string;
   homeHref: string;
   ariaLabel: string;
   markText: string;
}

export const SHELL_BRAND: ShellBrandMetadata = ...;
export const SHELL_ROUTES: readonly ShellRouteDefinition[] = ...;
export const PRIMARY_NAV_ITEMS: readonly ShellRouteDefinition[] = ...;
export const SHELL_FOOTER_GROUPS: readonly ShellFooterGroup[] = ...;
```

At minimum include:

1. a brand metadata export
2. a canonical primary-nav list
3. grouped footer navigation data
4. route metadata suitable for command-surface reuse
5. explicit handling for legacy compatibility routes so they remain documented
   without becoming primary IA

Only include destinations that are real today.

### Task 0.1 Verify

```bash
npm run typecheck
```

---

## Task 0.2 - Add route-truth regression coverage for the shell model

**What:** Add a focused test that fails when a shell-config destination points
to a route that is not actually part of the current application surface.

| Item | Detail |
| --- | --- |
| **Create** | `tests/shell-navigation-model.test.ts` |
| **Spec** | `SND-010`, `SND-031`, `SND-041`, `SND-110` |

### Task 0.2 Notes

This test should assert at minimum:

1. primary nav destinations are real routes
2. footer-group destinations are real routes or explicit external links
3. legacy compatibility routes are marked as such and not emitted into primary
   nav by accident

Prefer route assertions against an explicit allowed-route list derived from the
verified `src/app/` surface rather than brittle DOM scraping.

Keep the test data-oriented. A structure like the following is sufficient:

```ts
const allowedInternalRoutes = new Set([
   "/",
   "/dashboard",
   "/profile",
   "/login",
   "/register",
   "/corpus",
]);

it("keeps primary nav routes inside the verified route surface", () => {
   const invalidRoutes = PRIMARY_NAV_ITEMS.filter(
      (item) => item.kind === "internal" && !allowedInternalRoutes.has(item.href),
   );

   expect(invalidRoutes).toEqual([]);
});
```

The allowed set should represent stable user-entry routes only. Dynamic
segments may be represented as metadata in the shell model, but should not be
treated as primary shell destinations in this sprint.

### Task 0.2 Verify

```bash
npm run test -- tests/shell-navigation-model.test.ts
```

---

## Task 0.3 - Introduce a shared shell brand primitive

**What:** Add a reusable brand component or primitive set that exposes the mark
and label once for later reuse in header and footer, with a minimal semantic
test.

| Item | Detail |
| --- | --- |
| **Create** | `src/components/shell/ShellBrand.tsx` |
| **Create** | `tests/shell-brand.test.tsx` |
| **Spec** | `SND-032`, `SND-050` through `SND-052`, `SND-115` |

### Task 0.3 Notes

Keep this sprint limited to the primitive itself. Do not refactor `SiteNav` or
`SiteFooter` yet.

The component should encapsulate:

1. the mark
2. the visible label
3. any accessible-only text or link semantics needed by shell consumers

Allow later surface-level variants through props rather than copied JSX.

Use a small prop surface so later shell components can adopt it without adding
new markup variants:

```tsx
interface ShellBrandProps {
   href?: string;
   showWordmark?: boolean;
   className?: string;
}
```

Add a focused render test that asserts the component exposes the canonical
brand label and navigates to `/` by default.

### Task 0.3 Verify

```bash
npm run test -- tests/shell-brand.test.tsx
```

---

## Task 0.4 - Record the shell model contract in the sprint doc

**What:** Capture any implementation-time decision about canonical destinations,
legacy route treatment, or external-link policy in this sprint document.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/shell-navigation-and-design-system/sprints/sprint-0-route-truth-and-shell-model.md` |
| **Spec** | `SND-020`, `SND-041`, `SND-042` |

### Task 0.4 Notes

If implementation matches the spec exactly, keep `QA Deviations` empty. If the
live route surface forces a change in allowed shell destinations, record it
there explicitly.

### Task 0.4 Verify

```bash
npm run quality
```

---

## Completion Checklist

- [x] Canonical shell navigation data exists in one module
- [x] Only real or explicitly external destinations are represented
- [x] A reusable shell brand primitive exists
- [x] Shell brand primitive has basic semantic coverage
- [x] Route-truth regression coverage exists and passes

## QA Deviations
