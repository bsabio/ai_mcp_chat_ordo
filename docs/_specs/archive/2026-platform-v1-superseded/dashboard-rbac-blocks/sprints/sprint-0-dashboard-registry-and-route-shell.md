# Sprint 0 - Dashboard Registry And Route Shell

> **Goal:** Establish the dashboard as a real signed-in route with a server-owned block registry and RBAC filtering contract so later sprints can add blocks without inventing new page-level authorization patterns.
> **Spec ref:** `DRB-010` through `DRB-013`, `DRB-030` through `DRB-034`, `DRB-050` through `DRB-057`, `DRB-090` through `DRB-094`
> **Prerequisite:** None
> **Test count target:** 641 existing + 8 new = 649 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/lib/shell/shell-navigation.ts` | The shell already defines a signed-in `dashboard` route at `/dashboard` with `footerVisibility` and `accountVisibility` bound to `SIGNED_IN_ROLES`, so Sprint 0 should implement that route rather than adding a new workspace path |
| `src/core/entities/user.ts` | `RoleName` is already the stable RBAC union: `"ANONYMOUS" | "AUTHENTICATED" | "STAFF" | "ADMIN"` |
| `src/lib/auth.ts` | `getSessionUser()` already resolves the current server identity and `requireRole(allowedRoles)` already exists as a server-side RBAC helper |
| `src/components/AccountMenu.tsx` | The signed-in account rail already resolves account routes through `resolveAccountMenuRoutes(user)`, which means the dashboard route will inherit existing shell discoverability automatically once it exists |
| `docs/_specs/dashboard-rbac-blocks/spec.md` | The new spec already defines the intended block registry shape, two-layer visibility model, and role map for future dashboard blocks |
| `src/app/api/admin/routing-review/route.ts` | Recent admin-only inspection work already demonstrates a route-level RBAC boundary for dashboard-worthy operational data |
| `src/app/api/admin/routing-review/route.test.ts` | Route tests already demonstrate the repo’s preferred mocking pattern for role-gated dashboard-adjacent APIs |

---

## Task 0.1 - Create the dashboard block registry contract

**What:** Introduce a first-class dashboard block registry module so block visibility, category, and priority are defined in one place instead of being scattered across components.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/dashboard/dashboard-blocks.ts` |
| **Create** | `src/lib/dashboard/dashboard-blocks.test.ts` |
| **Spec** | `DRB-031`, `DRB-032`, `DRB-054`, `DRB-081` through `DRB-089` |

### Task 0.1 Notes

Start with static metadata only. This sprint should not fetch block data yet.

Use a small, explicit contract close to the spec:

```ts
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

Seed a minimal block set even if some blocks are placeholders for later sprints, for example:

1. `conversation_workspace`
2. `recent_conversations`
3. `routing_review`
4. `lead_queue`
5. `system_health`

Keep the registry serializable and free of React components in Sprint 0.

### Task 0.1 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-blocks.test.ts
```

---

## Task 0.2 - Add role filtering and runtime-visibility primitives

**What:** Implement the shared filtering utilities that future dashboard route code and block loaders will use.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/dashboard/dashboard-visibility.ts` |
| **Create** | `src/lib/dashboard/dashboard-visibility.test.ts` |
| **Spec** | `DRB-032`, `DRB-033`, `DRB-055` through `DRB-057`, `DRB-103` through `DRB-106` |

### Task 0.2 Notes

Sprint 0 should implement two things only:

1. `filterDashboardBlocksForUser(user, blocks)`
2. a simple runtime-state wrapper that can later return `ready`, `empty`, or `hidden`

Do not wire block-specific data checks yet. A baseline runtime context with nullable fields is enough.

Recommended runtime shape:

```ts
export interface DashboardRuntimeContext {
  currentConversationId: string | null;
  routingSnapshot: ConversationRoutingSnapshot | null;
  hasCapturedLeads: boolean;
  hasOpenDeals: boolean;
}
```

Runtime conditions should be optional. A block that has no condition should remain visible once its role gate passes.

### Task 0.2 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-visibility.test.ts
```

---

## Task 0.3 - Create the `/dashboard` route shell

**What:** Add the first real dashboard page that resolves the signed-in user on the server, applies RBAC, and renders a block shell from registry metadata.

| Item | Detail |
| --- | --- |
| **Create** | `src/app/dashboard/page.tsx` |
| **Create** | `src/app/dashboard/page.test.tsx` or route-adjacent test coverage |
| **Modify if needed** | `src/lib/shell/shell-navigation.ts` only if route metadata clarification is required |
| **Spec** | `DRB-010`, `DRB-030`, `DRB-034`, `DRB-050` through `DRB-053`, `DRB-090` |

### Task 0.3 Notes

Sprint 0 should render a truthful shell, not the full product dashboard.

Minimum behavior:

1. resolve the current user with `getSessionUser()`
2. deny anonymous access through redirect, `notFound()`, or equivalent signed-in boundary
3. filter the block registry by role
4. render a simple block list or cards showing title, description, category, and state

Do not hardcode admin content in the page itself. The page should render whatever the registry and filtering utilities say is visible.

### Task 0.3 Verify

```bash
npx vitest run src/app/dashboard/page.test.tsx
```

---

## Task 0.4 - Add regression coverage for the signed-in dashboard boundary

**What:** Lock the new dashboard contract before any real data blocks are added.

| Item | Detail |
| --- | --- |
| **Modify or Create** | `src/app/dashboard/page.test.tsx` |
| **Modify** | `src/lib/dashboard/dashboard-blocks.test.ts` |
| **Modify** | `src/lib/dashboard/dashboard-visibility.test.ts` |
| **Spec** | `DRB-100` through `DRB-108` |

### Task 0.4 Notes

Cover at minimum:

1. anonymous users do not get dashboard access
2. authenticated users see only signed-in workspace blocks
3. admin users receive admin-only block definitions in the rendered shell
4. duplicate or unknown block IDs are prevented by the registry contract

### Task 0.4 Verify

```bash
npx vitest run src/lib/dashboard/dashboard-blocks.test.ts src/lib/dashboard/dashboard-visibility.test.ts src/app/dashboard/page.test.tsx
```

---

## Task 0.5 - Record the registry and route-shell boundary

**What:** Preserve any implementation-time decisions about anonymous handling, registry shape, or test seams so later sprints consume a stable dashboard contract.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/dashboard-rbac-blocks/sprints/sprint-0-dashboard-registry-and-route-shell.md` |
| **Spec** | `DRB-050` through `DRB-057`, `DRB-090` through `DRB-094` |

### Task 0.5 Notes

Document any of the following if they shift during implementation:

1. whether anonymous users are redirected or hard-blocked with `notFound()`
2. whether the registry remains pure metadata or starts carrying lightweight loader IDs
3. what baseline block set ships in Sprint 0

### Task 0.5 Verify

```bash
npm run typecheck
```

---

## Completion Checklist

- [x] Dashboard block definitions exist as a centralized registry
- [x] Role filtering utilities exist independently of dashboard UI components
- [x] `/dashboard` is implemented as a signed-in route shell backed by the registry
- [x] Anonymous access is blocked server-side
- [x] Focused tests cover registry validity, role filtering, and signed-in route access

## QA Deviations

- Sprint 0 uses a server-side redirect to `/login` for anonymous users rather than `notFound()` so the workspace boundary points directly at the sign-in path.
- The registry remains pure metadata in Sprint 0. No loader IDs or React components were added to the registry contract.
- The baseline Sprint 0 block set ships as metadata cards for `conversation_workspace`, `recent_conversations`, `routing_review`, `lead_queue`, and `system_health`.
