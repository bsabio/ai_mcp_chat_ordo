# QA Report 07 — Architecture & Code Quality

**Severity range:** P1 High / P2 Medium / P3 Low  
**Scope:** Component structure, error handling, code organization, naming conventions, and maintainability.

---

## DEF-043 · P1 High — JobsPagePanel Is a 600+ Line Monolith

**File:** `src/components/jobs/JobsPagePanel.tsx`  
**Spec reference:** Sprint 5 — Jobs Elevation  
**Expected decomposition:**
- `JobsHero.tsx` — title, description, metrics (~40 lines)
- `JobCard.tsx` — individual job summary card (~60 lines)
- `JobDetail.tsx` — selected job detail panel (~80 lines)
- `JobEventTimeline.tsx` — event history presentation (~50 lines)
- Refactored `JobsPagePanel.tsx` — container wiring (~100 lines)

**Actual:** Single file containing:
- 4 `useState` hooks managing interdependent state
- EventSource connection management (SSE)
- Polling lifecycle with intervals
- 3 nested sub-components (`JobSection`, `JobDetailPanel`, `MetricPill`)
- Form action handlers (cancel, retry)
- Sort logic and computed values

**Problems:**
1. **Testability:** Cannot unit-test individual sub-sections (detail panel, event timeline) in isolation.
2. **Re-render scope:** Any state change re-renders the entire panel including all job cards.
3. **Error isolation:** No error boundaries — a rendering failure in the event timeline crashes the entire jobs surface.
4. **Mobile readability:** The spec calls this "visually dense and hard to read, especially on a phone." The monolith makes targeted mobile optimizations difficult.

---

## DEF-044 · P2 Medium — No Error Boundaries in Admin Shell

**Files:** `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`  
**Expected:** Admin pages that load external data (health probes, lead counts, journal list) should gracefully handle failures with error boundaries or try/catch patterns.  
**Actual:** No `error.tsx` files exist in the admin route hierarchy. If `loadSystemHealthBlock()` throws (e.g., health endpoint unreachable), the entire dashboard page crashes with Next.js's default error page.

**Impact:** A flaky health probe takes down the entire admin dashboard, including lead data that might have loaded successfully.

**Recommendation:** Add `src/app/admin/error.tsx` with a recovery UI. Consider per-card error handling using Suspense + error boundaries for independent failure isolation.

---

## DEF-045 · P2 Medium — Admin Access Guard Called Twice Per Page Load

**Files:** `src/app/admin/layout.tsx`, `src/app/admin/page.tsx` (and all child pages)  
**Observed:** Every admin page calls `await requireAdminPageAccess()` at the page level, AND the layout also calls it:
```tsx
// layout.tsx
export default async function AdminLayout({ children }) {
  await requireAdminPageAccess();  // Call 1
  // ...
}

// page.tsx
export default async function AdminDashboardPage() {
  const user = await requireAdminPageAccess();  // Call 2
  // ...
}
```
**Problem:** The access check likely involves a database query or session lookup. Running it twice on every page load is redundant. The layout check ensures unauthorized users never see the shell; the page check is then unnecessary (or vice versa).

**Caveat:** The page-level call also captures the `user` object for data loading. If the layout doesn't pass user data to children, the second call is needed to get the user. But this is an architectural issue — the user should be resolved once and shared via a context or prop.

**Recommendation:** Resolve user once in layout, use React context or Next.js `headers()` caching to share the result.

---

## DEF-046 · P2 Medium — No `loading.tsx` Files for Admin Routes

**Files:** `src/app/admin/` — no `loading.tsx` anywhere in the route tree  
**Expected:** Long-running server renders (health probes, journal list queries) should show skeleton/loading states.  
**Actual:** No loading UI. The server blocks on data fetching and streams the completed HTML. On slow connections, the browser shows the previous page until the new page's data is ready.

**Impact:** Navigation between admin pages feels unresponsive when data loaders are slow. The operator clicks "Dashboard" and nothing visibly happens for several seconds.

---

## DEF-047 · P2 Medium — Admin Navigation Config Status Labels Are Developer-Only

**File:** `src/lib/admin/admin-navigation.ts`  
**Observed:**
```typescript
{ status: "preview" }  // Users, System, Leads
{ status: "live" }     // Dashboard, Journal
```
These status labels control the "Preview" badge rendering in the sidebar and bottom nav.

**Problem:** Exposing development status ("preview" vs "live") to end users makes the admin platform look unfinished. An operator seeing "Preview" badges next to 3 of 5 navigation items correctly infers that 60% of the platform isn't ready — which undermines confidence.

**Recommendation:** Either remove the badges entirely, or replace them with something neutral like "Coming soon" or "Beta." Or better: don't ship pages that aren't ready — link to them from a roadmap card on the dashboard instead.

---

## DEF-048 · P3 Low — Inconsistent Data Fetching Patterns

**Files:** `src/app/admin/page.tsx`, `src/app/admin/journal/page.tsx`  
**Observed:**
- Dashboard: `Promise.all([loadSystemHealthBlock(user), loadLeadQueueBlock(user)])` — parallel fetch
- Journal list: `loadAdminJournalList(await searchParams)` — single sequential fetch
- Journal detail: `loadAdminJournalDetail(id)` — single sequential fetch

**Problem:** The dashboard correctly parallelizes independent data fetches. But when the 4 missing cards are added (analytics, routing, jobs, signups), each additional loader increases the parallel fan-out. Without Suspense boundaries, all loaders must complete before any content renders.

**Recommendation:** Use React Suspense with individual `<Suspense>` boundaries per card so faster data sources render immediately while slower ones show skeletons.

---

## DEF-049 · P3 Low — `dynamic = "force-dynamic"` Only on Dashboard

**File:** `src/app/admin/page.tsx`  
**Observed:**
```tsx
export const dynamic = "force-dynamic";  // Only on dashboard
```
**Problem:** Only the dashboard page sets `dynamic = "force-dynamic"`. The journal list (which also depends on live data), users page, system page, and leads page don't set this. Since the other pages are currently placeholders, this doesn't cause issues yet — but as they become dynamic, each will need explicit `dynamic` configuration.

**Risk:** When the users page starts querying the database, Next.js might attempt to statically generate it, serving stale data. The developer will need to remember to add `force-dynamic`.

---

## DEF-050 · P3 Low — Route Helper for User Detail Exists But Route Doesn't

**File:** `src/lib/admin/admin-routes.ts`  
**Observed:**
```typescript
export function getAdminUserDetailPath(userId: string): string {
  return `/admin/users/${encodeURIComponent(userId)}`;
}
```
**Problem:** This helper generates paths to `/admin/users/[userId]` which has no page.tsx. Any code using this helper will produce links to a 404 page. The helper creates a false sense that the route exists.

**Recommendation:** Either remove the helper until the page is implemented, or add a thin placeholder `page.tsx` in `[userId]/` that shows "User detail coming soon."
