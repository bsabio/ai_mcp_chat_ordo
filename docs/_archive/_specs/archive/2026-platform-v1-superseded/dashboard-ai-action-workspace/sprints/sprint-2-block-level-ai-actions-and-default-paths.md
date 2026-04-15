# Sprint 2 - Block-Level AI Actions And Default Paths

> **Goal:** Extend the AI action pattern beyond the admin brief so the dashboard’s key blocks consistently guide users into task-specific chat flows with the same one-click contract: click the block AI action, open the FAB chat if needed, and immediately start the mapped task.
> **Spec ref:** `DAW-040` through `DAW-045`, `DAW-062` through `DAW-064A`, `DAW-076` through `DAW-088`, `DAW-093`, `DAW-080A` through `DAW-080D`
> **Prerequisite:** Sprint 1 commit
> **Status:** Implemented 2026-03-20
> **Test count actual:** `25 existing focused dashboard tests + 9 Sprint 2 additions = 34 total` across `src/app/dashboard/page.test.tsx` (9), `src/components/dashboard/DashboardQuestionChips.test.tsx` (3), `src/components/dashboard/LeadQueueBlock.test.tsx` (7), `src/components/dashboard/RoutingReviewBlock.test.tsx` (3), `src/components/dashboard/TrainingPathQueueBlock.test.tsx` (3), `src/components/dashboard/RecentConversationsBlock.test.tsx` (3), `src/components/dashboard/ConversationWorkspaceBlock.test.tsx` (3), and `src/lib/dashboard/dashboard-chat-intents.test.ts` (3)

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/components/dashboard/LeadQueueBlock.tsx` | Client block with local filter state, inline triage mutation, and summary copy already oriented toward founder follow-up |
| `src/components/dashboard/RoutingReviewBlock.tsx` | Server-rendered block that currently presents queue sections and `Open conversation` links for lane changes, uncertain threads, and follow-up-ready threads |
| `src/components/dashboard/TrainingPathQueueBlock.tsx` | Server-rendered block showing founder-managed training-path follow-up and conversation links |
| `src/components/dashboard/RecentConversationsBlock.tsx` | Server-rendered history block that currently reopens threads through plain links |
| `src/components/dashboard/DashboardQuestionChips.tsx` | Existing client launch surface for opening chat and sending an intent prompt |
| `src/lib/dashboard/dashboard-chat-intents.ts` | Current home for dashboard action metadata and prompt templates |
| `src/app/dashboard/page.tsx` | Imports and composes the major dashboard blocks under one route |
| `src/app/dashboard/page.test.tsx` | Has 9 tests and provides the current high-level dashboard composition test surface, including focus scoping, loader gating, and adopted block-level AI action visibility |
| `src/components/dashboard/DashboardQuestionChips.test.tsx` | Has 3 tests and anchors the canonical dashboard open-and-send path, disabled-state semantics, and duplicate-send guard |
| `src/components/dashboard/LeadQueueBlock.test.tsx` | Has 7 tests and anchors the most stateful admin block surface in this sprint, including launch, pending-state coverage, and active-filter AI scope coverage |
| `src/components/dashboard/RoutingReviewBlock.test.tsx` | Has 3 tests and anchors current routing-review rendering plus block-level AI launch coverage |
| `src/components/dashboard/TrainingPathQueueBlock.test.tsx` | Has 3 tests and anchors current training-path queue rendering plus block-level AI launch coverage |
| `src/components/dashboard/RecentConversationsBlock.test.tsx` | Has 3 tests and anchors recent-history rendering plus shared focus-action launch behavior |
| `src/components/dashboard/ConversationWorkspaceBlock.test.tsx` | Has 3 tests and anchors workspace-card rendering plus shared focus-action launch behavior |
| `src/lib/dashboard/dashboard-chat-intents.test.ts` | Has 3 tests and anchors block-level AI action metadata, support boundaries, and fallback prompt safety |

---

## Task 2.1 - Define per-block AI action helpers for the main operational blocks

**What:** Create a small registry or helper set that returns AI actions for specific dashboard blocks rather than relying on a single shared admin-brief prompt list.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-chat-intents.ts` or split into a companion action-registry file |
| **Spec** | `DAW-062` through `DAW-064`, `DAW-076` through `DAW-080`, `DAW-093` |

### Task 2.1 Notes

Prioritize the blocks that most obviously benefit from AI interpretation:

1. `lead_queue`
2. `routing_review`
3. `training_path_queue`
4. `recent_conversations` or `conversation_workspace`

Each block should have at least one explicit AI action and may have a small secondary set.

Do not encode these actions as visible labels only. The prompt copy must remain task-aware and may differ from the chip label.

Every helper introduced here must describe a command that executes on the first click. Do not define an action shape that implies a later manual send step.

The expected sprint test additions for this task are:

1. add 3 tests in a new action-registry or launcher-helper test file
2. positive: adopted blocks return task-aware action metadata with the correct `label`, `prompt`, `toolHints`, `sourceBlockId`, and `sourceContextId` where applicable
3. negative: unknown or non-adopted blocks do not silently fall back to the generic admin brief prompt set
4. edge: fallback variants such as empty conversation workspace state still produce a valid one-click action with safe prompt copy rather than blank labels or missing prompts

### Task 2.1 Verify

```bash
npm run typecheck
```

---

## Task 2.2 - Add AI actions directly to key block headers or action rows

**What:** Surface block-specific AI actions in the blocks themselves so users do not have to infer that the global chat can help with the current content.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/dashboard/LeadQueueBlock.tsx` |
| **Modify** | `src/components/dashboard/RoutingReviewBlock.tsx` |
| **Modify** | `src/components/dashboard/TrainingPathQueueBlock.tsx` |
| **Modify** | `src/components/dashboard/RecentConversationsBlock.tsx` and/or `ConversationWorkspaceBlock.tsx` |
| **Create or Modify** | Thin reusable launcher helper/component for server-rendered block headers and row actions when needed |
| **Spec** | `DAW-025` through `DAW-029`, `DAW-040`, `DAW-062` through `DAW-064`, `DAW-085` through `DAW-088` |

### Task 2.2 Notes

Keep the hierarchy disciplined:

1. one primary AI action per block header is sufficient
2. add secondary chips only where the block naturally supports multiple operator tasks
3. do not remove necessary record links or admin mutation controls
4. use the same icon + label language established in Sprint 0

Block-level AI actions must preserve the same behavior everywhere they appear:

1. one click opens the FAB chat if needed
2. that same click immediately submits the mapped block-aware prompt
3. there is no intermediate chooser, draft state, or second send click

This sprint should make the dashboard feel like “every major block can hand off to AI” without overloading every card.

The expected sprint test additions for this task are:

1. add 3 tests in `src/components/dashboard/LeadQueueBlock.test.tsx`
2. positive: the lead queue header exposes its primary AI action and still renders founder triage controls and conversation links
3. negative: pending chat state or an in-flight launch disables the AI action without disabling direct triage mutations beyond their existing rules
4. edge: the lead queue AI action remains usable when optional lead fields such as organization, founder note, or last-contacted timestamp are missing
5. add 2 tests split across `src/components/dashboard/RoutingReviewBlock.test.tsx` and `src/components/dashboard/TrainingPathQueueBlock.test.tsx`
6. positive: each adopted server-rendered block exposes one-click AI launch from the header or designated action row
7. negative or edge: empty sections still render truthful empty-state copy and do not spam per-row AI controls when there is nothing actionable yet

### Task 2.2 Verify

```bash
npx vitest run src/app/dashboard/page.test.tsx src/components/dashboard/DashboardQuestionChips.test.tsx
```

---

## Task 2.3 - Normalize the relationship between AI actions and non-AI controls

**What:** Make the product rule visible in the code: AI actions are the default for interpretation and prioritization, while links and mutations remain for direct record handling.

| Item | Detail |
| --- | --- |
| **Modify** | Relevant block components from Task 2.2 |
| **Modify** | Tests covering visible CTAs and link presence |
| **Spec** | `DAW-085` through `DAW-088` |

### Task 2.3 Notes

The outcome should be consistent across blocks:

1. AI actions help decide what to do
2. record links help inspect or continue a specific thread
3. admin mutations continue to act directly on structured state
4. AI actions are the fastest path from block signal to active FAB execution, not a pre-chat suggestion layer

If a block ends up with too many header actions, move secondary AI actions into a compact row beneath the summary copy rather than adding more inline controls.

The expected sprint test additions for this task are:

1. add 3 tests split across `src/components/dashboard/RecentConversationsBlock.test.tsx` and `src/components/dashboard/ConversationWorkspaceBlock.test.tsx`
2. positive: AI-first CTA hierarchy is visible while direct record links remain intact and discoverable
3. negative: block-level AI actions do not replace or relabel direct record links such as `Open thread` or `Open chat workspace`
4. edge: empty or no-active-thread states still present a safe AI-first default path without pretending that resumable history exists

### Task 2.3 Verify

```bash
npx vitest run src/app/dashboard/page.test.tsx src/components/dashboard/DashboardQuestionChips.test.tsx src/components/dashboard/LeadQueueBlock.test.tsx src/components/dashboard/RoutingReviewBlock.test.tsx src/components/dashboard/TrainingPathQueueBlock.test.tsx src/components/dashboard/RecentConversationsBlock.test.tsx src/components/dashboard/ConversationWorkspaceBlock.test.tsx
```

---

## Task 2.4 - Record which blocks adopted AI-first actions in Sprint 2

**What:** Preserve the initial rollout scope so Sprint 3 can focus on handoff quality instead of re-deciding which blocks should have launched AI actions.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/dashboard-ai-action-workspace/sprints/sprint-2-block-level-ai-actions-and-default-paths.md` |
| **Spec** | `DAW-093` |

### Task 2.4 Notes

If implementation deliberately limits adoption to a subset of blocks, record the exact set and the reason.

Record the final test inventory for each adopted block and explicitly note any deferred negative or edge cases so Sprint 3 does not assume broader coverage than actually shipped.

### Task 2.4 Verify

```bash
npm run build
```

---

## Sprint 2 Testing Matrix

Sprint 2 should not be treated as complete until the new block-level AI actions are covered across positive paths, negative paths, and edge cases.

### Positive Paths

1. A click on each adopted block AI action opens the FAB chat and immediately submits the mapped block-aware prompt.
2. Adopted blocks render AI actions with explicit AI semantics, correct icon and emphasis metadata, and block-aware source metadata.
3. The composed dashboard page renders block-level AI actions only on the adopted blocks for the active role and focus.
4. AI actions coexist with existing links and direct mutations so operators can still inspect records or change structured state without going through chat.

### Negative Paths

1. Shared launcher surfaces do not send the same prompt twice while an action is already pending or while global chat is already sending.
2. Non-adopted blocks do not gain stray AI CTAs through generic helper reuse.
3. Empty-state blocks do not render misleading AI controls that imply resumable data when the required source record or history is absent.
4. Adding AI actions does not remove, rename, or break direct record links and mutation controls that already support deterministic operator work.

### Edge Cases

1. Missing optional record fields such as conversation title, organization, founder note, or timestamp values do not break the AI action label or prompt contract.
2. Fallback launcher variants still emit valid `sourceBlockId` and `sourceContextId` metadata where the surface requires attribution.
3. Server-rendered blocks with mixed ready and empty subsections keep a disciplined action hierarchy: one primary block AI action, truthful empty-state copy, and no duplicated per-row AI spam.
4. Page-level composition continues to respect role gating and focus-scoped loader behavior while block-level AI actions are added.

### Minimum Verification Command

```bash
npx vitest run src/app/dashboard/page.test.tsx src/components/dashboard/DashboardQuestionChips.test.tsx src/components/dashboard/LeadQueueBlock.test.tsx src/components/dashboard/RoutingReviewBlock.test.tsx src/components/dashboard/TrainingPathQueueBlock.test.tsx src/components/dashboard/RecentConversationsBlock.test.tsx src/components/dashboard/ConversationWorkspaceBlock.test.tsx
```

---

## Completion Checklist

- [x] Key operational blocks expose task-specific AI actions
- [x] AI actions use block-aware prompts rather than generic labels alone
- [x] Block AI actions preserve one-click FAB open-and-send behavior across headers, rows, and workspace surfaces
- [x] Server-rendered block actions reuse the shared thin launcher boundary instead of inventing per-block launch logic
- [x] Non-AI record links and direct mutations remain available where appropriate
- [x] Positive, negative, and edge-case coverage is added for launcher semantics, empty states, pending-state guards, and preserved direct controls
- [x] The initial block adoption scope is documented for Sprint 3 follow-up

## QA Deviations

- Adopted Sprint 2 block-level AI actions ship on block headers for `lead_queue`, `routing_review`, and `training_path_queue`; per-row AI controls were deliberately deferred to avoid CTA spam and to preserve a clear primary action hierarchy.
- Empty `lead_queue`, `routing_review`, and `training_path_queue` states intentionally suppress block-level AI actions instead of offering a generic fallback CTA, while `conversation_workspace` remains the safe no-context entry point for starting fresh AI work.
- The implemented focused regression suite is 34 tests rather than the earlier projected 36 because `recent_conversations` and `conversation_workspace` already had the required AI-first and direct-link coverage from Sprint 1, so Sprint 2 concentrated new tests on the newly adopted blocks and the action helper layer.
- Post-QA fix: the `lead_queue` header AI action now scopes its prompt to the currently visible filter subset and suppresses the CTA when the selected filter has no matching leads, so the handoff cannot describe hidden rows.

## Adopted Block Scope

Sprint 2 adopts block-level AI actions on the following surfaces:

1. `conversation_workspace` via its existing primary workspace launcher
2. `recent_conversations` via its existing focus-aware continuity launcher
3. `lead_queue` via `Ask AI to prioritize leads`
4. `routing_review` via `Ask AI to triage routing`
5. `training_path_queue` via `Ask AI to review training`
