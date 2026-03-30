# Admin Platform — System Specification

> Your business runs itself and tells you what matters. The admin platform
> is a calm, AI-first operations center for a solopreneur — where the chat
> assistant is the primary interface, admin pages give visual confirmation
> through standardized BREAD surfaces, and proactive notifications ensure
> nothing slips. Designed for one person checking their phone at a coffee
> shop.

---

## The Gap

The system has strong backend infrastructure — 24 database tables, 12
operator signal loaders, 45 chat tools, a full editorial pipeline, and
clean architecture from entities through adapters — but the admin layer
is incomplete:

1. **One working page.** The Journal admin is production-ready with full
   BREAD (Browse, Read, Edit, Add, Delete). Users, Leads, and System are
   stub cards with no backing data. The Dashboard shows 2 of 10 planned
   signal cards.

2. **Hidden entities.** The database has tables for `system_prompts` (AI
   personality with versioning), `consultation_requests`, `deal_records`,
   `training_path_records`, and `conversations` — none of which have admin
   surfaces. The lead-to-close pipeline is invisible.

3. **No standardized patterns.** The Journal page was built bespoke. Each
   new admin entity is rebuilt from scratch instead of reusing shared
   infrastructure — violating DRY and making every addition expensive.

4. **The Jobs page is a monolith.** `JobsPagePanel.tsx` is ~560 lines of
   client-side state management with SSE, polling, and nested sub-
   components. It lives outside the admin shell at `/jobs`.

5. **12 failing tests** across 7 files. Unstable foundation.

6. **No mobile navigation.** The 5-icon bottom nav is cramped. No hamburger
   menu. Admin routes strip the site footer.

---

## Design Principles

Seven rules that govern every decision:

1. **AI-first administration.** The chat concierge is the primary admin
   interface. Pages exist for spatial tasks (lists, dashboards, detail
   views). Can the operator just tell the AI? Then the page is
   confirmation, not the workflow.

2. **Standardize, then build.** Extract reusable BREAD infrastructure from
   the Journal gold-standard pattern *before* building new entity pages.
   Every admin entity follows the same loader → view-model → server-action
   → route-helper → page-component pipeline. Grady Booch's object model,
   Uncle Bob's Clean Architecture, and Gang of Four patterns (Strategy for
   workflow, Factory for composition, Decorator for cross-cutting, Command
   for tools) are the guiding principles.

3. **Calm and responsive.** Every surface works on a phone. Single-column
   card stacks. Hamburger menu replaces the cramped bottom nav. 44px touch
   targets. The admin shell keeps the site footer. Inspired by Linear
   (decisive calm), Notion (progressive reveal), Vercel (density without
   clutter).

4. **The system talks to you.** When something happens — a signup, a
   failing job, a new lead — the system tells you through chat with action
   chips. Proactive, not reactive.

5. **Progressive disclosure.** Level 1: glanceable summary (badge, count,
   status dot). Level 2: card with key facts. Level 3: full detail. Never
   all three at once. Empty states are opportunities.

6. **People over dashboards.** Every screen answers: "what does the
   operator do with this information?" No dashboards for dashboards' sake.

7. **Simple over flexible.** Build for one operator managing one system.
   Enterprise features go in Future Considerations.

---

## Architecture

### Standardized BREAD Framework

The Journal admin established a gold-standard pattern. We extract it into
reusable infrastructure so every admin entity follows the same structure
with zero copy-paste.

#### The pattern (per entity)

```text
Entity: "users"

core/entities/user.ts                    ← Pure types, zero deps
core/use-cases/UserAdminInteractor.ts    ← UseCase<Req,Res> with repository ports
adapters/UserDataMapper.ts               ← implements UserRepository (exists)

lib/admin/users/
├── admin-users.ts                       ← Loaders returning view models
├── admin-users-actions.ts               ← Server action helpers + form parsers
└── admin-users-routes.ts                ← Pure route helper functions

app/admin/users/
├── page.tsx                             ← Browse (server component, force-dynamic)
└── [id]/page.tsx                        ← Read + Edit (detail page)
```

#### Layer responsibilities

| Layer | Responsibility | Pattern |
|-------|---------------|---------|
| **Entity** | Pure TypeScript interfaces, type unions, status enums | `interface User { ... }`, `type RoleName = "ANONYMOUS" \| ...` |
| **Use-case** | Business rules via `UseCase<Req,Res>`. Defines repository port interfaces alongside interactor. | `class UserAdminInteractor implements UseCase<Req,Res>` with constructor-injected repositories |
| **Adapter** | `DataMapper` classes implementing repository ports. SQL → entity mapping. | `class UserDataMapper implements UserRepository` |
| **Lib (admin)** | View-model loaders, server action helpers, route helpers. Bridge between core and Next.js pages. | `loadAdminUserList(searchParams)` → `AdminUserListViewModel` |
| **App (page)** | Server components. Call `requireAdminPageAccess()`, run loaders, render view models. Inline server actions for mutations. | `export const dynamic = "force-dynamic"` |

#### Shared BREAD infrastructure (`lib/admin/shared/`)

Extracted from Journal patterns into reusable modules:

| Module | Extracts From | Provides |
|--------|--------------|----------|
| `admin-auth.ts` | `requireAdminPageAccess()` | Auth guard (already shared) |
| `admin-form-parsers.ts` | `readRequiredText()`, `readOptionalText()` | Form parsing primitives |
| `admin-list-helpers.ts` | Journal's filter-parse → parallel-count → map pattern | Generic list loader builder |
| `admin-route-helpers.ts` | `createAdminEntityRoutes()` | Route helper factory for entity URLs |
| `admin-workflow.ts` | `getWorkflowActionDescriptors()`, `ALLOWED_TRANSITIONS` | Parameterized state-machine descriptors (Strategy pattern) |
| `admin-action-helpers.ts` | The 5-step server action sequence | `withAdminAction()` higher-order function |

#### Server action contract

Every mutation follows a 5-step sequence:

```text
1. "use server" directive
2. requireAdminPageAccess() — re-authenticate on every call
3. createEntityInteractor() — fresh from RepositoryFactory
4. interactor.method(parsed input) — business logic
5. revalidatePath() × N + redirect() — cache bust + PRG
```

#### Browse page contract

Every Browse page follows:

```text
1. force-dynamic server component
2. requireAdminPageAccess()
3. Parse & validate searchParams → typed filters
4. Promise.all: parallel count queries per status + filtered list
5. Map entities → view-model entries (pre-computed labels, hrefs)
6. Render: header → filter form (GET) → status count cards → data table
```

#### Detail page contract

Every detail page follows:

```text
1. force-dynamic server component
2. requireAdminPageAccess()
3. Load entity by ID (404 if missing)
4. Promise.all: load related data (revisions, assets, linked records)
5. Compute workflow action descriptors from current status
6. Render: metadata section + inline edit forms + workflow buttons + related data panels
```

### Admin Shell

```text
src/app/admin/
├── page.tsx                      ← Dashboard (operator signal cards)
├── layout.tsx                    ← Shared layout (hamburger + sidebar on desktop)
├── users/
│   ├── page.tsx                  ← Users Browse
│   └── [id]/page.tsx             ← User detail (Read + Edit)
├── leads/
│   ├── page.tsx                  ← Leads Browse (unified pipeline view)
│   └── [id]/page.tsx             ← Lead detail (Read + Edit)
├── prompts/
│   ├── page.tsx                  ← System Prompts Browse
│   └── [role]/[promptType]/page.tsx ← Prompt detail (Read + Edit + Activate)
├── conversations/
│   ├── page.tsx                  ← Conversations Browse
│   └── [id]/page.tsx             ← Conversation detail (Read thread)
├── jobs/
│   ├── page.tsx                  ← Jobs Browse (replaces JobsPagePanel)
│   └── [id]/page.tsx             ← Job detail (Read + event timeline)
├── journal/                      ← (existing) Editorial admin
│   ├── page.tsx
│   ├── [id]/page.tsx
│   ├── preview/[slug]/page.tsx
│   └── attribution/page.tsx      ← Content→lead attribution (Sprint 7)
└── system/
    └── page.tsx                  ← System config (flags, models, env, health)
```

**Navigation items** (8 total):

| ID | Label | Route | Status |
|----|-------|-------|--------|
| admin-dashboard | Dashboard | `/admin` | live |
| admin-users | Users | `/admin/users` | preview |
| admin-leads | Leads | `/admin/leads` | preview |
| admin-journal | Journal | `/admin/journal` | live |
| admin-prompts | Prompts | `/admin/prompts` | preview |
| admin-conversations | Conversations | `/admin/conversations` | preview |
| admin-jobs | Jobs | `/admin/jobs` | preview |
| admin-system | System | `/admin/system` | preview |

**Mobile navigation:** Replace the 5-icon bottom nav with a hamburger
drawer (`AdminDrawer`). The drawer slides in from the left, lists all 8
admin routes, and includes the site footer content. The bottom nav is
removed. Desktop keeps the sidebar.

**Shell changes:** Admin routes restore the `SiteFooter`. The AppShell
`workspace` mode gains a footer slot. This aligns admin with the rest of
the site.

### Entity Inventory

Every database-backed entity, grouped by admin surface tier.

#### Tier 1 — Full BREAD pages

| Entity | Table(s) | Browse | Read | Edit | Add | Delete | Status |
|--------|----------|--------|------|------|-----|--------|--------|
| **Users** | `users`, `user_roles`, `user_preferences`, `referrals` | Filter by role | Profile + activity + referrals | Role, affiliate | — (via signup) | — | Sprint 2 |
| **Leads** | `lead_records`, `consultation_requests`, `deal_records`, `training_path_records` | Pipeline tabs: leads → consults → deals → training | Full qualification + founder notes | Triage state, notes | — (via AI capture) | Archive | Sprint 3 |
| **Journal** | `blog_posts`, `blog_assets`, `blog_post_artifacts`, `blog_post_revisions` | Filter by status/section | Full editorial detail | Metadata, body, workflow | Via chat pipeline | — (workflow) | **Live** |
| **System Prompts** | `system_prompts` | Filter by role/type | Full prompt + version history | Content, notes | New version | Deactivate | Sprint 4 |
| **Conversations** | `conversations`, `messages`, `conversation_events` | Filter by lane/status/source | Full thread view | Archive/close/takeover | — (via chat) | Archive | Sprint 4 |
| **Jobs** | `job_requests`, `job_events` | Filter by status/tool | Full detail + event timeline | Cancel | — (via tools) | — | Sprint 5 |

#### Tier 2 — System page sections (not full BREAD)

| Entity | Table(s) | Surface | Notes |
|--------|----------|---------|-------|
| Sessions | `sessions` | System page card | Active count, kill button |
| Push subscriptions | `push_subscriptions` | System page card | Count, status |
| Embeddings | `embeddings`, `bm25_stats` | System page card | Index health stats |
| User files | `user_files` | System page card | Storage audit |
| Config files | `config/*.json` | System page cards | Identity, prompts, flags, models |
| Environment | `env-config.ts` schema | System page card | Masked read-only display |

#### Tier 3 — Viewed within parent entities (no standalone page)

| Entity | Parent | Display |
|--------|--------|---------|
| Messages | Conversations detail | Thread view |
| Conversation events | Conversations detail | Event log |
| Blog assets | Journal detail | Hero image gallery |
| Blog artifacts | Journal detail | Artifact list |
| Blog revisions | Journal detail | Revision history |
| Job events | Jobs detail | Event timeline |
| User preferences | Users detail | Key-value section |
| Referrals | Users detail | Referral history |
| Roles | Users (filter/assign) | Dropdown + badge |

### Leads as a Pipeline

The Leads page is the most complex admin surface because it unifies four
linked tables into a single pipeline view:

```text
lead_records → consultation_requests → deal_records
                                    → training_path_records
```

The Browse page uses **tabs** (not separate pages) for each pipeline stage:

| Tab | Source | Key Fields | Workflow |
|-----|--------|------------|----------|
| Leads | `lead_records` | name, email, org, lane, triage_state | new → contacted → qualified → archived |
| Consultations | `consultation_requests` | lane, request_summary, status | pending → in_progress → completed |
| Deals | `deal_records` | title, org, proposed_scope, estimated_price, status | draft → proposed → accepted → closed |
| Training | `training_path_records` | current_role, primary_goal, recommended_path, status | draft → active → completed |

Each tab follows the standard Browse pattern (filters + counts + list). The
detail page loads the specific record type based on ID.

### Follow-up Scheduler

The #1 revenue leak for a solopreneur is forgotten follow-ups. The pipeline
tracks status but not scheduled next actions.

**Data model:** Add a `follow_up_at` timestamp column to `lead_records` and
`deal_records`. Nullable — not every record needs a follow-up. Set via the
detail page workflow bar or inline from the dashboard.

**Follow-up loader:** `loadOverdueFollowUpsBlock()` in
`src/lib/operator/loaders/admin-queue-loaders.ts`. Returns records where
`follow_up_at < now()` grouped by entity type (leads, deals).

**Dashboard card:** "Overdue Follow-ups" shows the count of overdue items
with direct links. This is the 10th dashboard signal card.

**Notification rule:** `AdminSignalEvaluator` fires a warning when any
follow-up is >24 hours overdue, critical at >72 hours.

**Detail page integration:** The Lead and Deal detail pages show the
follow-up date with a date picker to reschedule. The workflow bar includes
a "Schedule Follow-up" action alongside state transitions.

### Jobs as Standard BREAD

The existing `JobsPagePanel` (~560-line client monolith with SSE, polling,
and 4 useState hooks) is replaced with a standard BREAD page pair:

**Browse** (`/admin/jobs`): Server component. Status filter tabs (queued,
running, succeeded, failed, canceled). Status count cards. Table of jobs
with tool name, status, created date, progress. Sorted: active first, then
most recent.

**Detail** (`/admin/jobs/[id]`): Server component. Full job metadata + event
timeline. Cancel button for active jobs. Links to related artifacts (e.g.,
journal preview for blog production jobs).

**Real-time updates:** Instead of client-side SSE in the page component,
the jobs Browse page simply refreshes via the standard Next.js revalidation.
If live updates are needed later, they can be added as a thin client
wrapper around the server-rendered list — not baked into the page.

This eliminates the monolith, makes jobs consistent with every other admin
entity, and removes ~550 lines of client-side state management.

### AI Concierge (Page Context & Navigation)

The chat assistant becomes a knowledgeable concierge that knows where the
operator is and what they can do.

**Page context injection:** The client sends `currentPathname` in the chat
request. The system prompt builder appends `[Current page: /admin/users]`
so the LLM always knows operator context. Validated against known routes
to prevent prompt injection.

**Navigation tools** (3 tools, all `ToolDescriptor` following the standard
factory + command pattern):

| Tool | Roles | Purpose |
|------|-------|---------|
| `get_current_page` | ALL | Returns current pathname, matched route, page description |
| `list_available_pages` | ALL | Returns all role-accessible routes with descriptions |
| `navigate_to_page` | ALL | Validates route, adds context, returns description |

**Route descriptions:** Extend `ShellRouteDefinition` with an optional
`description` field. Create a `ROUTE_DESCRIPTIONS` map for admin sub-routes
so the AI can explain any page.

### Conversation Takeover

The AI concierge handles conversations 24/7, but when it identifies a
high-value prospect (high lane confidence, detected need = consulting),
the solopreneur should be able to step in.

**Takeover action:** A single server action on the conversation detail page
flips `conversation_mode` from `"ai"` to `"human"`. Add a
`conversation_mode` column to the `conversations` table (values: `ai`,
`human`, default `ai`). The existing `MessageDataMapper.create()` posts a
system message: "The founder has joined the conversation." Subsequent
messages in the thread bypass the AI response pipeline until the operator
explicitly hands back.

**Hand-back action:** A "Return to AI" action re-enables the AI pipeline
and posts a transition message.

**Indicator:** The Conversations Browse page shows a badge on human-mode
conversations so the operator remembers they have active threads.

**Guard rails:** Takeover only available to ADMIN role. The notification
system sends a push alert when the AI routes a conversation as high-value,
so the operator can decide whether to intervene.

### Notification System

A unified, channel-independent architecture. Every notification flows
through the same dispatcher. No separate pipelines for different event
types.

```text
NotificationEvent
  ├─ type: "user_signup" | "lead_arrival" | "job_failure" | ...
  ├─ severity: "info" | "warning" | "critical"
  ├─ title, body, recipient, actions[], meta
        │
        ▼
  NotificationDispatcher
        ├─ ChatChannel → project into operator conversation
        │    → conversational message with action chips
        └─ PushChannel → web-push via existing VAPID/service-worker
```

**Signal evaluator:** `AdminSignalEvaluator` runs operator loaders on an
interval, detects threshold breaches, and emits `NotificationEvent`s
through the dispatcher. Reuses the existing SSE/conversation-projector
infrastructure.

**Volume control** (`user_preferences` table): cooldown minutes per signal,
quiet hours window, per-channel enable/disable. Stored per-user in the
existing `user_preferences` table.

### Operator Dashboard

The admin landing page is a **command center**, not a scoreboard. Every
card answers "what do I do next?" with inline actions.

The system has 12 operator signal loaders (9 admin-facing, 3 customer-
facing). The dashboard wires all 9 admin loaders plus a new follow-up
loader:

| Card | Loader | Key Metric | Quick Actions |
|------|--------|------------|---------------|
| System health | `loadSystemHealthBlock()` | Status dot + message | View details |
| Lead queue | `loadLeadQueueBlock()` | Submitted lead count | Triage top lead, View all |
| Consultation queue | `loadConsultationRequestQueueBlock()` | Pending count + status breakdown | View oldest pending |
| Deal queue | `loadDealQueueBlock()` | Active deals + pipeline value + closed this month | View deal, Create proposal |
| Training paths | `loadTrainingPathQueueBlock()` | Active paths + status breakdown | View active path |
| Overdue follow-ups | `loadOverdueFollowUpsBlock()` | Overdue count by entity type | Triage oldest, View all |
| Routing quality | `loadRoutingReviewBlock()` | Uncertain + follow-up counts | Review uncertain |
| Funnel analytics | `loadFunnelRecommendationsBlock()` | Top recommendation | View funnel |
| Anonymous opportunities | `loadAnonymousOpportunitiesBlock()` | High-value anon conversations | View conversation |
| Pain themes | `loadRecurringPainThemesBlock()` | Top problem themes from leads | View leads |

Cards use `AdminCard` with the status prop (ok/warning/neutral). Each card
includes **concrete action chips** — small buttons that navigate directly
to the relevant record or trigger a quick action (e.g., "Triage" opens the
lead detail with the workflow bar focused). Action chips use `btn-secondary`
+ `haptic-press` styling.

### System Configuration

**Feature flags** (`config/flags.json`): Runtime via `getFeatureFlags()`.
Toggleable from System page and via chat.

**Model configuration** (`config/models.json`): Provider/model/tier
registry. Shown as human-friendly labels (Fast/Balanced/Powerful).

**Environment display:** Masked read-only. API keys show `set`/`unset`
status, never values.

**System prompts:** Promoted to its own BREAD page (`/admin/prompts`)
because the `system_prompts` table has versioning, role-scoping, and
activation toggle — designed for admin management.

---

## Component Architecture

### Existing shared components (reuse as-is)

| Component | API | Usage |
|-----------|-----|-------|
| `AdminSection` | `{ title, description?, children }` | Page-level wrapper with hero header |
| `AdminCard` | `{ title, description?, status?, children }` | Status-aware panel (ok/warning/neutral) |
| `AdminSidebar` | — | Desktop nav from `ADMIN_NAV_CONFIG` |
| `ErrorBoundary` | `{ children, fallback?, name? }` | Status-error styling |

### New shared components (to build)

| Component | API | Purpose |
|-----------|-----|---------|
| `AdminDrawer` | `{ items, isOpen, onClose }` | Mobile hamburger drawer replacing bottom nav |
| `AdminBrowseFilters` | `{ fields, values, invalid? }` | Generic GET filter form (search, select, status) |
| `AdminStatusCounts` | `{ counts: { label, value, active? }[] }` | Status count card row |
| `AdminDataTable` | `{ columns, rows, emptyMessage }` | Responsive table → card list on mobile |
| `AdminDetailShell` | `{ main, sidebar? }` | 2-column detail layout (responsive) |
| `AdminWorkflowBar` | `{ actions: WorkflowActionDescriptor[] }` | Workflow transition buttons with change notes |
| `AdminEmptyState` | `{ icon?, heading, description, action? }` | Consistent empty state |
| `AdminBulkActionBar` | `{ count, actions: BulkAction[] }` | Sticky bar for multi-select operations |

### Bulk Actions

Every Browse page supports multi-select with bulk operations. The
`AdminDataTable` accepts a `selectable` prop that adds checkboxes. When 1+
rows are selected, the `AdminBulkActionBar` appears (sticky bottom on
mobile, floating above the table on desktop):

```text
┌──────────────────────────────────────────────────┐
│ 7 selected  │  Archive  │  Mark Contacted  │  Clear  │
└──────────────────────────────────────────────────┘
```

Available bulk actions per entity:

| Entity | Bulk Actions |
|--------|-------------|
| Users | Change role |
| Leads | Triage (archive, mark contacted, mark qualified) |
| Consultations | Update status |
| Deals | Update status |
| Conversations | Archive |
| Jobs | Cancel, Retry |

Bulk actions use a single server action that receives `FormData` with
comma-separated IDs. The interactor validates each transition individually
(respecting `ALLOWED_TRANSITIONS`) and reports partial failures. One auth
check, one revalidation, N mutations.

### Removed components

| Component | Replacement |
|-----------|-------------|
| `AdminBottomNav` | `AdminDrawer` (hamburger) |
| `JobsPagePanel` | Standard BREAD pages at `/admin/jobs` |

---

## Design Token Usage

All admin components consume the existing design system tokens. No new
tokens are created.

**Surfaces:** `jobs-panel-surface` (cards), `jobs-hero-surface` (section
headers). The `jobs-` prefix is legacy naming from the first admin surface
built. We continue using it for consistency; renaming is a future cosmetic
task.

**Spacing:** Semantic role tokens (`--space-stack-default`, `--space-inset-panel`,
`--space-frame-default`) adapt automatically to density (compact/normal/relaxed).

**Typography:** `shell-section-heading` (eyebrows), `shell-panel-heading`
(card titles), `tier-micro` (pills/badges).

**Buttons:** `btn-primary` (submit), `btn-secondary` (cancel/secondary
actions), `haptic-press` (touch feedback), `focus-ring` (keyboard focus).

**Inputs:** `input-field`, `form-label`, `field-error`, `alert-error`.

---

## Security

- All admin routes enforce `ADMIN` role via `requireAdminPageAccess()`
- All admin API routes check `user.roles.includes("ADMIN")` → 403
- Server actions re-authenticate on every call (no stale session)
- `currentPathname` injection validated against known routes
- Environment variable values never exposed to client — status only
- System prompt edits create new versions (audit trail via version column)
- Feature flag changes require admin auth
- Notification dispatch respects volume caps (anti-spam)
- Form parsers validate against known enum values (no injection)

---

## Testing Strategy

| Category | Approach | Est. Count |
|----------|----------|------------|
| Failing test fixes | Fix root causes in 7 files | ~12 |
| Shared BREAD infrastructure | Unit test extracted modules, shared components, BulkActionBar | ~24 |
| Admin shell & drawer | RTL, responsive rendering | ~8 |
| Navigation tools | Route inventory, context, validation | ~6 |
| Users BREAD | Loaders, actions, pages, bulk role change | ~23 |
| Leads pipeline BREAD | 4-tab pipeline, DataMappers, triage, follow-up, bulk actions | ~30 |
| System Prompts BREAD | Version management, activation | ~12 |
| Conversations BREAD | DataMapper, lane filtering, thread display, takeover, bulk archive | ~14 |
| Jobs BREAD | DataMapper, status filtering, event timeline, bulk actions | ~15 |
| System page | Health, env, tools, workers | ~6 |
| Dashboard signal cards | All 10 cards, action chips, empty states | ~7 |
| Notification dispatch | Event routing, channels, volume, follow-up rules | ~10 |
| Polish & accessibility | Density, focus, touch targets, empty states | ~6 |
| Global search & attribution | Cross-entity search, AI tool, content→lead linking | ~10 |
| **Total** | | **~193** |

---

## Sprint Plan

Eight sprints, each delivering shippable increments. Every sprint after
Sprint 0 builds on the standardized BREAD framework established in Sprint 1.

- **0 — Green Baseline:** Fix 12 failing tests across 7 files. `vitest run` + `tsc --noEmit` + `npm run lint` all green.
- **1 — BREAD Framework & Shell:** Extract shared infrastructure from Journal. Build `AdminDrawer`, `AdminBulkActionBar`, and all shared BREAD components. Restore footer to admin routes. Establish the patterns that all subsequent sprints reuse.
- **2 — Users & Roles:** First entity to use the new BREAD framework. Browse + detail with bulk role change, role management, affiliate toggle, referral history.
- **3 — Leads Pipeline:** 4-tab pipeline view with bulk triage. Follow-up scheduler with `follow_up_at` on leads and deals. The most complex BREAD surface.
- **4 — System Prompts & Conversations:** Prompts BREAD with versioning and activation. Conversations BREAD with lane filters, thread view, takeover/hand-back, and bulk archive.
- **5 — Jobs, System & Dashboard:** Replace `JobsPagePanel` with standard BREAD and bulk cancel/retry. Build real System page. Wire all 10 dashboard signal cards with concrete action chips.
- **6 — Notifications & Polish:** Notification dispatcher with chat + push channels. Signal evaluator with follow-up overdue rules. Density audit, empty states, mobile edge cases, accessibility sweep.
- **7 — Global Search & Attribution:** Cross-entity search bar in the admin shell. AI concierge search tool. Content-to-lead attribution linking journal analytics to pipeline outcomes.

Detailed sprint specs are in `sprints/`.

---

## Future Considerations

- **Public profile pages** — `/people/[slug]` with opt-in public visibility.
- **Email & webhook notification channels** — plug into existing dispatcher.
- **DB-backed feature flags** — with audit trail, once JSON is outgrown.
- **LLM cost tracking** — token counting per user/model.
- **Admin audit log** — all admin actions with timestamp, user, diff.
- **Multi-admin signal routing** — assign signals to specific admins.
- **Local LLM support** — Ollama integration with SSRF prevention.
- **Surface class rename** — `jobs-*` → `admin-*` (cosmetic, low priority).
- **Advanced revenue analytics** — monthly/quarterly trend views, average deal size, win rate, forecast projections.
- **Scheduled actions** — extend follow-up scheduler to support arbitrary scheduled tasks (auto-archive, auto-escalate).
- **Conversation sentiment scoring** — NLP-based satisfaction indicators on conversation threads.
- **Inline prompt testing** — "Test this prompt" button on the prompt detail page with side-by-side result panel.
- **Export / CSV reporting** — CSV and PDF export from any Browse page via server action download.
