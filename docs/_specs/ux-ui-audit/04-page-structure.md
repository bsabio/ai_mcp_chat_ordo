# UX / UI Audit 04 — Page Structure & One-Table Rule

**Severity:** P0 Critical (conversations bug) · P2 Medium (structure)  
**Scope:** All admin pages audited for the "one table per page" rule, residual sections, and the server→client ColumnDef bug

---

## UX-11 · P0 Critical — Conversations Page Still Has ColumnDef Render Functions in Server Component

**File:** `src/app/admin/conversations/page.tsx`

**Observed issue:**  
The conversations page defines `ColumnDef[]` with `render` functions in the server component and passes them to `AdminBulkTableWrapper` (a client component). This is the **identical** server→client serialization violation that was fixed for the users, jobs, and leads pages in the previous session.

```tsx
// src/app/admin/conversations/page.tsx — SERVER COMPONENT
const COLUMNS: ColumnDef[] = [
  {
    key: "userName",
    header: "User",
    render: (_v, row) => {  // ← function crossing RSC boundary ❌
      return <a href={e.detailHref}>{e.userName}</a>;
    },
  },
  ...
];

// Passed to client component:
<AdminBulkTableWrapper
  columns={COLUMNS}   // ← serialization failure at runtime
  ...
```

**Impact:**  
Next.js 16.1.6 Turbopack will throw the same "Functions cannot be passed directly to Client Components" error in production when the conversations page renders, just as it did for jobs/users/leads before the fix.

**Fix required:**  
Create `src/components/admin/ConversationsTableClient.tsx` following the same pattern as `UsersTableClient`, `JobsTableClient`, and `LeadsTableClient`. Move the `COLUMNS` constant and all render functions into the client component. The server page passes only serializable `rows`.

---

## UX-12 · P2 Medium — Admin Layout Uses `jobs-page-shell` CSS Class

**File:** `src/app/admin/layout.tsx`

**Observed:**
```tsx
<main
  className="jobs-page-shell min-h-0 min-w-0 overflow-y-auto ..."
  data-admin-scroll-region="true"
>
```

The admin main content region uses the `jobs-page-shell` CSS class — a visual style originally designed for the public Jobs page. This was noted in QA Report 04 (DEF-022). The admin shell has **no independent CSS namespace**; all its visual primitives borrow from the Jobs page stylesheet.

**Impact:**
- A CSS change to `jobs-page-shell` (e.g. for the public `/jobs` page re-skin) would accidentally break the admin layout.
- Class naming is confusing for future developers reading the markup.

**Recommendation:**  
Create `src/app/styles/admin.css` with admin-namespaced tokens. Rename `jobs-page-shell` → `admin-content-shell` on the layout `<main>` element.

---

## Page-by-Page Structure Audit

### Admin Index Pages (one table rule)

| Page | Status | Issue |
|------|--------|-------|
| `/admin/users` | ✅ Clean | Single table, one `UsersTableClient` |
| `/admin/jobs` | ✅ Clean | Single table, one `JobsTableClient` |
| `/admin/leads` | ✅ Clean | Tabbed single table per tab, `LeadsTableClient` |
| `/admin/conversations` | ❌ Bug (UX-11) | ColumnDef render functions in server component |
| `/admin/journal` | ✅ Clean | Single table |
| `/admin/prompts` | ✅ Clean | Card grid of prompt slots |
| `/admin/system` | ⚠️ Review needed | Placeholder — no table, status cards only |

### Admin Detail Pages (record-type coverage)

| Record Type | Detail Page | Status | Gap |
|-------------|-------------|--------|-----|
| User | `/admin/users/[id]` | ✅ Exists | Missing: login history, recent jobs |
| Job | `/admin/jobs/[id]` | ✅ Exists | Payload/events are complete |
| Lead | `/admin/leads/[id]` | ✅ Exists | Full qualification fields, workflow bar |
| Consultation | `/admin/leads/[id]` (type=consultation) | ✅ Exists | Handled by pipeline detail router |
| Deal | `/admin/leads/[id]` (type=deal) | ✅ Exists | Handled by pipeline detail router |
| Training Path | `/admin/leads/[id]` (type=training) | ✅ Exists | Handled |
| Conversation | `/admin/conversations/[id]` | ✅ Exists | Full message thread, takeover action |
| Journal Post | `/admin/journal/[id]` | ✅ Exists | Most complete — workflow, metadata, revisions, attribution |
| Prompt Version | `/admin/prompts/[role]/[type]` | ✅ Exists | Versions list, activate action |
| System Config | `/admin/system` | ⚠️ No detail | System page is a card grid, no drilldown |

**Gap: System page has no detail or edit surface.** The system page (`/admin/system`) renders status cards but offers no way to edit feature flags, model policy, or thresholds. A separate `admin-system` audit is needed when that surface is spec'd.

---

## UX-13 · P2 Medium — Conversations Page Dual Count Cards (Two `AdminStatusCounts`)

**File:** `src/app/admin/conversations/page.tsx`

**Observed:**  
The conversations index page renders **two** `<AdminStatusCounts>` rows back to back — one for status (active/archived) and one for lane counts. On mobile this creates two full-width pill rows before the filters, pushing the table far down the viewport.

```tsx
<AdminStatusCounts counts={statusCards} />    {/* status: active, archived */}
{laneCards.length > 0 && <AdminStatusCounts counts={laneCards} />}  {/* lane: sales, training... */}
<AdminBrowseFilters ... />
```

> **Second-pass correction:** Source inspection confirmed that `AdminStatusCounts` renders plain `<div>` elements — **the cards are not interactive**. They display counts for orientation but do not fire filters when clicked. The `AdminBrowseFilters` `<select>` is the only actual filter mechanism. This makes the two separate count-card rows even more confusing: users see status numbers and expect clicking them to filter (Gmail, Jira pattern), but nothing happens.

**Recommendation:**  
- Convert the count pills to `<a href="?status=…">` links so they function as expected filter shortcuts. This also addresses the gap noted in UX-17.
- Or merge counts into a single row and remove the duplicate status dimension from the `<select>`.

On mobile, at minimum consolidate the two count rows into one horizontal scroll strip with `overflow-x-auto`.

---

## UX-14 · P2 Medium — Jobs Detail: Payload Dumps Raw JSON Without Syntax Highlighting

**File:** `src/app/admin/jobs/[id]/page.tsx`

**Observed:**  
Request payload, result payload, and event payloads are rendered as raw `<pre>{JSON.stringify(data, null, 2)}</pre>`. On large jobs (e.g. blog article generation), these payloads can be thousands of lines.

**Problems:**
- No syntax highlighting makes scanning a raw JSON blob difficult
- No copy button
- `max-h-80 overflow-auto` is fine but 20rem is often too short for useful payloads
- Event payloads are in an event timeline but each also dumps raw JSON inline

**Recommendation:**  
A lightweight client component `<JsonViewer data={payload} />` with optional collapsible tree view and a one-click copy button. This is a single component that dramatically improves job debugging ergonomics.

---

## UX-36 · P2 Medium — Journal Admin List Uses Non-Standard Layout Pattern

**File:** `src/app/admin/journal/page.tsx`

**Observed:**  
The journal admin list page uses a completely different layout from every other admin page. While all other admin pages use `<AdminSection>` + `<AdminCard>` (which render `jobs-hero-surface` and `jobs-panel-surface` with consistent spacing tokens), the journal list renders its own custom structure:

```tsx
<div className="shell-page editorial-page-shell">
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-(--space-8) px-(--space-frame-default) ...">
    <header className="flex flex-col gap-(--space-cluster-default) border-b ...">
      ...
    </header>
    <form method="get" ...>  {/* inline filter form, not AdminBrowseFilters */}
      <input name="q" ... />
      <select name="status" ... />
      ...
    </form>
    <section aria-label="Workflow counts" ...>  {/* inline count cards */}
    <section ...>  {/* raw <table> */}
```

**Problems:**
1. Uses `editorial-page-shell` CSS class — the same class used for public-facing journal posts, not for admin utility pages. Any editorial CSS change could break the admin layout.
2. Does not use `AdminBrowseFilters`, losing the consistent filter form UI across all admin index pages.
3. Raw `<table>` defined inline instead of using `AdminDataTable`, which has built-in responsive column/card switching, selection, and ARIA attributes.
4. `<th>` elements have no `scope="col"` attribute (see also UX-42).
5. The workflow count `<article>` cards are non-interactive display-only elements — same misleading visual pattern as `AdminStatusCounts` (see UX-13 correction).
6. Action links ("Preview", "Manage") have no row context for screen readers (see UX-43).

**Recommendation:**  
Migrate `src/app/admin/journal/page.tsx` to use `AdminSection` + a client-side `JournalTableClient` component (following the same pattern as `JobsTableClient`, `UsersTableClient`). The filter form should use `AdminBrowseFilters` with a `type: "date"` extension if needed. The workflow count cards should either be converted to filter links or rendered as `AdminStatusCounts`.

This is a structural refactor; prioritise after the conversations P0 fix.
