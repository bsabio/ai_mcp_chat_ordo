# Sprint 3 - Chat Handoff Alignment And Browser QA

> **Goal:** Make dashboard-triggered chat feel task-aware in the first assistant reply, then verify the end-to-end behavior in the running app with browser evidence, preserving the one-click contract from dashboard action to active FAB execution.
> **Spec ref:** `DAW-043`, `DAW-064A`, `DAW-076` through `DAW-080D`, `DAW-094`, `DAW-095`
> **Prerequisite:** Sprint 2 implemented, including the post-QA `lead_queue` filter-aligned AI handoff fix shipped on 2026-03-20
> **Status:** Implemented 2026-03-20
> **Test count target:** `55 existing focused prompt and handoff tests + 7 Sprint 3 additions = 62 total` across `src/components/dashboard/DashboardQuestionChips.test.tsx` (3), `tests/system-prompt.test.ts` (16), `tests/chat-stream-route.test.ts` (9), `src/lib/chat/routing-context.test.ts` (4), `src/lib/chat/routing-analysis.test.ts` (7), `src/hooks/useGlobalChat.test.tsx` (16), and a new focused dashboard handoff test file (3)

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/components/dashboard/DashboardQuestionChips.tsx` | Existing click path opens the floating chat and sends the prompt immediately through the shared launcher contract |
| `src/components/dashboard/DashboardAIActionButton.tsx` | Canonical launcher dispatches `OPEN_GLOBAL_CHAT_EVENT`, calls `sendMessage(action.prompt)`, and exposes `data-source-block-id` plus `data-source-context-id`, but does not yet transport source metadata into chat state or the backend |
| `src/hooks/useGlobalChat.tsx` | Canonical chat provider exposes `messages`, `sendMessage`, `newConversation`, `conversationId`, `currentConversation`, and role-aware bootstrap behavior; `sendMessage` currently accepts only `messageText` and optional files |
| `src/frameworks/ui/ChatContainer.tsx` | Floating chat opens on `OPEN_GLOBAL_CHAT_EVENT` and renders the conversation viewport plus composer; the open event currently carries no source payload |
| `src/lib/chat/routing-context.ts` | Adds server-owned routing instructions to the system prompt, including uncertain-lane clarification guidance |
| `src/lib/chat/routing-analysis.ts` | Produces uncertain-lane summaries and recommended next-step wording used in stream-time context |
| `src/core/use-cases/ChatPolicyInteractor.ts` | Composes base prompt and role directive for the current chat role |
| `src/lib/db/schema.ts` | Stores canonical seeded system prompts used by the live SQLite database |
| `tests/system-prompt.test.ts` | Current regression surface for base prompt and role-directive composition |
| `tests/chat-stream-route.test.ts` | Current regression surface for stream-route prompt wiring, routing context, and role-aware tool selection |
| `src/lib/chat/routing-context.test.ts` | Verifies emitted routing instructions per lane |
| `src/lib/chat/routing-analysis.test.ts` | Verifies routing analyzer summaries and uncertain-lane recommendations |
| `src/hooks/useGlobalChat.test.tsx` | Verifies role-aware bootstrap behavior and conversation restore/send logic |
| `src/components/dashboard/DashboardQuestionChips.test.tsx` | Has 3 tests and anchors the canonical dashboard open-and-send entry path, disabled-state semantics, and duplicate-send guard |
| `tests/system-prompt.test.ts` | Has 16 tests and anchors prompt composition behavior |
| `tests/chat-stream-route.test.ts` | Has 9 tests and anchors stream-route prompt wiring |
| `src/lib/chat/routing-context.test.ts` | Has 4 tests and anchors routing instruction copy |
| `src/lib/chat/routing-analysis.test.ts` | Has 7 tests and anchors uncertain-lane wording and recommendation behavior |
| `src/hooks/useGlobalChat.test.tsx` | Has 16 tests and anchors client-side chat bootstrap and send semantics |
| `src/lib/dashboard/dashboard-chat-intents.ts` | Sprint 1 and 2 now provide task-aware prompts plus `sourceBlockId` and `sourceContextId` for block headers, continuity rail actions, and focus-level actions |
| `src/app/dashboard/page.test.tsx` | Already verifies focus scoping, role gating, and the presence of adopted Sprint 2 AI actions with context ids, which reduces Sprint 3 risk around view composition but not handoff semantics |
| `tests/**/*handoff*` | No dedicated dashboard handoff test file exists yet, so Sprint 3 still needs a focused suite for source-context transport and first-reply task framing |
| `package.json` | Provides `npm run typecheck`, `npm run build`, `npm run test`, and focused vitest commands |

---

## Task 3.1 - Encode dashboard source context so first replies stay in the clicked task frame

**What:** Strengthen the dashboard-to-chat contract so the first assistant reply reflects the originating block/action instead of falling back to generic clarification patterns.

| Item | Detail |
| --- | --- |
| **Modify** | Dashboard AI action prompt helpers and any chat handoff metadata layer introduced earlier |
| **Modify if needed** | Chat prompt composition or routing-context helpers |
| **Spec** | `DAW-043`, `DAW-076` through `DAW-080`, `DAW-094` |

### Task 3.1 Notes

The contract for this sprint is behavioral, not merely structural.

Current shipped baseline after Sprint 2:

1. Dashboard actions already encode task-aware prompts and source metadata in `DashboardAIAction`.
2. The thin launcher already preserves one-click open-and-send behavior across chips, focus rail actions, and adopted block headers.
3. The missing handoff boundary is transport: `sourceBlockId` and `sourceContextId` are currently exposed as DOM metadata only, while `sendMessage` still sends only raw prompt text.
4. Because the open-chat event carries no payload and chat send has no dashboard metadata channel yet, the backend cannot currently distinguish `focus-rail:revenue` from `lead-queue:header` except through prompt wording alone.

The relevant behavioral baseline is:

1. the dashboard AI action is clicked once
2. the FAB chat opens if needed
3. the mapped prompt is submitted on that same click
4. the first assistant reply stays inside the originating task frame

Examples of acceptable outcomes:

1. a routing-review action yields a routing-risk-oriented first reply
2. a lead-queue action yields a founder-priority or revenue-oriented first reply
3. a training-path action yields a training follow-up or recommendation-oriented first reply
4. a focus-rail action such as `focus-rail:revenue` stays distinguishable from a block-header action such as `lead-queue:header`

Do not settle for a change that only alters visible chip labels while the first reply remains generic.

Implementation guardrails for this sprint:

1. preserve the thin launcher model from Sprint 2 rather than converting server-rendered dashboard blocks into client-owned state machines
2. add an explicit handoff metadata layer between dashboard launcher and chat send path instead of hiding source context inside user-visible prose only
3. keep fallback behavior safe when no source metadata is present so non-dashboard chat entry points continue to work

The expected sprint test additions for this task are:

1. add 3 tests in a new focused dashboard handoff test file
2. positive: at least two adopted block actions transport prompt plus distinct `sourceBlockId` and `sourceContextId` into the handoff path
3. negative: focus-rail actions do not collapse into the continuity block context or reuse a block-header context id accidentally
4. edge: fallback actions such as `conversation-workspace:start` still produce a valid handoff payload when there is no active conversation state to restore

### Task 3.1 Verify

```bash
npx vitest run tests/system-prompt.test.ts tests/chat-stream-route.test.ts src/lib/chat/routing-context.test.ts src/lib/chat/routing-analysis.test.ts src/hooks/useGlobalChat.test.tsx
```

---

## Task 3.2 - Add regression coverage for dashboard-originated chat behavior

**What:** Add focused tests that cover the block-aware prompt and handoff rules introduced in Task 3.1.

| Item | Detail |
| --- | --- |
| **Modify** | Existing dashboard chip tests and any prompt/routing tests affected by the new behavior |
| **Create** | A focused dashboard-to-chat handoff test file if current suites become too indirect |
| **Spec** | `DAW-094` |

### Task 3.2 Notes

The tests should prove at least:

1. dashboard actions still open chat
2. dashboard actions still send the correct prompt payload on that same click
3. prompt/routing composition preserves the intended task frame
4. no dashboard AI action regresses into a two-step open-then-send flow
5. invalid or missing dashboard source metadata falls back safely instead of poisoning prompt composition

Avoid snapshot-only coverage. The assertions should make the task-specific behavior explicit.

The expected sprint test additions for this task are:

1. add 2 tests in `tests/chat-stream-route.test.ts` for dashboard-originated prompt composition and block-context handoff behavior
2. positive: dashboard-originated handoff metadata influences the composed task frame for at least one block-header action and one focus-rail action
3. negative: unknown or spoofed dashboard source metadata is ignored or normalized to a safe fallback rather than trusted blindly
4. add 1 test in `src/components/dashboard/DashboardQuestionChips.test.tsx` or `src/hooks/useGlobalChat.test.tsx` that explicitly guards the no-two-step open-then-send contract after the handoff transport layer is added
5. add 1 test in `tests/system-prompt.test.ts` or `src/lib/chat/routing-context.test.ts` for preserving the clicked task frame in the composed prompt stack without degrading the existing lane-routing instructions

### Task 3.2 Verify

```bash
npx vitest run src/components/dashboard/DashboardQuestionChips.test.tsx tests/system-prompt.test.ts tests/chat-stream-route.test.ts
```

---

## Task 3.3 - Perform browser verification of dashboard AI actions in the running app

**What:** Validate the final UX in a real browser so the dashboard action model is confirmed at runtime, not just in tests.

| Item | Detail |
| --- | --- |
| **Verify live** | `/dashboard` focused views and right-rail AI actions |
| **Verify live** | admin brief chip launch behavior |
| **Verify live** | at least one additional block-level AI action |
| **Spec** | `DAW-095` |

### Task 3.3 Notes

Required runtime checks:

1. AI actions are visually distinguishable from normal filters or links
2. clicking an AI action opens the FAB chat reliably and immediately starts the mapped action
3. the first assistant reply matches the clicked dashboard task
4. the focused dashboard view still feels lighter and more understandable than the pre-refactor page
5. browser QA covers at least one right-rail AI action and at least one non-overview block AI action revealed by the Sprint 1 focus model

Required browser route and action coverage for this sprint:

1. `/dashboard` overview with a right-rail action such as `Summarize this dashboard` or `Resume in AI chat`
2. `/dashboard?focus=revenue` with `Ask AI to prioritize leads`
3. `/dashboard?focus=service` with `Ask AI to triage routing`
4. `/dashboard?focus=training` with `Ask AI to review training`

For each browser check, capture enough evidence to answer:

1. which action was clicked
2. whether the floating chat opened on that same click
3. whether the outgoing user message matched the intended task frame
4. whether the first assistant reply stayed inside that frame rather than falling back to generic orientation copy

Record any mismatch between passing tests and runtime behavior in `QA Deviations`.

### Task 3.3 Verify

```bash
npm run build
```

Plus browser verification evidence captured during implementation.

---

## Task 3.4 - Record final QA evidence and any remaining deviations

**What:** Preserve the runtime verification outcome and the final design constraints for future dashboard work.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/dashboard-ai-action-workspace/sprints/sprint-3-chat-handoff-alignment-and-browser-qa.md` |
| **Create if needed** | A small artifact note under this feature folder summarizing browser verification evidence |
| **Spec** | `DAW-094`, `DAW-095` |

### Task 3.4 Notes

If runtime evidence shows that some dashboard-triggered prompts still behave too generically, document the exact block/action pairs and the observed first-reply drift.

Preferred evidence artifacts for this sprint:

1. a short markdown note under this sprint folder summarizing the verified browser flows
2. copied first-reply excerpts for each checked dashboard action
3. any follow-up gaps separated into product-copy drift vs metadata-transport drift vs runtime-launch drift

### Task 3.4 Verify

```bash
npm run test
```

---

## Sprint 3 Testing Matrix

Sprint 3 should not be treated as complete until dashboard chat handoff is covered across positive paths, negative paths, and edge cases using both focused tests and browser evidence.

### Positive Paths

1. Clicking any dashboard AI action still opens the FAB chat and immediately sends exactly one mapped action payload.
2. The handoff path preserves both the task-aware prompt and the originating `sourceBlockId` / `sourceContextId` for adopted block actions.
3. Focus-rail actions preserve focus-level context distinct from block-header actions so the server can frame `revenue` differently from `lead_queue`.
4. The composed prompt stack keeps existing role and lane-routing behavior while also preserving the clicked dashboard task frame.
5. In a real browser, the first assistant reply is visibly aligned with the clicked task for at least one right-rail action and at least two non-overview block actions.

### Negative Paths

1. Dashboard handoff does not regress into a two-step open-then-send flow after metadata transport is added.
2. Duplicate clicks or in-flight sends do not emit multiple dashboard-originated handoff payloads.
3. Unknown, stale, or spoofed dashboard source metadata does not override prompt composition or analytics state.
4. Non-dashboard chat entry points continue to work when no dashboard source metadata is available.
5. Existing focus gating and empty-state suppression from Sprint 1 and 2 do not start emitting hidden or stale action context into chat.

### Edge Cases

1. `conversation-workspace:start` remains a valid handoff source when no active conversation exists.
2. Focus-rail actions such as `focus-rail:revenue` remain distinguishable from continuity actions such as `recent-conversations:revenue`.
3. Restored selected conversations and dashboard-launched actions do not lose the intended conversation id or active thread context.
4. Role-specific bootstrap copy remains intact when dashboard handoff metadata is present for admins, staff, and authenticated users.
5. Browser verification covers at least one action whose visible prompt wording is similar to another action, proving the task frame is preserved by source context rather than label similarity alone.

### Minimum Verification Command

```bash
npx vitest run src/components/dashboard/DashboardQuestionChips.test.tsx src/hooks/useGlobalChat.test.tsx tests/system-prompt.test.ts tests/chat-stream-route.test.ts src/lib/chat/routing-context.test.ts src/lib/chat/routing-analysis.test.ts tests/dashboard-chat-handoff.test.ts
```

---

## Completion Checklist

- [x] Dashboard handoff metadata is transported beyond DOM attributes into the chat send / prompt composition path
- [x] Dashboard AI actions produce task-aware first replies rather than generic entry prompts
- [x] Regression tests cover dashboard-originated prompt and routing behavior
- [x] Browser verification confirms dashboard AI actions still execute as one-click FAB open-and-send commands
- [x] Browser verification confirms the refactored dashboard teaches AI-first operation
- [x] Final runtime evidence and remaining deviations are recorded

## QA Deviations

### Implemented Runtime On 2026-03-20

Sprint 3 now ships an explicit dashboard handoff transport layer:

1. `DashboardAIActionButton` sends `sourceBlockId` and optional `sourceContextId` through `sendMessage` instead of relying on prompt wording alone.
2. `useGlobalChat`, `useChatSend`, `useChatStreamRuntime`, `ChatStreamAdapter`, and `/api/chat/stream` all preserve the handoff payload.
3. The stream route normalizes dashboard handoff metadata server-side and appends a server-owned dashboard handoff context block to the composed system prompt.
4. Mismatched or spoofed `sourceContextId` values are reduced to a safe block-level fallback instead of being trusted blindly.

### Browser Evidence Summary

Captured during live verification against the local Next.js dev server in admin simulation mode:

1. Overview right-rail action `Summarize this dashboard` opened the FAB and submitted the mapped prompt on the same click. The first assistant reply stayed in dashboard triage mode and opened with a concrete `NOW` action focused on the uncertain routing queue rather than generic orientation copy.
2. Service block action `Ask AI to triage routing` opened the FAB and submitted the routing-review prompt on the same click. The first assistant reply stayed inside routing-risk triage, naming the uncertain queue, the highest-priority thread, and the next clarifying question.
3. Revenue and training focus views were reachable and their focus-rail actions remained visually distinct AI actions, but the live dataset exposed empty block states for `Lead Queue` and `Training Path Queue`, so those block-header CTAs were not available to click at runtime in this environment.

### Remaining Deviations

1. The local browser verification environment had empty revenue and training block datasets, so Sprint 3 runtime evidence covers the overview rail action and the service block action directly, while revenue/training are verified primarily through focused tests plus the live focus-rail surfaces.
2. Browser automation sessions were intermittently reset while capturing repeated focus-view checks, so the recorded browser evidence favors the clearest successful overview and service runs rather than a full transcript for every retried navigation.
