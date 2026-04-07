# Sprint 3 - Workspace And Admin List Compaction

> **Status:** Completed
> **Goal:** Rebuild signed-in workspace and admin overview/list routes around mobile-first scan order, compact summaries, and deliberate overflow behavior.
> **Spec ref:** `MSR-015` through `MSR-018`, `MSR-060` through `MSR-065`, `MSR-070` through `MSR-103`, `MSR-120`
> **Prerequisite:** Sprint 2

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/app/jobs/page.tsx` and `src/components/jobs/JobsWorkspace.tsx` | signed-in workspace with hero, metrics, and master/detail pressure |
| `src/app/profile/page.tsx` and `src/components/profile/ProfileSettingsPanel.tsx` | settings route with wrap-heavy panel stacks |
| `src/app/referrals/page.tsx` and `src/components/referrals/ReferralsWorkspace.tsx` | analytics and share route with QR, links, and activity feed |
| `src/app/admin/page.tsx` | admin overview route |
| `src/app/admin/leads/page.tsx` | confirmed P0 admin list hotspot |
| `src/app/admin/affiliates/page.tsx` | mixed analytics, cards, tables, and exception-review route |
| `src/app/admin/conversations/page.tsx` | multi-view list and review route |
| `src/app/admin/jobs/page.tsx` | queue route with metrics, filters, and bulk actions |
| `src/app/admin/journal/page.tsx` and `src/app/admin/journal/attribution/page.tsx` | wide inventory and analytics table routes |
| `src/app/admin/users/page.tsx`, `src/app/admin/prompts/page.tsx`, `src/app/admin/system/page.tsx` | list, card-grid, and diagnostics outlier routes |
| `src/components/admin/AdminSection.tsx`, `src/components/admin/AdminCard.tsx`, `src/components/admin/AdminStatusCounts.tsx` | shared admin overview and metric primitives |
| `src/app/styles/admin.css` and `src/app/styles/foundation.css` | admin and shared density selectors |
| `tests/browser-ui/admin-shell-responsive.spec.ts`, `tests/browser-ui/jobs-page.spec.ts`, `tests/browser-ui/admin-jobs.spec.ts` | existing browser coverage touching these families |

---

## Task 3.1 - Create Reusable Compact Summary And Filter Patterns

**What:** Replace repeated wrap-heavy summary rows and uncontrolled filter stacks with shared mobile patterns.

**Modify:** `src/components/admin/AdminStatusCounts.tsx`, shared admin filter or tab components, `src/components/admin/AdminSection.tsx`, `src/components/admin/AdminCard.tsx`, `src/components/jobs/JobsWorkspace.tsx`, `src/components/referrals/ReferralsWorkspace.tsx`, or a new shared compact-summary primitive, plus `src/app/styles/admin.css` and `src/app/styles/foundation.css`

### Task 3.1 Required Changes

1. define one compact mobile metric pattern for counts and status summaries
2. define one mobile overflow pattern for tabs and filter groups
3. ensure summary rows do not duplicate themselves before data on phones
4. extract or introduce a shared compact-summary primitive if the existing admin components cannot be cleanly reused by jobs and referrals

### Task 3.1 Acceptance

1. metric rows no longer degrade into cramped wrap-heavy bands
2. tab and filter controls remain reachable and readable on phones
3. the same compact summary contract can be applied across `/jobs`, `/referrals`, `/admin`, and `/admin/leads` without forking the design language

---

## Task 3.2 - Compact Signed-In Workspace Routes

**What:** Give `/jobs`, `/profile`, and `/referrals` a deliberate mobile sequence instead of equal-weight stacked panels.

**Modify:** `src/app/jobs/page.tsx`, `src/components/jobs/JobsWorkspace.tsx`, `src/app/profile/page.tsx`, `src/components/profile/ProfileSettingsPanel.tsx`, `src/app/referrals/page.tsx`, `src/components/referrals/ReferralsWorkspace.tsx`

### Task 3.2 Required Changes

1. reduce hero and summary weight before the first active workspace surface
2. sequence referral summary, share tools, QR, and activity so the route reads as one mobile workflow
3. make long links, codes, and share strings overflow-safe without sacrificing copyability
4. keep profile settings readable while reducing panel repetition and stacked CTA weight

### Task 3.2 Acceptance

1. each workspace exposes its first meaningful task surface inside the initial viewport
2. `/referrals` no longer feels like multiple dashboards stacked together on a phone
3. no long field or link creates accidental horizontal overflow

---

## Task 3.3 - Compact Admin Overview And Queue Entry Routes

**What:** Reduce pre-data chrome and sharpen scan order on `/admin`, `/admin/leads`, `/admin/jobs`, and adjacent queue-style routes.

**Modify:** `src/app/admin/page.tsx`, `src/app/admin/leads/page.tsx`, `src/app/admin/jobs/page.tsx`, shared admin overview and list primitives

### Task 3.3 Required Changes

1. shorten hero framing on admin overview routes
2. eliminate duplicate summary bands on mobile
3. surface the first actual queue record inside the initial viewport
4. move secondary controls behind clearer mobile patterns where appropriate

### Task 3.3 Acceptance

1. `/admin/leads` and `/admin/jobs` stop spending the first screen on repeated metrics and filters
2. `/admin` overview surfaces urgent operational state faster
3. mobile scan order is consistent across queue-style routes

---

## Task 3.4 - Rebuild Wide Admin List And Diagnostics Surfaces

**What:** Apply deliberate mobile patterns to the outlier admin list routes and diagnostics views.

**Modify:** `src/app/admin/affiliates/page.tsx`, `src/app/admin/conversations/page.tsx`, `src/app/admin/journal/page.tsx`, `src/app/admin/journal/attribution/page.tsx`, `src/app/admin/users/page.tsx`, `src/app/admin/prompts/page.tsx`, `src/app/admin/system/page.tsx`

### Task 3.4 Required Changes

1. choose card transform or governed horizontal scroll for each wide data surface
2. keep diagnostics, environment values, and tool lists overflow-safe on `/admin/system`
3. reduce card-grid padding and badge clutter on `/admin/prompts`
4. simplify the combined counts, pills, forms, and tables mix on `/admin/affiliates`

### Task 3.4 Acceptance

1. no route exhibits accidental horizontal overflow at `390x844`
2. each admin list route shows real working data within the first viewport
3. diagnostics and monospace-heavy routes remain usable on phones

---

## Task 3.5 - Add Focused Mobile Assertions For Workspace And List Routes

**What:** Strengthen the regression surface for the families changed in Sprint 3.

**Modify:** `tests/browser-ui/mobile-workspace-admin-lists.spec.ts` for `/jobs`, `/profile`, `/referrals`, `/admin`, `/admin/leads`, `/admin/jobs`, `/admin/system`, and one representative wide-table route

### Task 3.5 Minimum Assertions

1. no horizontal overflow on the route root
2. the first real record, task, or data block appears in the first viewport
3. tabs, filters, and summary rows use the intended compact model

---

## Verification

1. `npm run typecheck`
2. `npm run lint`
3. `npm run lint:css`
4. `npm run spacing:audit`
5. `npx playwright test tests/browser-ui/mobile-workspace-admin-lists.spec.ts tests/browser-ui/admin-shell-responsive.spec.ts tests/browser-ui/jobs-page.spec.ts tests/browser-ui/admin-jobs.spec.ts`
6. focused mobile browser evidence for `/jobs`, `/profile`, `/referrals`, `/admin`, `/admin/leads`, `/admin/system`, and one wide-table admin route

## Sprint 3 Exit Criteria

1. Signed-in workspace routes now expose the first useful task surface inside the first viewport.
2. Admin overview and list routes no longer front-load repeated chrome before data.
3. Wide data and diagnostics routes use deliberate overflow behavior.
4. Focused mobile assertions exist for the changed workspace and list families.
