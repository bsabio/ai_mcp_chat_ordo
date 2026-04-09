# Sprint 3 — Navigation Convergence

> **Status:** Complete
> **Goal:** Canonicalize shell, account, desktop admin, and mobile admin navigation around the live role model, align admin surfaces to the existing theme runtime, and remove stale route-era artifacts without widening access.
> **Spec refs:** §1.2 through §1.3, §2, §3.1 through §3.7, §4, §5, `RNQ-004`, `RNQ-014`, `RNQ-020` through `RNQ-026`, `RNQ-050` through `RNQ-055`, `RNQ-080` through `RNQ-095`
> **Grounding docs:** [../admin-dashboard-nav-audit.md](../admin-dashboard-nav-audit.md), [../theme-mcp-contract-audit.md](../theme-mcp-contract-audit.md)
> **Prerequisite:** [sprint-2-global-jobs-policy-alignment.md](sprint-2-global-jobs-policy-alignment.md)

---

## Strategic Ideas

Sprint 3 should follow these four ideas directly.

1. **Route truth must live once.** Shell, account, desktop admin, and mobile admin navigation should stop carrying their own local admin-route opinions.
2. **Responsive parity had to be deliberate, not implied.** At sprint start the repository already contained a grouped `AdminDrawer`, but the production admin layout did not mount it. Sprint 3 had to converge real desktop and mobile behavior instead of letting isolated components and stale tests tell different stories.
3. **Theme integration should preserve the current runtime contract.** `ThemeProvider`, manifest-backed theme metadata, and `shell.css` are already the live authority. Sprint 3 should align admin visuals to that system rather than creating local theme state or extending `jobs-*` semantics indefinitely.
4. **Cleanup should target verified drift only.** Remove stale assumptions such as hardcoded admin link arrays, dead route exports, preview-era browser assertions, and phantom mobile-nav expectations only when shared metadata and coverage replace them.

---

## Verified Starting Point

| Area | Verified current state | Evidence |
| --- | --- | --- |
| Shell route truth | `src/lib/shell/shell-navigation.ts` is the canonical route registry, but admin exposure is still split between route metadata and local component arrays | `src/lib/shell/shell-navigation.ts`, `src/components/AccountMenu.tsx` |
| Account menu | `AccountMenu` already consumes route resolvers and theme controls, but it still hardcodes `ADMIN_LINKS` for the full admin workspace list | `src/components/AccountMenu.tsx` |
| Desktop admin nav | `AdminSidebar` renders a flat ordered list from `resolveAdminNavigationItems()` | `src/lib/admin/admin-navigation.ts`, `src/components/admin/AdminSidebar.tsx` |
| Mobile admin nav | At sprint start, `AdminDrawer` grouped admin routes locally, but `src/app/admin/layout.tsx` did not mount it in production | `src/components/admin/AdminDrawer.tsx`, `src/app/admin/layout.tsx` |
| Browser truth | The responsive admin-shell browser spec had drifted to removed preview and bottom-nav expectations; before implementation it reflected the live desktop route set and the pre-sprint mobile-shell gap | `tests/browser-ui/admin-shell-responsive.spec.ts` |
| Jobs browser smoke | `/admin/jobs` now has focused browser coverage for anonymous redirect, capability-filtered row visibility, status-driven detail actions, and mobile card-stack selection | `tests/browser-ui/admin-jobs.spec.ts` |
| Theme/runtime contract | Theme runtime authority already lives in `ThemeProvider` and manifest-backed helpers; at sprint start admin surfaces still borrowed `jobs-hero-surface` and `jobs-panel-surface` semantics | `src/components/ThemeProvider.tsx`, `src/components/admin/AdminSection.tsx`, `src/components/admin/AdminCard.tsx`, `src/components/admin/AdminSidebar.tsx` |
| Cleanup baseline | The verified-unused `ADMIN_ROUTE_IDS` export has been removed; broader cleanup still belongs to canonical navigation convergence work | `src/lib/admin/admin-navigation.ts` |

---

## Pre-Sprint Groundwork Already Landed

The following low-risk hardening work is already complete before Sprint 3 implementation starts.

1. `/admin/jobs` now has a focused Playwright smoke that exercises current access control, capability filtering, detail affordances, and mobile list behavior.
2. The stale admin responsive browser spec no longer claims preview routes or bottom navigation that the product does not ship.
3. Browser-suite documentation now reflects the Playwright-managed production server and the new admin-jobs smoke.
4. One verified-unused admin navigation export was removed to reduce obvious dead code before larger route-model changes begin.

These changes do not complete Sprint 3 by themselves. They only make the current state easier to reason about and harder to misdescribe.

---

## Verified Exit State

Sprint 3 is complete and verified.

1. `src/lib/admin/admin-navigation.ts` now owns canonical grouped admin route metadata, and the desktop sidebar, mobile drawer, and account-menu admin destinations all derive from it.
2. `src/app/admin/layout.tsx` now mounts a mobile admin toolbar plus `AdminDrawer`, so desktop and mobile admin shells are both shipped experiences with shared route ordering and active-state truth.
3. `src/app/styles/admin.css` now owns admin chrome and content semantics, and `AdminSection`, `AdminCard`, `AdminSidebar`, and `AdminDrawer` no longer depend on borrowed `jobs-*` classes.
4. Stale preview-era, bottom-nav, and unmounted-drawer assumptions were removed from unit, browser, and source-audit coverage.
5. Verification passed on 2026-03-31 with `npm run typecheck`, a focused Vitest bundle (`11` files, `113` tests), `npx playwright test tests/browser-ui/admin-shell-responsive.spec.ts tests/browser-ui/admin-jobs.spec.ts` (`5` tests), and `npm run build`.

---

## Cross-Layer Constraints

1. Sprint 3 must not widen admin-route access beyond `ADMIN`. Route exposure, page gates, and browser coverage should stay aligned to the current access model until a later sprint changes policy intentionally.
2. `ThemeProvider` remains the only live owner for theme state, document attributes, and persisted UI preferences. Sprint 3 must not introduce component-local theme stores for admin chrome.
3. Shared route metadata must become more canonical, not more fragmented. Avoid adding new local admin-route arrays in `AccountMenu`, `AdminSidebar`, `AdminDrawer`, or page components.
4. If Sprint 3 mounts a dedicated mobile admin navigator in `src/app/admin/layout.tsx`, it must update browser coverage and any source-audit tests that currently assert the drawer is unmounted in the same change.
5. Hidden secondary routes such as `/admin/journal/attribution` should not become top-level global-nav items unless their product ownership changes. Top-level convergence is about truthful primary workspaces first.
6. Theme and spacing work should land through named classes or owned admin-surface primitives, not through more one-off arbitrary-value visual strings inside route components.

---

## Target Desktop And Mobile Behavior

### Desktop target

1. At `sm` and above, the admin shell shows one grouped, sticky workspace navigator sourced from canonical admin metadata.
2. The desktop navigator highlights the active top-level workspace for both index and deep routes, such as `/admin/jobs/[id]` or `/admin/journal/attribution`.
3. Only live, loadable workspaces appear. No preview badges, placeholder labels, or hidden-route stand-ins remain.
4. Account-menu admin links and desktop sidebar links resolve from the same route model, even if the account menu exposes only a curated subset.

### Mobile target

1. Below `sm`, the desktop sidebar is replaced by a real mounted admin navigator reachable from every admin route.
2. The mobile navigator uses the same grouped route model and ordering as desktop.
3. The mobile navigator closes on route change, closes on backdrop or Escape, traps focus while open, and preserves safe-area and hit-target usability.
4. There is no legacy bottom nav. There are no preview labels. Mobile behavior must describe the shipped route model exactly.

---

## Positive, Negative, And Edge-Case Test Matrix

| Class | Required cases |
| --- | --- |
| Positive | Admin desktop shell shows the full live workspace set from canonical metadata; admin mobile shell exposes the same grouped route set through the mounted mobile navigator; account menu admin destinations match canonical route truth; theme and density changes preserve readable nav contrast and active states |
| Negative | Anonymous users redirect to `/login` for admin routes; signed-in non-admin users do not receive admin links or page access; routes that cannot load do not appear in shell or account navigation; stale preview labels and bottom-nav expectations are absent from source and browser tests |
| Edge | Deep routes still highlight the owning workspace; hidden secondary routes stay in local workspace subnav instead of top-level global nav; long labels and narrow mobile widths preserve touch targets and wrapping; focus trap, backdrop dismiss, Escape close, and route-change close all work on the mounted mobile navigator |

The current pre-sprint browser baseline already covers part of this matrix through `tests/browser-ui/admin-jobs.spec.ts` and the refreshed `tests/browser-ui/admin-shell-responsive.spec.ts`. Sprint 3 should extend that baseline to the final converged shell behavior.

---

## Task 3.1 — Canonicalize shell, account, and admin route truth

**What:** Move admin workspace grouping and admin-link resolution onto one shared route model so shell and admin surfaces stop drifting independently.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/admin/admin-navigation.ts` |
| **Modify** | `src/lib/shell/shell-navigation.ts` |
| **Modify** | `src/components/AccountMenu.tsx` |
| **Modify** | `src/components/admin/AdminSidebar.tsx` |
| **Modify** | `src/components/admin/AdminDrawer.tsx` |
| **Modify if needed** | focused shell and admin navigation tests |
| **Spec** | §1.2, §3.4, §3.7, `RNQ-004`, `RNQ-014`, `RNQ-024`, `RNQ-050` through `RNQ-055`, `RNQ-080`, `RNQ-081` |

### Task 3.1 outcomes

1. Canonical admin metadata defines both top-level ordering and group membership.
2. `AccountMenu` no longer hardcodes `ADMIN_LINKS`; it derives admin destinations from the shared route model.
3. Desktop and mobile admin navigators consume the same route definitions and active-state rules.
4. Verified stale route helpers or local arrays are removed only after callers migrate.

### Task 3.1 implementation subtasks

- [x] introduce canonical admin groups in the shared admin navigation model
- [x] remove hardcoded admin-link arrays from `AccountMenu`
- [x] make sidebar and drawer consume the same grouped route metadata
- [x] remove or simplify stale helper exports once the new route model is the only caller path

### Verify Task 3.1

```bash
npx vitest run tests/admin-shell-and-concierge.test.tsx tests/site-shell-composition.test.tsx tests/shell-navigation-model.test.ts src/lib/shell/shell-navigation.test.ts
```

---

## Task 3.2 — Converge shipped desktop and mobile admin navigation behavior

**What:** Turn the current desktop-only production shell plus isolated mobile drawer component into one shipped, responsive admin-navigation experience.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/admin/layout.tsx` |
| **Modify** | `src/components/admin/AdminSidebar.tsx` |
| **Modify** | `src/components/admin/AdminDrawer.tsx` |
| **Modify** | `tests/browser-ui/admin-shell-responsive.spec.ts` |
| **Modify if needed** | `tests/ux-layout-navigation.test.tsx` |
| **Spec** | §2, §3.4, §3.7, `RNQ-020`, `RNQ-024`, `RNQ-025`, `RNQ-050` through `RNQ-055`, `RNQ-080`, `RNQ-081`, `RNQ-095` |

### Task 3.2 outcomes

1. Desktop and mobile admin shells are both real shipped experiences, not a mix of mounted and unmounted components.
2. Mobile admin routes are reachable through a mounted navigator on every admin page.
3. Deep-route active state stays truthful for desktop and mobile.
4. Browser coverage describes the real responsive shell, not earlier preview-era assumptions.

### Task 3.2 implementation subtasks

- [x] mount the chosen mobile admin navigator in the shared admin layout
- [x] keep focus trap, Escape close, backdrop dismiss, and route-change close behavior working end to end
- [x] ensure deep routes highlight their owning workspace on both desktop and mobile
- [x] update responsive shell tests to the converged shipped behavior in the same change

### Verify Task 3.2

```bash
npx playwright test tests/browser-ui/admin-shell-responsive.spec.ts
```

---

## Task 3.3 — Align admin surfaces to the live theme system

**What:** Stop defining admin chrome through borrowed `jobs-*` semantics and move admin surface styling onto named, governed primitives that still flow through the existing theme runtime.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/admin/AdminSection.tsx` |
| **Modify** | `src/components/admin/AdminCard.tsx` |
| **Modify** | `src/components/admin/AdminSidebar.tsx` |
| **Modify** | owned admin or operational CSS partition under `src/app/styles/` |
| **Modify if needed** | `tests/theme-governance-qa.test.ts`, relevant component tests |
| **Spec** | §2, §3.4, §5, `RNQ-024`, `RNQ-025`, `RNQ-095` |

### Task 3.3 outcomes

1. Admin chrome and admin content primitives no longer depend on `jobs-hero-surface` or `jobs-panel-surface` naming.
2. Theme state remains driven entirely by `ThemeProvider`, manifest-backed controls, and existing UI commands.
3. Admin gains an owned semantic surface model or neutral operational primitives that can be tested and evolved deliberately.
4. Desktop and mobile admin chrome remain legible across supported themes, density settings, and contrast states.

### Task 3.3 implementation subtasks

- [x] introduce named admin or neutral operational surface primitives in an owned CSS partition
- [x] migrate `AdminSection`, `AdminCard`, and admin navigation chrome onto those primitives
- [x] preserve theme-control behavior through `AccountMenu` and `ThemeProvider`
- [x] extend theme-governance tests if Sprint 3 creates a new first-class admin surface family

### Verify Task 3.3

```bash
npx vitest run src/components/ThemeProvider.test.tsx tests/theme-governance-qa.test.ts
```

---

## Task 3.4 — Close stale coverage and artifact drift around the converged shell

**What:** Expand regression coverage and source audits so navigation drift becomes hard to reintroduce after the route model converges.

| Item | Detail |
| --- | --- |
| **Modify** | `tests/browser-ui/admin-jobs.spec.ts` |
| **Modify** | `tests/browser-ui/admin-shell-responsive.spec.ts` |
| **Modify** | `tests/admin-shell-and-concierge.test.tsx` |
| **Modify** | `tests/browser-ui/README.md` |
| **Modify** | spec and audit docs under `docs/_specs/role_nav_qa_refactor/` |
| **Spec** | §3.7, §4, §5, `RNQ-025`, `RNQ-080` through `RNQ-095` |

### Task 3.4 outcomes

1. Browser and unit tests prove desktop and mobile route truth from the same canonical model.
2. Browser and source tests no longer assert preview labels, bottom navigation, or other removed admin-shell concepts.
3. Admin-jobs browser coverage remains focused on access, capability truth, and responsive list behavior while the shell converges around it.
4. Spec and audit docs describe the live current state and the intended Sprint 3 target without drift.

### Task 3.4 implementation subtasks

- [x] add regression checks for account-menu/admin-route parity
- [x] add regression checks for deep-route active state and mounted mobile navigator behavior
- [x] remove stale preview-era and unmounted-drawer assumptions where Sprint 3 changes product behavior
- [x] update the sprint index and related audits when the shipped shell changes

### Verify Task 3.4

```bash
npx vitest run tests/admin-shell-and-concierge.test.tsx tests/ux-layout-navigation.test.tsx tests/jobs-system-dashboard.test.ts
npx playwright test tests/browser-ui/admin-shell-responsive.spec.ts tests/browser-ui/admin-jobs.spec.ts
```

---

## Out Of Scope For Sprint 3

1. Widening admin-route access beyond `ADMIN`.
2. Reworking self-service `/jobs` authorization or signed-in job capability policy.
3. Replacing server-owned admin analytics summaries with client-owned computation.
4. Promoting hidden secondary routes such as attribution or local workspace filters into top-level global navigation without a separate ownership decision.
5. General admin-dashboard content reshaping beyond the changes required to keep navigation truthful and theme-safe.

---

## Sprint 3 Verification Bundle

Run this bundle before marking Sprint 3 complete:

```bash
npm run typecheck
npx vitest run tests/admin-shell-and-concierge.test.tsx tests/site-shell-composition.test.tsx tests/shell-navigation-model.test.ts src/lib/shell/shell-navigation.test.ts tests/ux-layout-navigation.test.tsx tests/jobs-system-dashboard.test.ts tests/theme-governance-qa.test.ts
npx playwright test tests/browser-ui/admin-shell-responsive.spec.ts tests/browser-ui/admin-jobs.spec.ts
npm run build
```

---

## Completion Checklist

- [x] one canonical admin route model drives shell, account, desktop admin, and mobile admin navigation
- [x] the shipped mobile admin shell includes a real mounted navigator with route parity and focus-safe behavior
- [x] admin chrome no longer depends on borrowed `jobs-*` semantic surface names
- [x] stale preview and bottom-nav assumptions are removed from tests and docs
- [x] desktop and mobile browser coverage describe the real shipped admin shell
- [x] the Sprint 3 verification bundle passes

---

## Sprint 3 Exit Criteria

Sprint 3 is complete only when the repository has one truthful answer to all of the following:

1. where admin workspace routes are defined and grouped
2. how account-menu admin links relate to desktop and mobile admin navigation
3. what desktop and mobile admin navigation look like in the shipped product
4. how admin surfaces participate in the live theme system without borrowing `jobs-*` ownership forever
5. how browser, unit, and source-level tests would detect route, responsive-shell, or theme-surface drift immediately

If route exposure, grouped admin navigation, mobile admin-shell behavior, and admin-surface theming still each have separate local truths, Sprint 3 is not complete.