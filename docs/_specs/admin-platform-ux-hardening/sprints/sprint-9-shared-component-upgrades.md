# Sprint 9 — Shared Component Upgrades

> Upgrade the five existing shared admin components (`AdminSection`,
> `AdminDetailShell`, `AdminDataTable`, `AdminStatusCounts`,
> `AdminBrowseFilters`) to consume the new Sprint 8 primitives and close
> the structural accessibility defects that are currently present in every
> page that uses them.

---

## Why This Sprint Exists

Every admin Browse and detail page renders at least one of: `AdminSection`,
`AdminDetailShell`, or `AdminDataTable`. Fixing these five components is
a force-multiplier — a single change fixes the defect on every page that
uses each component, without touching any page file.

`AdminStatusCounts` cards are currently inert `<div>` elements users
expect to be clickable filter links. `AdminDetailShell`'s `<aside>` has
no accessible name. `AdminDataTable`'s `<table>` has no label and the
first column uses a `<td>` where it should use a `<th scope="row">`.
`AdminSection`'s `<h1>` violates the one-`<h1>`-per-page rule when used
inside the admin shell which already renders a heading.

---

## Deliverables

### D9.1 — `AdminSection` heading level correction

**File:** `src/components/admin/AdminSection.tsx`
**Defects closed:** UX-03

Change the title element from `<h1>` to `<h2>`:

```typescript
// Before
<h1 className={cn("text-2xl font-bold", titleClassName)}>
  {title}
</h1>

// After
<h2 className={cn("text-2xl font-bold", titleClassName)}>
  {title}
</h2>
```

Add an optional `breadcrumbs` prop of type `BreadcrumbItem[]` (imported
from `AdminBreadcrumb`). When provided, render `<AdminBreadcrumb items={breadcrumbs} className="mb-2" />` directly above the `<header>` block.

```typescript
interface AdminSectionProps {
  // ... existing props
  breadcrumbs?: BreadcrumbItem[];
}
```

### D9.2 — `AdminDetailShell` accessible sidebar label + back-link prop

**File:** `src/components/admin/AdminDetailShell.tsx`
**Defects closed:** UX-04, UX-26

Add `aria-label` to the `<aside>` element. The label defaults to
`"Details"` but is configurable:

```typescript
interface AdminDetailShellProps {
  // ... existing props
  sidebarLabel?: string;   // default: "Details"
  backHref?: string;       // e.g. "/admin/leads"
  backLabel?: string;      // e.g. "All Leads"
}
```

When `backHref` is provided, render a back-navigation link above the
main content:

```tsx
{backHref && (
  <a href={backHref} className="inline-flex items-center gap-1 text-sm
     text-muted hover:text-foreground mb-4">
    ← {backLabel ?? "Back"}
  </a>
)}
```

Apply `aria-label={sidebarLabel ?? "Details"}` to the `<aside>` element.

### D9.3 — `AdminDataTable` accessible table name

**File:** `src/components/admin/AdminDataTable.tsx`
**Defects closed:** UX-41

Add a required `ariaLabel` prop to the component:

```typescript
interface AdminDataTableProps<T> {
  // ... existing props
  ariaLabel: string;
}
```

Apply it as `aria-label={ariaLabel}` on the `<table>` element.

### D9.4 — `AdminDataTable` first-column header cell

**File:** `src/components/admin/AdminDataTable.tsx`
**Defects closed:** UX-41 (structural part)

The first data cell in each row currently renders as:

```tsx
<td ...><span role="rowheader">{value}</span></td>
```

Change to a proper header cell:

```tsx
<th scope="row" className={cn("...", firstCellClassName)}>
  {value}
</th>
```

Remove the `<span role="rowheader">` wrapper — the `<th scope="row">`
carries the semantics directly.

### D9.5 — `AdminStatusCounts` clickable filter links

**File:** `src/components/admin/AdminStatusCounts.tsx`
**Defects closed:** UX-17, UX-29

Each count card should be an anchor tag that applies a filter to the
current page. Update the `StatusCountItem` type and component rendering:

```typescript
interface StatusCountItem {
  label: string;
  count: number;
  filterHref?: string;    // e.g. "?status=active" — if omitted, renders as <div>
  active?: boolean;       // true when this filter is currently applied
}
```

When `filterHref` is provided:

```tsx
<a
  href={filterHref}
  aria-current={active ? "page" : undefined}
  className={cn(
    "min-h-[44px] flex flex-col items-center justify-center ...",
    active && "ring-2 ring-primary"
  )}
>
  <span className="text-2xl font-bold">{count}</span>
  <span className="text-xs">{label}</span>
</a>
```

When `filterHref` is omitted, render the existing `<div>` layout unchanged
(backward compatibility).

### D9.6 — `AdminBrowseFilters` toggle auto-submit

**File:** `src/components/admin/AdminBrowseFilters.tsx`
**Defects closed:** UX-18, UX-44

Toggle filter fields should auto-submit the form when changed, not wait
for an explicit submit button click:

```typescript
// In the "toggle" case render:
<input
  type="checkbox"
  id={field.id}
  name={field.id}
  defaultChecked={field.defaultValue === "true"}
  onChange={(e) => {
    const form = e.currentTarget.closest("form");
    if (form) form.requestSubmit();
  }}
  aria-label={field.label}
/>
```

---

## File Inventory

### Modified Files

| File | Change |
|------|--------|
| `src/components/admin/AdminSection.tsx` | h1→h2, add `breadcrumbs` prop (D9.1) |
| `src/components/admin/AdminDetailShell.tsx` | Add `sidebarLabel`, `backHref`, `backLabel` props; apply `aria-label` to aside; render back-link (D9.2) |
| `src/components/admin/AdminDataTable.tsx` | Add `ariaLabel` prop, apply to `<table>`; change first-column cell to `<th scope="row">` (D9.3, D9.4) |
| `src/components/admin/AdminStatusCounts.tsx` | Add `filterHref` / `active` to `StatusCountItem`; render as `<a>` when href present (D9.5) |
| `src/components/admin/AdminBrowseFilters.tsx` | Toggle onChange auto-submit (D9.6) |

---

## Acceptance Criteria

- [ ] `AdminSection` renders `<h2>` for title, NOT `<h1>`
- [ ] `AdminSection` — when `breadcrumbs` prop is provided, renders `<AdminBreadcrumb>`
- [ ] `AdminDetailShell` aside has `aria-label` attribute
- [ ] `AdminDetailShell` — `backHref` prop renders a back-link `<a>` element
- [ ] `AdminDetailShell` — omitting `backHref` renders no back-link
- [ ] `AdminDataTable` has `aria-label` on the `<table>` element
- [ ] `AdminDataTable` first column cell is `<th scope="row">`, NOT `<td>`
- [ ] `AdminStatusCounts` — item with `filterHref` renders as `<a>`
- [ ] `AdminStatusCounts` — item with `active: true` gets `aria-current="page"`
- [ ] `AdminStatusCounts` — item with `active: true` gets visual ring class
- [ ] `AdminStatusCounts` — item without `filterHref` renders as `<div>` (backward compat)
- [ ] `AdminBrowseFilters` — toggle type triggers `form.requestSubmit()` on change
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No lint errors (`npm run lint`)
- [ ] All existing tests pass without modification

---

## Estimated Tests

| Area | Positive | Negative | Edge | Total |
|------|----------|----------|------|-------|
| D9.1 AdminSection | 3 | 1 | 2 | 6 |
| D9.2 AdminDetailShell | 4 | 2 | 2 | 8 |
| D9.3–D9.4 AdminDataTable | 4 | 2 | 2 | 8 |
| D9.5 AdminStatusCounts | 4 | 1 | 3 | 8 |
| D9.6 AdminBrowseFilters toggle | 3 | 1 | 2 | 6 |
| **Total** | **18** | **7** | **11** | **36** |

---

## Dependencies

- Sprint 8 complete: `AdminBreadcrumb` must exist before D9.1 can import it
- `BreadcrumbItem` type exported from `src/components/admin/AdminBreadcrumb.tsx`
