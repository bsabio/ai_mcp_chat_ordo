# Sprint 1 - Header Footer Composition

> **Goal:** Refactor the header and footer so they consume shared shell data and
> the shared brand primitive instead of duplicating structure, routes, and copy.
> **Spec ref:** `SND-012`, `SND-013`, `SND-032`, `SND-033`, `SND-050` through
> `SND-072`, `SND-111`, `SND-112`, `SND-115`
> **Prerequisite:** Sprint 0 committed
> **Test count target:** 570 existing + 5 new = 575 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/components/SiteNav.tsx` | `SiteNav({ user })` renders a sticky nav with duplicated brand markup and `AccountMenu`; `usePathname()` is currently unused |
| `src/components/SiteFooter.tsx` | `SiteFooter()` duplicates the brand markup and hardcodes three link groups plus a decorative global-status row |
| `src/components/AppShell.tsx` | `AppShell({ user, children })` already owns shell composition and renders `SiteNav` above `main` and `SiteFooter` below the viewport stage |
| `src/components/AccountMenu.tsx` | `AccountMenu({ user })` owns authenticated account controls and already routes to `/dashboard`, `/profile`, `/login`, and `/register` |
| `src/components/shell/ShellBrand.tsx` | Sprint 0 creates `ShellBrand({ href?, showWordmark?, className? })` as the shared brand primitive for header/footer reuse |
| `src/lib/shell/shell-navigation.ts` | Sprint 0 creates canonical shell data exports including `SHELL_BRAND`, `SHELL_ROUTES`, `PRIMARY_NAV_ITEMS`, `SHELL_FOOTER_GROUPS`, `getShellRouteById()`, and `resolveFooterGroupRoutes()` |
| Sprint 0 shell decisions | Current canonical primary-nav set is `home`, `corpus`, and `dashboard`; current footer groups are `platform` and `account`; legacy compatibility routes remain documented but are not shell IA |
| `tests/homepage-shell-layout.test.tsx` | Existing tests already assert shell/footer placement and stage ownership, so header/footer refactors must preserve those contracts |
| `tests/homepage-shell-ownership.test.tsx` | Existing ownership tests currently assert a sparse header with brand plus account menu and no site-links substitute, so Sprint 1 should update expectations without regressing shell ownership guarantees |

---

## Task 1.1 - Refactor SiteNav onto canonical primary navigation

**What:** Make `SiteNav` consume shared primary-nav data and render an explicit
active-state navigation contract.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/SiteNav.tsx` |
| **Spec** | `SND-033`, `SND-060`, `SND-070` through `SND-072`, `SND-111` |

### Task 1.1 Notes

This sprint must implement canonical primary navigation, not a masthead-only
fallback. Leaving `SiteNav` without real primary nav would fail `SND-111` and
push the core header problem into later sprints.

Required behavior:

1. render a small canonical primary-nav set from `PRIMARY_NAV_ITEMS`
2. derive active-state behavior from shell-route metadata rather than local
    duplicated comparisons
3. preserve `AccountMenu` as the authenticated control surface on the right
4. keep the header compatible with the existing homepage-shell ownership tests

A structure close to the following is sufficient:

```tsx
const pathname = usePathname();

<nav aria-label="Primary">
   <ShellBrand />
   <ul>
      {PRIMARY_NAV_ITEMS.map((item) => {
         const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
         return ...;
      })}
   </ul>
   <AccountMenu user={user} />
</nav>
```

The exact active-state helper may be extracted, but it must be driven by the
canonical shell model rather than inline hardcoded route arrays.

Sprint 0 already fixed the canonical primary-nav scope to `home`, `corpus`, and
`dashboard`. Sprint 1 should implement that scope directly unless a documented
product decision changes it.

### Task 1.1 Verify

```bash
npm run test -- tests/homepage-shell-layout.test.tsx
```

---

## Task 1.2 - Refactor SiteFooter onto shared brand and grouped link data

**What:** Replace duplicated brand JSX and hardcoded footer link arrays with
canonical shell data.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/SiteFooter.tsx` |
| **Spec** | `SND-031`, `SND-032`, `SND-051`, `SND-061`, `SND-112`, `SND-115` |

### Task 1.2 Notes

The refactor should:

1. reuse `ShellBrand`
2. render grouped footer links from canonical data
3. remove dead routes
4. keep any supporting copy truthful and aligned to the current product

Do not broaden the footer into a second application router.

Render footer groups by resolving `routeIds` through the canonical shell-route
definitions rather than copying `href` values inline in the component.

Sprint 0 currently defines the footer groups as `platform` and `account`, with
no external destinations. Sprint 1 should preserve that truthful scope rather
than reintroducing the removed dead-link groups.

### Task 1.2 Verify

```bash
npm run build
```

---

## Task 1.3 - Add focused shell composition tests

**What:** Add tests that prove header/footer now render from shared shell truth
instead of duplicated local definitions.

| Item | Detail |
| --- | --- |
| **Create** | `tests/site-shell-composition.test.tsx` |
| **Spec** | `SND-013`, `SND-050` through `SND-052`, `SND-070` through `SND-072`, `SND-111`, `SND-112`, `SND-115` |

### Task 1.3 Notes

Assert at minimum:

1. header and footer both render the shared brand label
2. footer link groups match canonical group definitions
3. header active-state behavior is tied to real canonical nav items when on a
   matching route
4. footer no longer renders the dead-route set identified in the spec audit

Prefer testing rendered semantics over class-name snapshots.

Use `next/navigation` path mocking so the test can assert active-state behavior
on `/`, `/corpus`, and `/dashboard` without coupling to unrelated app runtime.

Update existing homepage-shell tests if necessary, but only where their current
header expectations intentionally change from the Sprint 0 sparse header to the
Sprint 1 canonical primary-nav contract. Do not weaken the shell ownership or
footer-placement assertions.

### Task 1.3 Verify

```bash
npm run test -- tests/site-shell-composition.test.tsx
```

---

## Task 1.4 - Record any header-IA decision made during implementation

**What:** If the sprint narrows or expands the canonical primary-nav set, record
that decision here so later sprints inherit the same contract.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/shell-navigation-and-design-system/sprints/sprint-1-header-footer-composition.md` |
| **Spec** | `SND-071`, `SND-072` |

### Task 1.4 Notes

Do not silently change primary-nav scope in code without documenting it here.

### Task 1.4 Verify

```bash
npm run quality
```

---

## Completion Checklist

- [x] `SiteNav` renders canonical primary navigation with model-driven active state
- [x] `SiteFooter` no longer hardcodes dead routes or duplicated brand markup
- [x] Shared brand primitive is used by both shell surfaces
- [x] Footer groups resolve from canonical shell data rather than local link arrays
- [x] Header/footer composition tests exist and pass

## QA Deviations
