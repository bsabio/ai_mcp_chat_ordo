# Dashboard AI Action Workspace - Architecture Spec

> **Status:** Draft v1.0
> **Date:** 2026-03-20
> **Scope:** Refactor the signed-in dashboard so it teaches AI-first operation through explicit chat actions, clearer AI iconography, and a more focused information architecture built around tabs or a secondary action rail.
> **Dependencies:** Dashboard RBAC Blocks (draft), Chat Experience (implemented), Homepage Chat Shell (draft), Shell Navigation And Design System (complete), Conversation Lane Routing (draft), Customer Workflow And Deal Flow (draft)
> **Affects:** `src/app/dashboard/page.tsx`, `src/lib/dashboard/dashboard-blocks.ts`, `src/lib/dashboard/dashboard-ordering.ts`, `src/lib/dashboard/dashboard-visibility.ts`, `src/lib/dashboard/dashboard-chat-intents.ts`, `src/components/dashboard/*`, `src/frameworks/ui/ChatContainer.tsx`, `src/hooks/useGlobalChat.tsx`, a thin reusable dashboard-to-chat launcher client boundary for server-rendered blocks, focused dashboard/chat tests, and browser QA coverage for dashboard-to-chat flows.
> **Motivation:** The current dashboard contains real operational signal, but it still behaves more like a report than a control surface. Users can read blocks and metrics, yet the UI does not consistently teach them that the AI agent is the main way to act on those signals. This spec turns the dashboard into a focused AI action workspace rather than a dense summary page with one floating chat button.
> **Requirement IDs:** `DAW-XXX`

---

## 1. Problem Statement

### 1.1 Product Requirement

The dashboard needs to do three things at once:

1. Make AI actions obvious at the block level rather than hiding chat behind a single floating entry point. `[DAW-010]`
2. Reduce dashboard sprawl so users focus on the current domain of work instead of scanning every block on every visit. `[DAW-011]`
3. Use chips and explicit AI affordances to train user behavior: see a signal, trigger the agent, get the next action. `[DAW-012]`

### 1.2 Verified Current State

The current dashboard already has the beginnings of this pattern, but only in one narrow slice.

Verified current baseline:

1. `src/app/dashboard/page.tsx` renders `/dashboard` as the signed-in workspace and already includes an inline admin brief with chat chips. `[DAW-020]`
2. `src/components/dashboard/DashboardQuestionChips.tsx` dispatches `OPEN_GLOBAL_CHAT_EVENT` and immediately calls `sendMessage(intent.prompt)`, so the dashboard already has a real chat-launch integration seam. `[DAW-021]`
3. `src/frameworks/ui/ChatContainer.tsx` listens for `OPEN_GLOBAL_CHAT_EVENT` and opens the floating chat shell, which means block-level actions can already summon chat without route transitions. `[DAW-022]`
4. Most dashboard blocks still expose either passive summaries, local filters, or plain links such as `Open chat` / `Open conversation`, rather than a consistent AI-action model. `[DAW-023]`
5. The current page layout renders the main dashboard lane and right rail simultaneously, with all eligible blocks visible at once. This creates density, but not focus. `[DAW-024]`

### 1.3 Verified UX Failures

The current rendered dashboard has the following product-level failures:

1. AI intent chips exist in the admin brief, but they do not yet establish a reusable visual language that says “this is an AI action” across the rest of the workspace. `[DAW-025]`
2. The floating chat trigger is the strongest chat affordance on the page, which means the page teaches a global chat pattern rather than a block-aware action pattern. `[DAW-026]`
3. The right rail is mostly informational and passive. It does not currently function as an action rail or an AI-launch surface. `[DAW-027]`
4. Dashboard blocks compete for attention because there is no focus model such as tabs, segmented views, or a secondary navigation rail. `[DAW-028]`
5. Dashboard-to-chat handoff remains inconsistent: chip clicks can send a prompt, but the first reply may still feel generic unless the backend prompt and routing context are aligned with the clicked dashboard task. `[DAW-029]`

### 1.4 Failure Modes Without A Refactor

Without an explicit dashboard AI-action architecture, the product will drift into predictable issues:

1. More dashboard chips will be added ad hoc, creating visual noise without improving behavior. `[DAW-030]`
2. Each block will invent its own CTA model: filters, deep links, plain anchors, or chat shortcuts. `[DAW-031]`
3. Users will continue to read dashboards passively rather than using the AI agent as the operating layer. `[DAW-032]`
4. The rendered chat will keep feeling detached from the originating block if the dashboard action contract is not formalized end to end. `[DAW-033]`

---

## 2. Design Goals

1. **AI-first action model.** Every important operational block should make the AI agent the easiest next step. `[DAW-040]`
2. **Focused dashboard views.** Users should see the subset of blocks relevant to the current task domain, not the entire operator inventory at once. `[DAW-041]`
3. **Consistent AI affordances.** Chips, labels, and icons should immediately communicate that a control launches or continues an AI conversation. `[DAW-042]`
4. **Block-aware chat handoff.** Clicking a dashboard AI action must feel like continuing the clicked task, not opening a generic assistant. `[DAW-043]`
5. **Role-aware continuity.** Admin, staff, and authenticated users should each see AI actions that match the blocks and workloads available to them. `[DAW-044]`
6. **Server-owned truth, client-owned launch.** Dashboard blocks and summaries remain server-owned, while the client focuses on opening chat and sending the correct intent prompt. `[DAW-045]`
7. **Incremental adoption.** The refactor should build on the current `DashboardQuestionChips` and `OPEN_GLOBAL_CHAT_EVENT` model rather than replacing the dashboard architecture wholesale. `[DAW-046]`

---

## 3. Current Architecture Inventory

### 3.1 Dashboard Route And Block Model

Verified in `src/app/dashboard/page.tsx`:

```typescript
export default async function DashboardPage()
```

Verified supporting dashboard model files:

```typescript
export type DashboardBlockId =
  | "conversation_workspace"
  | "customer_workflow_continuity"
  | "recent_conversations"
  | "routing_review"
  | "lead_queue"
  | "anonymous_opportunities"
  | "consultation_requests"
  | "training_path_queue"
  | "deal_queue"
  | "recurring_pain_themes"
  | "funnel_recommendations"
  | "system_health";

export interface DashboardBlockDefinition {
  id: DashboardBlockId;
  title: string;
  description: string;
  allowedRoles: readonly RoleName[];
  loadPriority: DashboardBlockPriority;
  category: DashboardBlockCategory;
  requiresData: boolean;
}
```

And ordering / visibility already exist as explicit contracts:

```typescript
export interface DashboardOrderedBlock {
  block: DashboardBlockDefinition;
  visibility: DashboardBlockVisibility;
}

export function sortDashboardBlocks(items: DashboardOrderedBlock[]): DashboardOrderedBlock[]
export function filterDashboardBlocksForUser(user, blocks): DashboardBlockDefinition[]
export function createDashboardRuntimeContext(overrides?): DashboardRuntimeContext
export function getDashboardBlockVisibility(user, block, runtimeContext): DashboardBlockVisibility
```

This is the correct foundation for adding focus views and AI-action metadata without inventing a second dashboard registry. `[DAW-050]`

### 3.2 Existing Dashboard-To-Chat Launch Contract

Verified in `src/components/dashboard/DashboardQuestionChips.tsx`:

```typescript
export function DashboardQuestionChips({ intents }: DashboardQuestionChipsProps)
```

Current behavior:

1. dispatches `new CustomEvent(OPEN_GLOBAL_CHAT_EVENT)`
2. calls `await sendMessage(intent.prompt)`
3. disables the clicked chip while the send is in flight

Verified event source of truth:

```typescript
export const OPEN_GLOBAL_CHAT_EVENT = "studio-ordo:open-chat";
```

Verified floating chat listener in `src/frameworks/ui/ChatContainer.tsx`:

```typescript
window.addEventListener(OPEN_GLOBAL_CHAT_EVENT, handleOpenChat)
```

This means the product already has a working client-side AI launch contract. The refactor should generalize and strengthen it rather than replace it. `[DAW-051]`

### 3.3 Existing Intent Model

Verified in `src/lib/dashboard/dashboard-chat-intents.ts`:

```typescript
export interface DashboardChatIntent {
  id: string;
  label: string;
  prompt: string;
  toolHints: string[];
}

export function getAdminDashboardChatIntents(): readonly DashboardChatIntent[]
```

The admin brief already treats dashboard chips as operational prompts, not cosmetic tags. This file is the correct starting point for a broader action registry or per-block intent helper model. `[DAW-052]`

### 3.4 Existing Passive Block Affordances

Verified block surfaces still rely on non-AI actions:

1. `ConversationWorkspaceBlock` renders a plain `Open chat` link to `payload.data.resumeHref`. `[DAW-053]`
2. `RecentConversationsBlock` renders `Open chat workspace` links into past threads. `[DAW-054]`
3. `RoutingReviewBlock` and `TrainingPathQueueBlock` render `Open conversation` links per item. `[DAW-055]`
4. `LeadQueueBlock` uses local filter pills and inline triage controls, but no AI-specific CTA pattern. `[DAW-056]`

These are not wrong, but they are inconsistent with the desired product behavior where the agent is the primary action model. `[DAW-057]`

---

## 4. Architecture Direction

### 4.1 Canonical Rule

The dashboard should become an AI action workspace with two coordinated layers:

1. **Focus layer:** tabs or a second rail determine which subset of blocks is foregrounded. `[DAW-060]`
2. **Action layer:** each foregrounded block exposes explicit AI actions that launch chat in a task-aware way. `[DAW-061]`

Default product rule:

1. summaries stay on the dashboard
2. execution pivots into chat
3. deep record inspection may still link to thread or detail routes when needed

### 4.2 AI Action Primitive

The system should promote a reusable dashboard AI action primitive instead of letting each block invent its own buttons.

Recommended contract:

```typescript
export interface DashboardAIAction {
  id: string;
  label: string;
  prompt: string;
  icon: "sparkles" | "message-square" | "bot";
  emphasis: "primary" | "secondary" | "inline";
  toolHints: string[];
  sourceBlockId?: DashboardBlockId;
  sourceContextId?: string;
}
```

Rules:

1. AI actions must visually read as AI actions, not ordinary filter chips. `[DAW-062]`
2. AI actions must be launchable from any block header or block sub-section. `[DAW-063]`
3. AI actions may coexist with non-AI controls, but the AI action should be the clearest next step for interpretation and prioritization tasks. `[DAW-064]`
4. The chip or CTA is the command itself. Clicking it should immediately start the mapped action in chat rather than opening an intermediate chooser or requiring a second confirmation step. `[DAW-064A]`

### 4.3 Focus Model

The dashboard should support a smaller number of focus views rather than one giant mixed surface.

Recommended initial views:

```typescript
export type DashboardFocusView =
  | "overview"
  | "revenue"
  | "service"
  | "training"
  | "operations";
```

Recommended mapping:

1. `overview`: today strip, AI brief, conversation workspace, recent conversations `[DAW-065]`
2. `revenue`: lead queue, consultation requests, deal queue `[DAW-066]`
3. `service`: routing review, anonymous opportunities, recurring pain themes, funnel recommendations `[DAW-067]`
4. `training`: customer workflow continuity, training path queue `[DAW-068]`
5. `operations`: system health and any future diagnostics or environment blocks `[DAW-069]`

The actual UI can be tabs, a segmented toolbar, or a compact secondary rail. The architecture requirement is focus separation, not one specific visual implementation. `[DAW-070]`

Active focus views should load only the block data needed for that focus plus persistent continuity surfaces in the rail. Cross-domain summaries belong to the default overview experience, not every focused view. `[DAW-070]`

### 4.4 Secondary Action Rail

The right rail should evolve from passive metadata into a persistent AI action rail.

Recommended contents:

1. current conversation continuity `[DAW-071]`
2. continue last AI thread `[DAW-072]`
3. suggested next AI action based on the current focus view `[DAW-073]`
4. optional quick-launch actions such as `Ask AI about this view` or `Summarize what matters here` `[DAW-074]`

The rail should help users act, not merely confirm state. `[DAW-075]`

When a rail action represents a focus-level command rather than a specific block row, it should preserve distinct source metadata separate from the continuity block itself so analytics and later handoff logic can distinguish `focus-rail:revenue` from `conversation-workspace:resume`. `[DAW-080A]`

### 4.5 Dashboard-To-Chat Handoff Contract

Dashboard AI actions must not behave like generic chat entry points.

Required rule set:

1. Clicking an AI action opens the FAB chat if needed. `[DAW-076]`
2. Clicking an AI action immediately submits the mapped action prompt into the FAB chat. The user should not have to click the chip and then click send again. `[DAW-077]`
3. The outgoing prompt must encode the block/task intent, not just the visible label. `[DAW-078]`
4. The first assistant reply should answer in the task frame implied by the clicked block or chip. `[DAW-079]`
5. If the action came from a specific block, that context should be available to future analytics, suggested follow-ups, or UI state. `[DAW-080]`

This may require an explicit `sourceBlockId`, richer prompt templates, or a small metadata layer that is separate from visible chip labels, but it must preserve the one-click launch-and-send behavior. `[DAW-080A]`

### 4.5A Client Launch Boundary

The dashboard contains both server-rendered blocks and client-side chat controls, so AI launches need a narrow reusable client boundary.

Required rule set:

1. Server-rendered dashboard blocks should not each be converted wholesale into client components just to launch chat. `[DAW-080B]`
2. A thin reusable client launcher component or helper may be embedded inside a server block to dispatch the canonical open-FAB event and submit the mapped prompt. `[DAW-080C]`
3. The launcher boundary should reuse the same semantics as the admin brief chips so all dashboard AI actions behave identically. `[DAW-080D]`

### 4.6 Iconography Contract

The dashboard needs a stable visual rule for AI controls.

Initial rule set:

1. use one small icon family across all dashboard AI actions `[DAW-081]`
2. reserve the icon for AI-launch controls, not ordinary filters `[DAW-082]`
3. prefer a calm, legible symbol such as `sparkles` or `message-square` over a novelty robot icon unless a stronger assistant identity is explicitly desired `[DAW-083]`
4. icon plus text should appear together for learnability; icon-only AI actions are not sufficient in this dashboard phase `[DAW-084]`

### 4.7 Non-AI Controls Still Allowed

This spec does not require every dashboard interaction to become chat.

The following controls remain valid:

1. record-level links into an existing conversation or detail surface `[DAW-085]`
2. admin triage mutations such as lead state changes `[DAW-086]`
3. role-gated operational edits that should not be mediated by the chat model `[DAW-087]`

The requirement is not “chat only.” The requirement is “AI first for interpretation, prioritization, and next-step guidance.” `[DAW-088]`

---

## 5. Testing Strategy

The implementation must add or update tests for the following:

1. reusable AI action chip rendering, icon labeling, disabled states, and launch behavior `[DAW-090]`
2. dashboard page focus-view rendering and block grouping `[DAW-091]`
3. right-rail action continuity and focus-aware suggestions `[DAW-092]`
4. block-level AI action availability for admin and signed-in non-admin views `[DAW-093]`
5. dashboard-to-chat prompt handoff semantics, including the open-chat event `[DAW-094]`
6. browser verification that a clicked block action opens chat and produces a task-aware first reply `[DAW-095]`

---

## 6. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Establish the reusable dashboard AI action primitive, icon language, and initial adoption in the admin brief and workspace rail |
| 1 | Introduce focused dashboard views through tabs or a compact secondary navigation model and reduce simultaneous block density |
| 2 | Extend block-level AI actions across key dashboard blocks so the agent becomes the default action model for operational interpretation |
| 3 | Harden dashboard-to-chat handoff, align first-reply behavior with block context, and complete browser QA evidence |

---

## 7. Future Considerations

1. Track analytics for which block-level AI actions are clicked most often. `[DAW-100]`
2. Allow the dashboard rail to surface context-aware suggested prompts derived from runtime block state. `[DAW-101]`
3. Promote certain AI actions to keyboard-accessible shell commands once the block-action taxonomy stabilizes. `[DAW-102]`
4. Consider saved “operator plays” or reusable AI workflows once per-block prompts are stable and effective. `[DAW-103]`
5. Defer any deeper redesign of individual block data models until the AI-action contract is proven in the current dashboard architecture. `[DAW-104]`
