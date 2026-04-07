# Sprint 0 - Baseline Audit, Route Contract, And Acceptance Gates

> **Status:** Completed
> **Goal:** Freeze the current mobile route-family authority map, convert the audit findings into implementation boundaries, and define the acceptance matrix and regression harness plan before code changes begin.
> **Spec ref:** `MSR-001`, `MSR-010` through `MSR-050`, `MSR-070` through `MSR-090`, `MSR-120` through `MSR-130`
> **Prerequisite:** None

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_refactor/mobile-surface-density-and-route-remediation/spec.md` | governing contract for the mobile remediation program |
| `docs/_qa/MOBILE_ROUTE_SWEEP.md` | route-family audit, route matrix, and current priority ordering |
| `docs/_qa/MOBILE_SCREENSHOT_AUDIT.md` | screenshot-derived evidence and shared root-cause mapping |
| `src/app/styles/foundation.css` | token and spacing authority for shared mobile primitives |
| `src/app/styles/chat.css` | selector authority for chat, composer, and floating-shell behavior |
| `src/app/styles/shell.css` | shell-level route framing and navigation behavior |
| `src/app/styles/admin.css` | admin density and route-shell selectors |
| `src/components/AppShell.tsx` | shared shell container for route-level bottom clearance and chrome relationships |
| `src/frameworks/ui/FloatingChatFrame.tsx` and `src/frameworks/ui/FloatingChatLauncher.tsx` | floating-chat structure and launcher ownership |
| `src/components/admin/AdminStatusCounts.tsx` and `src/components/admin/AdminDetailShell.tsx` | shared admin list/detail primitives implicated by the audit |
| `tests/browser-fab-mobile-density.test.tsx` | existing compact/mobile browser coverage for the chat surface |
| `tests/browser-ui/admin-shell-responsive.spec.ts` | existing admin shell responsive coverage |
| `tests/browser-ui/home-shell-header.spec.ts` | existing shell and header mobile coverage for home and library routes |

---

## Task 0.1 - Freeze The Current Route-Family Authority Map

**What:** Convert the route sweep into a concrete ownership map so later sprints change shared primitives deliberately instead of rediscovering where each defect lives.

| Route family | Current structural owner | Current style owner | Verified defect pattern |
| --- | --- | --- | --- |
| Embedded and floating chat | `ChatContentSurface.tsx`, `ChatInput.tsx`, `FloatingChatFrame.tsx`, `FloatingChatLauncher.tsx` | `chat.css`, `foundation.css` | oversized composer, helper-copy persistence, chip density, launcher collision |
| Public discovery shelves | route files under `src/app/library` and `src/app/journal` plus shared listing components | `foundation.css`, route-local Tailwind, shell selectors | tall cards, generous insets, weak content density |
| Public reading routes | route files under `src/app/library/[document]/[section]` and `src/app/journal/[slug]` | shared content styles plus route-local framing | over-tall header stacks and metadata bands |
| Signed-in workspaces | `JobsWorkspace.tsx`, `ProfileSettingsPanel.tsx`, `ReferralsWorkspace.tsx` | shared tokens plus component-local utility spacing | stacked desktop panels, long-field overflow, weak sequence |
| Admin overview and list routes | `AdminSection.tsx`, `AdminCard.tsx`, `AdminStatusCounts.tsx`, route files under `src/app/admin` | `admin.css`, `foundation.css`, route-local utilities | too much pre-data chrome, tab/filter overflow, count-card density |
| Admin detail and editorial routes | `AdminDetailShell.tsx` and detail route pages | `admin.css` plus route-local structure | desktop inspector stacking, payload overflow, overly long edit surfaces |

### Required output

1. Record this ownership map in the sprint issue or implementation kickoff note.
2. Use this map to reject route-local hacks when a shared primitive can solve the defect.
3. Tag the genuine route-specific outliers: `/admin/system`, `/admin/journal/[id]`, `/referrals`, `/admin/affiliates`, and `/journal/[slug]`.

---

## Task 0.2 - Define The Mobile Acceptance Matrix

**What:** Freeze the exact mobile thresholds each later sprint must satisfy.

### Viewport matrix

| Viewport | Purpose | Minimum gate |
| --- | --- | --- |
| `390x844` | primary acceptance baseline | every P0 and P1 route family must pass here |
| `430x932` | large-phone validation | compact mode still feels authored, not sparse |
| `360x800` | lower-bound sanity | no critical overflow or unreachable controls |

### Route-family gates

| Route family | Required acceptance outcome |
| --- | --- |
| Home and floating chat | transcript or core content retains clear visual ownership; idle composer does not dominate the viewport |
| Public discovery routes | at least one full content item plus a visible continuation cue is present above the fold |
| Public reading routes | the user reaches real reading content within one short header stack |
| Auth, status, and landing routes | page title and primary CTA are both visible without scrolling |
| Signed-in workspaces | primary summary and first working surface appear inside the first viewport |
| Admin list routes | the first actual record or queue entry appears inside the first viewport |
| Admin detail routes | status, primary action area, and the first editable or reviewable field appear inside the first viewport |

### Global gates

1. `document.documentElement.scrollWidth === window.innerWidth` on mobile-critical routes unless a deliberate horizontal container is under test.
2. No floating launcher may overlap content cards, body copy, or primary buttons.
3. No route may expose duplicate summary bands on mobile unless one collapses behind an explicit disclosure.

---

## Task 0.3 - Define The Shared Regression Harness

**What:** Specify the shared test helpers and evidence structure that later sprints will add.

### Planned test helpers

| Planned helper | Purpose |
| --- | --- |
| `tests/browser-ui/_shared/mobileRouteAssertions.ts` | centralize no-overflow, viewport-occupancy, and floating-clearance assertions |
| `tests/browser-ui/_shared/mobileScreenshotRoutes.ts` | store the route list and naming contract for screenshot coverage |
| `tests/browser-ui/_shared/mobileViewportFixtures.ts` | standardize `390x844`, `430x932`, and `360x800` coverage |

### Planned assertion families

1. first-viewport occupancy for home, floating chat, admin list, and admin detail entry states
2. no-horizontal-overflow assertions for `/library`, `/referrals`, `/admin`, `/admin/leads`, `/admin/system`, and `/admin/journal/[id]`
3. launcher-clearance assertions for non-home routes with floating chat
4. screenshot capture naming that groups evidence by route family rather than by ad hoc file name

---

## Task 0.4 - Freeze Sprint Boundaries And File Ownership

**What:** Prevent scope drift by assigning file families to the correct sprint before implementation starts.

| Sprint | Primary file families | Non-goals |
| --- | --- | --- |
| 1 | `foundation.css`, `chat.css`, `shell.css`, `AppShell.tsx`, floating-chat components, home route, library index | public reading and admin route redesign |
| 2 | `src/app/login`, `src/app/register`, `src/app/access-denied`, `src/app/r/[code]`, `src/app/library/[document]/[section]`, `src/app/journal`, `PublicJournalPages.tsx` | admin routes and workspace routes |
| 3 | `src/app/jobs`, `src/app/profile`, `src/app/referrals`, `src/app/admin`, admin list routes, shared admin list primitives | admin detail shell redesign |
| 4 | `AdminDetailShell.tsx`, admin detail routes, editorial/prompt editors, payload/transcript inspectors | broader public route changes |
| 5 | browser tests, screenshot coverage, QA evidence refresh | major UI redesign work |

---

## Task 0.5 - Baseline Verification Gate

**What:** Run the current quality bar before implementation so regressions have a stable comparison point.

### Required commands

1. `npm run typecheck`
2. `npm run lint`
3. `npm exec vitest run tests/browser-fab-mobile-density.test.tsx tests/browser-ui/admin-shell-responsive.spec.ts tests/browser-ui/home-shell-header.spec.ts tests/browser-ui/jobs-page.spec.ts tests/browser-ui/admin-jobs.spec.ts`

### Baseline evidence to retain

1. current screenshots or written findings for `/`, `/library`, `/admin`, `/admin/leads`, `/admin/system`, and `/admin/journal/[id]`
2. current route matrix in `docs/_qa/MOBILE_ROUTE_SWEEP.md`
3. any current-browser failure notes that would otherwise be lost when fixes begin

---

## Sprint 0 Exit Criteria

1. The route-family authority map is frozen in writing.
2. The acceptance thresholds are explicit enough to reject ambiguous fixes.
3. The shared regression harness plan exists before any UI code changes begin.
4. Each later sprint has a clear file-ownership boundary.
5. The baseline test and evidence set is recorded.
