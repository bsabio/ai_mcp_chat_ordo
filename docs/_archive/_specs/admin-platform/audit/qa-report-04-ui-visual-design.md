# QA Report 04 — UI & Visual Design

**Severity range:** P2 Medium / P3 Low / P4 Cosmetic  
**Scope:** CSS patterns, visual hierarchy, naming conventions, and design consistency across admin surfaces.

---

## DEF-022 · P2 Medium — Admin Components Reuse Jobs Page CSS Classes

**Files:** `AdminCard.tsx`, `AdminSection.tsx`, `AdminSidebar.tsx`, `src/app/admin/layout.tsx`  
**Observed classes:**
- `AdminCard` → uses `jobs-panel-surface`, `jobs-status-succeeded`, `jobs-status-failed`, `jobs-count-pill`
- `AdminSection` → uses `jobs-hero-surface`
- `AdminSidebar` → uses `jobs-panel-surface`
- `layout.tsx` `<main>` → uses `jobs-page-shell`

**Problem:** The admin platform has no independent design vocabulary. Every visual primitive is borrowed from the Jobs page CSS namespace. This creates:
1. **Naming confusion:** An admin card called `jobs-panel-surface` makes reading CSS unpredictable.
2. **Coupling risk:** A visual change to the Jobs page could unintentionally break the admin shell.
3. **Spec violation:** The spec calls for "shared primitives" (`AdminCard`, `AdminSection`) — these exist as components but their visual foundation is parasitic on the jobs stylesheet.

**Recommendation:** Create `src/app/styles/admin.css` with admin-namespaced tokens (`admin-panel-surface`, `admin-hero-surface`, etc.) that reference the same design tokens but decouple the class names.

---

## DEF-023 · P3 Low — AdminCard Status Badge Labels Are Vague

**File:** `src/components/admin/AdminCard.tsx`  
**Current mapping:**
```tsx
{status === "ok" ? "Stable" : status === "warning" ? "Needs review" : "Overview"}
```
**Problem:** The badge labels are generic. "Stable" is clear, but "Overview" (for neutral) is meaningless as a status. "Needs review" is the same label for any non-OK state, whether it's a warning about slow health probes or a lead queue needing attention.

**Recommendation:** Allow the parent component to pass a custom badge label, or derive it from the card's domain context.

---

## DEF-024 · P3 Low — Sidebar Description Is Static Developer Copy

**File:** `src/components/admin/AdminSidebar.tsx`  
**Current text:**
> "Queue health, editorial operations, and upcoming operator surfaces live here without the public marketing chrome."

**Problem:** "Upcoming operator surfaces" and "marketing chrome" are developer terminology. An operator doesn't think about "marketing chrome" — they just want to manage their business.

**Recommendation:** Something like "Health, content, and operations — all in one place." Keep it operator-facing.

---

## DEF-025 · P4 Cosmetic — Navigation Icons Are Single Letters, Not Actual Icons

**File:** `src/lib/admin/admin-navigation.ts`  
**Current config:**
```typescript
{ icon: "D" } // Dashboard
{ icon: "U" } // Users
{ icon: "S" } // System
{ icon: "J" } // Journal
{ icon: "L" } // Leads
```
**Rendered in `AdminBottomNav.tsx`:**
```tsx
<span aria-hidden="true" className="text-[0.68rem] font-semibold uppercase tracking-[0.16em]">
  {item.icon}
</span>
```
**Problem:** The mobile bottom nav shows single capital letters ("D", "U", "S", "J", "L") instead of recognizable icons. This is visually unprofessional and conflicts with the spec's reference to "iOS/Android pattern operators already know." Native mobile apps use icons (home, people, gear, document, inbox), not letters.

**Impact:** The bottom nav looks like a prototype mockup. For a solopreneur using this on their phone, the letter-based icons provide poor scannability compared to standard iconography.

---

## DEF-026 · P4 Cosmetic — AdminSection Always Shows "Admin platform" Label

**File:** `src/components/admin/AdminSection.tsx`  
**Current:**
```tsx
<p className="shell-section-heading text-foreground/46">Admin platform</p>
```
**Problem:** Every admin page shows "Admin platform" as the overline label, regardless of context. The users page says "Admin platform" → "Users", the system page says "Admin platform" → "System". This is redundant — the user already knows they're in the admin platform (the sidebar/nav tells them).

**Recommendation:** Make the overline contextual: "People & roles" for users, "System configuration" for system, "Lead management" for leads. Or remove it entirely and let the heading speak for itself.

---

## DEF-027 · P4 Cosmetic — Inconsistent Border Radius Strategy

**Files:** Multiple admin components  
**Observed values:**
- `AdminSidebar` links → `rounded-[1.2rem]`
- `AdminBottomNav` container → `rounded-[1.45rem]`
- `AdminBottomNav` links → `rounded-[0.95rem]`
- `layout.tsx` main → `rounded-[2rem]`
- `AdminCard` (via `jobs-panel-surface`) → `border-radius: 1.6rem`
- `AdminSection` (via `jobs-hero-surface`) → `border-radius: 1.85rem`

**Problem:** Six different border-radius values across admin components. While graduated radii can create visual hierarchy, the specific values (0.95, 1.2, 1.45, 1.6, 1.85, 2.0) feel arbitrary rather than systematic. The design tokens in `foundation.css` don't define radius tokens — they only cover spacing and color.

**Recommendation:** Define 3-4 radius tokens (`--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`) and apply consistently.

---

## DEF-028 · P4 Cosmetic — Shadow Complexity Is Excessive

**Files:** `layout.tsx`, `AdminSidebar.tsx`, `AdminBottomNav.tsx`, `jobs.css`  
**Observed:**
```css
shadow-[0_24px_60px_-42px_color-mix(in_srgb,var(--shadow-base)_16%,transparent)]
shadow-[0_18px_30px_-24px_color-mix(in_srgb,var(--shadow-base)_34%,transparent)]
shadow-[0_16px_34px_-28px_color-mix(in_srgb,var(--shadow-base)_22%,transparent)]
shadow-[0_14px_24px_-22px_color-mix(in_srgb,var(--shadow-base)_28%,transparent)]
shadow-[0_24px_60px_-44px_color-mix(in_srgb,var(--shadow-base)_16%,transparent)]
shadow-[0_24px_60px_-46px_color-mix(in_srgb,var(--shadow-base)_14%,transparent)]
```
**Problem:** Every component has a unique shadow definition with slightly different blur, spread, and opacity values. These inline Tailwind shadows are hard to maintain and impossible to change systematically. The `color-mix` approach is excellent for theme support, but the per-component variation is over-engineered.

**Recommendation:** Define 3 shadow tokens (`--shadow-sm`, `--shadow-md`, `--shadow-lg`) using the `color-mix` pattern and reference them consistently.
