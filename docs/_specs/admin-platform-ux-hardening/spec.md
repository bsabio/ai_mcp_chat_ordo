# Admin Platform — UX Hardening Specification

> The admin platform is functionally feature-complete. Six sprints of
> hardening now close the gap between a working tool and a polished,
> accessible, production-quality operations center: correct information
> architecture, keyboard-navigable forms, paginated lists, wayfinding
> breadcrumbs, and a command-palette search bar.

---

## The Gap

A full UX/UI audit (2026-03-30, second pass 2026-03-31) identified 45
defects across navigation, pagination, search, page structure, forms,
and accessibility. 29 remain open against the shipped codebase. Five
systemic problems dominate the remediation plan:

1. **Wrong navigation model for mobile.** The left-side hamburger drawer
   was the scaffolding default. Every SaaS product the operator uses
   puts account/admin links in a top-right dropdown. `AdminDrawer` must
   be removed; the account menu receives an admin-section group.

2. **No breadcrumbs.** Every detail page in the admin hierarchy is
   navigably orphaned. There is no path from "Jane Smith — Lead" back to
   the leads index without the browser back button. A single
   `AdminBreadcrumb` component rendered inside `AdminSection` closes this
   for all pages at once.

3. **No pagination anywhere.** All admin index loaders are full table
   scans. A production deployment with 10 000 job records or 2 000 leads
   returns the entire table on every page render.

4. **Search bar only does entity search; no command navigation.** The
   operator explicitly needs `/users`, `/journal` style command shortcuts
   alongside free-text entity search.

5. **Form ergonomics and WCAG gaps.** Dynamic errors are rendered without
   `role="alert"`. Field descriptions are not linked via
   `aria-describedby`. The `AdminDataTable` has no accessible name. These
   are P1 regressions against WCAG 2.1 AA.

---

## Design Principles

All six sprints are governed by the same rules that govern the platform:

1. **DRY before building.** New capability lives in shared components or
   utilities. No copy-paste fix-in-place across 8 detail pages. One
   `AdminBreadcrumb` wires everywhere.

2. **Accessibility is not optional.** WCAG 2.1 AA is the baseline. Every
   interactive element must be reachable by keyboard, every dynamic
   update must be announced, every table must have an accessible name.

3. **Config over code.** Navigation structure lives in
   `shell-navigation.ts` / `admin-navigation.ts`. Changing where a link
   appears should not require editing a component.

4. **Progressively scoped.** Each sprint is shippable on its own. A
   config-only sprint does not depend on a new component sprint.

5. **Tests verify intent, not implementation.** Source inspection tests
   (`readSource`) confirm presence of required attributes and patterns
   without coupling to internal rendering details.

---

## Architecture

```
docs/_specs/admin-platform-ux-hardening/
├── spec.md                                    (this file)
└── sprints/
    ├── sprint-8-config-and-new-components.md  Batch 1 + 2
    ├── sprint-9-shared-component-upgrades.md  Batch 3
    ├── sprint-10-layout-and-navigation.md     Batch 4
    ├── sprint-11-pagination-data-layer.md     Batch 5
    ├── sprint-12-conversations-p0-journal.md  Batch 6 (P0 + journal)
    └── sprint-13-auth-forms-accessibility.md  Batch 6 (auth + a11y)

tests/
    ├── sprint-8-ux-config-and-new-components.test.ts
    ├── sprint-9-ux-shared-component-upgrades.test.tsx
    ├── sprint-10-ux-layout-and-navigation.test.tsx
    ├── sprint-11-ux-pagination-data-layer.test.ts
    ├── sprint-12-ux-conversations-p0-journal.test.tsx
    └── sprint-13-ux-auth-forms-accessibility.test.tsx
```

---

## Defect → Sprint Mapping

| Sprint | Batches | Defects closed |
|--------|---------|----------------|
| 8 — Config + new components | 1, 2 | UX-05, UX-07, UX-32, UX-33, UX-02, UX-08 (component), UX-15, UX-16, UX-19, UX-38 |
| 9 — Shared component upgrades | 3 | UX-03, UX-04, UX-17, UX-18, UX-20, UX-26, UX-29, UX-41, UX-44 |
| 10 — Layout + navigation wiring | 4 | UX-01, UX-02 (wire), UX-03 (wire), UX-12, UX-22, UX-25 |
| 11 — Pagination data layer | 5 | UX-08 (complete) |
| 12 — Conversations P0 + journal | 6a | UX-09, UX-10, UX-11, UX-36, UX-37, UX-42, UX-43 |
| 13 — Auth forms + accessibility | 6b | UX-21, UX-24, UX-28, UX-38 (wire), UX-39, UX-40, UX-45 |

---

## Shared Component Contract

New shared components introduced in Sprint 8 and consumed in subsequent
sprints:

### `AdminBreadcrumb`

```typescript
// src/components/admin/AdminBreadcrumb.tsx
export interface BreadcrumbItem {
  label: string;
  href?: string; // omit on last (current) item
}

interface AdminBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function AdminBreadcrumb(props: AdminBreadcrumbProps): React.ReactElement
```

Renders `<nav aria-label="Breadcrumb"><ol>…</ol></nav>`. Current item
receives `aria-current="page"`. Items truncate with `text-ellipsis` at
`max-w-[180px]` on mobile.

### `AdminPagination`

```typescript
// src/components/admin/AdminPagination.tsx
interface AdminPaginationProps {
  page: number;          // 1-based current page
  total: number;         // total record count
  pageSize: number;      // records per page
  baseHref: string;      // e.g. "/admin/users"
  className?: string;
}

export function AdminPagination(props: AdminPaginationProps): React.ReactElement
```

Renders `<nav aria-label="Pagination">` with Prev / numeric page
buttons / Next. Disabled Prev on page 1 and Next on last page.
Each page link is `<a href="{baseHref}?page={n}">`. The component is a
server component (no `"use client"` directive) — page transitions happen
via native link navigation.

### `AdminFormField`

```typescript
// src/components/admin/AdminFormField.tsx
interface AdminFormFieldProps {
  id: string;
  label: string;
  description?: string;
  error?: string;
  children: React.ReactElement; // the actual <input>, <select>, etc.
  required?: boolean;
}

export function AdminFormField(props: AdminFormFieldProps): React.ReactElement
```

Renders label → children → description → error in a consistent wrapper.
If `description` is provided, appends `aria-describedby="{id}-description"` to the child element via `React.cloneElement`. If `error` is provided, appends `aria-describedby="{id}-error"` and `aria-invalid="true"`.

---

## Acceptance Gate

All six sprints must pass the following before merge:

- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run build` exits 0
- [ ] All vitest tests pass (no regressions)
- [ ] Sprint-specific test file passes in isolation
- [ ] No new WCAG 2.1 AA violations per axe-core audit

---

## Dependencies

| Dependency | Status |
|-----------|--------|
| Sprint 1–7 features (admin platform) | ✅ Shipped |
| `AdminBrowseFilters`, `AdminDataTable`, `AdminSection`, `AdminDetailShell`, `AdminWorkflowBar` | ✅ Exist |
| `AdminSearchBar` (Sprint 7) | ✅ Exists |
| Vitest + @testing-library/react | ✅ Configured |
