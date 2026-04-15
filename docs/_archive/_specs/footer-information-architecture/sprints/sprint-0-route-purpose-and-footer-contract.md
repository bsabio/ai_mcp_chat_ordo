# Sprint 0 - Route Purpose And Footer Contract

> **Goal:** Formalize route-purpose metadata in the shell model and lock the footer-only informational navigation contract into canonical tests before additional informational pages are added.
> **Spec ref:** `FIA-030` through `FIA-035`, `FIA-040` through `FIA-045`, `FIA-050` through `FIA-071`, `FIA-080` through `FIA-094`
> **Prerequisite:** None
> **Test count target:** 612 existing + 4 new = 616 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/lib/shell/shell-navigation.ts` | Exports `ShellRouteDefinition`, `ShellFooterGroup`, `SHELL_ROUTES`, `SHELL_FOOTER_GROUPS`, `resolvePrimaryNavRoutes(user?)`, `resolveCommandPaletteRoutes(user?)`, `resolveFooterGroups(user?)`, and `resolveFooterGroupRoutes(group, user?)` |
| `src/lib/shell/shell-commands.ts` | `resolveShellNavigationCommandDefinitions(user?)` already derives palette-safe destinations from `resolveCommandPaletteRoutes(user?)` |
| `src/components/SiteNav.tsx` | `SiteNav({ user })` renders brand, optional `primary-links`, and account access from `resolvePrimaryNavRoutes(user)` |
| `src/components/SiteFooter.tsx` | `SiteFooter({ user })` renders grouped footer links from `resolveFooterGroups(user)` and `resolveFooterGroupRoutes(group, user)` |
| `tests/shell-navigation-model.test.ts` | Already verifies primary-nav, footer-group, and legacy-route truth against the current route surface |
| `tests/shell-command-parity.test.ts` | Already verifies canonical shell command ids and destinations from shared command definitions |
| `tests/shell-acceptance.test.tsx` | Already asserts public shell/header/footer behavior for anonymous and authenticated users |
| `package.json` | Targeted verification scripts already exist: `test`, `test:homepage-shell`, `typecheck`, and `build` |

---

## Task 0.1 - Add explicit route-purpose metadata to the shell model

**What:** Extend the canonical shell-route definition so every route declares whether it is informational, workspace, access, or compatibility surface.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/shell/shell-navigation.ts` |
| **Spec** | `FIA-032`, `FIA-050` through `FIA-054`, `FIA-083` |

### Task 0.1 Notes

Add a small, typed purpose field or equivalent derived classification that is directly testable.

Use a shape close to:

```ts
export type ShellRoutePurpose =
  | "informational"
  | "workspace"
  | "access"
  | "compatibility";

export interface ShellRouteDefinition {
  id: string;
  label: string;
  href: string;
  kind: ShellRouteKind;
  purpose: ShellRoutePurpose;
  isLegacy?: boolean;
  showInCommandPalette?: boolean;
  headerVisibility?: ShellVisibility;
  footerVisibility?: ShellVisibility;
  accountVisibility?: ShellVisibility;
}
```

At minimum:

1. `Library` must classify as `informational`.
2. `Dashboard` and `Profile` must classify as `workspace`.
3. `Login` and `Register` must classify as `access`.
4. Existing legacy redirect routes must classify as `compatibility` and stay non-promoted.

### Task 0.1 Verify

```bash
npm run typecheck
```

---

## Task 0.2 - Add explicit footer-only informational-route helpers

**What:** Add small canonical helpers that make footer-only informational rules readable and reusable in tests and later page onboarding work.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/shell/shell-navigation.ts` |
| **Spec** | `FIA-030`, `FIA-031`, `FIA-055` through `FIA-071` |

### Task 0.2 Notes

Keep this sprint data-oriented. Do not add new pages yet.

Recommended helpers:

1. `resolveInformationalRoutes(user?)`
2. `isInformationalRoute(route)`
3. `resolveFooterInformationalGroups(user?)` only if it simplifies test readability without duplicating footer logic

The contract for this sprint is:

1. informational routes are discoverable from footer groups
2. informational routes are not reintroduced into primary nav
3. command discoverability is allowed without header visibility

Do not add speculative destinations like services or founder story yet unless the page routes also exist.

### Task 0.2 Verify

```bash
npx vitest run tests/shell-navigation-model.test.ts tests/shell-command-parity.test.ts
```

---

## Task 0.3 - Add regression coverage for the footer informational contract

**What:** Add focused shell tests that fail if informational routes drift into the header, disappear from the footer model, or lose command-surface parity.

| Item | Detail |
| --- | --- |
| **Modify** | `tests/shell-navigation-model.test.ts` |
| **Modify** | `tests/shell-command-parity.test.ts` |
| **Modify** | `tests/shell-acceptance.test.tsx` |
| **Spec** | `FIA-090` through `FIA-094` |

### Task 0.3 Notes

Cover at minimum:

1. every `informational` route is absent from `resolvePrimaryNavRoutes(user)`
2. every `informational` route that is visible to the audience is reachable through a footer group
3. command definitions for informational routes derive from `resolveCommandPaletteRoutes(user)` rather than header visibility
4. compatibility routes stay out of header, footer, and command surfaces unless explicitly promoted later

If a dedicated new file is clearer than expanding existing shell tests, create `tests/footer-information-architecture.test.ts` and update the count target accordingly.

### Task 0.3 Verify

```bash
npx vitest run tests/shell-navigation-model.test.ts tests/shell-command-parity.test.ts tests/shell-acceptance.test.tsx
```

---

## Task 0.4 - Record the Sprint 0 IA boundary in the sprint artifact

**What:** Preserve any implementation-time decision about purpose naming, footer grouping rules, or command exposure in this sprint doc.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/footer-information-architecture/sprints/sprint-0-route-purpose-and-footer-contract.md` |
| **Spec** | `FIA-032`, `FIA-063` through `FIA-071` |

### Task 0.4 Notes

If implementation matches the spec, leave `QA Deviations` empty. If the live route surface forces a narrower rule, record it there explicitly so Sprint 1 page onboarding inherits the real contract.

### Task 0.4 Verify

```bash
npm run build
```

---

## Completion Checklist

- [ ] Canonical shell routes declare an explicit route purpose
- [ ] Informational routes remain footer-first and header-excluded
- [ ] Command-surface parity is tested independently of header visibility
- [ ] Compatibility routes remain non-promoted in canonical shell IA

## QA Deviations
