# Sprint 10 — Layout & Navigation Wiring

> Wire the Sprint 8/9 foundations into the admin shell layout, account
> menu, and all seven detail pages. Removes the mobile hamburger drawer.
> Adds a skip-to-content link. Closes back-link navigation on every
> detail page and removes the `jobs-page-shell` CSS coupling from the
> admin layout.

---

## Why This Sprint Exists

Sprint 8 built the `AdminBreadcrumb` component and configured the nav
files. Sprint 9 wired `AdminSection` to accept a `breadcrumbs` prop.
But no page is actually passing bread crumbs, no page has a back-link, and
the admin shell layout still has no skip-to-content link, still renders
the mobile hamburger `AdminDrawer`, and still has the residual
`jobs-page-shell` class on the main element — a leak from when the jobs
page lived at `/jobs` before the admin platform was built.

The `AccountMenu` component must receive an "Admin" collapsible group
that houses all 8 admin nav items for admin users, so operators can
navigate from anywhere in the product.

---

## Deliverables

### D10.1 — Admin layout skip-to-content link

**File:** `src/app/admin/layout.tsx`
**Defects closed:** UX-22

Add a visually hidden but focusable skip link as the very first child
inside the layout's body element:

```tsx
<a
  href="#admin-main"
  className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
             focus:z-50 focus:px-4 focus:py-2 focus:bg-background
             focus:text-foreground focus:rounded focus:shadow-md"
>
  Skip to main content
</a>
```

Add `id="admin-main"` to the main content container so the skip link
can land there.

### D10.2 — Remove `AdminDrawer` from mobile layout

**File:** `src/app/admin/layout.tsx`
**Defects closed:** UX-01

Remove the `<AdminDrawer>` component from the admin layout entirely.
Delete or suppress the hamburger button that triggers it. The admin
navigation is no longer a side-drawer — it lives in the account menu
(D10.3) and in the persistent left sidebar on desktop (existing
`AdminSidebar` component, unchanged).

If the `AdminDrawer` component is only used in the admin layout and
nowhere else, mark it as deprecated with a comment. Do NOT delete the
file in this sprint — that is a followup cleanup. Removing the render
is sufficient.

### D10.3 — `AccountMenu` admin section group

**File:** `src/components/shell/AccountMenu.tsx` (or equivalent)
**Defects closed:** UX-01 (complete)

For users with the `ADMIN` role, add a collapsible "Admin" section to
the account menu dropdown. The section renders beneath the existing
personal items (Profile, Settings) separated by a divider:

```tsx
{isAdmin && (
  <>
    <DropdownMenuSeparator />
    <DropdownMenuLabel>Admin</DropdownMenuLabel>
    {adminNavItems.map((item) => (
      <DropdownMenuItem key={item.href} asChild>
        <a href={item.href}>{item.label}</a>
      </DropdownMenuItem>
    ))}
  </>
)}
```

`adminNavItems` is sourced from the admin-navigation config (D8.2) via a
helper that filters by role, so no hard-coded list lives in the
component.

### D10.4 — Remove `jobs-page-shell` class from admin layout

**File:** `src/app/admin/layout.tsx`
**Defects closed:** UX-11

Remove `jobs-page-shell` (or any equivalent orphaned CSS namespace class)
from the admin layout's main `<div>` or `<main>` container. This class
was carried over from when the jobs surface lived at `/jobs` and is now
semantically incorrect in the admin shell.

### D10.5 — Wire breadcrumbs and back-links into detail pages

**Files:** (all 7 listed below)
**Defects closed:** UX-02, UX-03 (wire), UX-12

For each admin detail page, pass `breadcrumbs` to `AdminSection` and
`backHref` / `backLabel` to `AdminDetailShell`:

| Page file | Breadcrumb trail | backHref | backLabel |
|-----------|-----------------|---------|-----------|
| `src/app/admin/users/[id]/page.tsx` | `[{Admin, /admin}, {Users, /admin/users}, {name}]` | `/admin/users` | `All Users` |
| `src/app/admin/leads/[id]/page.tsx` | `[{Admin, /admin}, {Leads, /admin/leads}, {name}]` | `/admin/leads` | `All Leads` |
| `src/app/admin/leads/[id]/consultations/[cid]/page.tsx` | `[{Admin}, {Leads}, {name}, {Consultation}]` | `..` | `Back` |
| `src/app/admin/deals/[id]/page.tsx` | `[{Admin}, {Deals, /admin/deals}, {title}]` | `/admin/deals` | `All Deals` |
| `src/app/admin/training/[id]/page.tsx` | `[{Admin}, {Training, /admin/training}, {name}]` | `/admin/training` | `All Training` |
| `src/app/admin/conversations/[id]/page.tsx` | `[{Admin}, {Conversations, /admin/conversations}, {title}]` | `/admin/conversations` | `All Conversations` |
| `src/app/admin/prompts/[id]/page.tsx` | `[{Admin}, {Prompts, /admin/prompts}, {role}]` | `/admin/prompts` | `All Prompts` |

The breadcrumb trail always ends with the entity's name/title as the
current-page (non-linked) item.

### D10.6 — Admin layout `<main>` landmark role

**File:** `src/app/admin/layout.tsx`
**Defects closed:** UX-25

Ensure the admin layout's primary content wrapper is a semantic
`<main>` element (not a `<div>`) so that landmark navigation from
assistive technology works correctly. If the content wrapper is already
`<main>`, no change needed — verify and document.

---

## File Inventory

### Modified Files

| File | Change |
|------|--------|
| `src/app/admin/layout.tsx` | Skip link (D10.1), remove AdminDrawer (D10.2), remove jobs-page-shell class (D10.4), ensure `<main>` landmark (D10.6) |
| `src/components/shell/AccountMenu.tsx` | Add ADMIN collapsible section (D10.3) |
| `src/app/admin/users/[id]/page.tsx` | breadcrumbs + backHref (D10.5) |
| `src/app/admin/leads/[id]/page.tsx` | breadcrumbs + backHref (D10.5) |
| `src/app/admin/deals/[id]/page.tsx` | breadcrumbs + backHref (D10.5) |
| `src/app/admin/training/[id]/page.tsx` | breadcrumbs + backHref (D10.5) |
| `src/app/admin/conversations/[id]/page.tsx` | breadcrumbs + backHref (D10.5) |
| `src/app/admin/prompts/[id]/page.tsx` | breadcrumbs + backHref (D10.5) |

---

## Acceptance Criteria

- [ ] Admin layout contains `<a href="#admin-main">Skip to main content</a>` as first focusable element
- [ ] `<main id="admin-main">` (or equivalent) exists in admin layout
- [ ] `AdminDrawer` is NOT rendered inside `src/app/admin/layout.tsx`
- [ ] `AccountMenu` renders admin nav items for admin users
- [ ] `AccountMenu` does NOT render admin items for non-admin users
- [ ] Admin layout main container does NOT contain `jobs-page-shell` CSS class
- [ ] Admin layout primary content wrapper is `<main>` element
- [ ] All 7 detail pages pass `breadcrumbs` to `AdminSection`
- [ ] All 7 detail pages pass `backHref` to `AdminDetailShell`
- [ ] No TypeScript errors
- [ ] No lint errors

---

## Estimated Tests

| Area | Positive | Negative | Edge | Total |
|------|----------|----------|------|-------|
| D10.1 Skip link | 2 | 0 | 1 | 3 |
| D10.2 AdminDrawer removal | 2 | 0 | 1 | 3 |
| D10.3 AccountMenu admin section | 3 | 2 | 1 | 6 |
| D10.4 jobs-page-shell removal | 1 | 0 | 0 | 1 |
| D10.5 Detail page breadcrumbs (7 pages) | 7 | 3 | 3 | 13 |
| D10.6 main landmark | 1 | 0 | 0 | 1 |
| **Total** | **16** | **5** | **6** | **27** |

---

## Dependencies

- Sprint 8: `AdminBreadcrumb` component must exist
- Sprint 9: `AdminSection` must accept `breadcrumbs` prop; `AdminDetailShell` must accept `backHref`
