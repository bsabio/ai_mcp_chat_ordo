# Sprint 1 — BREAD Framework & Admin Shell

> Extract the Journal gold-standard BREAD pattern into reusable
> infrastructure. Fix the admin shell (hamburger menu, footer, responsive
> layout). Establish the patterns that every subsequent sprint reuses.

---

## Why This Sprint Exists

The Journal admin works well, but it was built bespoke. Every new admin
entity would require copy-pasting ~500 lines of loader/action/route/page
code. This sprint extracts the repeatable patterns into shared modules so
Sprints 2–5 can build on a DRY foundation.

The admin shell also has structural problems: no footer, a cramped 5-icon
bottom nav, and no hamburger menu. These are fixed here so every subsequent
page inherits a correct shell.

---

## Deliverables

### D1.1 — Shared form parser module

**File:** `src/lib/admin/shared/admin-form-parsers.ts`

Extract from `admin-journal-actions.ts`:

```typescript
export function readRequiredText(formData: FormData, key: string): string;
export function readOptionalText(formData: FormData, key: string): string | null;
export function readRequiredEnum<T extends string>(
  formData: FormData, key: string, valid: readonly T[]
): T;
export function readOptionalEnum<T extends string>(
  formData: FormData, key: string, valid: readonly T[]
): T | null;
```

Update journal actions to import from the shared module.

### D1.2 — Shared workflow transition helpers

**File:** `src/lib/admin/shared/admin-workflow.ts`

Extract the `ALLOWED_TRANSITIONS` + `getWorkflowActionDescriptors()` pattern
into a parameterized module (Strategy pattern):

```typescript
export interface WorkflowConfig<TStatus extends string> {
  transitions: Record<TStatus, readonly TStatus[]>;
  labels: Record<string, { label: string; description: string }>;
}

export interface WorkflowActionDescriptor {
  nextStatus: string;
  label: string;
  description: string;
}

export function getWorkflowActions<TStatus extends string>(
  currentStatus: TStatus,
  config: WorkflowConfig<TStatus>,
): WorkflowActionDescriptor[];
```

Refactor `JournalEditorialInteractor` to use the shared workflow config.

### D1.3 — Shared route helper pattern

**File:** `src/lib/admin/shared/admin-route-helpers.ts`

Define a factory for entity route helpers:

```typescript
export interface AdminEntityRoutes {
  list(): string;
  detail(id: string): string;
  preview?(slug: string): string;
}

export function createAdminEntityRoutes(
  basePath: string,
  options?: { preview?: boolean },
): AdminEntityRoutes;
```

Migrate journal routes to use this factory. New entities get routes for free.

### D1.4 — Shared server action wrapper

**File:** `src/lib/admin/shared/admin-action-helpers.ts`

Higher-order function encapsulating the 5-step server action contract:

```typescript
export function withAdminAction<T>(
  handler: (user: SessionUser, formData: FormData) => Promise<T>,
): (formData: FormData) => Promise<T>;
```

Steps: `"use server"` → `requireAdminPageAccess()` → `handler(user, formData)`
→ (caller handles revalidation + redirect).

This is intentionally thin — it handles only auth, not revalidation, because
revalidation paths are entity-specific.

### D1.5 — Shared list loader builder

**File:** `src/lib/admin/shared/admin-list-helpers.ts`

Generic list loader builder that encapsulates the Journal Browse pattern
(parse filters → parallel count queries per status → map to view model):

```typescript
export interface AdminListConfig<TFilters, TRow, TViewModel> {
  parseFilters(searchParams: Record<string, string | string[] | undefined>): TFilters;
  countAll(filters: TFilters): Promise<number>;
  countByStatus(filters: TFilters): Promise<Record<string, number>>;
  listFiltered(filters: TFilters): Promise<TRow[]>;
  toViewModel(row: TRow): TViewModel;
}

export async function loadAdminList<TFilters, TRow, TViewModel>(
  config: AdminListConfig<TFilters, TRow, TViewModel>,
  searchParams: Record<string, string | string[] | undefined>,
): Promise<{ filters: TFilters; total: number; counts: Record<string, number>; items: TViewModel[] }>;
```

### D1.6 — Shared BREAD UI components

Build the 7 shared components that every BREAD surface reuses:

**`src/components/admin/AdminBrowseFilters.tsx`**
- Props: `{ fields: FilterFieldConfig[], values: Record<string, string> }`
- Renders a GET filter form (search input, select dropdowns, status toggles)
- Submits via standard form GET (URL-driven filtering)

**`src/components/admin/AdminStatusCounts.tsx`**
- Props: `{ counts: { label: string, value: number, active?: boolean }[] }`
- Renders a row of count cards (one per status)
- Active card highlighted

**`src/components/admin/AdminDataTable.tsx`**
- Props: `{ columns: ColumnDef[], rows: unknown[], emptyMessage: string, selectable?: boolean, selectedIds?: Set<string>, onSelectionChange?: (ids: Set<string>) => void }`
- Responsive: renders `<table>` on desktop, card stack below `640px`
- Uses `<th scope="col">` and `<th scope="row">` for accessibility
- When `selectable` is true, renders a checkbox column and tracks selection
  state. Selection is a thin client wrapper around the server-rendered table.

**`src/components/admin/AdminDetailShell.tsx`**
- Props: `{ main: ReactNode, sidebar?: ReactNode }`
- 2-column layout on desktop, stacked on mobile
- Main panel gets ~65% width, sidebar ~35%

**`src/components/admin/AdminWorkflowBar.tsx`**
- Props: `{ actions: WorkflowActionDescriptor[], currentStatus: string }`
- Renders workflow transition buttons with confirmation
- Uses the `WorkflowConfig` from D1.2

**`src/components/admin/AdminEmptyState.tsx`**
- Props: `{ icon?: ReactNode, heading: string, description: string, action?: ReactNode }`
- Consistent empty state with centered layout

**`src/components/admin/AdminBulkActionBar.tsx`**
- Props: `{ count: number, actions: BulkAction[], onClear: () => void }`
- `BulkAction`: `{ label: string, action: string, variant?: "default" | "destructive" }`
- Sticky bottom bar on mobile, floating above table on desktop
- Appears when 1+ rows are selected in `AdminDataTable`
- Confirmation dialog on destructive actions (archive, cancel)
- "Clear" button deselects all
- Uses `btn-secondary` + `haptic-press` styling for action buttons

### D1.7 — AdminDrawer (hamburger menu)

**File:** `src/components/admin/AdminDrawer.tsx`

Client component. Replaces `AdminBottomNav`.

- Hamburger button in the admin header (visible on mobile, hidden on `sm:`)
- Drawer slides in from the left
- Lists all admin nav items from `resolveAdminNavigationItems()`
- Shows active state matching sidebar
- Includes mini footer content (brand + copyright)
- Closes on route change (listens to `usePathname()`)
- Trap focus when open, `Escape` to close
- Glass surface consistent with existing `glass-surface` class

### D1.8 — Remove AdminBottomNav

Delete `src/components/admin/AdminBottomNav.tsx`. Remove its import from
`admin/layout.tsx`. The hamburger drawer replaces it.

### D1.9 — Restore footer to admin routes

Update `src/components/AppShell.tsx`:
- Change the `admin` route surface from `workspace` (no footer) to render
  with `SiteFooter`
- Admin layout manages its own scroll; the footer appears at the end of
  admin page content, not dead-fixed at viewport bottom

### D1.10 — Update admin navigation config

Update `src/lib/admin/admin-navigation.ts` to include all 8 nav items:

| ID | Label | Icon | Status |
|----|-------|------|--------|
| admin-dashboard | Dashboard | D | live |
| admin-users | Users | U | preview |
| admin-leads | Leads | L | preview |
| admin-journal | Journal | J | live |
| admin-prompts | Prompts | P | preview |
| admin-conversations | Conversations | C | preview |
| admin-jobs | Jobs | B | preview |
| admin-system | System | S | preview |

Register corresponding shell routes in `shell-navigation.ts`.

### D1.11 — AI concierge navigation tools

Three tools following the standard `ToolDescriptor` factory + command
pattern:

**`get-current-page.tool.ts`:**
- Input: `{ pathname: string }`
- Output: matched route info + page description
- Roles: `"ALL"`
- Command validates pathname against `SHELL_ROUTES` + admin routes

**`list-available-pages.tool.ts`:**
- Input: none (context provides role)
- Output: all routes accessible by the user's role
- Roles: `"ALL"`

**`navigate-to-page.tool.ts`:**
- Input: `{ path: string }`
- Output: validated route + `__actions__` navigation chip
- Roles: `"ALL"`
- Validates against known routes (no arbitrary URL navigation)

Register in a new `tool-bundles/navigation-tools.ts` bundle.

### D1.12 — Page context injection

Update the chat system prompt builder to append:

```
[Current page: /admin/users — Users admin page]
```

when `currentPathname` is present in the chat request. Validate against
registered routes. Unknown paths get `[Current page: /admin/users]` without
description (safe fallback, no prompt injection).

---

## File Inventory

### New files

| File | Type | Purpose |
|------|------|---------|
| `src/lib/admin/shared/admin-form-parsers.ts` | Module | Shared form parsing |
| `src/lib/admin/shared/admin-workflow.ts` | Module | Parameterized workflow transitions |
| `src/lib/admin/shared/admin-route-helpers.ts` | Module | Route helper factory |
| `src/lib/admin/shared/admin-action-helpers.ts` | Module | Server action wrapper |
| `src/lib/admin/shared/admin-list-helpers.ts` | Module | Generic list loader builder |
| `src/components/admin/AdminBrowseFilters.tsx` | Component | GET filter form |
| `src/components/admin/AdminStatusCounts.tsx` | Component | Status count card row |
| `src/components/admin/AdminDataTable.tsx` | Component | Responsive table/card list |
| `src/components/admin/AdminDetailShell.tsx` | Component | 2-column detail layout |
| `src/components/admin/AdminWorkflowBar.tsx` | Component | Workflow transition buttons |
| `src/components/admin/AdminEmptyState.tsx` | Component | Empty state display |
| `src/components/admin/AdminBulkActionBar.tsx` | Component | Bulk action sticky bar |
| `src/components/admin/AdminDrawer.tsx` | Component | Hamburger drawer |
| `src/core/use-cases/tools/get-current-page.tool.ts` | Tool | Page context query |
| `src/core/use-cases/tools/list-available-pages.tool.ts` | Tool | Route inventory |
| `src/core/use-cases/tools/navigate-to-page.tool.ts` | Tool | Validated navigation |
| `src/lib/chat/tool-bundles/navigation-tools.ts` | Bundle | Register nav tools |

### Modified files

| File | Change |
|------|--------|
| `src/lib/journal/admin-journal-actions.ts` | Import from shared parsers |
| `src/core/use-cases/JournalEditorialInteractor.ts` | Use shared workflow config |
| `src/lib/journal/admin-journal-routes.ts` | Use shared route factory |
| `src/components/AppShell.tsx` | Restore footer for admin routes |
| `src/app/admin/layout.tsx` | Add hamburger button, remove bottom nav |
| `src/lib/admin/admin-navigation.ts` | 8 nav items |
| `src/lib/shell/shell-navigation.ts` | Register new admin routes |
| `src/lib/chat/tool-composition-root.ts` | Register navigation bundle |
| Chat system prompt builder | Append page context |

### Deleted files

| File | Reason |
|------|--------|
| `src/components/admin/AdminBottomNav.tsx` | Replaced by AdminDrawer |

---

## Acceptance Criteria

- [ ] `readRequiredText`, `readOptionalText`, `readRequiredEnum`, `readOptionalEnum` exported from shared module
- [ ] Journal actions import from shared module (no local copies)
- [ ] Journal workflow uses shared `WorkflowConfig` parameterization
- [ ] Journal routes use shared `createAdminEntityRoutes` factory
- [ ] `AdminBottomNav` deleted, no references remain
- [ ] `AdminDrawer` renders on mobile, hamburger button visible < 640px
- [ ] Drawer traps focus, closes on Escape, closes on route change
- [ ] `SiteFooter` renders on admin routes
- [ ] Admin nav config has 8 items
- [ ] 3 navigation tools registered and executable
- [ ] Page context appears in system prompt when pathname provided
- [ ] Unknown pathnames handled safely (no prompt injection)
- [ ] All existing tests still pass
- [ ] `AdminBulkActionBar` appears when rows selected in `AdminDataTable`
- [ ] Bulk bar shows count + action buttons + clear
- [ ] Confirmation dialog on destructive bulk actions
- [ ] `npm run build` succeeds

---

## Estimated Tests

| Area | Count |
|------|-------|
| Shared form parsers | 4 |
| Shared workflow transitions | 3 |
| Shared route helpers | 2 |
| Shared list loader builder | 3 |
| AdminBrowseFilters rendering | 2 |
| AdminDataTable responsive behavior | 3 |
| AdminDetailShell layout | 2 |
| AdminWorkflowBar transitions | 2 |
| AdminEmptyState rendering | 1 |
| AdminBulkActionBar rendering + interaction | 3 |
| AdminDrawer rendering + interaction | 4 |
| Navigation tools (3 tools × 2 cases) | 6 |
| Page context injection | 3 |
| Shell footer restoration | 2 |
| **Total** | **~40** |

---

## Dependencies

- Sprint 0 (green baseline)
