# Sprint 12 — Conversations P0 & Journal Refactor

> Fix the P0 server→client boundary violation in the conversations page.
> Refactor the journal admin page to use `AdminBrowseFilters` and standard
> admin components, replacing its bespoke `editorial-page-shell` layout.
> Wire correct command-palette navigation entries.

---

## Why This Sprint Exists

The conversations page has the same server→client `ColumnDef` violation
that was fixed for users, jobs, and leads. `ColumnDef` render functions
defined in a React Server Component and passed as props to a Client
Component is a Next.js 16 hard error waiting to happen. It is the only
P0 remaining.

The journal admin page predates the admin platform standards — it uses an
`editorial-page-shell` CSS class borrowed from the public site,
inline filter logic instead of `AdminBrowseFilters`, a raw `<table>` with
missing `scope="col"` on column headers, and action links ("Preview" /
"Manage") that carry no row context for screen readers. Bringing it into
parity with every other admin page removes an inconsistency and a table
accessibility violation.

---

## Deliverables

### D12.1 — `ConversationsTableClient`

**File:** `src/components/admin/ConversationsTableClient.tsx`
**Defects closed:** UX-09

Extract the `COLUMNS` definition and the table render to a `"use client"`
component, exactly as was done for users, jobs, and leads:

```typescript
"use client";

import type { ColumnDef } from "@/components/admin/AdminDataTable";
import type { AdminConversationViewModel } from "@/lib/admin/conversations/admin-conversation-loaders";

const COLUMNS: ColumnDef<AdminConversationViewModel>[] = [
  {
    key: "title",
    header: "Title",
    render: (row) => (
      <a href={`/admin/conversations/${row.id}`} className="font-medium hover:underline">
        {row.title ?? "(untitled)"}
      </a>
    ),
  },
  { key: "userId", header: "User" },
  { key: "status", header: "Status" },
  { key: "detectedNeedSummary", header: "Detected Need" },
  { key: "createdAt", header: "Created" },
];

interface ConversationsTableClientProps {
  rows: AdminConversationViewModel[];
  total: number;
  page: number;
  pageSize: number;
}

export function ConversationsTableClient(
  props: ConversationsTableClientProps,
): React.ReactElement
```

The component renders `<AdminBulkTableWrapper>` (or equivalent) with
`columns={COLUMNS}` and `rows={rows}`. It MUST NOT be a server component.

### D12.2 — Update `conversations/page.tsx`

**File:** `src/app/admin/conversations/page.tsx`
**Defects closed:** UX-09 (complete)

Remove the `COLUMNS` definition from the server component. Import and
render `<ConversationsTableClient>` instead of passing raw `ColumnDef[]`
to `AdminBulkTableWrapper` or the equivalent.

The server component retains all data-loading logic. It passes only
serialisable props to the client component.

### D12.3 — Fix conversations takeover form confirm

**File:** `src/app/admin/conversations/[id]/page.tsx` (or equivalent action component)
**Defects closed:** UX-28 (wire correct confirm)

The `AdminWorkflowBar` component HAS a two-step confirm (`confirming`
state). Verify the takeover action (if one exists) is wired through this
confirm flow. If the form fires immediately without confirm:

1. Wrap the takeover form submission in the `AdminWorkflowBar` confirm
   flow or add an equivalent `aria-haspopup="dialog"` confirmation step
2. The confirm message must state: "Take over this conversation? The
   current session will be interrupted." with Confirm / Cancel buttons

### D12.4 — Command palette entry for conversations

**File:** `src/lib/shell/admin-navigation.ts`
**Defects closed:** UX-10

Ensure the `conversations` admin route has `showInCommands: true` and
that the command palette search includes a navigation shortcut for it.
Add an entry for the conversations page with a keyboard shortcut hint
of `C` in the navigation commands.

### D12.5 — Journal page: replace bespoke layout with admin standards

**File:** `src/app/admin/journal/page.tsx`
**Defects closed:** UX-36, UX-42, UX-43

Three changes in one page refactor:

**a. CSS coupling:** Remove `editorial-page-shell` class from the journal
admin page's outer wrapper. The page must use `AdminSection` and the
standard admin layout classes.

**b. Filters:** Replace the inline `<form>` filter bar with
`<AdminBrowseFilters fields={...} />`. The existing filter state (title
search, status select) maps directly to the `search` and `select`
`FilterFieldConfig` types.

**c. Table accessibility:** The raw `<table>` column headers (`<th>` elements)
must have `scope="col"`. All action links in the table ("Preview",
"Manage") must include visually hidden row context:

```tsx
// Before
<a href={previewUrl}>Preview</a>

// After
<a href={previewUrl}>
  Preview
  <span className="sr-only"> "{row.title}"</span>
</a>
```

---

## File Inventory

### New Files

| File | Purpose |
|------|---------|
| `src/components/admin/ConversationsTableClient.tsx` | Client component for conversations table (D12.1) |

### Modified Files

| File | Change |
|------|--------|
| `src/app/admin/conversations/page.tsx` | Remove COLUMNS, render ConversationsTableClient (D12.2) |
| `src/app/admin/conversations/[id]/page.tsx` | Wire takeover confirm (D12.3) |
| `src/lib/shell/admin-navigation.ts` | Add showInCommands to conversations (D12.4) |
| `src/app/admin/journal/page.tsx` | Remove editorial-page-shell, use AdminBrowseFilters, fix th scope, fix action link sr-only (D12.5) |

---

## Acceptance Criteria

- [ ] `ConversationsTableClient.tsx` exists and has `"use client"` directive
- [ ] `conversations/page.tsx` does NOT define `ColumnDef[]` render functions
- [ ] `conversations/page.tsx` imports `ConversationsTableClient`
- [ ] Conversations P0: `npx tsc --noEmit` exits 0 with no new errors
- [ ] Takeover action (if present) goes through a confirm step before firing
- [ ] Journal page does NOT contain `editorial-page-shell` CSS class
- [ ] Journal page uses `<AdminBrowseFilters>` instead of inline filter form
- [ ] Journal table `<th>` elements all have `scope="col"`
- [ ] Journal action links contain `<span className="sr-only">` row context
- [ ] No TypeScript errors
- [ ] No lint errors

---

## Estimated Tests

| Area | Positive | Negative | Edge | Total |
|------|----------|----------|------|-------|
| D12.1 ConversationsTableClient source | 3 | 1 | 2 | 6 |
| D12.2 conversations/page server component | 3 | 1 | 1 | 5 |
| D12.3 Takeover confirm flow | 2 | 1 | 2 | 5 |
| D12.4 Command palette entry | 2 | 0 | 0 | 2 |
| D12.5 Journal refactor | 5 | 2 | 3 | 10 |
| **Total** | **15** | **5** | **8** | **28** |

---

## Dependencies

- Sprint 9 complete: `AdminSection` must use standard layout for D12.5
- Sprint 8 complete: `AdminBrowseFilters` date/description support for D12.5 (filter migration)
- Existing `AdminBulkTableWrapper` or `AdminDataTable` API unchanged
