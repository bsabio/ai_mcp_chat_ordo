# V1 Sprint 2 — Dashboard Elimination

> **Parent spec:** [Platform V1](spec.md) §8 Phase A, Sprint 2
> **Requirement IDs:** PLAT-001 (chat-only interface), PLAT-010 (forkable by students)
> **Sprint 1 Baseline:** 1266 tests, 178 suites, build clean
> **Goal:** Delete the dashboard page, all 14 block components, and all dashboard infrastructure modules except the data loaders. Remove the GridInspector and CommandPalette developer tools from the root layout. Redirect `/dashboard` to `/` so bookmarked URLs don't break. Update shell navigation so signed-in users land on `/` instead of `/dashboard`. The result is a simpler application surface — one page, one chat — that reduces the component tree by ~3,500 lines and eliminates an entire admin UI layer that will be replaced by MCP tools in Sprint 10.
> **Historical note (2026-03-24):** This sprint spec still records the original Sprint 2 boundary accurately, but the later TD-C4 convergence work went further than this sprint planned. The former dashboard business logic was subsequently moved into the operator-owned runtime under `src/lib/operator/`, and the legacy `dashboard-handoff.ts` path was replaced by `task-origin-handoff.ts`. References below to preserved dashboard loaders or handoff files should therefore be read as sprint-boundary history, not current runtime state.

---

## §1 Current State (What We're Removing)

### §1.1 Dashboard page — an entire admin surface

The dashboard (`src/app/dashboard/page.tsx`, 656 lines) is an async server component that orchestrates 12 data loaders, applies visibility filtering and focus-rail navigation across 5 views (overview, revenue, service, training, operations), and renders 14 block components in an admin-only grid layout. It is the single most complex page in the application.

| Component | Lines | Tests | Purpose |
| --- | --- | --- | --- |
| `ConversationWorkspaceBlock` | ~80 | 3 | Resume active conversation with AI-forward CTA |
| `RecentConversationsBlock` | ~60 | 3 | Recent thread links with search shortcuts |
| `CustomerWorkflowContinuityBlock` | ~50 | 2 | Approved next steps for customers |
| `LeadQueueBlock` | ~90 | 7 | Submitted leads with founder triage state |
| `RoutingReviewBlock` | ~70 | 3 | Uncertain conversations and lane changes |
| `AnonymousOpportunitiesBlock` | ~50 | 2 | High-intent anonymous demand signals |
| `ConsultationRequestsBlock` | ~60 | 4 | Pending consultation scheduling requests |
| `DealQueueBlock` | ~60 | 2 | Founder-managed deal progression |
| `TrainingPathQueueBlock` | ~60 | 3 | Training recommendations and apprenticeships |
| `RecurringPainThemesBlock` | ~50 | 2 | Repeated customer pain analysis |
| `FunnelRecommendationsBlock` | ~50 | 2 | Funnel adjustment suggestions |
| `SystemHealthBlock` | ~50 | 2 | Release and runtime health status |
| `DashboardQuestionChips` | ~40 | 3 | Renders admin brief AI actions |
| `DashboardAIActionButton` | ~30 | 0 | Reusable AI action button |

**Total block component code:** ~14 component files, ~800 lines. **Total block component tests:** 13 test files, 38 `it()` calls.

### §1.2 Dashboard infrastructure — orchestration layer

Five library modules coordinate the dashboard's behavior:

| Module | Lines | Tests | Purpose |
| --- | --- | --- | --- |
| `dashboard-blocks.ts` | 155 | 4 | Block ID types, definitions, and registry |
| `dashboard-visibility.ts` | 116 | 11 | Role-based block filtering, runtime context |
| `dashboard-focus.ts` | 72 | 2 | Focus-rail view definitions and scoping |
| `dashboard-ordering.ts` | 64 | 2 | Deterministic block sort order |
| `dashboard-chat-intents.ts` | 306 | 3 | AI action buttons, chat intent mappings |

**Total infrastructure code:** 713 lines. **Total infrastructure tests:** 22 `it()` calls.

### §1.3 Dashboard data loaders — the Sprint 2 survivors

At the Sprint 2 boundary, `dashboard-loaders.ts` was the preserved business-logic survivor. It carried the SQL queries and shaping logic that would later be reused for chat-native admin tooling.

Current-state note: TD-C4 has since completed the convergence. The active backend now lives under `src/lib/operator/`, and the old dashboard compatibility files were removed entirely.

### §1.4 Dashboard handoff — Sprint 2 preserved, later canonicalized

At the Sprint 2 boundary, `src/lib/chat/dashboard-handoff.ts` remained as a chat-system continuity feature independent of the dashboard UI.

Current-state note: TD-C4 later removed that legacy path and canonicalized the handoff implementation as `src/lib/chat/task-origin-handoff.ts`.

### §1.5 GridInspector — developer overlay

`src/components/GridInspector.tsx` (60 lines) is a client component that renders a column grid overlay toggled by `Ctrl+G`. It returns `null` in production. It has **zero tests**. It is rendered in `layout.tsx` and referenced nowhere else.

### §1.6 CommandPalette — developer tool

`src/components/CommandPalette.tsx` (185 lines) is a client component that provides a `Cmd+K` / `Ctrl+K` command search over navigation routes and theme commands using Radix Dialog. In the V1 chat-only model, admin commands are issued through natural language — the command palette is redundant. It has **3 tests** across 2 external test files (`tests/browser-overlays.test.tsx`, `tests/shell-acceptance.test.tsx`).

### §1.7 Shell navigation — dashboard as home

`src/lib/shell/shell-navigation.ts` defines a `dashboard` route in `SHELL_ROUTES` and `resolveShellHomeHref()` returns `"/dashboard"` for signed-in users. After elimination, both must point to `/`.

### §1.8 External references — tests that mock `/dashboard`

Several test files use `"/dashboard"` as a mock pathname:

- `tests/shell-navigation-model.test.ts` — asserts `resolveShellHomeHref()` returns `"/dashboard"` for signed-in users
- `tests/browser-motion.test.tsx` — uses `"/dashboard"` as a pathname mock
- `tests/homepage-shell-ownership.test.tsx` — uses `"/dashboard"` as a pathname mock
- `tests/shell-visual-system.test.tsx` — uses `"/dashboard"` as a pathname mock
- Various UI framework tests — reference `"/dashboard"` in action-link tests

These are not tests *of* the dashboard — they're tests that *happen to reference* the route. Some will need assertion updates where they check for `"/dashboard"` as the home href; others use it as a generic pathname and need no changes.

---

## §2 Target Architecture

### §2.1 One page, one chat

After Sprint 2, the application has a single user-facing page (`/`) with an embedded chat surface. Admin capabilities that were on the dashboard will be delivered through MCP tools in Sprint 10. The grid-based admin UI is eliminated entirely.

### §2.2 Deleted files

| File | Category |
| --- | --- |
| `src/app/dashboard/page.tsx` | Dashboard page |
| `src/app/dashboard/page.test.tsx` | Dashboard page test |
| `src/components/dashboard/ConversationWorkspaceBlock.tsx` | Block component |
| `src/components/dashboard/ConversationWorkspaceBlock.test.tsx` | Block component test |
| `src/components/dashboard/RecentConversationsBlock.tsx` | Block component |
| `src/components/dashboard/RecentConversationsBlock.test.tsx` | Block component test |
| `src/components/dashboard/CustomerWorkflowContinuityBlock.tsx` | Block component |
| `src/components/dashboard/CustomerWorkflowContinuityBlock.test.tsx` | Block component test |
| `src/components/dashboard/LeadQueueBlock.tsx` | Block component |
| `src/components/dashboard/LeadQueueBlock.test.tsx` | Block component test |
| `src/components/dashboard/RoutingReviewBlock.tsx` | Block component |
| `src/components/dashboard/RoutingReviewBlock.test.tsx` | Block component test |
| `src/components/dashboard/AnonymousOpportunitiesBlock.tsx` | Block component |
| `src/components/dashboard/AnonymousOpportunitiesBlock.test.tsx` | Block component test |
| `src/components/dashboard/ConsultationRequestsBlock.tsx` | Block component |
| `src/components/dashboard/ConsultationRequestsBlock.test.tsx` | Block component test |
| `src/components/dashboard/DealQueueBlock.tsx` | Block component |
| `src/components/dashboard/DealQueueBlock.test.tsx` | Block component test |
| `src/components/dashboard/TrainingPathQueueBlock.tsx` | Block component |
| `src/components/dashboard/TrainingPathQueueBlock.test.tsx` | Block component test |
| `src/components/dashboard/RecurringPainThemesBlock.tsx` | Block component |
| `src/components/dashboard/RecurringPainThemesBlock.test.tsx` | Block component test |
| `src/components/dashboard/FunnelRecommendationsBlock.tsx` | Block component |
| `src/components/dashboard/FunnelRecommendationsBlock.test.tsx` | Block component test |
| `src/components/dashboard/SystemHealthBlock.tsx` | Block component |
| `src/components/dashboard/SystemHealthBlock.test.tsx` | Block component test |
| `src/components/dashboard/DashboardQuestionChips.tsx` | Block component |
| `src/components/dashboard/DashboardQuestionChips.test.tsx` | Block component test |
| `src/components/dashboard/DashboardAIActionButton.tsx` | Block component |
| `src/lib/dashboard/dashboard-blocks.ts` | Infrastructure — block registry |
| `src/lib/dashboard/dashboard-blocks.test.ts` | Infrastructure test |
| `src/lib/dashboard/dashboard-visibility.ts` | Infrastructure — role filtering |
| `src/lib/dashboard/dashboard-visibility.test.ts` | Infrastructure test |
| `src/lib/dashboard/dashboard-focus.ts` | Infrastructure — focus-rail views |
| `src/lib/dashboard/dashboard-focus.test.ts` | Infrastructure test |
| `src/lib/dashboard/dashboard-ordering.ts` | Infrastructure — block sort |
| `src/lib/dashboard/dashboard-ordering.test.ts` | Infrastructure test |
| `src/lib/dashboard/dashboard-chat-intents.ts` | Infrastructure — AI actions |
| `src/lib/dashboard/dashboard-chat-intents.test.ts` | Infrastructure test |
| `src/components/GridInspector.tsx` | Developer tool |
| `src/components/CommandPalette.tsx` | Developer tool |

**Total: 41 files deleted.**

### §2.3 Preserved files

| File | Lines | Tests | Why preserved |
| --- | --- | --- | --- |
| `src/lib/dashboard/dashboard-loaders.ts` | 1,469 | 24 | Preserved at the Sprint 2 boundary as the business-logic carry-forward for later MCP tooling |
| `src/lib/dashboard/dashboard-loaders.test.ts` | — | 24 | Sprint-boundary tests for the then-preserved loaders |
| `src/lib/chat/dashboard-handoff.ts` | 164 | 10 | Sprint-boundary preserved chat handoff path |
| `tests/dashboard-chat-handoff.test.ts` | — | 10 | Tests for preserved handoff |

Current-state note: these preserved runtime files no longer exist in active code. Their surviving logic was later converged into `src/lib/operator/` and `src/lib/chat/task-origin-handoff.ts`.

### §2.4 Modified files

| File | Change |
| --- | --- |
| `src/app/layout.tsx` | Remove `GridInspector` and `CommandPalette` imports and JSX |
| `src/lib/shell/shell-navigation.ts` | Remove `dashboard` route from `SHELL_ROUTES`. Update `resolveShellHomeHref()` to return `"/"` for all users. |
| `next.config.ts` | Add `redirects()` to redirect `/dashboard` → `/` (permanent 308) |
| `src/lib/dashboard/dashboard-loaders.ts` | Sprint-boundary change: extract `DashboardBlockId` type inline after `dashboard-blocks.ts` deletion |
| `src/lib/chat/dashboard-handoff.ts` | Sprint-boundary change: extract `DashboardBlockId` type inline after `dashboard-blocks.ts` deletion |
| `tests/shell-navigation-model.test.ts` | Update assertion: `resolveShellHomeHref(authenticatedUser)` now returns `"/"` |
| `tests/browser-overlays.test.tsx` | Remove CommandPalette tests (2 tests) and import |
| `tests/shell-acceptance.test.tsx` | Remove CommandPalette tests (2 tests), update render helpers to remove `<CommandPalette />` |

Current-state note: the dashboard-loader and dashboard-handoff follow-up changes listed above were later superseded by TD-C4 convergence into operator-owned modules and `task-origin-handoff.ts`.

### §2.5 No new source files

This sprint creates zero new source files. It creates 1 test file for verification of the elimination itself.

---

## §3 Implementation Details

### §3.1 DashboardBlockId type extraction

Before deleting `dashboard-blocks.ts`, the `DashboardBlockId` type must be extracted into the two files that use it:

**In `dashboard-loaders.ts` — replace the import with an inline type:**

```typescript
// BEFORE:
import type { DashboardBlockId } from "./dashboard-blocks";

// AFTER:
type DashboardBlockId =
  | "conversation_workspace"
  | "recent_conversations"
  | "customer_workflow_continuity"
  | "lead_queue"
  | "routing_review"
  | "anonymous_opportunities"
  | "consultation_requests"
  | "deal_queue"
  | "training_path_queue"
  | "recurring_pain_themes"
  | "funnel_recommendations"
  | "system_health";
```

**In `dashboard-handoff.ts` — same inline extraction.** The handoff file already hardcodes its own `DASHBOARD_BLOCK_ID_SET` with all 12 IDs, so the type is already effectively duplicated. The import was only for type-checking — inlining it removes the dead dependency.

### §3.2 Layout cleanup — remove developer tools

**Before (`layout.tsx` lines 30–34, 68–69):**

```typescript
import { GridInspector } from "@/components/GridInspector";
import CommandPalette from "@/components/CommandPalette";

// ... in JSX:
<GridInspector />
<CommandPalette />
```

**After:** Both import lines and both JSX elements removed. The `<AppShell>`, `<Suspense>`, and `<ChatSurface>` remain untouched.

### §3.3 Shell navigation — remove dashboard route

**Remove from `SHELL_ROUTES`:**

```typescript
// DELETE this route object:
{ id: "dashboard", label: "Dashboard", href: "/dashboard", kind: "internal",
  footerVisibility: SIGNED_IN_ROLES, accountVisibility: SIGNED_IN_ROLES }
```

**Update `resolveShellHomeHref()`:**

```typescript
// BEFORE:
export function resolveShellHomeHref(user?): string {
  return hasSignedInRole(user) ? "/dashboard" : SHELL_BRAND.homeHref;
}

// AFTER:
export function resolveShellHomeHref(user?): string {
  return SHELL_BRAND.homeHref;   // "/" for all users
}
```

With the dashboard gone, all users — anonymous and signed-in — land on the same page. The chat surface handles role-appropriate behavior.

### §3.4 Next.js redirect — preserve bookmarks

Add a permanent redirect in `next.config.ts` so existing bookmarks and search engine references to `/dashboard` resolve gracefully:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/",
        permanent: true,   // 308 Permanent Redirect
      },
    ];
  },
};

export default nextConfig;
```

A 308 (permanent redirect) is appropriate because the dashboard is permanently eliminated — there is no conditional or temporary state. Search engines will update their indexes.

### §3.5 File deletion order

Deletions must happen after the type extraction (§3.1) and navigation update (§3.3) to prevent build errors:

1. **Phase 1 — Prepare:** Extract `DashboardBlockId` type inline in `dashboard-loaders.ts` and `dashboard-handoff.ts`. Update `shell-navigation.ts`. Update `next.config.ts`. Update `layout.tsx`.
2. **Phase 2 — Delete dashboard page:** Remove `src/app/dashboard/page.tsx` and `src/app/dashboard/page.test.tsx`.
3. **Phase 3 — Delete block components:** Remove all 27 files in `src/components/dashboard/`.
4. **Phase 4 — Delete infrastructure:** Remove `dashboard-blocks.ts`, `dashboard-visibility.ts`, `dashboard-focus.ts`, `dashboard-ordering.ts`, `dashboard-chat-intents.ts` and their test files.
5. **Phase 5 — Delete developer tools:** Remove `GridInspector.tsx` and `CommandPalette.tsx`.
6. **Phase 6 — Clean up tests:** Update `tests/shell-navigation-model.test.ts`, `tests/browser-overlays.test.tsx`, `tests/shell-acceptance.test.tsx`.

### §3.6 Test file updates

**`tests/shell-navigation-model.test.ts`:**

- The `"/dashboard"` entry in the expected routes list must be removed
- The assertion `expect(resolveShellHomeHref(authenticatedUser)).toBe("/dashboard")` must change to `.toBe("/")`

**`tests/browser-overlays.test.tsx`:**

- Remove the `CommandPalette` import
- Remove the 2 tests that render and assert on `<CommandPalette />`
- Preserve the other 2 tests in the file (they test non-CommandPalette overlays)

**`tests/shell-acceptance.test.tsx`:**

- Remove the `CommandPalette` import
- Remove `<CommandPalette />` from the 2 render calls that include it
- Remove the 2 tests that open or assert on CommandPalette (tests 4 and 5)
- Preserve the other 3 tests (they test shell header, footer, and anonymous footer)

**Tests using `"/dashboard"` as a mock pathname** (`browser-motion.test.tsx`, `homepage-shell-ownership.test.tsx`, `shell-visual-system.test.tsx`): These tests use `"/dashboard"` as a generic pathname mock — they are not testing dashboard functionality and do not assert on its existence. They **do not need changes** because the pathname mocking is independent of whether the route exists. The mock simulates "the user is at this URL" regardless of whether a page component exists there.

---

## §4 Migration and Backward Compatibility

### §4.1 URL preservation — redirect handles existing links

Any bookmarks, browser history entries, or external links pointing to `/dashboard` will be permanently redirected to `/`. The 308 status code tells search engines and HTTP clients that the resource has permanently moved.

### §4.2 Admin capability gap — intentional and temporary

Between Sprint 2 (dashboard eliminated) and Sprint 10 (admin MCP tools implemented), admins lose the visual dashboard for pipeline management, lead triage, system health, and other operational views. This is an **intentional gap**. The V1 spec (§3.7) explicitly plans this migration. At the Sprint 2 boundary, the business logic remained in `dashboard-loaders.ts`; in the current repo, that logic has since been converged into the operator-owned runtime under `src/lib/operator/`. Admins use direct database queries or ad-hoc chat during the gap. Sprint 10 restores all capabilities through the chat interface.

### §4.3 Dashboard handoff — semantic continuity

The dashboard handoff system at the Sprint 2 boundary provided context when a user clicked an action button on a dashboard block and entered a chat conversation. With the dashboard UI eliminated, that continuity concept remained foundational for Sprint 10's MCP tool outputs. In the current repo, the capability survives under the canonical `task-origin-handoff` naming rather than the legacy dashboard path.

### §4.4 Data loaders — no schema changes

The preserved Sprint 2 business loaders read from existing database tables, so no schema migration was needed. Their interfaces were the carry-forward contract for Sprint 10 planning. In the current repo, the active equivalents now live behind the operator-owned facade rather than `src/lib/dashboard/`.

---

## §5 Test Specification

### §5.1 Positive tests (expected behavior works)

| # | Test name | What it verifies |
| --- | --- | --- |
| P1 | `layout.tsx does not import GridInspector` | Read `layout.tsx` source → no `GridInspector` import statement |
| P2 | `layout.tsx does not import CommandPalette` | Read `layout.tsx` source → no `CommandPalette` import statement |
| P3 | `layout.tsx does not render GridInspector or CommandPalette` | Read `layout.tsx` source → no `<GridInspector` or `<CommandPalette` in JSX |
| P4 | `next.config.ts includes /dashboard redirect` | Read `next.config.ts` source → contains `source: "/dashboard"` and `destination: "/"` and `permanent: true` |
| P5 | `resolveShellHomeHref returns / for all users` | Import `resolveShellHomeHref` → returns `"/"` for anonymous user, authenticated user, and admin user |
| P6 | `SHELL_ROUTES does not include dashboard` | Import `SHELL_ROUTES` → no entry with `id: "dashboard"` or `href: "/dashboard"` |
| P7 | `dashboard-loaders.ts still exports all 12 loader functions` | Import all 12 loader functions → all are defined functions |
| P8 | `dashboard-loaders.ts defines DashboardBlockId type locally` | Read `dashboard-loaders.ts` source → contains `type DashboardBlockId` and does not import from `./dashboard-blocks` |
| P9 | `dashboard-handoff.ts defines DashboardBlockId type locally` | Read `dashboard-handoff.ts` source → contains `DashboardBlockId` type and does not import from `dashboard-blocks` |

### §5.2 Negative tests (deleted files stay deleted)

| # | Test name | What it verifies |
| --- | --- | --- |
| N1 | `src/app/dashboard/ directory does not exist` | `fs.existsSync("src/app/dashboard")` → `false` |
| N2 | `src/components/dashboard/ directory does not exist` | `fs.existsSync("src/components/dashboard")` → `false` |
| N3 | `GridInspector.tsx does not exist` | `fs.existsSync("src/components/GridInspector.tsx")` → `false` |
| N4 | `CommandPalette.tsx does not exist` | `fs.existsSync("src/components/CommandPalette.tsx")` → `false` |
| N5 | `dashboard-blocks.ts does not exist` | `fs.existsSync("src/lib/dashboard/dashboard-blocks.ts")` → `false` |
| N6 | `dashboard-visibility.ts does not exist` | `fs.existsSync("src/lib/dashboard/dashboard-visibility.ts")` → `false` |
| N7 | `dashboard-focus.ts does not exist` | `fs.existsSync("src/lib/dashboard/dashboard-focus.ts")` → `false` |
| N8 | `dashboard-ordering.ts does not exist` | `fs.existsSync("src/lib/dashboard/dashboard-ordering.ts")` → `false` |
| N9 | `dashboard-chat-intents.ts does not exist` | `fs.existsSync("src/lib/dashboard/dashboard-chat-intents.ts")` → `false` |

### §5.3 Edge tests (preserved files intact)

| # | Test name | What it verifies |
| --- | --- | --- |
| E1 | `dashboard-loaders.ts still exists` | `fs.existsSync("src/lib/dashboard/dashboard-loaders.ts")` → `true` |
| E2 | `dashboard-loaders.test.ts still exists` | `fs.existsSync("src/lib/dashboard/dashboard-loaders.test.ts")` → `true` |
| E3 | `dashboard-handoff.ts still exists` | `fs.existsSync("src/lib/chat/dashboard-handoff.ts")` → `true` |
| E4 | `dashboard-handoff tests still exist` | `fs.existsSync("tests/dashboard-chat-handoff.test.ts")` → `true` |

### §5.4 Test count summary

| Category | Count |
| --- | --- |
| Positive (P1–P9) | 9 |
| Negative (N1–N9) | 9 |
| Edge (E1–E4) | 4 |
| **Total new tests** | **22** |
| Deleted tests — block component tests | -38 |
| Deleted tests — infrastructure tests (excl. loaders) | -22 |
| Deleted tests — page test | -9 |
| Deleted tests — CommandPalette tests in external files | -4 |
| **Total deleted tests** | **-73** |
| **Net change** | **-51** |

**Post-sprint baseline:** ~1215 tests (1266 - 73 + 22)

---

## §6 Test Implementation Patterns

### §6.1 File existence verification

The core of Sprint 2's test strategy is asserting that deleted files stay deleted and preserved files remain:

```typescript
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function exists(relativePath: string): boolean {
  return existsSync(join(process.cwd(), relativePath));
}

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

describe("dashboard elimination — deleted files", () => {
  it("N1: src/app/dashboard/ directory does not exist", () => {
    expect(exists("src/app/dashboard")).toBe(false);
  });

  it("N2: src/components/dashboard/ directory does not exist", () => {
    expect(exists("src/components/dashboard")).toBe(false);
  });

  it("N3: GridInspector.tsx does not exist", () => {
    expect(exists("src/components/GridInspector.tsx")).toBe(false);
  });
});
```

### §6.2 Source analysis for layout and config

```typescript
describe("dashboard elimination — layout cleanup", () => {
  const layout = readSource("src/app/layout.tsx");

  it("P1: layout.tsx does not import GridInspector", () => {
    expect(layout).not.toContain("GridInspector");
  });

  it("P2: layout.tsx does not import CommandPalette", () => {
    expect(layout).not.toContain("CommandPalette");
  });
});
```

### §6.3 Navigation behavior tests

```typescript
import { resolveShellHomeHref, SHELL_ROUTES } from "@/lib/shell/shell-navigation";

describe("dashboard elimination — navigation", () => {
  it("P5: resolveShellHomeHref returns / for all users", () => {
    expect(resolveShellHomeHref(undefined)).toBe("/");
    expect(resolveShellHomeHref({ role: "AUTHENTICATED" })).toBe("/");
    expect(resolveShellHomeHref({ role: "ADMIN" })).toBe("/");
  });

  it("P6: SHELL_ROUTES does not include dashboard", () => {
    const ids = SHELL_ROUTES.map(r => r.id);
    expect(ids).not.toContain("dashboard");
  });
});
```

### §6.4 Preserved file verification

```typescript
describe("dashboard elimination — preserved files", () => {
  it("E1: dashboard-loaders.ts still exists", () => {
    expect(exists("src/lib/dashboard/dashboard-loaders.ts")).toBe(true);
  });

  it("P8: dashboard-loaders.ts defines DashboardBlockId type locally", () => {
    const source = readSource("src/lib/dashboard/dashboard-loaders.ts");
    expect(source).toContain("type DashboardBlockId");
    expect(source).not.toMatch(/import.*from\s+["']\.\/dashboard-blocks["']/);
  });
});
```

---

## §7 Acceptance Criteria

1. `npm run build` produces zero TypeScript errors.
2. All preserved tests pass without assertion changes (except the 3 specified in §3.6).
3. All 22 new verification tests pass.
4. `src/app/dashboard/` directory does not exist.
5. `src/components/dashboard/` directory does not exist.
6. `src/components/GridInspector.tsx` does not exist.
7. `src/components/CommandPalette.tsx` does not exist.
8. `src/lib/dashboard/` contains only `dashboard-loaders.ts` and `dashboard-loaders.test.ts`.
9. `src/app/layout.tsx` does not reference `GridInspector` or `CommandPalette`.
10. `next.config.ts` redirects `/dashboard` to `/` with permanent status.
11. `resolveShellHomeHref()` returns `"/"` for all user types.
12. `SHELL_ROUTES` contains no `dashboard` entry.
13. `dashboard-loaders.ts` defines `DashboardBlockId` locally (no import from deleted file).
14. `dashboard-handoff.ts` defines or inlines `DashboardBlockId` locally (no import from deleted file).
15. `dashboard-loaders.ts` still exports all 12 loader functions.

---

## §8 User Value Assessment

### §8.1 Founder (Keith) — immediate value

- **Reduced attack surface.** An entire admin page with 12 data loaders, role-based visibility filtering, and 14 interactive components is removed from the build. Less code means fewer security vulnerabilities and less to audit.
- **Simpler mental model.** The application is now one page with one chat interface. Admin capabilities will return through natural language in Sprint 10 — more accessible, more natural, and more aligned with the product's AI-first identity.
- **Faster builds.** ~3,500 lines of TypeScript and React components are eliminated. Build and test times improve proportionally.

### §8.2 Students — learning value

- **Controlled demolition.** Sprint 2 demonstrates how to safely eliminate a major feature: extract dependencies first, preserve data access layers, update navigation, add redirects, then delete. The test specification proves the deletion was intentional, not accidental.
- **Interface segregation in practice.** The dashboard's block components were tightly coupled to a specific rendering pattern. By preserving the data loaders but deleting the UI, students see the value of separating data access from presentation.

### §8.3 Deployers — simplification value

- **Fewer components to understand.** A deployer forking this project no longer needs to understand dashboard blocks, focus rails, visibility rules, or ordering logic. The deployment surface is just a chat page.
- **Clean redirect.** Any existing bookmarks or integrations pointing to `/dashboard` are gracefully redirected with a permanent HTTP status.

---

## §9 Out of Scope

| Item | Deferred to |
| --- | --- |
| MCP admin tools replacing dashboard blocks | Sprint 10 (Admin Pipeline Tools) |
| Removal of `dashboard-loaders.ts` | Never — refactored into MCP backends in Sprint 10 |
| Removal of `dashboard-handoff.ts` | Never — repurposed for MCP tool conversational continuity |
| CSS cleanup of dashboard-specific styles | TD-A (Booch Object Audit) — if any orphaned styles exist |
| Shell Command system removal (`shell-commands.ts`) | Not in scope — CommandPalette is deleted but shell commands may be used elsewhere |
| `dashboard.html` static file cleanup | Implementation — delete if present (not a source file) |
| Removal of `@radix-ui/react-dialog` dependency | Not in scope — may be used by other components |

---

## §10 Sprint Boundary Verification

After Sprint 2 is complete, verify:

```text
1. npx vitest run                    → ~1215 tests passing (1266 - 73 + 22)
2. npm run build                     → clean, zero errors
3. npm run lint                      → no new warnings
4. ls src/app/dashboard/             → No such file or directory
5. ls src/components/dashboard/      → No such file or directory
6. ls src/components/GridInspector.tsx
                                     → No such file or directory
7. ls src/components/CommandPalette.tsx
                                     → No such file or directory
8. ls src/lib/dashboard/             → dashboard-loaders.ts  dashboard-loaders.test.ts
9. grep "GridInspector\|CommandPalette" src/app/layout.tsx
                                     → zero matches
10. grep "/dashboard" next.config.ts → source: "/dashboard"  destination: "/"
11. grep "resolveShellHomeHref" src/lib/shell/shell-navigation.ts
                                     → returns SHELL_BRAND.homeHref (which is "/")
```
