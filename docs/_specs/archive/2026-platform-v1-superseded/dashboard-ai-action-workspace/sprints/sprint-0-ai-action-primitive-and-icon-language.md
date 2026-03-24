# Sprint 0 - AI Action Primitive And Icon Language

> **Goal:** Establish a reusable dashboard AI action primitive, make AI affordances visually explicit, and lock the one-click launch contract: click a dashboard AI action, open the FAB chat, and immediately start the mapped action.
> **Spec ref:** `DAW-040` through `DAW-046`, `DAW-051` through `DAW-064A`, `DAW-076` through `DAW-084`, `DAW-090`, `DAW-094`, `DAW-080A` through `DAW-080D`
> **Prerequisite:** None
> **Test count target:** `8 existing focused dashboard/chat tests + 3 sprint additions = 11 total` across `src/components/dashboard/DashboardQuestionChips.test.tsx`, `src/components/dashboard/ConversationWorkspaceBlock.test.tsx`, and `src/app/dashboard/page.test.tsx`

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/lib/dashboard/dashboard-chat-intents.ts` | Exports `DashboardChatIntent`, `ADMIN_DASHBOARD_CHAT_INTENTS`, and `getAdminDashboardChatIntents(): readonly DashboardChatIntent[]` |
| `src/components/dashboard/DashboardQuestionChips.tsx` | Client component that uses `useGlobalChat()`, dispatches `OPEN_GLOBAL_CHAT_EVENT`, and calls `await sendMessage(intent.prompt)` on click |
| `src/lib/chat/chat-events.ts` | Exports `OPEN_GLOBAL_CHAT_EVENT = "studio-ordo:open-chat"` |
| `src/frameworks/ui/ChatContainer.tsx` | Floating chat listens for `OPEN_GLOBAL_CHAT_EVENT` and already exposes the canonical `aria-label="Open Studio Ordo chat"` entry point |
| `src/app/dashboard/page.tsx` | Inline `DashboardAdminBrief` currently calls `<DashboardQuestionChips intents={intents} />` and renders the admin brief plus dashboard blocks |
| `src/components/dashboard/ConversationWorkspaceBlock.tsx` | Renders the current workspace card with an AI-forward CTA plus a fallback thread link when a resume URL exists |
| `src/components/dashboard/ConversationWorkspaceBlock.test.tsx` | Has 2 tests and now anchors the workspace card around the AI-forward CTA and same-click launcher contract |
| `src/components/dashboard/DashboardQuestionChips.test.tsx` | Has 3 tests and verifies chip launch semantics, AI affordance metadata, and duplicate-click suppression while an action is pending |
| `src/app/dashboard/page.test.tsx` | Has 6 tests, still mocks `DashboardQuestionChips`, and now verifies composed dashboard page launcher behavior through the real workspace CTA |
| `package.json` | Verification scripts already exist: `npm run typecheck`, `npm run build`, and `npx vitest run ...` |

---

## Task 0.1 - Define a reusable dashboard AI action contract

**What:** Replace the current dashboard-specific prompt-chip shape with a broader AI-action contract that can be reused across multiple blocks and layouts.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/dashboard/dashboard-chat-intents.ts` |
| **Create or Modify** | Small companion helper if needed under `src/lib/dashboard/` |
| **Spec** | `DAW-051` through `DAW-064`, `DAW-076` through `DAW-084` |

### Task 0.1 Notes

Keep the existing prompt-driven behavior, but expand the type so it can support:

1. visual icon identity
2. optional `sourceBlockId`
3. action emphasis such as primary vs inline chip
4. future non-admin block adoption
5. one-click launch semantics where the action itself is the command, not a pre-chat suggestion

A shape close to this is sufficient:

```ts
export interface DashboardAIAction {
  id: string;
  label: string;
  prompt: string;
  icon: "sparkles" | "message-square";
  emphasis: "primary" | "secondary" | "inline";
  toolHints: string[];
  sourceBlockId?: DashboardBlockId;
}
```

Do not over-engineer analytics or persistence yet. This sprint is about a stable action primitive, not backend instrumentation.

The canonical product rule for this sprint is:

1. click the dashboard AI chip or CTA
2. open the FAB chat if it is closed
3. immediately submit the mapped prompt

There is no intermediate chooser and no extra send click.

### Task 0.1 Verify

```bash
npm run typecheck
```

---

## Task 0.2 - Refactor dashboard chips into an explicit AI action component

**What:** Replace the visually-generic chip presentation with a reusable AI action component that clearly communicates “this launches AI chat.”

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/dashboard/DashboardQuestionChips.tsx` |
| **Create** | Optional helper component under `src/components/dashboard/` if splitting rendering logic improves reuse |
| **Spec** | `DAW-040` through `DAW-043`, `DAW-062` through `DAW-084`, `DAW-090`, `DAW-094` |

### Task 0.2 Notes

Required behavior:

1. preserve the existing event + `sendMessage(intent.prompt)` launch semantics
2. add a stable icon + text treatment for AI actions
3. expose the AI meaning in accessible labels or visible copy
4. distinguish AI chips from ordinary filters visually
5. keep the interaction one click from dashboard action to active chat execution

Keep the icon implementation lightweight. Inline SVG is acceptable in this sprint if no shared icon system already exists.

Do not redesign the entire dashboard layout yet. This sprint only establishes the action primitive and its semantics.

Focused regression coverage for this task must prove both:

1. the click still opens FAB chat through the canonical event path
2. the prompt is submitted immediately on that same click
3. the rendered control exposes AI-specific icon + text semantics rather than looking like a generic dashboard filter

### Task 0.2 Verify

```bash
npx vitest run src/components/dashboard/DashboardQuestionChips.test.tsx src/app/dashboard/page.test.tsx
```

---

## Task 0.3 - Adopt the AI action primitive in the admin brief and conversation workspace card

**What:** Use the new AI action component in the current admin brief and replace the passive `Open chat` workspace CTA with a clearer AI-forward action model that follows the same one-click open-and-send behavior.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/dashboard/page.tsx` |
| **Modify** | `src/components/dashboard/ConversationWorkspaceBlock.tsx` |
| **Create or Modify** | Small client launcher wrapper/component if needed so the server-rendered workspace card can still trigger the canonical FAB open + prompt submit flow |
| **Modify** | Related dashboard tests if rendered labels or affordances change |
| **Spec** | `DAW-025` through `DAW-027`, `DAW-071` through `DAW-075`, `DAW-085` through `DAW-088` |

### Task 0.3 Notes

At minimum:

1. the admin brief chips should visually read as AI actions, not plain pills
2. the conversation workspace card should expose an AI-forward CTA such as `Ask AI` or `Resume in AI chat`
3. plain route links can remain where necessary, but they should no longer be the only visible next step in the workspace card
4. the workspace CTA should use the same launch contract as the chips: one click opens FAB chat and immediately starts the mapped action

If this task needs a small wrapper like `DashboardAIActionRow`, create it now rather than duplicating action rendering again in Sprint 2.

Prefer a thin reusable client launcher over converting entire server-rendered dashboard blocks to client components unless the block already needs local client state.

The expected sprint test additions are:

1. add 2 focused tests in `DashboardQuestionChips.test.tsx` for AI affordance semantics and duplicate-click suppression while launch is pending
2. keep `ConversationWorkspaceBlock.test.tsx` focused on the AI-forward CTA and launcher contract
3. add 1 composed dashboard page test in `src/app/dashboard/page.test.tsx` that exercises the real workspace launcher path

If implementation requires a different test distribution, update this count in the sprint doc before closing the sprint.

### Task 0.3 Verify

```bash
npx vitest run src/app/dashboard/page.test.tsx src/components/dashboard/ConversationWorkspaceBlock.test.tsx src/components/dashboard/DashboardQuestionChips.test.tsx
```

---

## Task 0.4 - Record the canonical AI affordance rules in the sprint doc

**What:** Preserve the final icon, labeling, and launch semantics chosen during implementation so later sprints reuse the same contract.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/dashboard-ai-action-workspace/sprints/sprint-0-ai-action-primitive-and-icon-language.md` |
| **Spec** | `DAW-042`, `DAW-081` through `DAW-084` |

### Task 0.4 Notes

If implementation settles on a narrower icon vocabulary or CTA label rule than the draft spec, record that in `QA Deviations` rather than letting later sprints guess.

### Task 0.4 Verify

```bash
npm run build
```

---

## Completion Checklist

- [ ] Reusable dashboard AI action type exists and is no longer admin-brief-only in spirit
- [ ] Dashboard AI controls have explicit icon + text affordances
- [ ] Admin brief and workspace card both teach AI-first action behavior
- [ ] Clicking a dashboard AI action opens FAB chat and immediately starts the mapped action
- [ ] Server-rendered dashboard blocks use a thin reusable client launcher boundary instead of broad client conversion
- [ ] Existing open-chat event and prompt-send semantics remain intact

## QA Deviations
