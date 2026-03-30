# Sprint 7 — Global Search & Attribution

> Add cross-entity search to the admin shell so the operator can find
> anything in 3 seconds. Wire a search tool into the AI concierge. Build
> the content-to-lead attribution surface that connects journal performance
> to pipeline outcomes.

---

## Why This Sprint Exists

By Sprint 6, every admin entity has its own Browse page with filters. But
there's no way to search across entities. "Find that insurance company
lead" requires knowing it's on the Leads tab, switching to the right tab,
and typing the search query. For a solopreneur who checks in twice a day,
this friction adds up.

The second gap is attribution. The blog/journal system and the lead
pipeline exist in separate silos. The conversation data has
`referral_source` and `session_source` fields — the data to answer "which
blog post generated this lead" may already exist. But no surface connects
content performance to pipeline outcomes. For a solopreneur doing content
marketing, knowing "my post on X brought 4 qualified leads" changes what
you write next.

---

## Deliverables

### D7.1 — Cross-entity search service

**File:** `src/lib/admin/search/admin-search.ts`

A server-side search function that queries across all admin entities:

```typescript
export interface AdminSearchResult {
  entityType: "user" | "lead" | "consultation" | "deal" | "training"
            | "conversation" | "job" | "prompt" | "journal";
  id: string;
  title: string;         // Display-friendly name/title
  subtitle: string;      // Entity-specific context (e.g., "Lead — qualified")
  href: string;          // Link to detail page
  matchField: string;    // Which field matched
  updatedAt: string;
}

export async function searchAdminEntities(
  query: string,
  options?: { entityTypes?: string[]; limit?: number },
): Promise<AdminSearchResult[]>;
```

Implementation uses SQLite `LIKE` queries (case-insensitive) across key
text fields per entity. For the typical solopreneur scale (hundreds of
records, not millions), this is fast enough without FTS. Fields searched:

| Entity | Searched Fields |
|--------|----------------|
| Users | name, email |
| Leads | name, email, organization |
| Consultations | request_summary, lane |
| Deals | title, organization_name, proposed_scope |
| Training | current_role_or_background, primary_goal |
| Conversations | title, detected_need_summary |
| Jobs | tool_name |
| Prompts | role, prompt_type, content (active version only — `WHERE is_active = 1`; no `updated_at` column, sort by `created_at`) |
| Journal | title, slug, description |

Results are ranked by `updated_at` descending (most recent first) and
capped at 20 per query. Entity type badges in the results make it easy
to distinguish a "lead" match from a "conversation" match.

### D7.2 — Admin search bar

**File:** `src/components/admin/AdminSearchBar.tsx`

A client component in the admin shell header. The current layout has no
dedicated header bar — the mobile `AdminDrawer` hamburger lives in a
standalone `<div>` and there is no desktop header. Implementation must
add a header row above the grid that holds the search bar (always
visible on desktop, icon-collapsed on mobile) alongside the existing
hamburger on mobile:

- Text input with search icon, keyboard shortcut `Cmd+K` / `Ctrl+K`
- Debounced input (300ms) triggers server action
- Results appear in a dropdown overlay (not a new page)
- Each result shows: entity type badge + title + subtitle + relative date
- Click navigates to the detail page
- Escape or click-outside closes the dropdown
- Empty state: "Search users, leads, conversations, and more..."
- Loading state: skeleton rows

The search bar is always visible on desktop. On mobile, it collapses to
an icon that expands on tap.

### D7.3 — Admin search server action

**File:** `src/lib/admin/search/admin-search-actions.ts`

```typescript
export async function searchAction(formData: FormData): Promise<AdminSearchResult[]>;
// Parses: query (required, min 2 chars)
// Uses withAdminAction() wrapper
// Returns: AdminSearchResult[]
```

### D7.4 — AI concierge search tool

**File:** `src/core/use-cases/tools/admin-search.tool.ts`

A new `ToolDescriptor` that lets the AI concierge search across entities:

```typescript
// Tool: admin_search
// Input: { query: string, entityTypes?: string[] }
// Output: { results: AdminSearchResult[], totalCount: number }
// Roles: ADMIN
```

This allows the operator to say "find that insurance company" in chat and
get results without navigating to a specific page. The AI can then offer
to navigate to the matching record via `navigate_to_page`.

Register in `tool-bundles/navigation-tools.ts` alongside the existing
navigation tools.

### D7.5 — Content-to-lead attribution loader

**File:** `src/lib/admin/attribution/admin-attribution.ts`

Links journal articles to lead pipeline outcomes using the conversation
trail:

```typescript
export interface JournalAttributionEntry {
  postId: string;
  postTitle: string;
  postSlug: string;
  publishedAt: string;
  conversationsSourced: number;   // Conversations where referral_source matches
  leadsGenerated: number;         // Leads linked via conversation→lead chain
  dealsGenerated: number;         // Deals linked via lead→deal chain
  estimatedRevenue: number;       // Sum of deal estimated_price
}

export async function loadJournalAttribution(
  options?: { afterDate?: string; beforeDate?: string },
): Promise<JournalAttributionEntry[]>;
```

The attribution chain: a conversation's `referral_source` or
`session_source` may contain a journal slug or URL. From the conversation,
trace to `lead_records` via `lead_records.conversation_id` (direct FK),
then to `deal_records` via `deal_records.lead_record_id`. Additionally,
some deals link through the consultation path
(`deal_records.consultation_request_id`) without a `lead_record_id` — the
query should also trace
`conversation → consultation_requests → deal_records` to capture the
full funnel. This gives a "content → conversation → lead/consultation →
deal" attribution per article.

**Table references:** `lead_records`, `deal_records`,
`consultation_requests`, `conversations`. Revenue from
`deal_records.estimated_price` (INTEGER, nullable).

### D7.6 — Attribution dashboard section

**File:** `src/app/admin/journal/attribution/page.tsx`

A new sub-page under the Journal admin:

**Layout:**
1. `AdminSection` header: "Content Attribution"
2. Date range filter (default: last 90 days)
3. Attribution table:

| Column | Source |
|--------|--------|
| Article | Title linked to journal detail |
| Published | Date |
| Conversations | Count of sourced conversations |
| Leads | Count of generated leads |
| Deals | Count of generated deals |
| Est. Revenue | Sum of deal `estimated_price` |

4. Summary row: totals across all articles

Sorted by leads generated (descending) by default. Empty state: "Publish
articles and share them — attribution data appears as visitors convert
through the AI concierge."

### D7.7 — Attribution link from journal detail

**File:** `src/app/admin/journal/[id]/page.tsx` (modify)

Add an "Attribution" card to the journal detail page. The page currently
renders as a single-column detail view with no sidebar — either add an
`AdminDetailShell` wrapper with sidebar slot or append the attribution
card inline below the existing content. The card shows:
- Conversations sourced from this article
- Leads generated
- Estimated revenue attributed

Links to the full attribution page with this article's date range.

---

## File Inventory

### New files

| File | Type |
|------|------|
| `src/lib/admin/search/admin-search.ts` | Search service |
| `src/lib/admin/search/admin-search-actions.ts` | Server action |
| `src/components/admin/AdminSearchBar.tsx` | Search bar component |
| `src/core/use-cases/tools/admin-search.tool.ts` | AI search tool |
| `src/lib/admin/attribution/admin-attribution.ts` | Attribution loader |
| `src/app/admin/journal/attribution/page.tsx` | Attribution page |

### Modified files

| File | Change |
|------|--------|
| `src/app/admin/layout.tsx` | Add search bar to header |
| `src/app/admin/journal/[id]/page.tsx` | Add attribution sidebar card |
| `src/lib/chat/tool-bundles/navigation-tools.ts` | Register search tool |

---

## Acceptance Criteria

### Search
- [ ] `Cmd+K` / `Ctrl+K` focuses the search bar
- [ ] Typing 2+ characters triggers debounced search
- [ ] Results show entity type badge + title + subtitle
- [ ] Click on result navigates to detail page
- [ ] Search works across all 9 entity types
- [ ] Empty state shown for no results
- [ ] AI concierge can use `admin_search` tool
- [ ] Search tool respects ADMIN role restriction
- [ ] Mobile: search icon expands to input on tap

### Attribution
- [ ] Attribution page shows all published articles with pipeline metrics
- [ ] Date range filter works
- [ ] Summary row shows totals
- [ ] Journal detail sidebar shows per-article attribution card
- [ ] Empty state explains data requirements
- [ ] All existing tests pass

---

## Estimated Tests

| Area | Count |
|------|-------|
| Cross-entity search service | 3 |
| Search action (auth, validation) | 2 |
| AdminSearchBar rendering | 2 |
| AI search tool | 2 |
| Attribution loader | 3 |
| Attribution page rendering | 2 |
| Journal detail attribution card | 1 |
| **Total** | **~15** |

---

## Dependencies

- Sprint 6 (all entities live, notification system operational)
- Sprint 1 (shared BREAD infrastructure, navigation tools bundle)

---

## Implementation Notes (QA-verified)

### SQLite tables → entity type mapping

| Entity Type | Table | Notes |
|-------------|-------|-------|
| `user` | `users` | `UserDataMapper` already has LIKE search in `listForAdmin()` |
| `lead` | `lead_records` | `LeadRecordDataMapper` — no LIKE search yet; needs raw SQL |
| `consultation` | `consultation_requests` | `ConsultationRequestDataMapper` — no LIKE search yet |
| `deal` | `deal_records` | `DealRecordDataMapper` — no LIKE search yet |
| `training` | `training_path_records` | `TrainingPathRecordDataMapper` — no LIKE search yet |
| `conversation` | `conversations` | `ConversationDataMapper` has admin listing but no text LIKE |
| `job` | `job_requests` | `JobQueueDataMapper` — no LIKE search yet |
| `prompt` | `system_prompts` | `SystemPromptDataMapper` — no LIKE; no `updated_at` column (use `created_at`) |
| `journal` | `blog_posts` | `BlogPostDataMapper` has LIKE on title+slug in `buildAdminFilterQuery` |

### Database access

All search queries use `getDb()` from `src/lib/db.ts` returning a
`better-sqlite3` `Database` instance. Raw `db.prepare().all()` is
appropriate for the cross-entity search to avoid adding LIKE methods to
every data mapper.

### Admin layout restructuring

`src/app/admin/layout.tsx` currently has:
- Mobile: standalone `<div>` with `AdminDrawer` hamburger
- Desktop: no header, only sidebar+main grid

The search bar requires adding a header row above the grid. Move the
hamburger into this header row so that on mobile the layout becomes:
`[hamburger] [search icon]` and on desktop: `[search bar]` full width
above the sidebar+main grid.

### Tool descriptor pattern

Follow `admin-prioritize-offer.tool.ts`: `roles: ["ADMIN"]`,
`category: "system"`, export a `ToolDescriptor` and register in
`src/lib/chat/tool-bundles/navigation-tools.ts`.

### Attribution FK chain

```
conversations.referral_source / session_source → journal slug
  └─→ lead_records.conversation_id (FK)
       └─→ deal_records.lead_record_id (FK, nullable)
  └─→ consultation_requests.conversation_id (FK)
       └─→ deal_records.consultation_request_id (FK, nullable)
```

Both paths must be queried. `deal_records.estimated_price` is INTEGER
(nullable) for revenue aggregation.
