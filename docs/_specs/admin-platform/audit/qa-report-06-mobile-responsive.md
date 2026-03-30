# QA Report 06 — Mobile & Responsive

**Severity range:** P2 Medium / P3 Low / P4 Cosmetic  
**Scope:** Mobile-first behavior, bottom navigation, safe areas, viewport edge cases, responsive layout.

---

## DEF-037 · P2 Medium — Main Content Padding-Bottom Overlaps Bottom Nav

**File:** `src/app/admin/layout.tsx`  
**Spec reference:** Design Principle #2 — Mobile-first  
**Observed:**
```tsx
<main className="... pb-[calc(var(--space-16)+var(--space-frame-default)+env(safe-area-inset-bottom,0px))]
  sm:pb-(--space-frame-wide)">
```
**Problem:** The bottom padding calculation (`--space-16` = 4rem + `--space-frame-default` = 2rem + safe-area) totals ~6rem (96px) + safe area. The bottom nav itself is:
- `bottom-[calc(env(safe-area-inset-bottom,0px)+var(--space-3))]` — positioned ~12px above safe area
- Nav container height ≈ 44px (min-h-11 links) + 2×padding (~8px) ≈ 60px

96px of padding vs ~72px of nav height means there's ~24px of extra dead space between the last content and the bottom nav on most devices. This isn't critical but feels loose.

**However:** On devices with large safe areas (iPhone with Dynamic Island: 34px), the calculation works well. The concern is Android devices where `env(safe-area-inset-bottom)` is 0 — the padding becomes excessive.

**Recommendation:** Consider using `var(--space-12)` instead of `var(--space-16)` as the base, or detect nav presence to calculate precisely.

---

## DEF-038 · P2 Medium — Bottom Nav Covers Content on Scroll-to-Bottom

**File:** `src/components/admin/AdminBottomNav.tsx`  
**Observed:** The bottom nav is `position: fixed` with `z-40`, hovering over page content. When the admin scrolls to the very bottom of a long page (e.g., journal detail with many revisions), the fixed nav occludes the last items.

The main content's `pb-[calc(...)]` compensates for this, but only for direct children of the layout. If a page component adds its own padding or scroll container, the compensation may not reach.

**Edge case:** The journal detail page has multiple form sections stacked vertically. On a short mobile viewport (iPhone SE: 667px), the last section's submit button could be hidden behind the bottom nav.

**Recommendation:** Add a scroll-margin-bottom to form submit buttons, or use `scroll-padding-bottom` on the scroll region.

---

## DEF-039 · P3 Low — Bottom Nav 5-Column Grid Cramped on Small Viewports

**File:** `src/components/admin/AdminBottomNav.tsx`  
**Observed:**
```tsx
<div className="grid grid-cols-5 gap-(--space-1)">
```
On a 320px viewport (iPhone SE first gen, accessibility zoom), each column gets ~58px minus gaps. With `min-h-11` (44px height), the links are technically compliant but visually cramped. The text at `text-[0.64rem]` (~10.2px) is near the minimum readable size.

**Problem:** 5 navigation items is the maximum for a bottom nav. The spec acknowledges this with "4 icon slots: Dashboard, Users, System, Journal" but the implementation added a 5th (Leads). At 5 columns on a 320px screen, each tap target is ~58px wide × 44px tall. Apple's HIG recommends minimum 44×44pt — these are 58×44, which passes, but feels dense.

**Recommendation:** Consider whether Leads should be moved to a sub-menu or merged into the Dashboard at mobile widths. Or accept the density but verify with real device testing.

---

## DEF-040 · P3 Low — Sidebar Does Not Collapse to Off-Canvas on Tablets

**File:** `src/app/admin/layout.tsx`  
**Observed:**
```tsx
className="grid ... grid-cols-1 ... sm:grid-cols-[248px_minmax(0,1fr)]"
```
**Problem:** At the `sm` breakpoint (640px), the sidebar takes 248px, leaving 392px for content. On a 640px portrait iPad or Android tablet, 392px of content width is narrow for data tables (journal list) or card grids (dashboard).

The spec says "On screens < 640px, the sidebar collapses to a fixed bottom bar" — but at exactly 640px, the sidebar appears, taking 39% of the viewport. The content area gets 61%.

**Recommendation:** Consider raising the sidebar breakpoint to `md` (768px) so that 640-767px devices get the bottom nav + full-width content. At 768px, the sidebar gets 248px and content gets 520px — a more comfortable ratio.

---

## DEF-041 · P3 Low — No Landscape Mobile Handling

**Files:** `AdminBottomNav.tsx`, `AdminSidebar.tsx`  
**Spec reference:** Sprint 6 — "Mobile edge cases"  
**Problem:** In landscape on a phone (e.g., 844×390 on iPhone 12), the viewport height is only 390px. The fixed bottom nav at ~60px plus the admin section header (~120px) consumes ~180px, leaving only 210px for actual card content. The sidebar is hidden (`sm:flex`), so navigation relies on the bottom dock.

**Edge case:** On iPhone 12 landscape, the bottom nav + safe area insets (notch on the right side in landscape) could interact poorly. The nav uses `env(safe-area-inset-bottom)` but doesn't account for `env(safe-area-inset-left)` and `env(safe-area-inset-right)` which apply in landscape.

---

## DEF-042 · P4 Cosmetic — AdminBottomNav Glassmorphism May Reduce Readability

**File:** `src/components/admin/AdminBottomNav.tsx`  
**Observed:**
```tsx
className="... bg-[color-mix(in_oklab,var(--glass-sublayer)_88%,transparent)] ... backdrop-blur"
```
**Problem:** The glassmorphism effect (88% opacity glass + backdrop-blur) looks elegant with solid-color backgrounds but can reduce text readability when the content scrolling beneath it has high visual complexity (images, graphs, varied colors). The nav text at `text-[0.64rem]` is already small; blurred content showing through reduces effective contrast.

**Recommendation:** Test with content-heavy admin pages behind the nav. Consider increasing opacity to 92-95% or adding a solid fallback for `@supports not (backdrop-filter: blur())`.
