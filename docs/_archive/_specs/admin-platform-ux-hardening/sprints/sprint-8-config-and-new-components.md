# Sprint 8 — Config & New Shared Components

> Close the four config-layer defects by editing `shell-navigation.ts` and
> `admin-navigation.ts`, then build the three reusable components
> (`AdminBreadcrumb`, `AdminPagination`, `AdminFormField`) that every later
> sprint depends on. This sprint ships no visible UI changes on its own —
> it lays the foundation.

---

## Why This Sprint Exists

The navigation config files drive every item that appears in the top bar,
footer, account menu, and command palette. Two sets of links currently
have incorrect `headerVisibility` values, and a handful of admin routes
are absent from the command-palette feed and footer admin section. Fixing
config is a zero-risk, zero-regression change with high leverage.

The three new shared components are prerequisites. Sprint 9 wires
`AdminBreadcrumb` into `AdminSection`. Sprint 10 wires `AdminPagination`
into every index page loader. Sprint 13 wires `AdminFormField` into auth
forms. Without the components being stable and tested first, those sprints
cannot proceed safely.

---

## Deliverables

### D8.1 — Fix `shell-navigation.ts` header visibility

**File:** `src/lib/shell/shell-navigation.ts`
**Defects closed:** UX-05, UX-32

Remove `headerVisibility: "all"` (or equivalent) from the `home`,
`corpus`, and `blog` route entries. These items should appear in the
site footer and account menu but **not** in the primary top header rail.

The `showInCommands` flag must be present and set to `true` for all
admin-accessible routes so they surface in the command palette (D8.6).

### D8.2 — Fix `admin-navigation.ts` footer + command entries

**File:** `src/lib/shell/admin-navigation.ts` (or equivalent nav config)
**Defects closed:** UX-07, UX-33

Ensure every admin route has:

```typescript
footerVisibility: ["ADMIN"],
showInCommands: true,
```

Routes that are currently missing these keys: `System`, `Journal`, and
any routes added in Sprint 7 (`Attribution`). Verify all 8 primary admin
nav items are present with correct definitions.

### D8.3 — `AdminBreadcrumb` component

**File:** `src/components/admin/AdminBreadcrumb.tsx`
**Defects closed:** UX-02 (component only; wiring is D10)

```typescript
"use client"

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function AdminBreadcrumb({
  items,
  className,
}: AdminBreadcrumbProps): React.ReactElement
```

**Layout:**

```
<nav aria-label="Breadcrumb" className={cn("text-sm ...", className)}>
  <ol className="flex flex-wrap items-center gap-1">
    {items.map((item, i) => (
      <li key={i}>
        {i < items.length - 1 ? (
          <>
            <a href={item.href}>{item.label}</a>
            <span aria-hidden="true">/</span>
          </>
        ) : (
          <span aria-current="page" className="font-medium text-ellipsis
                max-w-[180px] truncate inline-block">
            {item.label}
          </span>
        )}
      </li>
    ))}
  </ol>
</nav>
```

- Separator `<span aria-hidden="true">/</span>` is hidden from assistive technology
- Last item receives `aria-current="page"` and is NOT a link
- Empty `items` array renders nothing (null return)
- Single item renders just the current-page span with no separators

### D8.4 — `AdminPagination` component

**File:** `src/components/admin/AdminPagination.tsx`
**Defects closed:** UX-08 (component; full closure in Sprint 11)

```typescript
// Server component — no "use client"

interface AdminPaginationProps {
  page: number;       // 1-based
  total: number;      // total record count
  pageSize: number;
  baseHref: string;   // e.g. "/admin/users"
  className?: string;
}

export function AdminPagination(props: AdminPaginationProps): React.ReactElement
```

**Layout:**

```
<nav aria-label="Pagination" className={cn("flex items-center gap-2", className)}>
  <a href="{baseHref}?page={page-1}" aria-label="Previous page"
     aria-disabled={page <= 1} ...>← Prev</a>

  {/* page buttons: show current ±2 pages + first/last if out of range */}
  <a href="{baseHref}?page={n}" aria-current={n === page ? "page" : undefined}>
    {n}
  </a>

  <a href="{baseHref}?page={page+1}" aria-label="Next page"
     aria-disabled={page >= totalPages} ...>Next →</a>
</nav>
```

Rules:
- `totalPages = Math.ceil(total / pageSize)`
- When `total === 0`, renders nothing (null return)
- When `totalPages === 1`, renders nothing (single-page result needs no pagination)
- Prev link is `aria-disabled="true"` when `page <= 1`, Next when `page >= totalPages`
- Never generates a negative or zero href

### D8.5 — `AdminFormField` component

**File:** `src/components/admin/AdminFormField.tsx`
**Defects closed:** UX-15, UX-16, UX-19, UX-38 (component; wiring in Sprint 13)

```typescript
"use client"

interface AdminFormFieldProps {
  id: string;
  label: string;
  description?: string;     // help text below label
  error?: string;           // validation message
  children: React.ReactElement;
  required?: boolean;
}

export function AdminFormField({
  id,
  label,
  description,
  error,
  children,
  required,
}: AdminFormFieldProps): React.ReactElement
```

**Behavior:**

- Renders `<label htmlFor={id}>{label}{required && " *"}</label>`
- Clones `children` injecting:
  - `id` prop
  - `aria-describedby` = `"{id}-description"` when description is present, `"{id}-error"` when error is present, or both when both are present (space-separated)
  - `aria-invalid="true"` when error is present
  - `aria-required="true"` when required is true
- Renders `<p id="{id}-description">` when description is provided
- Renders `<p id="{id}-error" role="alert">` when error is provided

### D8.6 — `AdminBrowseFilters` date field type

**File:** `src/components/admin/AdminBrowseFilters.tsx`
**Defects closed:** UX-20 (partial — enables date filter fields)

Add `"date"` to the `FilterFieldConfig` type union:

```typescript
// Before
type: "search" | "select" | "toggle"

// After
type: "search" | "select" | "toggle" | "date"
```

Render `<input type="date">` for the `"date"` case with proper
`aria-label` sourced from the field's `label` property.

Also add `description?: string` to `FilterFieldConfig` and render it as
`<p className="text-xs text-muted">{description}</p>` below the control.

---

## File Inventory

### New Files

| File | Purpose |
|------|---------|
| `src/components/admin/AdminBreadcrumb.tsx` | Breadcrumb nav component (D8.3) |
| `src/components/admin/AdminPagination.tsx` | Pagination nav component (D8.4) |
| `src/components/admin/AdminFormField.tsx` | Accessible form field wrapper (D8.5) |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/shell/shell-navigation.ts` | Remove incorrect `headerVisibility`, add `showInCommands` flags (D8.1) |
| `src/lib/shell/admin-navigation.ts` | Add `footerVisibility: ["ADMIN"]`, `showInCommands: true` to missing routes (D8.2) |
| `src/components/admin/AdminBrowseFilters.tsx` | Add `"date"` type + `description` field to `FilterFieldConfig` (D8.6) |

---

## Acceptance Criteria

- [ ] `shell-navigation.ts` — `home`, `corpus`, `blog` entries do NOT have `headerVisibility` pointing to the top rail
- [ ] `shell-navigation.ts` — all admin-accessible routes have `showInCommands: true`
- [ ] `admin-navigation.ts` — all 8+ admin routes have `footerVisibility: ["ADMIN"]`
- [ ] `AdminBreadcrumb` renders `<nav aria-label="Breadcrumb">`
- [ ] `AdminBreadcrumb` — last item has `aria-current="page"` and is not a link
- [ ] `AdminBreadcrumb` — separator spans have `aria-hidden="true"`
- [ ] `AdminBreadcrumb` — empty array returns null / renders nothing
- [ ] `AdminPagination` renders `<nav aria-label="Pagination">`
- [ ] `AdminPagination` — Prev link has `aria-disabled="true"` on page 1
- [ ] `AdminPagination` — Next link has `aria-disabled="true"` on last page
- [ ] `AdminPagination` — renders nothing when `totalPages <= 1`
- [ ] `AdminFormField` — label is associated with input via `htmlFor` / `id`
- [ ] `AdminFormField` — description paragraph has `id="{id}-description"`
- [ ] `AdminFormField` — error paragraph has `role="alert"` and `id="{id}-error"`
- [ ] `AdminFormField` — child receives `aria-invalid="true"` when error is set
- [ ] `AdminBrowseFilters` — `FilterFieldConfig.type` accepts `"date"`
- [ ] `AdminBrowseFilters` — `FilterFieldConfig.description` renders as help text
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run lint` exits 0

---

## Estimated Tests

| Area | Positive | Negative | Edge | Total |
|------|----------|----------|------|-------|
| D8.1–D8.2 config | 4 | 2 | 1 | 7 |
| D8.3 AdminBreadcrumb | 4 | 2 | 3 | 9 |
| D8.4 AdminPagination | 4 | 2 | 4 | 10 |
| D8.5 AdminFormField | 5 | 2 | 3 | 10 |
| D8.6 AdminBrowseFilters | 3 | 1 | 2 | 6 |
| **Total** | **20** | **9** | **13** | **42** |

---

## Dependencies

- No Sprint 9–13 deliverables required
- `cn()` utility (already present in codebase)
- `React.cloneElement` (React 18 — already in use)
