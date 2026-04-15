# Admin Platform Frontend Audit

Date: 2026-03-29

Scope:

1. Admin routes
2. Jobs route
3. Admin journal routes
4. Shared shell composition
5. Public-route runtime noise that affects perceived UI quality

Method:

This audit was repeated three times using different lenses:

1. Pass 1: static code and design-system review
2. Pass 2: runtime and browser validation against the local Next.js server
3. Pass 3: implementation-quality review for duplication, placeholders, framework bypasses, and suspicious drift

Evidence sources:

1. User screenshots showing the broken admin mobile surface and a more polished jobs surface
2. Source inspection across `src/app/admin`, `src/components/admin`, `src/app/admin/journal`, `src/components/jobs`, `src/components/journal`, `src/components/AppShell.tsx`, and shared CSS
3. Browser checks against `http://localhost:3001`
4. Existing focused test passes already run for shell and admin coverage

## Executive Summary

The admin platform is not one coherent product surface yet. It is currently a partial shell sitting on top of two different visual systems:

1. a jobs-inspired operational skin for the dashboard shell
2. a separate editorial shell for the admin journal

That split is the root of most visible problems.

The jobs page looks substantially more complete because it has a real surface model, a real component system, and clearer information hierarchy. The admin dashboard and secondary admin routes look broken because they are thin placeholders inside a shell that borrows jobs classes without owning a true admin design system. The journal admin pages then break away from that shell entirely and re-enter the editorial/public page language.

The user-visible result is exactly what the screenshots show:

1. a large, awkward mobile bottom dock with oversized active states
2. inconsistent shell treatment between admin, jobs, and journal-admin routes
3. scrolling and layout behavior that feels frozen or structurally confused
4. multiple pages that are technically routed but not meaningfully implemented

## Severity Summary

P0 findings:

1. Admin shell scroll ownership is contradictory and fragile.
2. Admin navigation is duplicated, incomplete, and visually unstable on mobile.
3. Most non-journal admin routes are placeholders presented as live product surfaces.
4. Admin journal does not use the admin design language and behaves like a second app.

P1 findings:

5. Admin primitives are coupled to jobs styling instead of a dedicated admin system.
6. Route naming and information architecture are inconsistent across admin surfaces.
7. Admin journal detail pages bypass shared framework primitives and repeat form styling inline.
8. Public routes emit avoidable unauthorized API noise that degrades perceived frontend quality.

P2 findings:

9. Compile/lint hygiene drift is visible in admin journal styles.
10. Jobs is higher quality than admin, but its patterns are not extracted into reusable platform primitives.

## Findings

### 1. P0: Admin shell scroll ownership is contradictory and fragile

Evidence:

1. `src/components/AppShell.tsx:36-52` declares admin as a workspace route with `data-shell-scroll-owner="document"` and `data-shell-route-mode="workspace"`.
2. `src/app/admin/layout.tsx:16-17` creates an inner `main` scroll region with `overflow-y-auto` and `data-admin-scroll-region="true"`.
3. `src/app/admin/layout.tsx:23` always mounts the mobile bottom nav outside that scroll region.

Why this is a problem:

1. The shell says the document owns scrolling.
2. The admin layout then creates an inner scrolling pane.
3. The fixed bottom dock is mounted outside the pane, so spacing, viewport height, and focus behavior depend on two competing scroll models.

This is the most plausible root cause for the “frozen / doesn’t scroll” complaint. Even when the page technically scrolls, the ownership model is unclear enough that the interface feels trapped inside a pane.

Recommendation:

1. Choose one scroll owner for admin routes.
2. If admin is a workspace app, keep the shell in workspace mode and make the content pane the only scrollable region with an explicit height contract.
3. If admin should be normal document flow, remove the nested scroll pane and let the document own scrolling end-to-end.
4. Do not keep both models active.

### 2. P0: Admin navigation is duplicated, incomplete, and visually unstable on mobile

Evidence:

1. `src/components/admin/AdminBottomNav.tsx:13-17` hard-codes four mobile items: Dashboard, Users, System, Journal.
2. `src/components/admin/AdminBottomNav.tsx:26` uses a fixed `sm:hidden` dock.
3. `src/components/admin/AdminBottomNav.tsx:30` forces a four-column grid.
4. `src/components/admin/AdminSidebar.tsx:14-19` hard-codes a different nav set that includes Leads.
5. `src/components/admin/AdminSidebar.tsx:28` also reuses jobs styling for the sidebar container.
6. `src/lib/shell/shell-navigation.ts` and `src/lib/admin/admin-routes.ts` already define route metadata elsewhere, creating a third source of truth.

Why this is a problem:

1. Desktop and mobile do not expose the same route set.
2. Admin route labels are maintained in multiple places.
3. The active mobile tile turns into a heavy black button that dominates the layout, matching the screenshot.
4. The bottom dock is being treated as a design object instead of a minimal navigation affordance.

Recommendation:

1. Move admin navigation to a single source of truth.
2. Use the same route collection for sidebar and mobile nav.
3. Add Leads to mobile if the route remains live.
4. Reduce mobile nav emphasis: icon-first, shorter labels, lower visual weight, smaller active delta.
5. Consider turning the mobile pattern into a compact segmented dock rather than four equal large buttons.

### 3. P0: Most non-journal admin routes are placeholders presented as live product surfaces

Evidence:

1. `src/app/admin/users/page.tsx:21-24` contains `People surface pending` and explicit placeholder copy.
2. `src/app/admin/system/page.tsx:21-24` contains `System controls pending` and placeholder copy.
3. `src/app/admin/leads/page.tsx:21-24` contains `Lead queue pending` and placeholder copy.

Why this is a problem:

1. These routes are in production navigation.
2. They communicate “feature pending” rather than delivering useful operator value.
3. The platform feels unfinished because the shell promises a workspace that the pages do not deliver.

Recommendation:

1. Either remove these routes from primary admin navigation until they are real, or ship minimal but functional read-only versions.
2. Do not present placeholders as destination-grade pages.
3. If a route must remain, label it explicitly as preview/beta in the IA, not as a finished workspace.

### 4. P0: Admin journal does not use the admin design language and behaves like a second app

Evidence:

1. `src/app/admin/journal/page.tsx:24` renders `shell-page editorial-page-shell`.
2. `src/app/admin/journal/page.tsx:28` titles the page `Journal workspace`, which is separate from `Admin dashboard` and `Admin platform` language.
3. `src/app/admin/journal/[id]/page.tsx:185` also renders `shell-page editorial-page-shell`.

Why this is a problem:

1. The admin dashboard uses jobs-derived admin primitives.
2. The journal admin uses editorial/public shell styling.
3. The operator experience changes visual language mid-journey.

This is the deepest consistency failure in the current implementation. The journal admin is not a section of the admin app. It is a different interface mounted under an admin URL.

Recommendation:

1. Refactor admin journal to use the same admin shell primitives and spacing rules as the rest of admin.
2. Keep editorial content treatment for article preview and article body only, not for the operator workspace container.
3. Split “operator shell” from “editorial preview surface” cleanly.

### 5. P1: Admin primitives are coupled to jobs styling instead of a dedicated admin system

Evidence:

1. `src/app/admin/layout.tsx:16` uses `jobs-page-shell` on the main admin content region.
2. `src/components/admin/AdminSidebar.tsx:28` uses `jobs-panel-surface`.
3. `src/components/admin/AdminCard.tsx:21` uses `jobs-panel-surface`.
4. `src/components/admin/AdminSection.tsx:13` uses `jobs-hero-surface`.

Why this is a problem:

1. Admin currently has no native visual language.
2. Jobs is being used as a styling donor rather than a reusable system.
3. That makes admin feel derivative and brittle.

Recommendation:

1. Extract shared “workspace surface” primitives from jobs into neutral operational classes or components.
2. Let jobs and admin both consume those primitives.
3. Stop importing jobs semantics directly into admin naming.

### 6. P1: Route naming and information architecture are inconsistent

Observed labels in the current implementation:

1. `Admin platform`
2. `Admin dashboard`
3. `Operator shell`
4. `Admin workspace`
5. `Admin journal`
6. `Journal workspace`
7. `Dashboard`
8. `Admin`

Why this is a problem:

1. The product does not have one vocabulary.
2. The same destination is framed as admin, dashboard, workspace, shell, and journal workspace depending on the page.
3. Users cannot build a stable mental model of the product hierarchy.

Recommendation:

1. Standardize the IA language.
2. Suggested pattern:
   - Product area: Admin
   - Section: Dashboard, Journal, Users, System, Leads, Jobs
   - Avoid `operator shell` and `journal workspace` in end-user page titles unless they are internal engineering concepts.

### 7. P1: Admin journal detail pages bypass shared framework primitives and repeat styling inline

Evidence:

1. `src/app/admin/journal/page.tsx:125-126` uses raw `<a href>` links for internal navigation.
2. `src/app/admin/journal/[id]/page.tsx:198`, `299`, `323` use raw `<a href>` links.
3. `src/app/admin/journal/[id]/page.tsx:311` uses raw `<img src>` instead of a shared image primitive.
4. `src/app/admin/journal/[id]/page.tsx:209-237`, `267`, `281`, `285`, `396` repeat the same inline form classes many times.

Why this is a problem:

1. Internal navigation bypasses shared route primitives.
2. Images bypass the framework image path and its optimization/consistency model.
3. Form styling is duplicated instead of abstracted into admin/editorial form controls.

Recommendation:

1. Replace internal anchors with shared navigation primitives where appropriate.
2. Use a consistent image component for managed assets unless there is a clear reason not to.
3. Extract shared admin form-field, panel, and section-row primitives.

### 8. P1: Public routes emit avoidable unauthorized API noise

Evidence:

1. Clean-browser navigation to `/jobs` redirects to `/login`, but the page still logs failed requests for `/api/preferences` and `/api/conversations/active`.
2. Clean-browser navigation to `/journal` also logs failed requests for `/api/preferences` and `/api/conversations/active`.
3. The underlying fetch calls originate from `src/components/ThemeProvider.tsx:134` and `225`, plus global chat hooks using `/api/conversations/active`.

Why this is a problem:

1. Anonymous/public pages are doing authenticated work they cannot complete.
2. This creates noisy console output and unnecessary request churn.
3. It makes the app look unstable even when the UI still renders.

Recommendation:

1. Gate preference and active-conversation fetches behind auth state or tolerant route guards.
2. Public routes should not emit expected 401/404 noise on first paint.

### 9. P2: Compile and lint hygiene drift is already showing in admin journal

Evidence:

1. `src/app/admin/journal/page.tsx:34` triggered a compile-style warning that `bg-foreground/[0.02]` should be normalized to `bg-foreground/2`.
2. `src/app/admin/journal/[id]/page.tsx` repeats `bg-foreground/[0.02]` and `bg-foreground/[0.03]` many times.

Why this matters:

1. These are small issues individually.
2. In aggregate they show the admin journal was assembled rapidly without a stable primitive layer.
3. That is usually correlated with future styling drift.

Recommendation:

1. Normalize the classes.
2. More importantly, remove the need to repeat them through extracted primitives.

### 10. P2: Jobs is stronger than admin, but its patterns are not extracted into reusable platform primitives

Evidence:

1. `src/components/jobs/JobsPagePanel.tsx:345-490` defines a mature shell with hero, section panels, count pills, selected-card states, and detail panel composition.
2. Admin components independently re-wrap these styles instead of consuming a shared workspace system.

Why this matters:

1. Jobs sets the current quality bar for internal product surfaces.
2. Because its visual logic stays local to jobs, the rest of admin cannot stay consistent without copy-pasting classes or coupling to jobs names.

Recommendation:

1. Extract a shared workspace UI kit:
   - page shell
   - hero surface
   - panel surface
   - metric pill
   - status badge
   - empty state
   - sticky detail rail
2. Then recompose jobs and admin from that shared system.

## Suspicious Patterns Worth Tracking

1. `AdminBottomNav` and `AdminSidebar` are manually curated while route definitions also live in `shell-navigation.ts` and `admin-routes.ts`.
2. Admin mobile hides the Leads route entirely, which suggests navigation completeness was not validated across breakpoints.
3. The admin dashboard copy already claims the platform “shares its visual system” with jobs, but the implementation only shares CSS class names, not a true design system.
4. The clean browser could not inspect protected admin pages directly because auth gates redirected to login, so the screenshots remain important evidence for mobile/admin runtime behavior.

## What Looks Solid

1. `src/components/AppShell.tsx` already special-cases admin so the public footer is no longer forced onto admin routes.
2. The jobs page has a coherent hierarchy and can serve as the baseline for an operational surface system.
3. Route-level tests around shell ownership and admin shell composition are already present, which gives a safe path for refactor work.

## Recommended Refactor Plan

### Phase 1: Stabilize the admin shell

1. Choose a single scroll owner for admin.
2. Replace the current mobile dock with a smaller, shared, route-driven nav.
3. Unify sidebar and mobile navigation from one route list.
4. Remove placeholder destinations from navigation or downgrade them to beta/preview.

### Phase 2: Create a shared workspace surface system

1. Extract jobs visual primitives into neutral workspace primitives.
2. Rebuild `AdminSection`, `AdminCard`, and the admin shell to use those primitives by name.
3. Keep jobs and admin as consumers, not styling sources for each other.

### Phase 3: Refactor admin journal into the admin app

1. Move list and detail pages onto the admin workspace shell.
2. Preserve editorial styling only inside content preview/read surfaces.
3. Extract reusable admin form and asset panels.
4. Replace raw internal anchors and images with shared primitives where possible.

### Phase 4: Clean public-route runtime noise

1. Stop authenticated preference/conversation fetches from firing on anonymous/public shells unless needed.
2. Re-run browser QA on `/journal`, `/login`, `/jobs`, and admin-authenticated routes.

## Acceptance Criteria For A “Fixed” Admin Platform

The admin platform should not be considered complete until all of the following are true:

1. Admin routes share one shell, one vocabulary, and one workspace visual system.
2. Mobile and desktop navigation are generated from one route source.
3. No live admin destination is a placeholder-only surface.
4. Journal admin reads as part of admin, not a different product.
5. Scroll ownership is singular and predictable.
6. Public routes no longer spam expected auth failures in the console.

## Final Assessment

The user instinct is correct. These features are not properly implemented as a finished frontend system yet.

The biggest issue is not one broken button or one bad breakpoint. It is that the admin platform currently spans three partially connected ideas:

1. a shell
2. a jobs-inspired internal surface language
3. an editorial journal management interface

Those pieces have not been unified. Until they are, the UI will continue to feel inconsistent, partially broken, and lower quality than the underlying architecture deserves.