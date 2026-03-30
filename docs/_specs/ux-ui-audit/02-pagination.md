# UX / UI Audit 02 — Pagination

**Severity:** P1 High across all admin index pages  
**Scope:** All admin list/index routes + their data loaders

---

## UX-08 · P1 High — Zero Pagination on Any Admin Index

**Files:**
- `src/lib/admin/users/admin-users.ts` → `loadAdminUserList`  
- `src/lib/admin/jobs/admin-jobs.ts` → `loadAdminJobList`  
- `src/lib/admin/leads/admin-leads.ts` → `loadAdminLeadsPipeline`  
- `src/lib/admin/conversations/admin-conversations.ts` → `loadAdminConversations`  
- `src/app/admin/journal/page.tsx` → `loadAdminJournalList`

**Observed behaviour:**  
All admin index data loaders fetch **all rows** matching the current filters with no `LIMIT`, `OFFSET`, or cursor. The query results are mapped 1:1 to table rows.

Verification (grepping for pagination primitives):
```
$ grep -rn "limit\|LIMIT\|page\|offset\|cursor\|hasMore" src/lib/admin/
  → Only admin-search.ts returns a result: const limit = options?.limit ?? 20
  → All other loaders: no results
```

No `AdminPagination` component exists anywhere in `src/components/`.

**Problem:**  
1. **Performance** — A production database with 10 000 lead records returns 10 000 rows, maps them all to view models, and renders 10 000 `<tr>` elements. This will freeze the browser tab.
2. **Memory** — Each admin page load holds the full result set in server memory during the RSC render.
3. **Mobile unusability** — On a phone, a table with hundreds of rows is unscrollable and unreadable.
4. **The spec gap** — The original admin spec did not enumerate pagination, but it is a universal requirement for any BREAD surface with unbounded data.

**Scope of affected pages:**

| Page | Table | Risk |
|------|-------|------|
| `/admin/users` | Users table | Low volume today; grows with users |
| `/admin/jobs` | Jobs table | **High risk** — jobs accumulate continuously; 10 000 in first month is likely |
| `/admin/conversations` | Conversations table | **High risk** — every chat session creates a row |
| `/admin/leads` | 4-tab pipeline | Medium risk — slower growth |
| `/admin/journal` | Article list | Low volume |

---

## Recommendation: Shared Pagination Pattern

### 1. Data layer: add `page` param to all loaders

```typescript
// Shared utility
export function parsePage(raw: string | string[] | undefined): number {
  const n = parseInt(typeof raw === "string" ? raw : raw?.[0] ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export const PAGE_SIZE = 50;

// In loadAdminJobList:
const page = parsePage(rawSearchParams.page);
const offset = (page - 1) * PAGE_SIZE;

// In the SQL query:
const rows = db.prepare(`
  SELECT ... FROM jobs
  WHERE ...
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?
`).all(PAGE_SIZE + 1, offset);  // fetch PAGE_SIZE + 1 to detect hasNextPage

const hasNextPage = rows.length > PAGE_SIZE;
const items = rows.slice(0, PAGE_SIZE);
```

### 2. View model: expose pagination state

```typescript
export interface AdminJobListViewModel {
  filters: AdminJobListFilters;
  statusCounts: Record<string, number>;
  toolNameCounts: Record<string, number>;
  total: number;            // grand total (for display, separate COUNT query)
  jobs: AdminJobListEntry[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
```

### 3. Component: `AdminPagination`

```tsx
// src/components/admin/AdminPagination.tsx
interface AdminPaginationProps {
  page: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalLabel?: string;   // e.g. "2 340 jobs"
}
```

Renders prev/next buttons that append `?page=N` to the current URL (preserving all other search params). Optionally shows page number.

### 4. Pages: add `AdminPagination` below each table

```tsx
{listView.jobs.length > 0 && (
  <JobsTableClient ... />
)}
<AdminPagination
  page={listView.page}
  hasNextPage={listView.hasNextPage}
  hasPrevPage={listView.hasPrevPage}
  totalLabel={`${listView.total.toLocaleString()} jobs`}
/>
```

---

## Priority Order

1. **Jobs** (highest risk — continuous growth)  
2. **Conversations** (high risk — every session)  
3. **Users** (medium risk — bounded by customers)  
4. **Leads** (medium risk — bounded by pipeline)  
5. **Journal** (low risk — manually curated content)
