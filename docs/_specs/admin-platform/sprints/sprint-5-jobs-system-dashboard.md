# Sprint 5 — Jobs, System & Dashboard

> Replace the ~560-line `JobsPagePanel` monolith with standard BREAD,
> build the System page with real configuration surfaces, and wire all
> admin dashboard signal cards.

---

## Why This Sprint Exists

Three admin surfaces are incomplete:

1. **Jobs** — `JobsPagePanel` is a ~560-line client component with inline
   state management, fetch calls, and SSE wiring. It violates every
   principle from Sprint 1: it doesn’t use server components, shared
   loaders, shared route helpers, or view models. It currently lives at
   `/jobs` (outside the admin shell); it needs to move to `/admin/jobs`
   and become a standard BREAD page like everything else.

2. **System** — A one-card stub ("System controls pending"). The system
   configuration data exists (flags, models, env vars, health sweep) but
   has no admin surface.

3. **Dashboard** — Currently loads only 2 of the 12 available operator
   signals (System Health + Lead Queue). The remaining 10 loaders are
   implemented but not called.

---

## Deliverables

### D5.1 — Jobs admin loaders

**File:** `src/lib/admin/jobs/admin-jobs.ts`

The existing `JobQueueDataMapper` already has `listJobsByUser` and
`listJobsByConversation`, but no admin-wide list. Add admin methods:

```typescript
// Add to JobQueueDataMapper:
async listForAdmin(filters: {
  status?: JobStatus;
  toolName?: string;
  afterDate?: string;
  beforeDate?: string;
  limit?: number;
  offset?: number;
}): Promise<JobRequestAdminRow[]>;

async countForAdmin(filters: Omit<typeof filters, 'limit' | 'offset'>): Promise<number>;
async countByStatus(): Promise<Record<string, number>>;
async countByToolName(): Promise<Record<string, number>>;
```

The loader maps results to view models:

```typescript
export interface AdminJobListEntry {
  id: string;
  toolName: string;
  status: string;
  priority: number;
  userName: string | null;
  conversationTitle: string | null;
  progressPercent: number | null;
  progressLabel: string | null;
  attemptCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AdminJobDetailViewModel {
  job: AdminJobListEntry & {
    requestPayload: unknown;
    resultPayload: unknown | null;
    errorMessage: string | null;
    dedupeKey: string | null;
    initiatorType: string;
    claimedBy: string | null;
    leaseExpiresAt: string | null;
  };
  events: Array<{
    id: string;
    eventType: string;
    eventPayload: unknown;
    createdAt: string;
  }>;
}
```

### D5.2 — Jobs admin route helpers

**File:** `src/lib/admin/jobs/admin-jobs-routes.ts`

```typescript
export const jobRoutes = createAdminEntityRoutes("jobs");
```

### D5.3 — Jobs admin actions

**File:** `src/lib/admin/jobs/admin-jobs-actions.ts`

```typescript
export async function cancelJob(formData: FormData): Promise<void>;
export async function retryJob(formData: FormData): Promise<void>;
```

Both use `withAdminAction()`. Cancel sets status to `canceled`. Retry
requeues a failed/canceled job as a new `queued` entry.

**Bulk actions:**
```typescript
export async function bulkCancelJobs(formData: FormData): Promise<void>;
export async function bulkRetryJobs(formData: FormData): Promise<void>;
```

Both parse comma-separated IDs from `FormData`. Bulk cancel only applies
to `queued` or `running` jobs. Bulk retry only applies to `failed` or
`canceled` jobs. Invalid states are silently skipped (partial success).

### D5.4 — Jobs Browse page

**File:** `src/app/admin/jobs/page.tsx`

Replaces the current route that rendered `JobsPagePanel`. Now a standard
server component:

**Layout:**
1. `AdminSection` header
2. Status count cards (queued, running, succeeded, failed, canceled)
3. Filter bar: status dropdown, tool name dropdown, date range
4. Data table:

| Column | Source |
|--------|--------|
| Tool | `tool_name` (human-readable label) |
| Status | Badge with color |
| Progress | Bar or percentage |
| User | Joined from users |
| Conversation | Title linked to conversation detail |
| Attempts | Count |
| Created | Relative timestamp |
| Duration | `completed_at - started_at` or "running" |

**Selectable:** `AdminDataTable` with `selectable` prop. The
`AdminBulkActionBar` offers Cancel (for queued/running) and Retry (for
failed/canceled) actions.

**Auto-refresh:** Instead of SSE in the page component, use a lightweight
client component `<JobsRefreshTrigger />` that polls and calls
`router.refresh()` on the server component. This preserves the RSC
pattern while keeping the list current.

### D5.5 — Jobs Detail page

**File:** `src/app/admin/jobs/[id]/page.tsx`

**Layout:**
1. Header: tool name + status badge + progress bar
2. Main panel: Request/result payload (formatted JSON)
3. Sidebar: Metadata (user, conversation link, priority, attempts,
   dedupe key, initiator, worker ID, timestamps)
4. Bottom: Event timeline (all `job_events` rows ordered by sequence)
5. Action bar: Cancel button (if running/queued), Retry button (if
   failed/canceled)

### D5.6 — Delete `JobsPagePanel` monolith

Remove `src/components/jobs/JobsPagePanel.tsx` and all imports. The
~560-line client component is replaced by D5.4 + D5.5.

Also remove `src/app/jobs/page.tsx` (the old `/jobs` route) and
remove or simplify the client-side API routes that `JobsPagePanel`
depended on (`GET /api/jobs`, `POST /api/jobs/:id`) if they are not used
elsewhere. Keep `GET /api/jobs/events` (SSE) — it may still be useful
for the refresh trigger or customer-facing job tracking.

### D5.7 — System page (configuration surfaces)

**File:** `src/app/admin/system/page.tsx` (replace stub)

The System page becomes a sectioned configuration viewer:

**Section 1 — Health Status**
- Calls `loadSystemHealthBlock()` (already implemented)
- Shows readiness, liveness, environment status with ok/warning/error pills
- Warning details expandable

**Section 2 — Runtime Configuration**
- Display key environment variables (redacted where sensitive):
  `ANTHROPIC_MODEL`, `STUDIO_ORDO_DB_PATH`, `VAPID_PUBLIC_KEY` (shown),
  `ANTHROPIC_API_KEY` (redacted), `JWT_SECRET` (redacted)
- Read-only display, not editable from UI

**Section 3 — Model Policy**
- Current model name and provider
- Token limits from configuration
- Rate limiting parameters

**Section 4 — Registered Tools**
- Count of registered tools (from ToolRegistry)
- Grouped by bundle (blog, admin, conversation, etc.)
- Each tool shows: name, description, required role

**Section 5 — Active Workers**
- Display info from `DEFERRED_JOB_WORKER_ID`
- Recent job throughput (count by status in last hour)

All sections are read-only `AdminCard` components. No forms or mutations.

### D5.8 — Dashboard signal cards (complete wiring)

**File:** `src/app/admin/page.tsx` (extend)

Currently loads 2 signals. Wire the remaining admin + analytics loaders,
plus a new follow-up loader. The dashboard is a **command center** — every
card includes concrete action chips.

**New loader:** Add `loadOverdueFollowUpsBlock()` to
`src/lib/operator/loaders/admin-queue-loaders.ts`. Queries `lead_records`
and `deal_records` where `follow_up_at < now()`, returns grouped counts
and the oldest overdue record per entity type.

| Signal | Loader | Card Description | Quick Actions |
|--------|--------|------------------|---------------|
| System Health | `loadSystemHealthBlock` | Already wired | View details |
| Lead Queue | `loadLeadQueueBlock` | Already wired | Triage top lead, View all |
| Consultation Queue | `loadConsultationRequestQueueBlock` | Pending count + status breakdown | View oldest pending |
| Deal Queue | `loadDealQueueBlock` | Active deals + pipeline value + closed this month | View deal, Create proposal |
| Training Paths | `loadTrainingPathQueueBlock` | Active paths + status breakdown | View active path |
| Overdue Follow-ups | `loadOverdueFollowUpsBlock` | Overdue count by type (leads, deals) | Triage oldest, View all |
| Routing Review | `loadRoutingReviewBlock` | Uncertain conversations + lane changes | Review uncertain |
| Funnel Recommendations | `loadFunnelRecommendationsBlock` | Conversion metrics + drop-off | View funnel |
| Anonymous Opportunities | `loadAnonymousOpportunitiesBlock` | High-value anon conversations | View conversation |
| Recurring Pain Themes | `loadRecurringPainThemesBlock` | Top problem themes from leads | View leads |

**Action chips** are small `btn-secondary` + `haptic-press` buttons that
navigate directly to the relevant record or trigger a quick action.
"Triage top lead" links to the first uncontacted lead's detail page with
the workflow bar focused. "View all" links to the entity Browse page with
the relevant filter pre-set.

**Layout:** 3-column grid on desktop, single column on mobile. Each card
is an `AdminCard` with title, optional status pill, and summary content.

Cards that fail to load (e.g., MCP analytics unavailable) degrade
gracefully to an empty state with "Data unavailable" message. Use
`Promise.allSettled()` to prevent one failure from blocking the page.

### D5.9 — Update admin navigation

**File:** `src/lib/admin/admin-navigation.ts`

Add the new routes from Sprints 3–5:

| routeId | label | status |
|---------|-------|--------|
| `admin-dashboard` | Dashboard | live |
| `admin-users` | Users | live |
| `admin-leads` | Leads | live |
| `admin-journal` | Journal | live |
| `admin-prompts` | Prompts | live |
| `admin-conversations` | Conversations | live |
| `admin-jobs` | Jobs | live |
| `admin-system` | System | live |

All items set to `live` — no more `preview` status.

---

## File Inventory

### New files

| File | Type |
|------|------|
| `src/lib/admin/jobs/admin-jobs.ts` | Loaders |
| `src/lib/admin/jobs/admin-jobs-actions.ts` | Actions |
| `src/lib/admin/jobs/admin-jobs-routes.ts` | Routes |
| `src/app/admin/jobs/page.tsx` | Browse page (replaces `/jobs` monolith) |
| `src/app/admin/jobs/[id]/page.tsx` | Detail page |
| `src/components/admin/JobsRefreshTrigger.tsx` | Client refresh |

### Modified files

| File | Change |
|------|--------|
| `src/adapters/JobQueueDataMapper.ts` | Add admin list/count methods |
| `src/lib/operator/loaders/admin-queue-loaders.ts` | Add `loadOverdueFollowUpsBlock()` |
| `src/app/admin/system/page.tsx` | Replace stub with config sections |
| `src/app/admin/page.tsx` | Wire all 10 dashboard signal cards with action chips |
| `src/lib/admin/admin-navigation.ts` | Add prompts, conversations, jobs; all live |

### Deleted files

| File | Reason |
|------|--------|
| `src/components/jobs/JobsPagePanel.tsx` | Monolith replaced by BREAD |
| `src/app/jobs/page.tsx` | Route moved to `/admin/jobs` |

---

## Acceptance Criteria

### Jobs
- [ ] Browse shows all jobs system-wide with status filter + tool filter
- [ ] Status count cards (queued, running, succeeded, failed, canceled)
- [ ] Job table shows tool, status, progress, user, conversation, duration
- [ ] Detail shows request/result JSON, event timeline, metadata
- [ ] Cancel and Retry actions work via server actions
- [ ] Bulk cancel and bulk retry work for selected jobs
- [ ] Auto-refresh keeps list current without full SSE client component
- [ ] `JobsPagePanel` monolith deleted; no client-side fetch/state management

### System
- [ ] Health section shows readiness/liveness/environment status
- [ ] Runtime config displays key env vars (sensitive values redacted)
- [ ] Model policy section shows current model + limits
- [ ] Tool registry section shows count + grouped tool list
- [ ] Worker section shows recent job throughput
- [ ] All sections read-only (no forms)

### Dashboard
- [ ] All 10 admin signal cards rendered (including Overdue Follow-ups)
- [ ] Every card has concrete action chips (not just display)
- [ ] Action chips navigate to relevant records or trigger quick actions
- [ ] `Promise.allSettled` prevents cascade failures
- [ ] Failed signals show graceful "Data unavailable" empty state
- [ ] 3-column grid on desktop, single column on mobile

### Navigation
- [ ] 8 nav items in drawer/sidebar, all status `live`
- [ ] All existing tests pass

---

## Estimated Tests

| Area | Count |
|------|-------|
| Job admin list/count data mapper methods | 3 |
| Job list loader (filters, view models) | 3 |
| Job detail loader | 2 |
| Cancel/Retry actions | 2 |
| Bulk cancel/retry actions | 2 |
| Jobs Browse page | 2 |
| Jobs Detail page | 2 |
| System page sections | 3 |
| Dashboard signal wiring | 3 |
| Dashboard action chips | 2 |
| Overdue follow-ups loader | 2 |
| Navigation config | 1 |
| **Total** | **~27** |

---

## Dependencies

- Sprint 1 (shared infrastructure)
- Sprint 3 (Leads, Consultations, Deals, Training — dashboard cards reference these)
- Sprint 4 (Prompts, Conversations — nav items added for these)
