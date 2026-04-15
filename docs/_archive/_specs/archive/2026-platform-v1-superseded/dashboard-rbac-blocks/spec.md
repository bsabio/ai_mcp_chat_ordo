# Dashboard RBAC Blocks - Architecture Spec

> **Status:** Draft v1.0
> **Date:** 2026-03-18
> **Scope:** Define a single dashboard route that renders all workspace capabilities as composable blocks governed by RBAC and server-enforced runtime conditions.
> **Dependencies:** RBAC (implemented), Footer Information Architecture (draft), Conversation Lane Routing (draft), Progressive Contact Capture (draft), Solo Operator Dashboard business spec
> **Affects:** `src/lib/shell/shell-navigation.ts`, `src/lib/auth.ts`, future `src/app/dashboard/` surfaces, future dashboard block registry/loaders, and any admin or founder data surfaces promoted into the dashboard.
> **Motivation:** The product already treats `/dashboard` as the signed-in workspace route in shell navigation, but there is no engineering contract for how dashboard capabilities should be composed, gated, or extended. This spec makes the dashboard a single block-based workspace rather than a growing set of separate role-specific pages.
> **Requirement IDs:** `DRB-XXX`

---

## 1. Problem Statement

### 1.1 Product Requirement

The business layer now wants the workspace to behave like one operator console rather than a cluster of separate admin pages and hidden tools.

The desired rule is:

1. `/dashboard` stays the canonical signed-in workspace route. `[DRB-010]`
2. Everything operational inside the workspace should appear as dashboard blocks rather than new top-level destinations by default. `[DRB-011]`
3. RBAC decides who can see and load each block. `[DRB-012]`
4. Runtime state can further refine block visibility without replacing RBAC. `[DRB-013]`

### 1.2 Current State

Verified shell code already reserves a dashboard destination:

```typescript
export const SHELL_ROUTES: readonly ShellRouteDefinition[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    kind: "internal",
    footerVisibility: SIGNED_IN_ROLES,
    accountVisibility: SIGNED_IN_ROLES,
  },
];
```

The current role model is also explicit and stable:

```typescript
export type RoleName = "ANONYMOUS" | "AUTHENTICATED" | "STAFF" | "ADMIN";
```

And auth already resolves the current server identity:

```typescript
export async function getSessionUser(): Promise<SessionUser>
export async function requireRole(allowedRoles: RoleName[])
```

The dashboard architecture is now partially implemented. Verified current baseline:

1. `src/app/dashboard/page.tsx` exists and serves as the signed-in workspace route. `[DRB-020]`
2. `src/lib/dashboard/dashboard-blocks.ts` is the current block registry source of truth for role allowlists, category, and priority metadata. `[DRB-020]`
3. `src/lib/dashboard/dashboard-loaders.ts` already provides server-owned loaders for `conversation_workspace`, `recent_conversations`, `lead_queue`, and `routing_review`. `[DRB-020]`
4. `src/components/dashboard/ConversationWorkspaceBlock.tsx`, `RecentConversationsBlock.tsx`, `RoutingReviewBlock.tsx`, and `LeadQueueBlock.tsx` are all shipped dashboard surfaces. `[DRB-020]`
5. The remaining architectural gap is no longer route existence. It is the absence of a final runtime-state evaluator and explicit ordering helper that make block state and layout deterministic across mixed-role scenarios. `[DRB-020]`

### 1.3 Failure Modes Without A Block Contract

Without a dashboard-block architecture, the project will drift into predictable problems:

1. New operational capabilities will become one-off routes or tool-only surfaces with inconsistent discoverability. `[DRB-021]`
2. Role checks will be duplicated across components, routes, and data fetchers. `[DRB-022]`
3. The founder dashboard will become a manual collection of bespoke panels with no shared visibility model. `[DRB-023]`
4. Sensitive data may be hidden in the client while still being too easy to fetch unless server boundaries are defined up front. `[DRB-024]`

---

## 2. Design Goals

1. **Single workspace route.** Keep `/dashboard` as the canonical operator workspace rather than creating a parallel tree of role-specific destinations. `[DRB-030]`
2. **Block-first composition.** Model dashboard capabilities as discrete blocks that can be added, reordered, or withheld without reshaping the entire page. `[DRB-031]`
3. **RBAC first.** Role permissions are the primary gate for whether a block is even eligible to render or load data. `[DRB-032]`
4. **Runtime refinement second.** Conditional rules such as active conversation state, lead availability, or data freshness can suppress or reorder blocks after role checks pass. `[DRB-033]`
5. **Server-enforced data boundaries.** The server decides whether block data can be loaded. Client-side hiding is not a security boundary. `[DRB-034]`
6. **Operator-first information density.** Blocks should compress action-worthy information, not recreate full-page management consoles by default. `[DRB-035]`

---

## 3. Current Architecture Inventory

### 3.1 Shell And Route Truth

Verified in `src/lib/shell/shell-navigation.ts`:

```typescript
export interface ShellRouteDefinition {
  id: string;
  label: string;
  href: string;
  kind: ShellRouteKind;
  isLegacy?: boolean;
  showInCommandPalette?: boolean;
  headerVisibility?: ShellVisibility;
  footerVisibility?: ShellVisibility;
  accountVisibility?: ShellVisibility;
}

export function resolveFooterGroups(
  user?: Pick<SessionUser, "roles"> | null,
): ShellFooterGroup[];

export function resolveAccountMenuRoutes(
  user?: Pick<SessionUser, "roles"> | null,
): ShellRouteDefinition[];
```

This means the shell already knows `/dashboard` is a signed-in workspace destination. The dashboard block system should extend this route, not compete with it. `[DRB-040]`

### 3.2 Role Resolution

Verified in `src/core/entities/user.ts` and `src/lib/auth.ts`:

```typescript
export type RoleName = "ANONYMOUS" | "AUTHENTICATED" | "STAFF" | "ADMIN";

export async function getSessionUser(): Promise<SessionUser>;
export async function requireRole(allowedRoles: RoleName[]);
```

This is the correct RBAC source of truth for dashboard access decisions. `[DRB-041]`

### 3.3 Existing Data Surfaces That Can Become Or Already Power Blocks

Recent work already created dashboard-worthy surfaces, and several are now assembled into `/dashboard`:

1. `conversation_analytics(metric: "routing_review")` in `mcp/analytics-tool.ts` provides founder review queues for recent lane changes, uncertain conversations, and follow-up-ready conversations. `[DRB-042]`
2. `GET /api/admin/routing-review` provides an admin-only read-only inspection boundary over that routing review data, even though the dashboard currently uses a shared server loader path rather than round-tripping through the route. `[DRB-043]`
3. `useGlobalChat()` already exposes `currentConversation` and `routingSnapshot`, which remain the right client-side inputs if Sprint 3 needs runtime presentation tied to the active thread without duplicating authorization logic. `[DRB-044]`
4. The signed-in workspace already exposes server-loaded `conversation_workspace` and `recent_conversations` blocks, and recent conversation items reopen a selected thread through `/?conversationId=<id>`. `[DRB-044]`
5. The admin lead queue already promotes submitted `lead_records` into a dashboard workflow with triage state, founder notes, `last_contacted_at`, and a dedicated admin-only PATCH route for lead triage updates. `[DRB-045]`

Verified `useGlobalChat` shape:

```typescript
interface ChatContextType {
  currentConversation: Conversation | null;
  routingSnapshot: ConversationRoutingSnapshot | null;
}
```

### 3.4 Business Dashboard Expectations

The solo-operator dashboard business spec already expects the dashboard to surface:

1. hot leads `[SOD-030]`
2. deals requiring review `[SOD-034A]`
3. high-intent anonymous conversations `[SOD-035]`
4. recurring pain themes `[SOD-039]`
5. funnel recommendations `[SOD-046]`

This spec translates those business needs into a block architecture rather than separate dashboard pages. `[DRB-045]`

---

## 4. Architecture Direction

### 4.1 Canonical Rule

The dashboard should be a single workspace route composed from a server-known block registry. `[DRB-050]`

Default rule:

1. If a capability is operational, signed-in, and summary-oriented, it belongs in the dashboard as a block. `[DRB-051]`
2. If a capability requires a deep editor, long-form workflow, or public URL, it may justify its own route. `[DRB-052]`
3. New founder/admin intelligence surfaces should start as dashboard blocks unless there is a clear reason not to. `[DRB-053]`

### 4.2 Block Registry Model

The system should define a first-class dashboard block registry in a future dashboard module such as `src/lib/dashboard/`.

Recommended contract:

```typescript
import type { RoleName } from "@/core/entities/user";

export type DashboardBlockId =
  | "lead_queue"
  | "routing_review"
  | "deals_pipeline"
  | "market_signals"
  | "funnel_recommendations"
  | "conversation_workspace"
  | "recent_conversations"
  | "system_health";

export interface DashboardBlockDefinition {
  id: DashboardBlockId;
  title: string;
  description: string;
  allowedRoles: readonly RoleName[];
  loadPriority: "primary" | "secondary" | "tertiary";
  category: "workspace" | "pipeline" | "intelligence" | "operations";
  requiresData: boolean;
}
```

This registry is the visibility source of truth for the UI shell. `[DRB-054]`

### 4.3 Two-Layer Visibility Model

Each block should pass two gates in order:

1. **RBAC gate**: `allowedRoles` decides whether the user is eligible for the block at all. `[DRB-055]`
2. **Runtime condition gate**: optional conditions decide whether the eligible block should render, collapse, or show an empty state. `[DRB-056]`

Recommended runtime contract:

```typescript
export interface DashboardRuntimeContext {
  currentConversationId: string | null;
  routingSnapshot: ConversationRoutingSnapshot | null;
  hasCapturedLeads: boolean;
  hasOpenDeals: boolean;
}

export interface DashboardBlockPayload<TData> {
  blockId: DashboardBlockId;
  state: "ready" | "empty";
  data: TData;
}

export interface DashboardBlockVisibility {
  visible: boolean;
  state: "ready" | "empty" | "hidden";
  reason?: string;
}
```

RBAC answers "may this block exist for this user?" Runtime conditions answer "is there something useful to show right now?" In the shipped baseline, role filtering and runtime context are separate concerns, and Sprint 3 should treat server-owned loader payload state as the primary `ready` vs `empty` signal rather than recomputing data availability from client context alone. `[DRB-057]`

### 4.4 Server/Data Boundary

Sensitive block data must be loaded on the server or through server-owned routes. `[DRB-060]`

Required rule set:

1. The dashboard page resolves the signed-in user server-side. `[DRB-061]`
2. Block loaders receive that user and enforce role checks before querying data. `[DRB-062]`
3. Admin-only blocks must never rely on client-side hiding alone. `[DRB-063]`
4. Client hooks such as `useGlobalChat()` may influence presentation, but they do not authorize data access. `[DRB-064]`

This keeps the new routing-review admin surface aligned with the rest of the dashboard: the dashboard may consume `GET /api/admin/routing-review`, but only after server-side or route-level role checks pass. In the current shipped baseline, `routing_review` uses a shared server loader path and the route remains a separate inspection boundary. `[DRB-065]`

The same boundary rule applies to `lead_queue`, but with one explicit exception: the dashboard surface is mostly read-only by default, yet admin lead triage is intentionally writable through the dedicated admin-only PATCH route for `triage_state`, founder notes, and `last_contacted_at`. `[DRB-065]`

### 4.5 Initial Role Map

The dashboard should start with a narrow, explicit role map.

#### ANONYMOUS

1. No `/dashboard` access. `[DRB-070]`
2. Continue using public chat and footer information architecture. `[DRB-071]`

#### AUTHENTICATED

Eligible block categories:

1. personal conversation workspace `[DRB-072]`
2. saved or recent conversations `[DRB-073]`
3. future personal leads/training follow-up blocks if they are user-owned rather than founder-owned `[DRB-074]`

#### STAFF

Eligible block categories:

1. authenticated blocks `[DRB-075]`
2. internal workflow or moderation blocks `[DRB-076]`
3. future deal or knowledge-ops summaries where staff access is justified `[DRB-077]`

#### ADMIN

Eligible block categories:

1. all staff/authenticated blocks `[DRB-078]`
2. founder/operator blocks such as routing review, lead queue, market signals, system health, prompt/version operations, and funnel recommendations `[DRB-079]`
3. current Sprint 4 admin-complete additions include anonymous opportunities, recurring pain themes, and funnel recommendations, while a future deals review surface remains deferred until the deals domain ships `[DRB-079A]`
4. simulation or inspection blocks that summarize internal state without creating new standalone routes by default `[DRB-080]`

### 4.6 Block Taxonomy

To prevent dashboard sprawl, each block should belong to a stable category:

1. **workspace**: user-owned current context, recent conversations, active thread state `[DRB-081]`
2. **pipeline**: leads, deals, follow-up queues `[DRB-082]`
3. **intelligence**: market themes, lane mix, funnel recommendations `[DRB-083]`
4. **operations**: admin-only health, prompt state, release diagnostics, audit queues `[DRB-084]`

The taxonomy should drive layout and ordering so the dashboard feels intentional instead of like an arbitrary grid. `[DRB-085]`

### 4.7 Dashboard Ordering Rule

Blocks should be ordered by operator value, not by implementation history. `[DRB-086]`

Initial ordering guidance:

1. primary action blocks first: lead queue, deals pipeline, routing review `[DRB-087]`
2. intelligence blocks second: recurring themes, market signals, recommendations `[DRB-088]`
3. system/maintenance blocks last: health, prompt management, diagnostics `[DRB-089]`

For the current shipped baseline, Sprint 4 should preserve these ordering expectations unless a later sprint changes them explicitly:

1. signed-in workspace users keep `conversation_workspace` ahead of `recent_conversations`
2. admin users keep `lead_queue` ahead of `routing_review`
3. admin users treat `anonymous_opportunities` as a primary pipeline block alongside lead and routing review
4. secondary intelligence blocks such as `recurring_pain_themes` and `funnel_recommendations` follow the primary pipeline and workspace surfaces
5. `system_health` remains last
6. `ready` blocks outrank `empty` blocks when both are otherwise comparable by priority and category

---

## 5. Security

1. `/dashboard` must remain unavailable to `ANONYMOUS` users. `[DRB-090]`
2. Every block loader must enforce server-side role checks before returning protected data. `[DRB-091]`
3. Admin-only blocks must use the same or stricter role checks as the underlying routes they call. `[DRB-092]`
4. Client visibility logic is a presentation concern, not a permission boundary. `[DRB-093]`
5. Simulation mode must not widen access beyond what the validated session role overlay is allowed to see. `[DRB-094]`

---

## 6. Testing Strategy

The dashboard-block implementation should be validated at three levels.

### 6.1 Registry Tests

Test the block registry directly:

1. each block declares allowed roles `[DRB-100]`
2. duplicate block IDs are impossible or rejected `[DRB-101]`
3. ordering/category metadata is stable `[DRB-102]`

### 6.2 Visibility Tests

Test role and runtime filtering:

1. anonymous users receive no dashboard blocks `[DRB-103]`
2. authenticated users only receive eligible workspace blocks `[DRB-104]`
3. admin users receive admin blocks such as `lead_queue`, `routing_review`, `anonymous_opportunities`, `recurring_pain_themes`, `funnel_recommendations`, and `system_health` `[DRB-105]`
4. empty-state runtime conditions suppress blocks without bypassing RBAC `[DRB-106]`
5. useful orientation blocks such as workspace history remain visible as `empty` instead of becoming `hidden` when the user has no data yet `[DRB-106]`
6. hidden admin blocks do not trigger protected data loading for authenticated or staff users `[DRB-106]`

### 6.3 Route/Loader Tests

Test the server boundary:

1. dashboard route rejects or redirects unauthorized roles `[DRB-107]`
2. admin block loaders reject non-admin sessions `[DRB-108]`
3. block data surfaces stay read-only unless explicitly designed otherwise `[DRB-109]`
4. the explicit writable exception for admin `lead_queue` triage remains narrow and does not widen access to non-admin users `[DRB-109]`
5. recent-conversation reopen behavior remains intact when dashboard ordering or runtime wrappers change `[DRB-109]`

---

## 7. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Create the dashboard block registry, role-filtering utilities, and the `/dashboard` route shell contract |
| 1 | Implement signed-in base blocks for conversation workspace and recent-user context |
| 2 | Promote founder/admin operational surfaces such as routing review and lead queue into admin-only dashboard blocks |
| 3 | Add runtime block conditions, deterministic ordering, and mixed-role regression coverage without regressing the shipped Sprint 0–2 workspace and admin workflow baseline |

Sprint 3 therefore inherits these already-shipped behaviors as non-regression scope:

1. anonymous users are redirected away from `/dashboard`
2. signed-in users keep `conversation_workspace` and `recent_conversations`
3. recent conversation links reopen a selected thread through the homepage restore flow
4. admin users keep `lead_queue`, `routing_review`, and `system_health`, with `lead_queue` ordered ahead of `routing_review`
5. `lead_queue` remains a real founder workflow surface with triage state, founder notes, `last_contacted_at`, and in-block filtering

---

## 8. Future Considerations

1. Personalized block arrangement or pinning per user.
2. Feature-flag support for experimental blocks after the base role model is stable.
3. Drill-down routes for blocks that outgrow summary mode.
4. Manual dashboard overrides or custom founder layouts, if the solo-operator workflow proves too rigid.