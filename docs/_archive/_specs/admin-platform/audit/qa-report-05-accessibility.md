# QA Report 05 — Accessibility

**Severity range:** P2 Medium / P3 Low  
**Scope:** WCAG 2.1 AA compliance, ARIA usage, keyboard navigation, screen reader support across admin surfaces.

---

## DEF-029 · P2 Medium — No Skip-to-Content Link in Admin Shell

**File:** `src/app/admin/layout.tsx`  
**WCAG criterion:** 2.4.1 Bypass Blocks (Level A)  
**Expected:** A visually hidden skip link at the top of the page that jumps to `<main>` content, allowing keyboard users to bypass the sidebar navigation.  
**Actual:** No skip link exists. Keyboard users must tab through the entire sidebar (5+ links) on every page load before reaching content.

**Severity justification:** This is a Level A requirement — the most basic accessibility tier. Its absence means the admin shell fails WCAG 2.1 A compliance.

**Fix:** Add a `<a href="#admin-main" className="sr-only focus:not-sr-only ...">Skip to content</a>` before the sidebar, and `id="admin-main"` on the `<main>` element.

---

## DEF-030 · P2 Medium — Journal Table Lacks Proper Table Semantics

**File:** `src/app/admin/journal/page.tsx`  
**WCAG criterion:** 1.3.1 Info and Relationships (Level A)  
**Expected:** Data tables should use `<th scope="col">` for column headers and optionally `<caption>` for table identification.  
**Actual:** The journal list uses a `<table>` with `<thead>` and `<tbody>`, but:
- Column headers lack `scope="col"` attribute
- No `<caption>` element to identify the table's purpose
- Screen readers may not properly associate cell content with column headers

**Fix:** Add `scope="col"` to all `<th>` elements and a visually hidden `<caption>`.

---

## DEF-031 · P2 Medium — Journal Detail Inputs Missing Explicit Labels

**File:** `src/app/admin/journal/[id]/page.tsx`  
**WCAG criterion:** 1.3.1 Info and Relationships (Level A), 4.1.2 Name, Role, Value (Level A)  
**Expected:** Every form input has a `<label>` element associated via `htmlFor`/`id` or wrapping.  
**Actual:** Some inputs use `<label>` wrappers (which is valid), but others rely on `aria-label` alone without visible labels. The `readonly` inputs have no visual distinction beyond the HTML attribute — a sighted user cannot tell which fields are editable versus read-only.

**Impact:** Screen reader users can navigate labels, but sighted keyboard users may be confused by non-obvious read-only states.

---

## DEF-032 · P2 Medium — No Focus Management After Form Submissions

**File:** `src/app/admin/journal/[id]/page.tsx`  
**WCAG criterion:** 3.2.2 On Input (Level A)  
**Expected:** After a form submission (metadata save, workflow transition, revision restore), focus should move to a confirmation message or back to a logical location.  
**Actual:** Forms use Next.js server actions which trigger a full-page revalidation. After submission, focus position is undefined — likely resets to the top of the page, requiring the user to navigate back to where they were.

**Impact:** Disorienting for keyboard and screen reader users on the journal detail page, which has 4+ form sections.

---

## DEF-033 · P2 Medium — AdminBottomNav Uses pointer-events Hack

**File:** `src/components/admin/AdminBottomNav.tsx`  
**WCAG criterion:** 2.1.1 Keyboard (Level A)  
**Observed:**
```tsx
<nav className="pointer-events-none fixed inset-x-0 ...">
  <div className="pointer-events-auto ...">
```
**Problem:** The outer `<nav>` has `pointer-events-none` to allow click-through on content beneath it, with the inner container restoring `pointer-events-auto`. While this works for mouse/touch, keyboard focus behavior on `pointer-events-none` elements varies across browsers. The `<nav>` itself is still in the tab order via its child links, but assistive technology may report interaction issues.

**Risk:** Low probability, but a fragile pattern for a primary navigation element.

---

## DEF-034 · P3 Low — AdminSidebar Touch Targets Below 44px on Tablet

**File:** `src/components/admin/AdminSidebar.tsx`  
**WCAG criterion:** 2.5.5 Target Size (Level AAA), 2.5.8 Target Size Minimum (Level AA)  
**Observed:**
```tsx
className="rounded-[1.2rem] px-(--space-inset-default) py-(--space-inset-compact)"
```
Where `--space-inset-compact` = `0.75rem` (12px). With font-size `text-sm` (~14px line-height ~20px), the total touch target is approximately 12 + 20 + 12 = 44px — barely meeting the minimum.

**Problem:** The sidebar is hidden on mobile (`hidden sm:flex`), so this only affects tablet users (640px+). However, the touch targets are tight and could fail with larger text or custom browser font sizes.

**Recommendation:** Add `min-h-11` (44px) to sidebar links to guarantee the target size regardless of text scaling.

---

## DEF-035 · P3 Low — Color Contrast on "Preview" Badges

**File:** `src/components/admin/AdminSidebar.tsx`  
**WCAG criterion:** 1.4.3 Contrast Minimum (Level AA) — 4.5:1 for normal text  
**Observed (inactive state):**
```tsx
className="border-amber-500/30 text-amber-300"
```
`text-amber-300` on the admin sidebar's dark-ish background may not meet 4.5:1 contrast ratio. Amber-300 is a light yellow that needs a very dark background to pass.

**Observed (active state):**
```tsx
className="border-background/30 text-background/78"
```
`text-background/78` (78% opacity background color on foreground-colored button) — contrast depends on theme but at 78% opacity the alpha channel reduces effective contrast.

**Recommendation:** Test with a contrast checker. Consider using `text-amber-400` or `text-amber-500` for better contrast, and full-opacity text on active badges.

---

## DEF-036 · P3 Low — No ARIA Live Region for Dashboard Data Updates

**File:** `src/app/admin/page.tsx`  
**WCAG criterion:** 4.1.3 Status Messages (Level AA)  
**Expected:** When health or lead data changes (via revalidation or navigation), screen readers should announce the update.  
**Actual:** The dashboard is a static server component with no `aria-live` regions. Data updates only occur on full page navigation, which screen readers handle naturally. However, if future work adds polling or streaming updates, the absence of live regions will become a problem.

**Severity:** P3 now, would escalate to P2 if real-time updates are added.
