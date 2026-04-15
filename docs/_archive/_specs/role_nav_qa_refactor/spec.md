# Role Navigation QA Refactor

> **Status:** Sprint 3 Complete, Admin IA Cleanup Extended
> **Date:** 2026-03-31
> **Scope:** Define a coherent role-aware navigation and job-ownership model so signed-in users can manage their own jobs at `/jobs`, privileged operators can manage global jobs at `/admin/jobs`, and admin overview vs workspace-local navigation stays aligned with real page ownership.
> **Dependencies:** [RBAC](../rbac/spec.md), [Shell Navigation And Design System](../shell-navigation-and-design-system/spec.md), [Deferred Job Orchestration](../deferred-job-orchestration/spec.md), [Job Visibility And Control](../job-visibility-and-control/spec.md), [Admin Platform](../admin-platform/spec.md)
> **Affects:** role-aware shell navigation, account menu information architecture, admin navigation grouping, admin overview scope, workspace-local admin subnavigation, `/jobs` and `/admin/jobs` route contracts, deferred job capability metadata, job tool policy, and QA coverage for role-to-surface consistency
> **Requirement IDs:** `RNQ-001` through `RNQ-099`

---

## 1. Problem Statement

### 1.1 Verified current state

The repository already contains the primitive pieces for both user-scoped and global job visibility, but the product surface does not describe them truthfully yet.

| Area | Verified state | Evidence |
| --- | --- | --- |
| Role model | Five roles exist: `ANONYMOUS`, `AUTHENTICATED`, `APPRENTICE`, `STAFF`, `ADMIN` | `src/core/entities/user.ts` |
| Content audience model | Access already distinguishes `public`, `member`, `staff`, and `admin`, and treats `APPRENTICE` as a member role | `src/lib/access/content-access.ts` |
| Shared shell jobs route | Shell navigation now exposes `/jobs` through the signed-in audience for `AUTHENTICATED`, `APPRENTICE`, `STAFF`, and `ADMIN` | `src/lib/shell/shell-navigation.ts` |
| `/jobs` page behavior | `/jobs` now serves a signed-in self-service workspace with active-first snapshots, selected-job detail, durable history, owner cancel/retry actions, URL-backed selection, and live SSE-backed sync with explicit degraded fallback behavior | `src/app/jobs/page.tsx`, `src/components/jobs/JobsWorkspace.tsx`, `src/components/jobs/useJobsEventStream.ts` |
| User-scoped job APIs | Signed-in endpoints already exist for `GET /api/jobs`, `GET /api/jobs/events`, `GET /api/jobs/[jobId]`, `POST /api/jobs/[jobId]`, and `GET /api/jobs/[jobId]/events` | `src/app/api/jobs/route.ts`, `src/app/api/jobs/events/route.ts`, `src/app/api/jobs/[jobId]/route.ts`, `src/app/api/jobs/[jobId]/events/route.ts` |
| User job action gate | User-scoped job detail and mutate routes currently authorize by authenticated conversation ownership, not by explicit per-job capability policy | `src/app/api/jobs/_lib.ts`, `src/app/api/jobs/[jobId]/route.ts` |
| User job query model | `JobQueueRepository` already includes `listJobsByUser`, `listUserEvents`, and `listEventsForUserJob` | `src/core/use-cases/JobQueueRepository.ts` |
| Signed-in tool support | Signed-in tools already exist for `list_my_jobs` and `get_my_job_status` across `AUTHENTICATED`, `APPRENTICE`, `STAFF`, and `ADMIN` | `src/core/use-cases/tools/deferred-job-status.tool.ts` |
| Global jobs surface | `/admin/jobs` is an admin-gated operator surface with capability-aware browse, detail, and action policy backed by registry-filtered loaders over `job_requests` state | `src/app/admin/jobs/page.tsx`, `src/app/admin/jobs/[id]/page.tsx`, `src/lib/journal/admin-journal.ts`, `src/lib/admin/jobs/admin-jobs.ts`, `src/lib/admin/jobs/admin-jobs-actions.ts`, `src/adapters/JobQueueDataMapper.ts` |
| Deferred job handlers | Current deferred handlers are all editorial/blog-oriented; several explicitly inject `role: "ADMIN"` into execution context while others rely on editorial services without role input | `src/lib/jobs/deferred-job-handlers.ts` |

### 1.2 Verified architecture status after Sprint 3 and admin IA cleanup

The current implementation closed the self-service route gap in Sprint 1, the global queue policy gap in Sprint 2, and the navigation convergence gap in Sprint 3. Two broader structural problems remain.

1. **The self-service route contract is now implemented.** `/jobs` now exists as a signed-in workspace route with selected-job detail, durable history, and live event-sync behavior. Future work should preserve that baseline while capability policy and admin/global alignment catch up. `[RNQ-001]`
2. **Global queue capability policy is now explicit, but self-service authorization still is not.** `/admin/jobs` now derives visibility and manageability from the shared capability registry, but the user-scoped `/api/jobs*` routes still rely on authenticated conversation ownership rather than full capability-aware authorization. `[RNQ-002]`
3. **Current deferred work is editorial-biased.** All registered deferred handlers today are blog/editorial jobs, and several of the handlers explicitly inject admin execution context. That is a valid current product slice, but it is a bad default for the long-term model because future user-owned jobs will not all be editorial or admin-only. `[RNQ-003]`
4. **Role-aware navigation convergence is now implemented.** Shell, account, desktop admin, and mobile admin navigation now derive from canonical admin metadata, the production admin layout mounts the grouped mobile drawer, and admin surfaces use owned admin semantics instead of borrowed `jobs-*` classes. Future work should preserve that converged truth while Sprint 4 hardens the broader role-and-route regression matrix. `[RNQ-004]`
5. **Admin workspace ownership is now clearer.** `/admin` is a five-card overview, secondary analytics live in workspace-local navigation, `/admin/leads` now owns a local `Attention` view, `/admin/conversations` now owns `Routing Review`, `Opportunities`, and `Themes` views, and duplicate `/admin/deals/[id]` plus `/admin/training/[id]` routes redirect to canonical `/admin/leads/[id]`. `[RNQ-005]`

### 1.3 Product decision

This feature formalizes the following product shape.

1. **`/jobs` is the self-service jobs workspace.** Any signed-in user can inspect and manage their own eligible jobs there. `[RNQ-010]`
2. **`/admin/jobs` is the global jobs workspace.** It is a privileged cross-user operational surface for admin-owned and other globally manageable jobs. `[RNQ-011]`
3. **Job type policy must be explicit.** Every deferred job type must declare which roles can initiate it, whether the owner can inspect/manage it, and which privileged roles can manage it globally. `[RNQ-012]`
4. **Current blog/editorial jobs remain role-limited.** Until product requirements expand, the existing blog-oriented deferred jobs are treated as privileged editorial jobs rather than generic member jobs. `[RNQ-013]`
5. **The navigation model must reflect real permissions, not future aspiration.** No surface may advertise job destinations or controls that the current role cannot actually use. `[RNQ-014]`

---

## 2. Design Goals

1. **Separate self-service from global operations.** Users need a truthful “my work” surface; operators need a truthful “all work” surface. `[RNQ-020]`
2. **Model job permissions explicitly.** Job audience, owner visibility, global visibility, and action rights must be data, not hard-coded assumptions spread across handlers and routes. `[RNQ-021]`
3. **Keep future job types open-ended.** The architecture must support future non-blog jobs for member, apprentice, staff, or admin roles without re-architecting the navigation again. `[RNQ-022]`
4. **Preserve current editorial restrictions.** Existing editorial/blog jobs must not become visible to inappropriate roles simply because the self-service job APIs exist. `[RNQ-023]`
5. **Unify navigation truth.** Shell routes, account menu sections, admin navigation groups, and job page links must derive from role-aware route metadata rather than local arrays. `[RNQ-024]`
6. **Make role drift test-detectable.** The QA strategy must verify route exposure, job visibility, and action rights across all roles. `[RNQ-025]`
7. **Prefer empty-state truth over false capability.** If a role has access to the self-service jobs surface but no current eligible job types, the page should explain that state rather than redirecting elsewhere. `[RNQ-026]`
8. **Reduce shell chrome fragmentation.** Global wayfinding and account controls should converge into one truthful shell surface instead of competing drawers, account rails, and admin sidebars, while notifications remain independently discoverable. `[RNQ-027]`

---

## 3. Architecture

### 3.1 Product surfaces

The job and navigation model should be split into two surfaces.

| Surface | Audience | Purpose |
| --- | --- | --- |
| `/jobs` | Signed-in users | Show jobs visible to the current account and allow owner-safe actions such as inspect, cancel, and retry when policy permits |
| `/admin/jobs` | Privileged operator roles | Show global job inventory, queue health, tool families, and cross-user actions subject to role policy |

`[RNQ-030]`

### 3.2 Current starting point

The repository already contains most of the lower-level data access needed for this split.

| Asset | Verified current detail | Implication |
| --- | --- | --- |
| `JobQueueRepository` | Exposes `listJobsByUser`, `listUserEvents`, and `listEventsForUserJob` in addition to conversation-scoped methods | User-scoped reads already exist at the repository boundary. `[RNQ-031]` |
| `/api/jobs` family | Requires authentication and returns user-scoped snapshots/events/actions, but current per-job authorization is rooted in conversation ownership rather than explicit job-capability policy | The self-service control plane exists but still needs a durable permission model above raw ownership checks. `[RNQ-032]` |
| `list_my_jobs` / `get_my_job_status` | Available to `AUTHENTICATED`, `APPRENTICE`, `STAFF`, and `ADMIN` | Tooling already expects signed-in self-service jobs to be a real concept. `[RNQ-033]` |
| `/admin/jobs` | Uses an admin-gated page with registry-backed global loaders, capability-aware filters, and policy-aware detail and actions over `job_requests` state | The global operator surface now proves current admin-only queue policy through shared registry helpers rather than route assumptions alone. `[RNQ-034]` |
| Deferred handlers | `draft_content`, `publish_content`, `prepare_journal_post_for_publish`, `generate_blog_image`, `compose_blog_article`, `qa_blog_article`, `resolve_blog_article_qa`, `generate_blog_image_prompt`, and `produce_blog_article` | Current handlers are editorial/blog-centric and operationally privileged, but they are not yet described by a formal capability registry. `[RNQ-035]` |

### 3.3 Required new canonical model

Introduce a job capability registry separate from route definitions and separate from handler implementation.

Suggested shape:

```typescript
type JobSurface = "self" | "global";

interface JobCapabilityDefinition {
  toolName: string;
  family: "editorial" | "content" | "workflow" | "training" | "system" | "other";
  label: string;
  description: string;
  initiatorRoles: RoleName[];
  ownerViewerRoles: RoleName[];
  ownerActionRoles: RoleName[];
  globalViewerRoles: RoleName[];
  globalActionRoles: RoleName[];
  defaultSurface: JobSurface;
}
```

Rules:

1. The registry is the source of truth for who can create, view, and manage a job type. `[RNQ-040]`
2. The registry must describe current blog/editorial handlers as privileged jobs, not as generally visible member jobs. `[RNQ-041]`
3. Future user-owned job types are added by extending the registry, not by special-casing `/jobs` route logic. `[RNQ-042]`
4. The admin/global jobs surface must be filtered by global viewer/action roles from the same registry rather than by route role alone. `[RNQ-043]`

### 3.4 Navigation model

The route/navigation contract should be explicit.

#### 3.4.1 Self-service workspace

For signed-in users, `Jobs` belongs in the account or workspace surface alongside `Profile`.

Rules:

1. `/jobs` must stop redirecting to `/admin/jobs`. `[RNQ-050]`
2. `/jobs` should remain visible to all signed-in roles that can own or inspect self-service jobs, including `APPRENTICE`. `[RNQ-051]`
3. If a signed-in role has no currently eligible job types, `/jobs` should render a truthful empty state instead of disappearing or forwarding to admin. `[RNQ-052]`

#### 3.4.2 Global workspace

For privileged roles, global jobs belongs in the admin workspace.

Rules:

1. `/admin/jobs` remains the cross-user operational queue. `[RNQ-053]`
2. Visibility of that route must match actual page gates and role policy. `[RNQ-054]`
3. If staff eventually receives global job visibility, the page gate, navigation exposure, and capability registry must all change together. `[RNQ-055]`

#### 3.4.3 Admin overview and local workspace IA

The role-aware navigation model also depends on keeping overview routes distinct from workspace-owned detail.

Rules:

1. `/admin` should remain an overview page that summarizes cross-workspace health rather than hosting every queue and analytics slice directly. `[RNQ-056]`
2. Secondary operational and analytics surfaces should live in route-aware workspace switching owned by the shared workspace drawer rather than a second in-page admin rail. Current examples are leads `Attention`, conversation `Routing Review`, `Opportunities`, and `Themes`, plus journal `Attribution`. `[RNQ-057]`
3. Duplicate detail routes must redirect to the owning workspace detail page rather than pretending to be separate workspaces. Current examples are `/admin/deals/[id]` and `/admin/training/[id]` redirecting to `/admin/leads/[id]`. `[RNQ-058]`

#### 3.4.4 Unified shell rail and workspace menu

The current shell previously split navigation across multiple surfaces: a left-side shell drawer, a separate account surface, a notifications popover, and an admin-specific sidebar or mobile drawer. That model created route drift and made the homepage header behave differently from the rest of the application.

Recommended product shape:

1. The shared top rail should use the same right-side workspace menu trigger on home, public content routes, signed-in self-service routes, and admin routes. `[RNQ-059]`
2. On narrow viewports, shell chrome should collapse to the same compact rail shape used on home: brand left, notifications plus workspace trigger right, and no separate top-rail search affordance. `[RNQ-086]`
3. The combined workspace trigger should open a right-edge modal sheet, not a dropdown menu. Because the surface mixes navigation links, account context, settings, and session actions, it should behave as a dialog with focus trap and inert background rather than as an ARIA `menu`. `[RNQ-061]`
4. The combined sheet should absorb the current shell drawer responsibilities and the account-menu responsibilities instead of keeping separate global nav and self-service controls in the rail. `[RNQ-062]`
5. Notifications should remain a separate bell affordance in the rail instead of being buried inside the combined sheet. Notification state is time-sensitive and should stay one tap away. `[RNQ-063]`
6. The sheet must be assembled from the same canonical metadata already used by `src/lib/shell/shell-navigation.ts` and `src/lib/admin/admin-navigation.ts`; this change must not introduce new local route arrays. `[RNQ-064]`
7. The active admin layout and admin workspace pages must not render a second global or workspace-level navigation rail. Desktop sidebar wayfinding, mobile-only admin hamburgers, and duplicated `AdminWorkspaceNav` blocks should be retired in favor of the shared workspace sheet. Only truly intra-page controls, such as leads pipeline tabs, may remain inside page content. `[RNQ-088]`
8. On wider non-home routes, search may remain in the center rail region, but it must not reintroduce a second global nav or account surface. `[RNQ-087]`
9. The homepage shell remains a dependency with its own compact shared-rail contract. `docs/_specs/homepage-chat-shell/spec.md` allows the same global control model on `/`: brand left, shared search available on wider viewports, and a compact right-side utility cluster with notifications plus one shared workspace menu trigger. The rest of the application should converge toward that same truthful shell model rather than branching away from it. `[RNQ-066]`
10. Discoverability matters. If visual space permits, prefer a hamburger plus short `Menu` label over a purely icon-only control on mobile. If the design remains icon-only, the accessible name must still describe the actual behavior, such as `Open workspace menu`. `[RNQ-067]`

Recommended information architecture inside the combined sheet:

1. **Header:** identity block, current role/account context, close button. `[RNQ-068]`
2. **Primary navigation:** public shell destinations such as `Library` and `Blog`, plus signed-in workspace destinations such as `Jobs` and `Profile` when allowed by role. `[RNQ-069]`
3. **Admin section:** canonical grouped admin destinations only for `ADMIN`, matching the existing grouped route model and still keeping deep secondary views in local workspace subnav rather than the global sheet. `[RNQ-072]`
4. **Current workspace section:** when the active route belongs to an admin workspace with owned subviews, the shared sheet should expose those subviews there instead of rendering a second in-page admin rail. Examples include leads `Pipeline`/`Attention`, conversations `Inbox`/`Routing Review`/`Opportunities`/`Themes`, and journal `Inventory`/`Attribution`. `[RNQ-089]`
5. **System controls:** theme, legibility, and other local shell controls that currently live in the account menu. `[RNQ-073]`
6. **Session action:** sign in/register for anonymous users or sign out for authenticated users. `[RNQ-074]`

Required interaction contract for the combined sheet:

1. Open from the right edge, cover the full viewport height, and preserve safe-area padding. `[RNQ-075]`
2. Apply `role="dialog"` with `aria-modal="true"`, move focus into the sheet on open, trap focus while open, and restore focus to the trigger on close. `[RNQ-076]`
3. Support close via explicit close button, backdrop press, `Escape`, and route change. `[RNQ-077]`
4. Lock body/document scroll while open so the background shell cannot move underneath the sheet. `[RNQ-078]`
5. Preserve current-route highlighting for shell and admin destinations from canonical active-state helpers. `[RNQ-079]`

### 3.5 Current job family policy

The initial policy for existing deferred jobs should be explicit.

| Tool name | Current family | Initial policy |
| --- | --- | --- |
| `draft_content` | editorial | Admin-initiated, admin-owned, globally manageable by admin |
| `publish_content` | editorial | Admin-initiated, admin-owned, globally manageable by admin |
| `prepare_journal_post_for_publish` | editorial | Admin-initiated, admin-owned, globally manageable by admin |
| `generate_blog_image` | editorial | Admin-initiated, admin-owned, globally manageable by admin |
| `compose_blog_article` | editorial | Admin-initiated, admin-owned, globally manageable by admin |
| `qa_blog_article` | editorial | Admin-initiated, admin-owned, globally manageable by admin |
| `resolve_blog_article_qa` | editorial | Admin-initiated, admin-owned, globally manageable by admin |
| `generate_blog_image_prompt` | editorial | Admin-initiated, admin-owned, globally manageable by admin |
| `produce_blog_article` | editorial | Admin-initiated, admin-owned, globally manageable by admin |

This table does **not** mean future jobs should follow the same policy. It only documents the current verified handler set. `[RNQ-060]`

### 3.6 Interaction contract

#### 3.6.1 Self-service jobs (`/jobs`)

The signed-in jobs page must support:

1. list of jobs visible to the current account
2. active-first ordering
3. event-stream updates from `/api/jobs/events`
4. per-job detail and event history via `/api/jobs/[jobId]` and `/api/jobs/[jobId]/events`
5. owner-safe actions via `POST /api/jobs/[jobId]`
6. truthful empty states when the account has no visible jobs or no eligible job families yet

`[RNQ-070]`

#### 3.6.2 Global jobs (`/admin/jobs`)

The global jobs page must support:

1. cross-user inventory
2. filtering by status and tool family or tool name
3. queue-health browsing
4. privileged cancel and retry actions
5. future role-based filtering if staff or other internal roles gain partial global access

`[RNQ-071]`

### 3.7 QA and refactor contract

This feature is partly an IA refactor and partly a role-policy hardening pass. The QA contract must verify both.

Required matrices:

1. **Route exposure matrix:** role x route (`/jobs`, `/admin/jobs`) `[RNQ-080]`
2. **Menu exposure matrix:** role x shell entry x admin entry `[RNQ-081]`
3. **Job visibility matrix:** role x job capability x self-service/global read `[RNQ-082]`
4. **Action matrix:** role x job capability x `cancel`/`retry` `[RNQ-083]`
5. **Empty-state matrix:** role x visible route with zero eligible jobs `[RNQ-084]`
6. **Mobile chrome matrix:** route surface x role x trigger set (`bell`, `workspace menu`) x overlay behavior `[RNQ-085]`

---

## 4. Security And Access

1. Anonymous users must never access `/jobs` or `/api/jobs*`. `[RNQ-090]`
2. Signed-in users may only read or mutate jobs they are authorized to manage through both ownership and job-capability policy. Current conversation ownership checks are necessary but not sufficient once non-conversation-owned job types appear. `[RNQ-091]`
3. Global jobs visibility must be restricted to privileged roles and filtered by job capability. `[RNQ-092]`
4. A navigation item must never appear for a role unless the route and underlying actions are both actually usable. `[RNQ-093]`
5. Future staff access must be additive and explicit, not inferred from generic signed-in or internal status. `[RNQ-094]`

---

## 5. Testing Strategy

| Area | Coverage expectation |
| --- | --- |
| Shell/account navigation | `/jobs` visibility for signed-in roles including `APPRENTICE`, absence for anonymous users, no false redirects to admin |
| Admin navigation | `/admin/jobs` exposure only for roles that can actually load the page |
| Combined mobile shell panel | single right-rail workspace trigger plus separate bell on mobile shell routes, canonical shell/admin route grouping inside the shared sheet, route-aware current-workspace links for admin sub-workspaces, no competing admin-only hamburger or duplicate in-page admin workspace rail, homepage exception handling, and correct focus-trap/route-change-dismiss behavior |
| User job APIs | authenticated access, owner access, unauthorized access, cancel/retry state transitions |
| Global jobs loaders | cross-user visibility, status/tool filters, privileged action gating |
| Capability registry | current editorial tools resolve to admin-only policy, future user-safe tools can be added without route rewrites |
| Browser flows | combined mobile shell sheet to `/jobs`, separate bell affordance, admin navigation to `/admin/jobs`, focused admin-jobs browser smoke for access and detail affordance truth, responsive shell/admin coverage for route parity and single-hamburger behavior, empty-state behavior, action feedback |
| Tool policy | `list_my_jobs`/`get_my_job_status` remain signed-in tools; admin tools remain privileged; summaries stay role-safe |

Focused browser and role-matrix coverage are required because this feature is primarily about truthful information architecture and permission alignment, not just API correctness. `[RNQ-095]`

---

## 6. Sprint Plan

| Sprint | Name | Goal |
| --- | --- | --- |
| **0** | **Inventory And Capability Registry** | Complete. The canonical job capability model and current handler policy are now in place. |
| **1** | **Self-Service Jobs Route Truth** | Complete. The signed-in `/jobs` workspace now supports selected-job detail, durable history, and live SSE-backed sync. |
| **2** | **Global Jobs Policy Alignment** | Complete. `/admin/jobs` now derives filtering, metadata, and actions from capability policy rather than ad hoc assumptions |
| **3** | **Navigation Convergence** | Complete. Shell, account, desktop admin, and mobile admin route truth now converge around canonical admin metadata and owned admin surfaces |
| **4** | **QA Matrix And Regression Hardening** | Add role x route x job-type regression coverage and close known role/nav drift gaps |

---

## 7. Future Considerations

1. Add explicit staff-only or team-only job families once internal non-admin workflows exist.
2. Replace tool-name filtering in global jobs with family/group filtering once the capability registry is in place.
3. Introduce richer “My Jobs” categorization such as `Active`, `Recent`, and `Needs Attention` after the route truth is fixed.
4. Add user-facing job creation flows for non-editorial work only after the role-policy model is stable.
5. Consider a dedicated `staff` workspace surface if staff gains enough global job responsibilities to justify something between `/jobs` and `/admin/jobs`.
