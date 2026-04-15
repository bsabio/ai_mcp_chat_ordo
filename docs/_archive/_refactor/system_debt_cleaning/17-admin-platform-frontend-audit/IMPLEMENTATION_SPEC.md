# Admin Platform Responsive Implementation Spec

Date: 2026-03-29

Purpose:

Translate the audit findings into an implementation contract that is explicit about desktop and mobile behavior for every live admin route family.

## Scope

This spec covers:

1. Admin shell navigation and route parity
2. Desktop and mobile layout requirements for the admin dashboard
3. Desktop and mobile layout requirements for journal-admin list and detail routes
4. Exposure rules for placeholder admin routes
5. Regression coverage required before the responsive refactor is considered complete

This spec does not attempt to redesign the full admin information architecture from scratch. It defines the minimum contract the current system must satisfy to stop regressing across breakpoints.

## Shared Contract

### Navigation

1. Desktop sidebar and mobile bottom navigation must derive from one admin route definition source.
2. The admin route model must include route ID, href, display label, short mobile label, icon token, and status.
3. Route status must be represented in both desktop and mobile navigation.
4. Placeholder routes may remain in navigation only if they are visibly marked as preview surfaces.

### Scroll and shell behavior

1. Admin routes must have one documented scroll owner.
2. Sticky shell elements may not create ambiguous nested scrolling on mobile.
3. Fixed mobile navigation must reserve only the space needed for safe-area compliance and tap targets.
4. Desktop shell surfaces must avoid spending large amounts of width on placeholder-only content.

### Visual vocabulary

1. Admin uses one product vocabulary: Admin, Dashboard, Journal, Users, System, Leads.
2. Avoid user-facing labels like operator shell or journal workspace in primary shell chrome.
3. Editorial styling belongs to content preview and content body presentation, not the admin workspace container.

## Route Requirements

### `/admin`

Desktop requirements:

1. Sidebar remains visible and lists every admin destination in one consistent order.
2. Dashboard cards should create a useful at-a-glance summary, not a sparse placeholder field.
3. Main content width should emphasize system health, lead queue, and next-action summaries.

Mobile requirements:

1. Bottom navigation exposes the same route set as desktop.
2. The first screen must show the dashboard heading and the first card content without the dock visually dominating the page.
3. The dock must preserve comfortable thumb targets while staying lighter than the primary content.

### `/admin/journal`

Desktop requirements:

1. The page must read as part of Admin rather than as a separate editorial application.
2. Filters, counts, and inventory should align with the same shell and panel grammar as the dashboard.
3. Tables may be used, but the primary interaction hierarchy must remain easy to scan.

Mobile requirements:

1. Inventory browsing should prefer stacked rows or compact cards for primary tasks.
2. Horizontal table scrolling may exist as a fallback, but it should not be the only viable browsing pattern.
3. Filters must remain tappable and legible without excessive vertical fragmentation.

### `/admin/journal/[id]`

Desktop requirements:

1. The main editing column and supporting rail should remain visually distinct.
2. Metadata, workflow, draft body, hero assets, artifacts, and revisions should feel like one admin tool system.
3. Repeated form controls should be built from shared admin primitives.

Mobile requirements:

1. Panels stack in a predictable order: core edit actions first, supporting assets and history after.
2. Workflow actions and save controls must remain reachable without clipped buttons or accidental dock overlap.
3. Hero images, artifacts, and revisions must remain readable without forcing pinch-zoom behavior.

### `/admin/users`, `/admin/system`, `/admin/leads`

Desktop requirements:

1. If these surfaces remain placeholders, they must be explicitly marked as preview routes in navigation and page framing.
2. Placeholder copy must not consume disproportionate shell real estate without supporting context.

Mobile requirements:

1. Preview state must remain visible in the mobile route affordance.
2. Placeholder screens must still feel intentional rather than broken or abandoned.

## Route Model

The admin route source should represent at least these entries:

1. Dashboard: live
2. Users: preview
3. System: preview
4. Journal: live
5. Leads: preview

The implementation should treat route status as product metadata rather than a styling afterthought.

## Test Requirements

### Unit and component coverage

1. Assert desktop and mobile navigation arrays are identical in route membership and order.
2. Assert preview-status metadata is exposed by the shared route model.
3. Assert mobile navigation includes every admin destination, including Leads.
4. Assert dashboard shell copy and labels do not drift back to conflicting vocabulary.

### Browser coverage

1. Desktop smoke: authenticated admin can load `/admin`, see the full sidebar route set, and navigate to one preview route.
2. Mobile smoke: authenticated admin can load `/admin`, see the full bottom route set, and navigate to one preview route.
3. Responsive smoke should validate route parity and visible shell stability, not just status codes.

## Phased Delivery

### Phase 1

1. Introduce shared admin route definitions.
2. Refactor desktop and mobile nav to consume them.
3. Add parity and preview-status regression tests.

### Phase 2

1. Normalize desktop and mobile shell spacing.
2. Reduce mobile dock visual weight.
3. Formalize one scroll-owner contract.

### Phase 3

1. Move journal-admin container styling onto the admin workspace system.
2. Replace repeated form and panel styling with shared admin primitives.
3. Improve mobile journal list and detail layouts.

### Phase 4

1. Replace or demote placeholder admin routes as real operator surfaces land.
2. Remove any remaining IA mismatch between account menu, admin shell, and route helpers.

## Completion Criteria

This refactor is not complete until all of the following are true:

1. Desktop and mobile admin navigation are generated from one route model.
2. Desktop and mobile expose the same destination set.
3. Preview route status is visible on both desktop and mobile.
4. At least one live browser smoke exists for desktop and one for mobile admin shell behavior.
5. Journal-admin no longer reads like a different application mounted under an admin URL.
