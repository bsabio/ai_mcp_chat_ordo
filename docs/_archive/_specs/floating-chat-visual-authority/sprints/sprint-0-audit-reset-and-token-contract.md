# Sprint 0 - Audit Reset and Token Contract

> **Goal:** Establish the floating-shell visual-authority foundation without reopening FAB lifecycle architecture: define the floating-only token layer, formalize semantic selector hooks for hierarchy work, and add no-regression coverage so later visual sprints can safely sharpen contrast, action priority, and composer anchoring.
> **Spec Sections:** `FVA-014`, `FVA-030`, `FVA-046`, `FVA-047`, `FVA-060` through `FVA-064`, `FVA-110` through `FVA-137`

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/app/globals.css` | The current token layer already defines shared shell, chat, hero, density, and safe-area variables; floating-shell work should extend this file rather than introduce a parallel theme file |
| `src/components/FloatingChatShell.tsx` | `FloatingChatShell()` owns open/minimize/full-screen lifecycle and composes `FloatingChatFrame` plus `ChatContentSurface`, so Sprint 0 must not reintroduce lifecycle styling logic here |
| `src/frameworks/ui/FloatingChatFrame.tsx` | `FloatingChatFrame({ canUseViewTransitions, children, conversationActions, isFullScreen, onMinimize, onFullScreenToggle })` already emits `data-chat-floating-shell="true"`, `data-chat-shell-kind="floating"`, and `data-chat-shell-size="default|fullscreen"` |
| `src/frameworks/ui/FloatingChatHeader.tsx` | `FloatingChatHeader({ title, subtitle, onMinimize, onFullScreenToggle, isFullScreen, conversationActions })` already emits `data-chat-floating-header="true"` and is the correct floating-header seam for hierarchy and metadata refinement |
| `src/frameworks/ui/ChatContentSurface.tsx` | `ChatContentSurface(...)` already separates the message region from the composer row and emits `data-chat-composer-shell="true"`; embedded-only `data-chat-composer-row="true"` remains gated behind `isEmbedded` |
| `src/frameworks/ui/ChatMessageViewport.tsx` | `ChatMessageViewport(...)` already emits `data-chat-message-region="true"` and `data-chat-message-viewport="true"`, provides the scroll CTA, and is the stable floating transcript shell for Sprint 0 selector work |
| `src/frameworks/ui/MessageList.tsx` | `MessageList({ messages, isSending, dynamicSuggestions, isHeroState, isSuggestionDisabled, onSuggestionClick, onLinkClick, searchQuery, isEmbedded })` already emits `data-message-list-mode`, `data-message-list-state`, and `data-chat-suggestion-group="hero|followup"` |
| `src/frameworks/ui/ChatInput.tsx` | `ChatInput(...)` already emits `data-chat-composer-form="true"` and `data-chat-composer-helper="true"`, owns the send affordance, and is the composer seam for later visual-authority work |
| `src/components/FloatingChatShell.test.tsx` | Current structural coverage already asserts launcher visibility, single-shell ownership, `data-chat-shell-kind`, `data-chat-shell-size`, and absence of embedded-only controls in the floating shell |
| `src/frameworks/ui/MessageList.test.tsx` | Current list coverage already protects hero/conversation state, suggestion-group behavior, and search filtering, so Sprint 0 can extend this file for hierarchy hooks without inventing a new message-list harness |
| `tests/browser-fab-chat-flow.test.tsx` | Browser-style jsdom coverage already proves the FAB flow from open to initial chip send to follow-up send and asserts `data-chat-suggestion-group="followup"` after conversation starts |
| `tests/browser-fab-mobile-density.test.tsx` | Mobile/browser-style coverage already protects `data-chat-shell-kind`, `data-chat-shell-size`, `data-chat-message-viewport`, `data-chat-composer-shell`, `data-chat-composer-form`, `data-chat-composer-helper`, and the absence of `data-chat-composer-row` in the floating shell |
| `tests/browser-fab-scroll-recovery.test.tsx` | Scroll recovery coverage already proves follow-up chips remain available below the fold and the scroll CTA still restores the viewport |
| `tests/browser-ui/fab-live-smoke.spec.ts` | Prompt-tolerant live-browser smoke already verifies launcher visibility, shell open, helper text, first chip send, and visible post-send follow-up actions on a real route |
| `package.json` | Existing verification entry points include `test:browser-ui`, `test:browser-live`, `browser:verify`, `typecheck`, and `build`, so Sprint 0 should reuse those commands rather than invent custom QA scripts |

## Tasks

1. Add a floating-only token namespace to `src/app/globals.css` for visual-authority work.

   The implementation should introduce floating-shell-specific tokens for:

   - shell surface separation
   - internal panel and message-bubble separation
   - chip-group emphasis
   - composer emphasis and send-readiness contrast
   - floating-only radius tiers
   - floating-only stack spacing between header, transcript, suggestion group, and composer

   Constraints:

   - Tokens must layer on top of the existing shared design system rather than replace it.
   - Token names must be semantic to floating-shell roles, not tied to one theme or one color literal.
   - Sprint 0 should scaffold the contract and adopt it in a minimal, no-regression way where practical; it should not yet attempt the full visual redesign reserved for Sprint 1 and Sprint 2.

   Verify:

   - `npm exec vitest run src/components/FloatingChatShell.test.tsx tests/browser-fab-mobile-density.test.tsx`

2. Formalize semantic selector hooks for floating-shell hierarchy without creating fragile styling-only test ids.

   The implementation should preserve the existing stable hooks and add only the minimum new semantic hooks required for later visual-authority work, such as hooks that distinguish:

   - floating header metadata region
   - floating suggestion-priority state when a primary action is present
   - floating composer readiness or emphasis state when input exists

   Constraints:

   - Existing hooks like `data-chat-floating-shell`, `data-chat-shell-kind`, `data-chat-shell-size`, `data-chat-message-region`, `data-chat-message-viewport`, `data-chat-composer-shell`, `data-chat-composer-form`, `data-chat-composer-helper`, and `data-chat-suggestion-group` must remain intact.
   - Any new hook must describe stable semantics rather than one CSS trick.
   - Embedded-only hooks must remain embedded-only.

   Verify:

   - `npm exec vitest run src/components/FloatingChatShell.test.tsx src/frameworks/ui/MessageList.test.tsx`

3. Create the no-regression boundary for later visual sprints by extending the current FAB test suite around hierarchy hooks and floating-only selector discipline.

   The implementation should add focused assertions that prove:

   - the floating shell still opens and minimizes normally
   - floating-only hooks remain present in default and fullscreen states
   - embedded-only hooks do not leak into the floating shell
   - follow-up action groups remain present after the first send
   - the composer helper and send affordance remain visible on compact/mobile layouts

   This sprint should not attempt final visual hierarchy assertions such as exact contrast or final primary-chip styling; it should only lock the selector and structure contract needed for later sprints.

   Verify:

   - `npm exec vitest run src/components/FloatingChatShell.test.tsx src/frameworks/ui/MessageList.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-scroll-recovery.test.tsx`

4. Keep Sprint 0 scoped to architecture-safe groundwork and document any visual contract decisions directly in the implementation.

   The implementation must avoid:

   - reworking FAB lifecycle ownership
   - changing assistant message semantics
   - rewriting hero/embedded chat behavior
   - introducing a global theme-system migration

   Where floating visual tokens are adopted in Sprint 0, the adoption should be limited to foundation-level surfaces or hook-backed state exposure rather than full aesthetic rework.

   Verify:

   - `npm run typecheck`
   - `npm run build`

## Test Matrix

### Positive Tests

1. Verify the floating shell still renders exactly one launcher while closed and exactly one floating shell when opened.
2. Verify `FloatingChatFrame` continues to emit `data-chat-floating-shell="true"`, `data-chat-shell-kind="floating"`, and `data-chat-shell-size="default|fullscreen"` after Sprint 0 token work lands.
3. Verify the floating header still emits `data-chat-floating-header="true"` and remains the only floating-header boundary in the shell.
4. Verify the transcript region still emits `data-chat-message-region="true"` and `data-chat-message-viewport="true"`.
5. Verify the composer still emits `data-chat-composer-shell="true"`, `data-chat-composer-form="true"`, and `data-chat-composer-helper="true"`.
6. Verify follow-up suggestions still render inside the follow-up action group after a conversation begins.
7. Verify compact/mobile floating rendering still shows helper copy and control visibility after the token namespace is introduced.
8. Verify full-screen toggling preserves the same shell ownership and hook contract.
9. Verify the live-browser FAB smoke still opens the shell and preserves visible helper and follow-up action outcomes after Sprint 0 token or selector scaffolding changes.

### Negative Tests

1. Verify Sprint 0 does not reintroduce floating lifecycle state into `ChatContainer` or any embedded-only component path.
2. Verify `data-chat-composer-row="true"` remains absent from the floating shell.
3. Verify Sprint 0 does not remove or rename existing stable FAB hooks that current browser regressions depend on.
4. Verify no new selector path depends on homepage hero-only hooks or embedded-only message-list states for floating styling.
5. Verify follow-up action assertions do not regress into prompt-specific wording checks.
6. Verify Sprint 0 does not make the send affordance disappear or become structurally unreachable when the composer is empty.
7. Verify floating visual token scaffolding does not leak into unrelated shell areas outside the opened FAB.
8. Verify Sprint 0 does not break the prompt-tolerant live smoke by renaming or removing visible shell affordances that real-browser coverage depends on.

### Edge-Case Tests

1. Verify repeated open/minimize/open cycles preserve the same floating selector contract and do not duplicate shell regions.
2. Verify duplicate `OPEN_GLOBAL_CHAT_EVENT` dispatches still result in a single floating shell instance with one selector set.
3. Verify fullscreen entry and exit preserve any new floating-only hierarchy hooks added in Sprint 0.
4. Verify mobile-sized rendering still preserves the composer helper and follow-up action area after token scaffolding is added.
5. Verify below-the-fold follow-up actions remain recoverable through the scroll CTA after any selector additions.
6. Verify future Sprint 1 and Sprint 2 work can distinguish floating header, transcript, suggestions, and composer regions using Sprint 0’s semantic hooks without adding test-only selectors later.
7. Verify live-browser runs remain resilient to assistant wording variation while stable shell-level visible outcomes stay intact.

## Completion Checklist

- [x] Floating-only visual-authority token namespace exists in `globals.css`
- [x] Existing stable floating FAB hooks are preserved
- [x] Any new hierarchy hooks are semantic and floating-specific
- [x] Embedded-only hooks remain out of the floating shell
- [x] Focused structural and browser-style no-regression tests are added or updated
- [x] Live-browser FAB smoke remains green after Sprint 0 groundwork
- [x] Sprint 0 groundwork is limited to contract scaffolding, not full aesthetic redesign

## QA Deviations

- `npm run test:browser-live` failed once on an unchanged build with a prompt-tolerant post-send action count poll returning `0` even though the failure snapshot still showed visible follow-up actions; the same test passed on the immediate rerun without code changes, so Sprint 0 is treated as green with a known flaky live-smoke poll.

## Verification Results

- Focused Sprint 0 FAB regressions passed: `npm exec vitest run src/components/FloatingChatShell.test.tsx src/frameworks/ui/MessageList.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-scroll-recovery.test.tsx`
- Browser-style FAB suite passed: `npm run test:browser-ui`
- Live-browser smoke passed on rerun: `npm run test:browser-live`
- Static typecheck passed: `npm run typecheck`
- Production build passed: `npm run build`

## Verification

- `npm exec vitest run src/components/FloatingChatShell.test.tsx src/frameworks/ui/MessageList.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-scroll-recovery.test.tsx`
- `npm run test:browser-ui`
- `npm run test:browser-live`
- `npm run typecheck`
- `npm run build`