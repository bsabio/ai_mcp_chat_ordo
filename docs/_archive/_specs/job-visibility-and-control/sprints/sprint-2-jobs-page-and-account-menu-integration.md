# Sprint 2 — Jobs Page And Account Menu Integration

> **Goal:** Add a first-class `/jobs` route, wire it into the account menu, and render a real-time operational Jobs page for signed-in users.
> **Parent spec:** [Job Visibility And Control](../spec.md) §3.3 through §3.5, §6 Sprint 2
> **Prerequisite:** Sprint 1 and TD-A complete

---

## Available Assets

| Asset | Verified detail |
| --- | --- |
| `src/components/AccountMenu.tsx` | Signed-in menu items are data-driven through `resolveAccountMenuRoutes(user)`. |
| `src/lib/shell/shell-navigation.ts` | `ACCOUNT_MENU_ROUTE_IDS` currently contains only `"profile"`; `resolveAccountMenuRoutes()` simply maps those ids through route definitions. |
| `src/app/profile/page.tsx` | Existing signed-in account route proves the auth/redirect pattern for workspace/account pages. |
| `src/components/profile/ProfileSettingsPanel.tsx` | Deferred-job notification settings already live in the account area and should remain complementary to, not inside, the Jobs page. |
| New Sprint 1 `/api/jobs*` routes | Provide the user-scoped data feed for page load and SSE updates. |

---

## Tasks

### 1. Add `/jobs` as a signed-in account/workspace route

Add a new shell route definition and include it in the account menu.

Requirements:

- route id: `jobs`
- label: `Jobs`
- href: `/jobs`
- visible for signed-in roles that can own deferred jobs

Do not bury Jobs inside `/profile`; it should feel like a first-class workspace destination even though it is reachable from the account menu.

Verify: keep auth/redirect parity with `npx vitest run src/app/profile/page.test.tsx`, then add focused navigation tests alongside the new route/menu work and run `npx vitest run src/app/jobs/**/*.test.tsx src/components/**/*.test.tsx`

### 2. Build the Jobs page

Create the page and its supporting components.

The page must render:

- Active jobs section
- Recent jobs section
- selected-job detail view or drawer
- current work label and progress meter
- conversation link-back
- authorized actions

The page should subscribe to `/api/jobs/events` for real-time updates.

The selected-job detail view must be able to load durable event history on demand from the Sprint 1 detail contract rather than depending only on events observed since page mount.

Verify: add colocated page tests under `src/app/jobs/` and run `npx vitest run src/app/jobs/**/*.test.tsx`

### 3. Add browser verification

Add browser-level validation covering:

- account menu navigation to Jobs
- real-time update of at least one active job row
- link-back from Jobs to the related conversation or artifact
- detail view still shows event history after a page reload

Verify: add `tests/browser-ui/jobs-page.spec.ts` alongside the existing browser UI specs, then run `npx playwright test tests/browser-ui/jobs-page.spec.ts tests/browser-ui/deferred-blog-jobs.spec.ts`

---

## Completion Checklist

- [ ] `/jobs` route added and reachable from account menu
- [ ] Jobs page renders active and recent job sections
- [ ] Jobs page updates in real time from durable events
- [ ] selected-job detail view loads durable event history
- [ ] browser verification added

## QA Deviations

- None yet.
