# Sprint 1 - Header Contrast And Action Rail

> **Goal:** Rebuild the floating-shell header so it reads as an operational control rail instead of a product-brand card: remove the unnecessary `Studio Ordo` lockup from the floating header, move the new-chat reset affordance into the left-side action rail, and sharpen the frame/header contrast without reopening FAB lifecycle architecture.
> **Spec Sections:** `FVA-040` through `FVA-048`, `FVA-070` through `FVA-076`, `FVA-110` through `FVA-115`, `FVA-130` through `FVA-134`
> **Prerequisite:** Sprint 0 implemented and verified

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/frameworks/ui/FloatingChatHeader.tsx` | `FloatingChatHeader({ title, subtitle, onMinimize, onFullScreenToggle, isFullScreen, conversationActions })` currently renders a left identity block with avatar + title/subtitle and a right action row that injects `conversationActions` before fullscreen/minimize controls |
| `src/frameworks/ui/FloatingChatFrame.tsx` | `FloatingChatFrame({ canUseViewTransitions, children, conversationActions, isFullScreen, onMinimize, onFullScreenToggle })` hardcodes `title="Studio Ordo"` and `subtitle="Advisory and orchestration training"` into `FloatingChatHeader`, so Sprint 1 must replace those header values at this seam |
| `src/frameworks/ui/ConversationSidebar.tsx` | `ConversationSidebar()` uses `useGlobalChat()` for `archiveConversation` and `conversationId`, returns `null` when no active conversation exists, and currently owns the `Start a new chat` / `Start fresh` confirmation UI |
| `src/components/FloatingChatShell.tsx` | `FloatingChatShell()` passes `surfaceState.conversationId ? <ConversationSidebar /> : null` into `FloatingChatFrame` as `conversationActions`, so the current `New Chat` affordance enters the floating header as a right-side injected node |
| `src/app/globals.css` | Sprint 0 already established floating-only `--fva-*` tokens and semantic hooks, providing the correct place to add stronger header/frame plane contrast and any new header-rail tokens |
| `src/components/FloatingChatShell.test.tsx` | Current shell coverage already verifies launcher/shell ownership, floating-only hooks, fullscreen toggling, and the absence of embedded-only controls; this file is the primary structural regression harness for header action-rail changes |
| `tests/browser-fab-chat-flow.test.tsx` | Current browser-style FAB coverage already verifies the `Start a new chat` button appears after the first send, making it the right place to protect the moved action in real shell flow |
| `tests/browser-fab-mobile-density.test.tsx` | Current mobile-sized FAB coverage already verifies floating-shell visibility, helper copy, and header hooks, so Sprint 1 can extend it for left-rail action presence without adding a new mobile harness |
| `tests/browser-fab-scroll-recovery.test.tsx` | Existing browser-style scroll recovery coverage proves the follow-up area remains recoverable through the scroll CTA, and Sprint 1 should keep that protection because header height and frame contrast changes can still affect floating-shell viewport continuity |
| `tests/browser-ui/fab-live-smoke.spec.ts` | Real-browser smoke currently expects launcher visibility, shell open, helper copy, first chip send, and a visible `Start a new chat` affordance after conversation start |

## Tasks

1. Replace floating-header branding with operational context and remove decorative lockup treatment.

   The implementation should stop rendering the floating header as a mini brand card. In practice this means:

   - remove the avatar + `Studio Ordo` lockup from the opened floating shell header
   - replace the current hardcoded title/subtitle copy in `FloatingChatFrame` with concise operator-facing context that helps the user orient within the chat surface
   - keep any subtitle/status line only if it still communicates truthful, low-noise context

   Constraints:

   - This change applies to the opened floating shell header only; it does not change the site shell brand, page navigation, or assistant naming inside transcript content.
   - The floating header should still emit `data-chat-floating-header="true"` and preserve Sprint 0 semantic hooks unless they are intentionally refined.
   - If a status dot remains, it must remain visually subordinate and truthful.

   Verify:

   - `npm exec vitest run src/components/FloatingChatShell.test.tsx`

2. Move the new-chat reset affordance into the left-side action rail and keep the right side for compact chrome controls.

   The implementation should treat the new-chat reset affordance as the primary header action instead of part of the right-side chrome cluster.

   Expected structure:

   - left-side header rail: context label/title plus the reset affordance when a conversation exists
   - right-side chrome rail: fullscreen and minimize controls only
   - confirmation state for archiving the current thread must remain available, but it should open from the left action rail instead of displacing the shell chrome

   Suggested implementation path:

   - split the current floating header into semantic left-rail and right-rail regions
   - either refactor `ConversationSidebar` into a floating-header action component or extract the archive/reset action from it so the left rail can own the reset UX cleanly
   - add stable semantic hooks for the left action rail and right chrome rail so tests can assert the contract semantically rather than through class strings, for example `data-chat-floating-header-primary-actions` and `data-chat-floating-header-chrome`

   Constraints:

   - Do not change the archive/new-conversation behavior itself; this sprint is moving and restyling the affordance, not changing lifecycle semantics.
   - Do not introduce embedded-only controls or dashboard-specific behavior into the floating shell header.
   - The reset affordance must remain absent when there is no active conversation.
   - Preserve the current accessible name contract of `Start a new chat` unless all existing browser and live-smoke assertions are intentionally migrated in the same sprint.

   Verify:

   - `npm exec vitest run src/components/FloatingChatShell.test.tsx tests/browser-fab-chat-flow.test.tsx`

3. Sharpen floating frame and header contrast so the shell reads as one instrument with distinct planes.

   The implementation should apply Sprint 0 token scaffolding to make the header and message stage read as separate but related planes.

   Minimum scope:

   - strengthen the header-to-transcript separation line and surface contrast
   - tighten internal spacing/radius treatment so the header feels more precise than the previous soft brand card
   - ensure the left action rail and right chrome rail remain legible on default and fullscreen sizes

   Constraints:

   - Keep the work floating-only; do not migrate the broader app shell or embedded homepage chat.
   - Do not use ad hoc one-off colors where an `--fva-*` token can express the same role.
   - Avoid large-scale message-stage or composer visual rework; those belong to Sprint 2.

   Verify:

   - `npm exec vitest run src/components/FloatingChatShell.test.tsx tests/browser-fab-mobile-density.test.tsx`

4. Extend regression coverage to lock the new header contract before Sprint 2.

   The implementation should add or update tests that prove:

   - the floating header no longer renders the old `Studio Ordo` lockup in the opened shell
   - the left header rail owns the reset affordance when a conversation exists
   - the right header rail still owns fullscreen and minimize controls
   - mobile/default/fullscreen states preserve the same semantic header split
   - live-browser smoke still finds the reset affordance after the first send without depending on prompt-specific copy
   - browser-style scroll recovery still preserves access to follow-up actions after the header/frame changes land

   Constraints:

   - Prefer semantic DOM assertions over brittle class-name snapshots.
   - Keep launcher tests focused on the launcher itself; header assertions should target the opened shell.
   - Live-browser coverage should remain tolerant of assistant wording changes.

   Verify:

   - `npm run test:browser-ui`
   - `npm run test:browser-live`
   - `npm run typecheck`
   - `npm run build`

## Test Matrix

### Positive Tests

1. Verify the opened floating shell header renders a single left-side context/action rail and a single right-side chrome rail.
2. Verify the floating header no longer shows the old `Studio Ordo` title/subtitle lockup in the opened shell.
3. Verify `Start a new chat` appears in the left rail only when an active conversation exists.
4. Verify fullscreen and minimize remain visible in the right chrome rail in both default and fullscreen states.
5. Verify the reset confirmation state still allows archiving the current thread and starting fresh.
6. Verify mobile-sized floating rendering still shows the reset affordance, helper copy, and chrome controls without overlap.
7. Verify live-browser FAB smoke still reaches a visible reset affordance after the first send.
8. Verify follow-up actions remain recoverable through the scroll CTA after the header/frame changes land.

### Negative Tests

1. Verify the launcher label and launcher ownership are not affected by the opened-shell header redesign.
2. Verify `Start a new chat` does not appear when there is no active conversation.
3. Verify the opened shell does not keep the old avatar/brand lockup alongside the new context rail.
4. Verify fullscreen/minimize controls are not moved into the left action rail.
5. Verify Sprint 1 does not alter archive/new-conversation semantics, only placement and visual hierarchy.
6. Verify floating-header styling does not bleed into embedded chat surfaces.
7. Verify the implementation does not silently rename the reset control away from the current `Start a new chat` accessibility contract unless the tests are updated in the same change.

### Edge-Case Tests

1. Verify repeated open/minimize/open cycles preserve the same left-rail/right-rail header contract.
2. Verify fullscreen entry and exit preserve the moved reset affordance and do not duplicate the action rail.
3. Verify the reset confirmation state remains usable on narrow widths without hiding minimize/fullscreen controls.
4. Verify the live-browser smoke remains resilient if the assistant returns different follow-up chip copy.
5. Verify scroll recovery still restores the viewport after header height and contrast changes.

## Completion Checklist

- [x] Floating header no longer renders the old `Studio Ordo` lockup in the opened shell
- [x] Opened-shell header copy is replaced with concise operator-facing context
- [x] The reset affordance is moved into the left-side action rail when a conversation exists while preserving the current `Start a new chat` accessibility contract unless intentionally migrated
- [x] Right-side chrome rail contains fullscreen and minimize controls only
- [x] Floating-only header/frame contrast is strengthened through the `--fva-*` token layer
- [x] Stable semantic hooks exist for the left action rail and right chrome rail
- [x] Structural, browser-style, and live-browser FAB tests cover the new header contract
- [x] Scroll recovery remains protected after the header/frame changes
- [x] Sprint 1 remains scoped to header/frame hierarchy and does not consume Sprint 2 message/composer work

## QA Deviations

- `tests/browser-ui/fab-live-smoke.spec.ts` needed a longer post-send poll timeout so streamed follow-up actions had enough time to materialize as buttons on the real route. This was a test-hardening adjustment, not a product-behavior change.

## Verification Results

- Focused Sprint 1 FAB regressions passed: `npm exec vitest run src/components/FloatingChatShell.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-scroll-recovery.test.tsx`
- Browser-style FAB suite passed: `npm run test:browser-ui`
- Live-browser smoke passed after timeout hardening: `npm run test:browser-live`
- Static typecheck passed: `npm run typecheck`
- Production build passed: `npm run build`

## Verification

- `npm exec vitest run src/components/FloatingChatShell.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-scroll-recovery.test.tsx`
- `npm run test:browser-ui`
- `npm run test:browser-live`
- `npm run typecheck`
- `npm run build`
