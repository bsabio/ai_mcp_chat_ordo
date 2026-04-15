# Sprint 1 - Focus Views And Secondary Rail

> **Goal:** Reduce dashboard sprawl by introducing focused views and evolving the right rail into a lighter action-oriented workspace rail where AI controls remain one-click actions: click once, open the FAB chat if needed, and immediately start the mapped task.
> **Spec ref:** `DAW-041`, `DAW-060` through `DAW-075`, `DAW-076` through `DAW-080D`, `DAW-091`, `DAW-092`
> **Prerequisite:** Sprint 0 commit
> **Test count target:** `9 existing focused dashboard tests + 6 sprint additions = 15 total` across `src/app/dashboard/page.test.tsx` (5), `src/components/dashboard/ConversationWorkspaceBlock.test.tsx` (2), `src/components/dashboard/RecentConversationsBlock.test.tsx` (2), and a new focus-model test file under `src/lib/dashboard/`

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/app/dashboard/page.tsx` | Server page that already loads block payloads, computes block visibility, and renders a split main-lane / right-rail layout |
| `src/lib/dashboard/dashboard-blocks.ts` | Canonical registry already defines `id`, `title`, `description`, `allowedRoles`, `loadPriority`, `category`, and `requiresData` |
| `src/lib/dashboard/dashboard-ordering.ts` | Exports `DashboardOrderedBlock` and `sortDashboardBlocks(items)` for deterministic ordering |
| `src/lib/dashboard/dashboard-visibility.ts` | Exports `DashboardRuntimeContext`, `DashboardBlockVisibility`, `createDashboardRuntimeContext`, `filterDashboardBlocksForUser`, and `getDashboardBlockVisibility(...)` |
| `src/components/dashboard/ConversationWorkspaceBlock.tsx` | Existing right-rail block showing current conversation continuity |
| `src/components/dashboard/RecentConversationsBlock.tsx` | Existing workspace-history block that can move between main content and rail depending on the focus model |
| `src/app/dashboard/page.test.tsx` | Has 5 tests and already verifies role-based layout, block presence, and injected chip props |
| `src/components/dashboard/ConversationWorkspaceBlock.test.tsx` | Has 2 tests and anchors current workspace-card behavior |
| `src/components/dashboard/RecentConversationsBlock.test.tsx` | Has 2 tests and anchors current recent-history behavior |
| `package.json` | Provides `npm run typecheck`, `npm run build`, and targeted vitest commands |

---

## Task 1.1 - Add a canonical dashboard focus-view model

**What:** Create a typed focus-view contract and a single mapping from blocks to focus views so the dashboard can render only the relevant subset of blocks at a time.

| Item | Detail |
| --- | --- |
| **Create or Modify** | Dashboard model file under `src/lib/dashboard/` plus a focused test file for the block-to-view mapping |
| **Modify** | `src/app/dashboard/page.tsx` |
| **Spec** | `DAW-041`, `DAW-060` through `DAW-070` |

### Task 1.1 Notes

Define a small focus model such as:

```ts
export type DashboardFocusView =
  | "overview"
  | "revenue"
  | "service"
  | "training"
  | "operations";
```

And a canonical mapping from `DashboardBlockId` to one focus bucket.

Keep this logic server-readable and testable. Avoid burying block-grouping rules inline inside JSX.

The expected sprint test additions for this task are:

1. add 2 tests in a new focus-model test file under `src/lib/dashboard/` for default focus resolution and block-to-view mapping behavior

### Task 1.1 Verify

```bash
npm run typecheck
```

---

## Task 1.2 - Render dashboard focus controls and scope the visible blocks

**What:** Add the actual dashboard focus controls and reduce the main content area to the active view instead of showing every block at once.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/dashboard/page.tsx` |
| **Modify** | Supporting dashboard presentation components if extraction improves readability |
| **Spec** | `DAW-041`, `DAW-060` through `DAW-070`, `DAW-091` |

### Task 1.2 Notes

The spec intentionally allows either tabs or a compact secondary nav pattern.

Implementation requirements:

1. current focus state must be explicit and testable
2. only the active focus view’s block set should dominate the main lane
3. the control labels must reflect the actual user task domains, not internal categories
4. the overview view should remain the default landing experience
5. focus controls may change which blocks are foregrounded, but any AI control revealed within that focused view must still preserve the Sprint 0 one-click open-and-send contract

If focus state is encoded in URL search params for shareability, keep the rule simple and deterministic.

The expected sprint test additions for this task are:

1. add 2 tests in `src/app/dashboard/page.test.tsx` for default focus selection and scoped block rendering when a non-default focus view is active

### Task 1.2 Verify

```bash
npx vitest run src/app/dashboard/page.test.tsx
```

---

## Task 1.3 - Convert the right rail into a true workspace action rail

**What:** Reframe the right rail so it supports AI actions and current-work continuity rather than acting as a passive metadata column.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/dashboard/page.tsx` |
| **Modify** | `src/components/dashboard/ConversationWorkspaceBlock.tsx` |
| **Modify** | `src/components/dashboard/RecentConversationsBlock.tsx` or extract a dedicated rail component if cleaner |
| **Create or Modify** | Reuse the Sprint 0 thin launcher helper/boundary for rail AI actions instead of inventing a rail-specific launch path |
| **Spec** | `DAW-071` through `DAW-075`, `DAW-092` |

### Task 1.3 Notes

At minimum, the rail should support:

1. conversation continuity
2. one or more focus-aware AI actions
3. clear distinction between “continue work” and “inspect status”

The rail AI actions are not shortcuts to a later compose step. They must behave as direct commands:

1. click the rail AI action
2. open the FAB chat if it is closed
3. immediately submit the mapped prompt in the current task frame

Do not fork the launch mechanism here. The rail should reuse the Sprint 0 launcher semantics so Sprint 2 can extend the same primitive across block headers and rows.

The expected sprint test additions for this task are:

1. add 2 tests across `src/components/dashboard/ConversationWorkspaceBlock.test.tsx` and `src/components/dashboard/RecentConversationsBlock.test.tsx` for focus-aware rail AI affordances and one-click launcher behavior

Do not turn the rail into a second full dashboard column. It should stay compact and action-oriented.

### Task 1.3 Verify

```bash
npx vitest run src/app/dashboard/page.test.tsx src/components/dashboard/ConversationWorkspaceBlock.test.tsx src/components/dashboard/RecentConversationsBlock.test.tsx
```

---

## Task 1.4 - Record the final focus-view contract

**What:** Preserve the adopted focus labels, block-to-view mapping, and rail rules so Sprint 2 can add block-level actions without re-litigating the IA.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/dashboard-ai-action-workspace/sprints/sprint-1-focus-views-and-secondary-rail.md` |
| **Spec** | `DAW-065` through `DAW-075` |

### Task 1.4 Notes

If implementation chooses tabs over a second nav rail, or vice versa, record the decision explicitly in `QA Deviations`.

### Task 1.4 Verify

```bash
npm run build
```

---

## Completion Checklist

- [x] Dashboard has an explicit typed focus-view model
- [x] Main lane no longer renders every block at once by default
- [x] Right rail functions as a continuity and AI action rail
- [x] Focus-aware rail AI actions preserve one-click FAB open-and-send behavior
- [x] Sprint 1 reuses the Sprint 0 launcher primitive rather than introducing a separate rail launch path
- [x] Focus labels and block-grouping rules are captured for later sprints

## QA Deviations

- Implemented focus selection as a simple `focus` query param (`/dashboard?focus=revenue`) so the server page owns the scoped layout deterministically.
- Kept `conversation_workspace` and `recent_conversations` as persistent rail blocks for admin views even though both map to `overview`; this preserves continuity while the main lane switches domains.
- Kept the cross-domain admin brief as an overview-only surface. Focused views now lead with the focus controls, scoped blocks, and focus-aware rail actions instead of a mixed-domain summary.
- Admin views now load only the data required for the active focus plus the persistent continuity rail, which reduces failure surface and keeps focus changes operationally isolated.
- Focus-aware rail actions now carry distinct `sourceContextId` metadata so later chat handoff and analytics can separate focus commands from generic workspace resume actions.
