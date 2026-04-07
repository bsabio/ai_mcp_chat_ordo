# Mobile Screenshot Audit

This document captures the mobile issues visible in the four screenshots supplied in chat, cross-referenced against the current mobile implementation in the shell, floating chat surface, and admin workspaces.

Scope notes:

- The screenshots themselves are not stored in the repository, so this audit references them as Image 1 through Image 4.
- The code mapping below is based on the visible UI pattern in each screenshot plus direct inspection of the relevant implementation files and current responsive tests.
- Where the exact route in a screenshot is ambiguous, the diagnosis calls that out explicitly and focuses on the shared failure mode rather than pretending the page identity is certain.

## Executive Summary

See also: `docs/_qa/MOBILE_ROUTE_SWEEP.md` for the route-by-route audit that expands this screenshot-focused document into a full route inventory.

Implementation package: `docs/_refactor/mobile-surface-density-and-route-remediation/` converts these findings into a sprinted remediation plan.

The mobile problems are real and consistent across the product.

The main pattern is not a single broken component. The product is reusing desktop spacing, desktop minimum sizes, and desktop interaction density on narrow screens. That creates four repeated failures:

1. Surfaces are too tall before the user reaches useful controls.
2. Horizontal control groups have no dedicated small-screen overflow strategy.
3. The floating chat composer consumes too much of the viewport once chips, helper text, and shell chrome are stacked together.
4. Current tests verify presence and structure, but they do not verify mobile density, viewport occupancy, or visual overflow.

## Shared Root Causes

### 1. Desktop spacing tokens are carried straight onto mobile

The design tokens keep generous desktop values by default:

- `--space-inset-panel: 1.5rem`
- `--space-section-default: 2rem`
- large radii for chat and admin surfaces
- tall hero and chip sizing for homepage/chat surfaces

Evidence:

- `src/app/styles/foundation.css`
- `src/components/admin/AdminSection.tsx`
- `src/components/admin/AdminCard.tsx`
- `src/frameworks/ui/MessageList.tsx`

Impact:

- Cards become visually expensive on phones.
- Copy wraps into short, awkward lines because the padding eats usable width.
- Users scroll through chrome before they reach actions.

### 2. Minimum widths and minimum heights are too rigid

Several surfaces force a minimum size that is reasonable on desktop but aggressive on 390px-wide mobile layouts.

Evidence:

- `src/components/admin/AdminStatusCounts.tsx` uses `min-w-[5.5rem]` and `text-2xl` counts.
- `src/frameworks/ui/ChatInput.tsx` keeps `min-h-11`, fixed attach/send controls, and a send button with a minimum width.
- `src/frameworks/ui/MessageList.tsx` uses large rounded chips with tall minimum heights for both hero and follow-up suggestions.

Impact:

- Summary cards wrap into cramped or clipped rows.
- Composer controls occupy too much width and height.
- Suggestion chips expand the stack instead of feeling lightweight.

### 3. Mobile overflow behavior is under-designed

The app often uses `flex` and `flex-wrap`, but that is not the same thing as a deliberate mobile overflow model.

Evidence:

- `src/app/admin/leads/page.tsx` renders pipeline tabs in a plain horizontal flex row with no dedicated mobile overflow treatment.
- `src/components/admin/AdminStatusCounts.tsx` wraps metric cards instead of switching layout mode.
- `src/frameworks/ui/MessageList.tsx` wraps hero and follow-up chips instead of switching to a denser or scrollable interaction model.

Impact:

- Layouts do not technically crash, but they still look crowded and unstable.
- Users see clipped, stacked, or overly tall control clusters.
- The visual rhythm degrades even when DOM-level tests still pass.

### 4. The mobile test suite is too structural

Current tests do useful verification, but they stop too early.

Evidence:

- `tests/browser-fab-mobile-density.test.tsx` checks that the floating shell exists, helper copy exists, and chips render.
- `tests/browser-ui/admin-shell-responsive.spec.ts` verifies menu access and the absence of duplicate mobile admin rails.

What is missing:

- viewport occupancy checks
- visual regression or screenshot diff coverage
- no-horizontal-overflow assertions on key admin pages
- mobile-specific checks for tab accessibility, chip wrapping quality, and card density

## Image-by-Image Audit

## Image 1: Narrow Preview Card / Hero-Like Surface

Confidence: medium

The screenshot appears to show a narrow, tall content surface with too much wrapping and too much vertical weight. The exact route is not fully certain from the image alone, but the failure mode matches several shared surfaces in the codebase: hero suggestion frames, preview-style cards, and large admin/content panels.

### Image 1 problems visible in the screenshot

1. The primary card is too tall for a phone-first first impression.
2. Text wraps into short lines, which makes the surface feel cramped instead of editorial.
3. Supporting metadata or chips appear to consume vertical space that should belong to the main action.
4. The surface reads like a desktop card compressed into a narrow column, not a mobile-native composition.

### Image 1 most likely code sources

Primary candidates:

- `src/frameworks/ui/MessageList.tsx`
- `src/components/admin/AdminSection.tsx`
- `src/components/admin/AdminCard.tsx`
- `src/app/styles/foundation.css`

Why these are likely:

- hero and suggestion frames use large padding, large radii, and tall chips
- admin/content surfaces use full panel inset on mobile
- typography and spacing are tuned for visual drama before mobile economy

### Image 1 root cause

The surface is likely inheriting desktop panel inset, generous hero spacing, and large chip or badge treatment without a small-screen compaction rule.

### Image 1 proposed resolution

1. Introduce a dedicated mobile panel density mode for hero and preview-style surfaces at `max-width: 640px`.
2. Reduce panel inset and section gap on mobile for preview cards and hero frames.
3. Reduce mobile title and chip sizes before reducing content width further.
4. Collapse non-critical metadata into a lower-emphasis secondary row or disclosure.
5. If the surface is a preview card, prefer a simpler stacked layout with one dominant title, one short summary, and one action row.

### Image 1 implementation targets

- add mobile overrides in `src/app/styles/foundation.css` for panel inset and section spacing
- add mobile compaction for hero/suggestion frames in `src/frameworks/ui/MessageList.tsx`
- audit preview-like surfaces that still use `p-(--space-inset-panel)` without a mobile override

### Image 1 missing tests

1. A screenshot regression for the homepage hero state at `390x844`.
2. A screenshot regression for any preview-style admin/content card surface used in mobile flows.
3. A bounding-box assertion that the first hero or preview surface does not exceed a reasonable first-viewport share.

## Image 2: Floating Chat Composer Consumes Too Much Viewport

Confidence: high

This is the clearest and most defensible issue in the set. The floating chat shell on mobile is too tall and too heavy once the transcript, follow-up chips, composer frame, helper copy, and shell chrome are all present.

### Image 2 problems visible in the screenshot

1. The composer area occupies too much of the lower viewport.
2. Follow-up chips above the composer amplify the crowding.
3. Helper text remains visible even when it adds no immediate value.
4. The placeholder is too long for a compact mobile composer.
5. The attach button, textarea, and fixed-width send button create a chunky control rail.
6. The shell feels like a scaled-down desktop modal rather than a mobile chat tool.

### Image 2 confirmed code causes

- `src/frameworks/ui/FloatingChatFrame.tsx`
  - floating shell keeps large offsets, a large radius, and a near-full-height framed container even on phones
- `src/frameworks/ui/ChatContentSurface.tsx`
  - always renders a distinct composer plane under the transcript in floating mode
- `src/frameworks/ui/ChatInput.tsx`
  - placeholder is long: "Bring the messy workflow, bold idea, or handoff..."
  - helper copy is always rendered: "Enter to send. Shift+Enter for line break. Attach files if needed."
  - send button keeps a minimum width and text label
  - textarea can grow to 224px
- `src/app/styles/chat.css`
  - mobile rule only lightly adjusts the composer; it does not redesign it
- `src/frameworks/ui/MessageList.tsx`
  - follow-up chips and hero chips still use tall, padded treatments on mobile

### Image 2 root cause

The floating chat model is structurally desktop-first. The mobile stylesheet trims it slightly, but it does not change the information hierarchy. Too many secondary elements remain permanently visible.

### Image 2 proposed resolution

1. Create a real mobile composer mode for floating chat.
2. Hide helper copy until focus, first send, or an explicit info affordance.
3. Replace the mobile placeholder with a shorter prompt such as "Ask Studio Ordo...".
4. Convert the mobile send button to icon-first or icon-only when space is tight.
5. Reduce composer padding, radius, and plane padding on narrow screens.
6. Reduce the allowed textarea growth on phones.
7. Move follow-up chips into a denser treatment on mobile:
   - horizontal scroll row, or
   - compact two-line grid, or
   - collapse them while the input is focused
8. Revisit the full floating-shell height model on mobile so the first visible transcript area is materially larger.

### Image 2 implementation targets

- `src/frameworks/ui/ChatInput.tsx`
- `src/frameworks/ui/FloatingChatFrame.tsx`
- `src/frameworks/ui/ChatContentSurface.tsx`
- `src/frameworks/ui/MessageList.tsx`
- `src/app/styles/chat.css`
- `src/app/styles/foundation.css`

### Image 2 missing tests

1. A Playwright mobile test that measures composer height relative to viewport height.
2. A visual regression for floating chat open at `390x844`.
3. A test that verifies helper copy can be suppressed in compact mobile mode.
4. A test that verifies follow-up chips remain accessible without forcing excessive vertical growth.

## Image 3: Admin Leads Pipeline Is Crowded and Unstable on Mobile

Confidence: high

The mobile leads pipeline is currently functional but visually overloaded. The issue is not that the page is inaccessible; it is that the summary metrics, tabs, filters, and table entry point are competing for the same narrow strip of space.

### Image 3 problems visible in the screenshot

1. Status summary cards appear cramped, clipped, or too tightly wrapped.
2. The tab row lacks a mobile-native interaction model.
3. The page front-loads too many controls before the user reaches the actual record list.
4. Visual priority is split between hero, counts, tabs, filters, and more counts.
5. The top of the page likely requires too much scrolling before the admin reaches the content they came to manage.

### Image 3 confirmed code causes

- `src/components/admin/AdminStatusCounts.tsx`
  - uses `min-w-[5.5rem]`
  - uses large `text-2xl` numerals
  - wraps cards instead of changing layout mode
- `src/app/admin/leads/page.tsx`
  - renders one summary count row before the tabs
  - renders a second status count row after filters
  - tab nav is a plain `flex` row with no explicit mobile overflow handling
- `src/components/admin/AdminSection.tsx`
  - large hero surface still leads the page on mobile

### Image 3 root cause

The page is using the same information architecture on phone that it uses on desktop. The issue is density, not basic routing or permissioning.

### Image 3 proposed resolution

1. Replace the current metric-card row with a mobile-specific layout:
   - two-column compact grid, or
   - horizontally scrollable metric strip, or
   - segmented summary with only active-tab metrics visible first
2. Convert the tab row into a mobile overflow pattern:
   - `overflow-x-auto` and `whitespace-nowrap`, or
   - a compact segmented control, or
   - a select menu on the smallest widths
3. Reduce count-card font size and inset on phones.
4. Collapse one of the two status summary rows on mobile so the page does not double-stack metrics before data.
5. Move filters into a more compact tray or disclosure panel on narrow screens.

### Image 3 implementation targets

- `src/components/admin/AdminStatusCounts.tsx`
- `src/app/admin/leads/page.tsx`
- `src/app/styles/admin.css`
- any filter surface used by `AdminBrowseFilters`

### Image 3 missing tests

1. A Playwright mobile test for `/admin/leads` that asserts no horizontal overflow.
2. A mobile test that ensures every tab remains reachable and readable.
3. A screenshot regression for `/admin/leads` at `390x844` and `430x932`.
4. A test that verifies status count cards switch into a compact layout below `640px`.

## Image 4: Admin Dashboard Uses Too Much Vertical Real Estate

Confidence: high

The admin dashboard is readable, but it is not efficient on mobile. The hero surface and stacked cards create a dashboard that looks polished yet slow to scan on a phone.

### Image 4 problems visible in the screenshot

1. The hero section is too tall relative to the amount of decision-making value it provides.
2. The card stack below the hero is heavy and repetitive on mobile.
3. Buttons and supporting text likely wrap into uneven rows.
4. The page feels like a desktop dashboard reduced to one column rather than a mobile command surface.
5. The first screen likely shows branding and framing before it shows enough actionable state.

### Image 4 confirmed code causes

- `src/components/admin/AdminSection.tsx`
  - hero surface uses full panel inset and a large title treatment on mobile
- `src/app/admin/page.tsx`
  - dashboard only becomes multi-column at `lg`; below that it is a single column of large cards
- `src/components/admin/AdminCard.tsx`
  - cards use the same generous panel inset on mobile as desktop
- `src/app/styles/admin.css`
  - surfaces are visually rich, but there are no mobile-specific density reductions in the inspected rules

### Image 4 root cause

The dashboard treats mobile primarily as a column collapse instead of a layout reinterpretation. That preserves all the weight of the desktop presentation without introducing mobile prioritization.

### Image 4 proposed resolution

1. Compress the admin hero on mobile:
   - smaller padding
   - shorter description
   - optional secondary copy hidden behind a disclosure
2. Introduce a compact mobile dashboard mode for the first set of cards.
3. Convert large cards into smaller metric-and-action surfaces where possible.
4. Reduce CTA button chrome and wrapping pressure inside cards.
5. Prioritize the first two mobile cards around urgent operational state instead of uniform card weight.

### Image 4 implementation targets

- `src/components/admin/AdminSection.tsx`
- `src/components/admin/AdminCard.tsx`
- `src/app/admin/page.tsx`
- `src/app/styles/admin.css`
- shared spacing tokens in `src/app/styles/foundation.css`

### Image 4 missing tests

1. A screenshot regression for `/admin` mobile dashboard.
2. A test that checks the first viewport contains meaningful actionable content, not only hero chrome.
3. A no-horizontal-overflow assertion for the dashboard at mobile widths.

## Prioritized Fix Plan

### P0

1. Redesign the floating chat composer for true mobile density.
2. Fix the mobile leads pipeline summary cards and tab overflow behavior.

### P1

1. Compress the admin dashboard hero and card density.
2. Introduce compact mobile rules for shared hero and preview-like surfaces.

### P2

1. Audit all remaining card surfaces still using full panel inset on mobile.
2. Normalize mobile chip, badge, and metadata treatments across chat and admin surfaces.

## Recommended Test Additions

1. Add screenshot regressions for `/`, floating chat open, `/admin`, and `/admin/leads` at phone viewports.
2. Add Playwright checks for horizontal overflow on core admin routes.
3. Add bounding-box checks for composer height and first-viewport occupancy.
4. Update chat mobile tests so they verify compact behavior, not just structural presence.
5. Add one shared utility for asserting `document.documentElement.scrollWidth === window.innerWidth` on mobile-critical routes.

## Key Files Reviewed

- `src/app/styles/foundation.css`
- `src/app/styles/shell.css`
- `src/app/styles/chat.css`
- `src/app/styles/admin.css`
- `src/frameworks/ui/ChatInput.tsx`
- `src/frameworks/ui/ChatContentSurface.tsx`
- `src/frameworks/ui/ChatMessageViewport.tsx`
- `src/frameworks/ui/FloatingChatFrame.tsx`
- `src/frameworks/ui/MessageList.tsx`
- `src/components/admin/AdminCard.tsx`
- `src/components/admin/AdminSection.tsx`
- `src/components/admin/AdminStatusCounts.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/leads/page.tsx`
- `tests/browser-fab-mobile-density.test.tsx`
- `tests/browser-ui/admin-shell-responsive.spec.ts`
