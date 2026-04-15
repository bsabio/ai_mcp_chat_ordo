# Admin Dashboard And Navigation Audit

> **Status:** Implemented state audit
> **Date:** 2026-03-31
> **Scope:** Audit the current admin dashboard, admin workspace routes, and related navigation surfaces after Sprint 3 navigation convergence so remaining dashboard and route-ownership work stays grounded in the shipped desktop/mobile shell.
> **Related:** [Role Navigation QA Refactor](./spec.md)

---

## 1. Verified Current Admin Surface

The current admin area now has cleaner workspace boundaries. The remaining job is preserving that ownership model as the workspaces evolve, not rediscovering where the boundaries should live.

| Surface | Current purpose | Verified notes |
| --- | --- | --- |
| `/admin` | Cross-workspace overview | Now renders five overview cards: system health, pipeline attention, conversation attention, content operations, and jobs health |
| `/admin/leads` | Pipeline workspace | Owns `Pipeline` plus a local `Attention` view for queue pressure and overdue follow-ups |
| `/admin/conversations` | Conversation review workspace | Owns `Inbox`, `Routing Review`, `Opportunities`, and `Themes` local views |
| `/admin/journal` | Editorial/content workspace | Owns article inventory and workflow operations |
| `/admin/journal/attribution` | Content performance analytics | Exists as a real page and is now discoverable through journal-local workspace navigation |
| `/admin/jobs` | Global deferred-job operations | Real operator workspace and a better candidate for overview-level health than a hidden secondary surface |
| `/admin/system` | Platform health and configuration | Already owns runtime, worker, tool, and config visibility |
| `/admin/users` | Identity and role governance | Pure governance surface |
| `/admin/prompts` | Prompt governance | Pure governance surface |
| `/admin/leads/[id]` | Canonical pipeline detail surface | Already renders lead, consultation, deal, and training detail views from one owner page |
| `/admin/deals/[id]` | Redirect shim | Permanently redirects to canonical `/admin/leads/[id]` |
| `/admin/training/[id]` | Redirect shim | Permanently redirects to canonical `/admin/leads/[id]` |

### 1.1 Navigation shape today

The admin workspace is now described through one canonical grouped model rather than separate desktop, mobile, and account-menu opinions.

1. `src/lib/admin/admin-navigation.ts` defines the grouped admin route model and shared active-state helper.
2. `src/components/admin/AdminSidebar.tsx` renders that grouped model on desktop.
3. `src/components/admin/AdminDrawer.tsx` renders the same grouped model on mobile.
4. `src/app/admin/layout.tsx` mounts both the desktop sidebar and the mobile drawer trigger, so the grouped navigator is part of the shipped responsive shell.

That closes the earlier route-truth drift between desktop, mobile, and account surfaces. The remaining IA work is mostly about dashboard scope and route ownership, not navigator duplication.

### 1.3 Current desktop and mobile shell behavior

The live responsive shell is now clearer after refreshing browser coverage.

1. Desktop admin routes ship with a sticky grouped sidebar that exposes the eight live workspaces: dashboard, leads, conversations, jobs, journal, users, prompts, and system.
2. On mobile, the desktop sidebar is hidden and the shared admin layout mounts a drawer trigger plus grouped navigator on every admin page.
3. `tests/browser-ui/admin-shell-responsive.spec.ts` now captures both the live desktop route set and the mounted grouped mobile navigator instead of removed preview labels, bottom navigation, or an implicit mobile gap.
4. `tests/browser-ui/admin-jobs.spec.ts` continues to provide a focused browser baseline for `/admin/jobs`, including anonymous redirect, capability-filtered row visibility, status-driven detail affordances, and mobile card-stack behavior.

### 1.2 Hidden routes and remaining drift

The route tree is materially cleaner now, but there are still a few rules worth keeping explicit.

1. `/admin/journal/attribution` is no longer hidden, but it remains a secondary journal surface and should stay out of the global drawer.
2. `/admin/deals/[id]` and `/admin/training/[id]` now behave as compatibility redirects; new links should continue targeting `/admin/leads/[id]` directly.
3. Leads and conversations now own their detailed queue and analytics slices locally, so future dashboard additions should be held to the same overview-only bar.
4. `src/components/AccountMenu.tsx` no longer carries a hardcoded admin route list; admin destinations now derive from canonical admin metadata, which closes one former drift seam.
5. The responsive browser smoke no longer asserts preview labels or bottom navigation; the main regression risk is local workspace ownership drifting back onto the dashboard.

---

## 2. Dashboard Ownership Result

The dashboard ownership split is now implemented instead of merely proposed.

| Overview block | Destination | Real owner | Current state |
| --- | --- | --- | --- |
| System health | `/admin/system` | System | Kept on `/admin` as overview-level health |
| Pipeline attention | `/admin/leads` | Leads pipeline | Aggregated on `/admin`; detailed queues now live in leads-local `Attention` |
| Conversation attention | `/admin/conversations` | Conversations | Aggregated on `/admin`; detailed review/opportunity/theme slices now live in conversation-local views |
| Content operations | `/admin/journal` | Journal | Kept on `/admin` as overview-level editorial wayfinding |
| Jobs health | `/admin/jobs` | Jobs | Kept on `/admin` as overview-level queue health |

### 2.1 Main finding

The dashboard now behaves like an overview page instead of a second operations workspace.

1. `/admin/leads` owns pipeline pressure and overdue follow-up handling.
2. `/admin/conversations` owns routing review, anonymous opportunities, and recurring pain themes.
3. `/admin/system`, `/admin/journal`, and `/admin/jobs` remain the correct owners for their overview summaries.

### 2.2 Secondary finding

The overview is now useful because it answers cross-workspace questions rather than restating every local queue.

1. Is the platform healthy?
2. Which workspace needs attention next?
3. Is the global job queue healthy?
4. Is content work blocked?

---

## 3. Recommended Target Information Architecture

### 3.1 Principle

Top-level admin navigation should expose only primary workspaces. Detailed queues, analytics slices, and secondary reports should live inside local workspace navigation, not in the global drawer or on the top-level dashboard.

### 3.2 Recommended primary admin groups

Use one canonical grouped admin navigation model and let both desktop and mobile render from it.

| Group | Primary routes | Purpose |
| --- | --- | --- |
| Overview | `/admin` | Cross-workspace health and next-action overview |
| Operations | `/admin/leads`, `/admin/conversations`, `/admin/jobs` | Pipeline work, review work, and global deferred-job operations |
| Content | `/admin/journal` | Editorial workflow and publishing operations |
| Governance | `/admin/users`, `/admin/prompts` | Role governance and prompt governance |
| Platform | `/admin/system` | Runtime and platform health |

This grouping keeps the top-level drawer short while still mapping to real page ownership.

### 3.3 Current local workspace navigation

The detailed slices that used to bloat the dashboard now live in workspace-local navigation.

| Workspace | Recommended local structure |
| --- | --- |
| Leads | `Pipeline`, `Attention`; within `Pipeline`, the existing `Leads`, `Consultations`, `Deals`, and `Training` tabs remain the detailed browse structure |
| Conversations | `Inbox`, `Routing Review`, `Opportunities`, `Themes` |
| Journal | `Articles`, `Attribution` |
| Jobs | `Active`, `Failed`, `Completed`, future family/tool filters |

This keeps the drawer stable while giving each workspace room to grow without bloating global navigation.

---

## 4. Current Dashboard Scope

### 4.1 What the dashboard became

`/admin` is now a compact overview page focused on exception handling and wayfinding.

Recommended dashboard blocks:

1. **Platform health**
   Link to `/admin/system`.
2. **Pipeline attention**
   Aggregate the lead, consultation, deal, training, and overdue-follow-up pressure into one operations summary linking to `/admin/leads`.
3. **Conversation attention**
   Aggregate routing review, anonymous opportunities, and recurring themes into one review summary linking to `/admin/conversations`.
4. **Content operations**
   Summarize journal work that needs editorial attention and link to `/admin/journal`.
5. **Global jobs health**
   Summarize failed/running backlog and link to `/admin/jobs`.

That is the right shape for an overview page once the drawer becomes the main navigation surface.

### 4.2 What the dashboard now avoids

The dashboard no longer carries standalone cards for underlying queues and analytics slices that already belong to deeper workspaces.

In practice that means detailed slices now live in their owning workspaces instead of on `/admin`:

1. lead queue
2. consultations
3. deals
4. training paths
5. overdue follow-ups
6. routing review
7. funnel recommendations
8. anonymous opportunities
9. recurring pain themes

Those are workspace-level slices, not first-class top-level destinations.

---

## 5. Role-Aware Exposure Model

### 5.1 Current truth

Today, the admin pages are admin-gated. The model below is therefore a target-state navigation recommendation, not a description of current shipped access.

### 5.2 Recommended role shape

| Role | Admin workspace exposure | Notes |
| --- | --- | --- |
| `ANONYMOUS` | None | Public shell only |
| `AUTHENTICATED` | None | Self-service routes such as `/jobs` and account/profile surfaces only |
| `APPRENTICE` | None | Same self-service baseline as other signed-in members unless a future apprentice workspace is explicitly introduced |
| `STAFF` | Limited operational subset in the future | Candidate routes: leads, conversations, maybe journal, maybe partial jobs if policy explicitly allows it |
| `ADMIN` | Full admin workspace | Includes governance and platform routes |

### 5.3 Important rule

If a role cannot load a workspace, the dashboard must not show summary blocks that route into that workspace.

That means dashboard cards must be filtered by the same role-capable route model as the drawer/sidebar.

---

## 6. Structural Cleanup Status

These drift-removal changes are now implemented.

1. Completed in Sprint 3: grouped admin navigation now lives canonically in `src/lib/admin/admin-navigation.ts`, and both `AdminSidebar` and `AdminDrawer` render from the same grouped model.
2. Completed in Sprint 3: shell/account hardcoded admin link lists were removed, and `AccountMenu` now derives admin workspace destinations from shared route metadata.
3. Completed after Sprint 3: `/admin/leads/[id]` is the canonical pipeline detail route, and `/admin/deals/[id]` plus `/admin/training/[id]` now redirect to it.
4. Completed after Sprint 3: phantom back-target ownership for `/admin/deals` and `/admin/training` was removed by redirecting the duplicate detail shims to the canonical owner route.
5. Completed after Sprint 3: local workspace subnav now makes secondary pages such as `/admin/journal/attribution` discoverable without polluting the global drawer.
6. Completed after Sprint 3: leads and conversations now own their displaced dashboard slices through local workspace views instead of top-level cards.

---

## 7. Practical Refactor Order

1. **Complete: canonicalize admin nav metadata**
   `group`, shared ordering, and active-state behavior now live in the shared admin navigation model.
2. **Complete: shrink `/admin` into overview-only content**
   The top-level dashboard now uses aggregated cross-workspace summaries.
3. **Complete: move detailed blocks into owning workspaces**
   Leads and conversations now absorb the displaced dashboard slices through local workspace views.
4. **Complete: clean up route drift**
   Duplicate detail routes now redirect to the canonical owner page.
5. **Complete: align shell and account navigation**
   Admin route lists are no longer duplicated outside the canonical metadata.

---

## 8. Bottom Line

The repository now has a coherent admin shell and a cleaner ownership model: desktop and mobile navigation come from one grouped model, `/admin` stays small, duplicate detail routes redirect to the canonical owner, and workspace-local subnav carries the deeper operational slices.

The main guardrail from here is straightforward: keep `/admin` limited to overview-level wayfinding, and make new admin detail slices earn their place inside the owning workspace before they ever land on the dashboard.
