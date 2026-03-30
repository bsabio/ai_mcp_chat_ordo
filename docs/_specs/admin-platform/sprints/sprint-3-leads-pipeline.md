# Sprint 3 — Leads Pipeline

> Build the unified Leads admin surface covering the full lead→consultation
> →deal→training-path pipeline. The most complex BREAD surface because it
> spans four linked tables with independent workflows.

---

## Why This Sprint Exists

The database already has the complete sales/training pipeline:

- `lead_records` — AI-captured qualification data with triage states
- `consultation_requests` — formal consultation requests with status workflow
- `deal_records` — proposals with pricing, scope, hours, and acceptance status
- `training_path_records` — individual-lane training assessments

Each table has its own DataMapper and operator loader. The admin tools
(`admin_prioritize_leads`, `admin_triage_routing_risk`) already query this
data — but there's no visual admin surface. The Leads page is a stub card.

---

## Deliverables

### D3.1 — Extend pipeline data layers

Add admin-level query methods to each pipeline DataMapper. The loaders
in D3.2 depend on these.

**LeadRecordDataMapper** (extend existing):
```typescript
async listForAdmin(filters: { triageState?: string; limit?: number; offset?: number }): Promise<LeadAdminRow[]>;
async countForAdmin(filters: Omit<typeof filters, 'limit' | 'offset'>): Promise<number>;
async countByTriageState(): Promise<Record<string, number>>;
async listOverdueFollowUps(): Promise<LeadAdminRow[]>;
```

Add a `follow_up_at` nullable timestamp column to `lead_records` via
migration. The column stores the next scheduled follow-up date.

**ConsultationRequestDataMapper** (extend existing):
```typescript
async listForAdmin(filters: { status?: string; limit?: number; offset?: number }): Promise<ConsultationAdminRow[]>;
async countForAdmin(filters: Omit<typeof filters, 'limit' | 'offset'>): Promise<number>;
async countByStatus(): Promise<Record<string, number>>;
```

**DealRecordDataMapper** (extend existing):
```typescript
async listForAdmin(filters: { status?: string; limit?: number; offset?: number }): Promise<DealAdminRow[]>;
async countForAdmin(filters: Omit<typeof filters, 'limit' | 'offset'>): Promise<number>;
async countByStatus(): Promise<Record<string, number>>;
async listOverdueFollowUps(): Promise<DealAdminRow[]>;
```

Add a `follow_up_at` nullable timestamp column to `deal_records` via
migration. Same purpose as leads — schedule the next check-in.

**TrainingPathDataMapper** (extend existing):
```typescript
async listForAdmin(filters: { status?: string; limit?: number; offset?: number }): Promise<TrainingAdminRow[]>;
async countForAdmin(filters: Omit<typeof filters, 'limit' | 'offset'>): Promise<number>;
async countByStatus(): Promise<Record<string, number>>;
```

### D3.2 — Leads admin loaders

**File:** `src/lib/admin/leads/admin-leads.ts`

Four tab loaders + a unified pipeline summary:

```typescript
export async function loadAdminLeadsPipeline(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<AdminLeadsPipelineViewModel>;
```

The view model includes:

```typescript
interface AdminLeadsPipelineViewModel {
  activeTab: "leads" | "consultations" | "deals" | "training";
  pipelineCounts: {
    leads: number;
    consultations: number;
    deals: number;
    training: number;
  };
  // Tab-specific data (only the active tab is loaded)
  tabData: AdminLeadsTabData | AdminConsultationsTabData
         | AdminDealsTabData | AdminTrainingTabData;
}
```

Each tab follows the standard list loader pattern: parse filters → parallel
count queries per status → map to view model entries.

**Lead tab statuses:** `new`, `contacted`, `qualified`, `archived`
**Consultation statuses:** `pending`, `in_progress`, `completed`
**Deal statuses:** `draft`, `proposed`, `accepted`, `closed`
**Training statuses:** `draft`, `active`, `completed`

### D3.3 — Leads admin route helpers

**File:** `src/lib/admin/leads/admin-leads-routes.ts`

The base route uses the shared factory. Sub-entity records share the same
`[id]` route but use a `type` query param for disambiguation:

```typescript
export const leadRoutes = createAdminEntityRoutes("leads");
// leadRoutes.detail(id)  → "/admin/leads/{id}" (type inferred from ID lookup)
```

The detail page looks up the record by ID across all four tables and
renders the appropriate detail view. No separate sub-entity URL paths—
all pipeline records route through `/admin/leads/[id]`.

### D3.4 — Leads admin actions

**File:** `src/lib/admin/leads/admin-leads-actions.ts`

```typescript
export function createLeadTriageInteractor(): LeadCaptureInteractor;
export function createConsultationInteractor(): TriageConsultationRequestInteractor;
export function createDealInteractor(): CreateDealFromWorkflowInteractor;

export function parseTriageForm(formData: FormData): { triageState: string; founderNote?: string };
export function parseConsultationStatusForm(formData: FormData): { status: string };
export function parseDealStatusForm(formData: FormData): { status: string; founderNote?: string };
export function parseFollowUpForm(formData: FormData): { followUpAt: string | null };
export function parseBulkTriageForm(formData: FormData): { ids: string[]; triageState: string };
```

### D3.5 — Leads admin workflow configs

Using the shared `WorkflowConfig` from Sprint 1:

```typescript
export const LEAD_TRIAGE_WORKFLOW: WorkflowConfig<LeadTriageState>;
export const CONSULTATION_WORKFLOW: WorkflowConfig<ConsultationStatus>;
export const DEAL_WORKFLOW: WorkflowConfig<DealStatus>;
export const TRAINING_WORKFLOW: WorkflowConfig<TrainingPathStatus>;
```

### D3.6 — Leads Browse page (tabbed pipeline)

**File:** `src/app/admin/leads/page.tsx`

Replaces the current stub. The page uses URL-driven tabs:

```
/admin/leads                   → defaults to "leads" tab
/admin/leads?tab=consultations → consultations tab
/admin/leads?tab=deals         → deals tab
/admin/leads?tab=training      → training tab
```

**Layout:**
1. `AdminSection` header with pipeline description
2. Pipeline count summary (4 cards, one per stage, always visible)
3. Tab bar (4 tabs, GET navigation)
4. Active tab content: status filter + status counts + data table

**Each tab supports bulk actions** via `AdminDataTable` with `selectable`
prop and `AdminBulkActionBar`:
- Leads tab: bulk archive, bulk mark-as-contacted, bulk mark-as-qualified
- Consultations tab: bulk update status
- Deals tab: bulk update status

**Each tab's table columns:**

| Tab | Columns |
|-----|---------|
| Leads | Name, Email, Org, Lane, Triage state, Created |
| Consultations | Lane, Summary, Status, User, Created |
| Deals | Title, Org, Service type, Est. price, Status, Created |
| Training | Role, Primary goal, Recommended path, Status, Created |

### D3.7 — Lead detail page

**File:** `src/app/admin/leads/[id]/page.tsx`

A single dynamic route that looks up the ID across all four pipeline
tables, then renders the appropriate detail view:

**Lead detail:** Full qualification data (all 15+ `lead_records` fields),
founder note editor, triage state workflow bar, linked consultation/deal
if exists. **Follow-up date picker** to schedule next follow-up (sets
`follow_up_at`). Overdue follow-ups shown with a warning badge.

**Consultation detail:** Request summary, status workflow, linked lead
record, user info.

**Deal detail:** Full proposal (title, org, scope, service type, hours,
training days, price, assumptions, open questions), founder note, customer
response note, status workflow. **Follow-up date picker** to schedule next
check-in (sets `follow_up_at`).

**Training path detail:** Background, technical depth, goal, format preference,
apprenticeship interest, recommended path, fit rationale, status workflow.

All detail pages use `AdminDetailShell` with main + sidebar.

---

## Pipeline Navigation

Detail pages include breadcrumb navigation back to the pipeline:

```
Leads > Lead #abc123 > Deal #def456
```

When a lead has linked consultation requests or deals, the detail page
shows relationship cards in the sidebar with links to the related records.

---

## File Inventory

### New files

| File | Type |
|------|------|
| `src/lib/admin/leads/admin-leads.ts` | Loaders |
| `src/lib/admin/leads/admin-leads-actions.ts` | Action helpers |
| `src/lib/admin/leads/admin-leads-routes.ts` | Route helpers |
| `src/lib/admin/leads/admin-leads-workflows.ts` | Workflow configs |
| `src/app/admin/leads/[id]/page.tsx` | Detail page |

### Modified files

| File | Change |
|------|--------|
| `src/app/admin/leads/page.tsx` | Replace stub with pipeline Browse |
| `src/adapters/LeadRecordDataMapper.ts` | Add admin list/count methods |
| `src/adapters/ConsultationRequestDataMapper.ts` | Add admin list/count methods |
| `src/adapters/DealRecordDataMapper.ts` | Add admin list/count methods |
| `src/adapters/TrainingPathDataMapper.ts` | Add admin list/count methods |

---

## Acceptance Criteria

- [ ] Pipeline Browse shows 4 tabs: Leads, Consultations, Deals, Training
- [ ] Pipeline count cards always visible (show total per stage)
- [ ] Each tab has its own status filter + count cards + data table
- [ ] Tab selection persisted in URL (`?tab=deals`)
- [ ] Lead detail shows all 15+ qualification fields
- [ ] Founder note can be edited inline
- [ ] Follow-up date can be set on lead and deal detail pages
- [ ] Overdue follow-ups shown with warning badge
- [ ] Bulk triage actions work (select multiple → archive/mark contacted)
- [ ] Triage state transitions via workflow bar
- [ ] Deal detail shows pricing, scope, hours, and status workflow
- [ ] Training path detail shows fit assessment and recommended path
- [ ] Linked records shown in sidebar with navigation links
- [ ] Empty states per tab ("No leads yet — the AI concierge captures them during conversations")
- [ ] Mobile: responsive cards instead of table rows
- [ ] All loaders return view models
- [ ] All existing tests pass

---

## Estimated Tests

| Area | Count |
|------|-------|
| Lead admin DataMapper methods | 3 |
| Consultation/deal/training DataMapper methods | 3 |
| Lead list loader (filters, counts, tab data) | 4 |
| Consultation/deal/training list loaders | 3 |
| Lead detail loader | 2 |
| Deal detail loader | 2 |
| Pipeline Browse page (tab switching) | 3 |
| Lead detail page | 2 |
| Triage workflow transitions | 2 |
| Deal workflow transitions | 2 |
| Follow-up date set/clear | 2 |
| Bulk triage action | 2 |
| **Total** | **~30** |

---

## Dependencies

- Sprint 2 (Users validates the BREAD framework)
- Sprint 1 (shared workflow, route, and action infrastructure)
