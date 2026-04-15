# Sprint 11 — Pagination Data Layer

> Add cursor/offset pagination to every admin index loader. A shared
> `buildAdminPaginationParams` utility extracts `page` and `pageSize`
> from the URL search params and returns `{ limit, offset }` ready for
> SQL. Wire `AdminPagination` (Sprint 8) into every admin index page.

---

## Why This Sprint Exists

Every admin index page currently calls its loader with no limit clause,
returning the entire database table on every page render. At development
scale (dozens of records) this is invisible. At production scale — 10 000
job records, 2 000 leads, hundreds of users — this becomes a hard crash
vector, not just a performance issue.

Pagination is the single highest-leverage remaining infrastructure gap.
The `AdminPagination` component was built in Sprint 8. This sprint wires
it to data.

---

## Deliverables

### D11.1 — `buildAdminPaginationParams` utility

**File:** `src/lib/admin/admin-pagination.ts`
**Defects closed:** UX-08

```typescript
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export interface AdminPaginationParams {
  page: number;       // 1-based
  pageSize: number;
  limit: number;
  offset: number;
}

export function buildAdminPaginationParams(
  searchParams: Record<string, string | string[] | undefined>,
  defaultPageSize?: number,
): AdminPaginationParams
```

**Rules:**
- Parses `searchParams.page` (string → integer, defaults to `1`)
- Parses `searchParams.pageSize` (string → integer, defaults to `defaultPageSize ?? DEFAULT_PAGE_SIZE`)
- Clamps `page` to minimum `1`
- Clamps `pageSize` to range `[1, MAX_PAGE_SIZE]`
- Returns `{ page, pageSize, limit: pageSize, offset: (page - 1) * pageSize }`
- Non-numeric / undefined values fall back to defaults silently

### D11.2 — Paginate `loadAdminUserList`

**File:** `src/lib/admin/users/admin-user-loaders.ts` (or equivalent)
**Defects closed:** UX-08 (users)

Add `page` and `pageSize` parameters:

```typescript
export async function loadAdminUserList(
  filters: AdminUserFilters,
  pagination: AdminPaginationParams,
): Promise<{ items: AdminUserViewModel[]; total: number }>
```

The loader must call `mapper.count(filters)` in parallel with
`mapper.list(filters, { limit, offset })` using `Promise.all`, returning
both `items` and `total` so the page can compute `totalPages`.

Update `src/app/admin/users/page.tsx` to:
1. Extract `page` from `searchParams` using `buildAdminPaginationParams`
2. Pass pagination to `loadAdminUserList`
3. Render `<AdminPagination page={page} total={total} pageSize={pageSize} baseHref="/admin/users" />`

### D11.3 — Paginate `loadAdminJobList`

**File:** `src/lib/admin/jobs/admin-job-loaders.ts`
**Defects closed:** UX-08 (jobs)

Same pattern as D11.2. Update `src/app/admin/jobs/page.tsx` accordingly.
Default page size for jobs: `50` (jobs cycle quickly; larger list is useful).

### D11.4 — Paginate `loadAdminConversations`

**File:** `src/lib/admin/conversations/admin-conversation-loaders.ts`
**Defects closed:** UX-08 (conversations)

Same pattern as D11.2. Update `src/app/admin/conversations/page.tsx`.

### D11.5 — Paginate `loadAdminLeadsPipeline`

**File:** `src/lib/admin/leads/admin-lead-loaders.ts`
**Defects closed:** UX-08 (leads)

Same pattern as D11.2. The leads pipeline loader returns multiple views
(leads + consultations + deals + training). Each view must be
independently paginated or the loader must accept a `entityType`
parameter selecting which view to paginate. The `AdminPagination`
component on the leads page should be scoped to the current active tab.

### D11.6 — Paginate `loadAdminJournalList`

**File:** `src/lib/admin/journal/admin-journal-loaders.ts`
**Defects closed:** UX-08 (journal)

Same pattern as D11.2. Update `src/app/admin/journal/page.tsx`.

---

## File Inventory

### New Files

| File | Purpose |
|------|---------|
| `src/lib/admin/admin-pagination.ts` | `buildAdminPaginationParams` utility (D11.1) |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/admin/users/admin-user-loaders.ts` | Add `AdminPaginationParams` param, return `total` (D11.2) |
| `src/app/admin/users/page.tsx` | Extract pagination from searchParams, pass to loader, render `AdminPagination` (D11.2) |
| `src/lib/admin/jobs/admin-job-loaders.ts` | Same pattern (D11.3) |
| `src/app/admin/jobs/page.tsx` | Same pattern (D11.3) |
| `src/lib/admin/conversations/admin-conversation-loaders.ts` | Same pattern (D11.4) |
| `src/app/admin/conversations/page.tsx` | Same pattern (D11.4) |
| `src/lib/admin/leads/admin-lead-loaders.ts` | Same pattern (D11.5) |
| `src/app/admin/leads/page.tsx` | Same pattern (D11.5) |
| `src/lib/admin/journal/admin-journal-loaders.ts` | Same pattern (D11.6) |
| `src/app/admin/journal/page.tsx` | Same pattern (D11.6) |

---

## Acceptance Criteria

- [ ] `buildAdminPaginationParams` exists at `src/lib/admin/admin-pagination.ts`
- [ ] `buildAdminPaginationParams({})` returns `{ page: 1, pageSize: 25, limit: 25, offset: 0 }`
- [ ] `buildAdminPaginationParams({ page: "3", pageSize: "10" })` returns `{ page: 3, pageSize: 10, limit: 10, offset: 20 }`
- [ ] `buildAdminPaginationParams({ page: "-5" })` clamps to `page: 1`
- [ ] `buildAdminPaginationParams({ pageSize: "999" })` clamps to `pageSize: 100`
- [ ] `buildAdminPaginationParams({ page: "abc" })` defaults to `page: 1`
- [ ] All 5 loaders accept `AdminPaginationParams` and return `{ items, total }`
- [ ] All 5 index pages render `<AdminPagination>` with correct props
- [ ] `AdminPagination` is NOT rendered when `total <= pageSize` (single page)
- [ ] No TypeScript errors
- [ ] No lint errors

---

## Estimated Tests

| Area | Positive | Negative | Edge | Total |
|------|----------|----------|------|-------|
| D11.1 buildAdminPaginationParams | 5 | 3 | 5 | 13 |
| D11.2 Users loader + page | 3 | 2 | 2 | 7 |
| D11.3 Jobs loader + page | 2 | 1 | 1 | 4 |
| D11.4 Conversations loader + page | 2 | 1 | 1 | 4 |
| D11.5 Leads loader + page | 2 | 1 | 2 | 5 |
| D11.6 Journal loader + page | 2 | 1 | 1 | 4 |
| **Total** | **16** | **9** | **12** | **37** |

---

## Dependencies

- Sprint 8: `AdminPagination` component must exist and be shippable
- Existing `DataMapper` implementations must support `limit` and `offset`
  options (or their equivalent `LIMIT`/`OFFSET` SQL parameters)
