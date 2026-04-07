# Sprint 5 - Regression Coverage, Route Evidence, And Release Closeout

> **Status:** Planned
> **Goal:** Add route-level mobile regression coverage, capture before and after evidence, and close the program only when the audited route families satisfy the mobile acceptance contract.
> **Spec ref:** `MSR-065`, `MSR-070` through `MSR-085`, `MSR-120` through `MSR-130`
> **Prerequisite:** Sprint 4

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `tests/browser-fab-mobile-density.test.tsx` | existing floating-chat mobile browser coverage |
| `tests/browser-ui/admin-shell-responsive.spec.ts` | existing admin responsive shell coverage |
| `tests/browser-ui/home-shell-header.spec.ts` | existing home and library header coverage |
| `tests/browser-ui/jobs-page.spec.ts` and `tests/browser-ui/admin-jobs.spec.ts` | current workspace and admin queue coverage |
| `docs/_qa/MOBILE_ROUTE_SWEEP.md` | route matrix to update after remediation |
| `docs/_qa/MOBILE_SCREENSHOT_AUDIT.md` | original screenshot audit for before/after closure |

---

## Task 5.1 - Add Shared Mobile Assertion Utilities

**What:** Land the shared browser helpers defined in Sprint 0 so every route family uses one acceptance grammar.

### Task 5.1 Required Helpers

1. viewport fixtures for `390x844`, `430x932`, and `360x800`
2. no-horizontal-overflow assertion helper
3. first-viewport occupancy helper
4. floating-launcher and floating-composer clearance helper

### Task 5.1 Acceptance

1. new route specs reuse the shared helpers rather than reimplementing one-off assertions
2. the helpers make the mobile acceptance contract visible in code

---

## Task 5.2 - Add Priority Route Screenshot Coverage

**What:** Add or refresh screenshot coverage for the most important audited route families.

### Task 5.2 Required Screenshot Routes

1. `/`
2. `/library`
3. `/journal/[slug]`
4. `/referrals`
5. `/admin`
6. `/admin/leads`
7. `/admin/system`
8. `/admin/journal/[id]`

### Task 5.2 Required Viewports

1. `390x844`
2. `430x932`

### Task 5.2 Acceptance

1. screenshot names are grouped by route family and viewport
2. the suite captures the first state most likely to regress, not only steady-state after scrolling

---

## Task 5.3 - Enforce Overflow And First-Viewport Gates

**What:** Convert the acceptance matrix into route-level pass or fail conditions.

### Task 5.3 Required Gates

1. no accidental horizontal overflow on all P0 and P1 route families
2. first-viewport visibility of the first task, first data, or first reading content on all P0 families
3. no floating-launcher overlap on routes with floating chat
4. admin list routes surface actual data within the first viewport
5. admin detail routes surface status, action, and first field within the first viewport

---

## Task 5.4 - Capture Before And After Evidence And Refresh QA Docs

**What:** Close the loop between diagnosis and remediation.

### Task 5.4 Required Documentation Updates

1. add post-remediation findings to `docs/_qa/MOBILE_ROUTE_SWEEP.md`
2. update `docs/_qa/MOBILE_SCREENSHOT_AUDIT.md` with a short closure note and the surviving risks, if any
3. record before and after screenshots for the routes listed in Task 5.2

### Task 5.4 Acceptance

1. the QA docs no longer read like open investigations with no implementation follow-through
2. residual mobile risks, if any, are clearly enumerated

---

## Task 5.5 - Run Final Quality Gates

**What:** Run the full quality pass required to ship the remediation safely.

### Task 5.5 Required Commands

1. `npm run typecheck`
2. `npm run lint`
3. `npm run lint:css`
4. `npm run spacing:audit`
5. `npm run test:browser-ui`
6. `npx playwright test tests/browser-ui/home-shell-header.spec.ts tests/browser-ui/mobile-home-library-density.spec.ts tests/browser-ui/mobile-public-reading.spec.ts tests/browser-ui/mobile-workspace-admin-lists.spec.ts tests/browser-ui/mobile-admin-detail-editorial.spec.ts tests/browser-ui/admin-shell-responsive.spec.ts tests/browser-ui/jobs-page.spec.ts tests/browser-ui/admin-jobs.spec.ts`
7. any route-screenshot or visual-regression command adopted in this program

### Task 5.5 Final Acceptance

1. no P0 route family remains open
2. no floating-chat route still exhibits collision defects
3. no admin list or detail route has accidental mobile overflow
4. the QA docs reflect the post-fix state rather than only the pre-fix diagnosis

---

## Sprint 5 Exit Criteria

1. Shared mobile assertion utilities exist and are used.
2. Priority route screenshot coverage is in place.
3. The acceptance matrix is enforced in browser coverage.
4. QA docs are refreshed with after-state evidence.
5. Final quality gates pass before release.
