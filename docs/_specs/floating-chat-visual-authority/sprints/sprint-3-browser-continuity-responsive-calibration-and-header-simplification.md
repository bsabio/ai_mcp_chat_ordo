# Sprint 3 - Browser Continuity, Responsive Calibration, And Header Simplification

> **Goal:** Finish the floating-shell visual-authority package with one final operational polish pass: remove the remaining low-value opened-shell header copy, collapse the separate reset rail into a single left header position, calibrate compact/default/fullscreen behavior around that simpler header, and lock the shipped contract with browser and live-smoke evidence.
> **Spec Sections:** `FVA-028`, `FVA-040` through `FVA-049`, `FVA-070` through `FVA-077`, `FVA-120` through `FVA-123`, `FVA-130` through `FVA-137`
> **Prerequisite:** Sprint 2 implemented and QA-passed
> **Status:** Implemented on 2026-03-21

## Implementation Outcome

Sprint 3 shipped the simplified floating header contract and closed the visual-authority package.

Delivered artifacts:

1. `src/frameworks/ui/FloatingChatHeader.tsx` now exposes a single `data-chat-floating-header-leading="true"` region for the reset affordance instead of rendering a title/subtitle meta block plus a separate primary-actions rail.
2. `src/frameworks/ui/FloatingChatFrame.tsx` no longer sends the decorative `Current thread` and `Continue or reset the workflow` copy into the floating header.
3. `src/app/globals.css` now styles the simplified leading header region and removes the floating-only selectors that existed only for the retired meta/primary-actions split.
4. `src/components/FloatingChatShell.test.tsx`, `tests/browser-fab-chat-flow.test.tsx`, `tests/browser-fab-mobile-density.test.tsx`, and `tests/shell-visual-system.test.tsx` now assert the final leading-region-plus-chrome header contract.
5. Existing browser-style, live-browser, typecheck, and production-build verification paths all passed against the shipped Sprint 3 implementation.

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/frameworks/ui/FloatingChatHeader.tsx` | `FloatingChatHeader({ title, subtitle, onMinimize, onFullScreenToggle, isFullScreen, conversationActions })` still renders a two-step left identity block (`title` + `subtitle`) and then a separate `data-chat-floating-header-primary-actions="true"` rail, so Sprint 3 must simplify this component into a single leading header region instead of stacking decorative copy above the reset affordance |
| `src/frameworks/ui/FloatingChatFrame.tsx` | `FloatingChatFrame({ canUseViewTransitions, children, conversationActions, isFullScreen, onMinimize, onFullScreenToggle })` still hardcodes `title="Current thread"` and `subtitle="Continue or reset the workflow"`, making this the exact seam where Sprint 3 can stop sending low-value header copy altogether |
| `src/frameworks/ui/ConversationSidebar.tsx` | `ConversationSidebar()` already owns the reset confirmation UX and stable reset hooks such as `data-chat-conversation-reset`, `data-chat-conversation-reset-trigger`, and `data-chat-conversation-reset-confirmation`, so Sprint 3 should preserve this behavior while allowing the control to live in the single left header position instead of a separate rail |
| `src/components/FloatingChatShell.tsx` | `FloatingChatShell()` continues to pass `surfaceState.conversationId ? <ConversationSidebar /> : null` into `FloatingChatFrame` as `conversationActions`, so Sprint 3 can stay within the existing ownership model and should not reopen shell lifecycle or conversation-state plumbing |
| `src/app/globals.css` | Sprint 0 through Sprint 2 already established the floating-only `--fva-*` token layer for header, transcript, chips, and composer, so Sprint 3 should finish the package by calibrating responsive spacing, wrapping, and chrome density through that token system rather than inline one-offs |
| `src/components/FloatingChatShell.test.tsx` | Current shell coverage still asserts `data-chat-floating-header-meta="true"` exists and that the reset affordance lives in a distinct `data-chat-floating-header-primary-actions="true"` region, so Sprint 3 must intentionally migrate these assertions to the simplified header contract |
| `tests/browser-fab-chat-flow.test.tsx` | Browser-style FAB flow already verifies first-send continuity, follow-up actions, and reset confirmation, making it the primary integration harness for proving the reset control remains discoverable after the separate header rail is removed |
| `tests/browser-fab-mobile-density.test.tsx` | Mobile/browser-style coverage still expects `data-chat-floating-header-meta="true"` plus the separate reset rail, making it the right place to protect compact-width wrapping and a single-row-or-single-region header model after simplification |
| `tests/browser-fab-scroll-recovery.test.tsx` | Scroll recovery coverage already proves the lower transcript and follow-up action region remain recoverable, and it must stay green because Sprint 3 will tighten vertical rhythm at the top of the shell |
| `tests/browser-ui/fab-live-smoke.spec.ts` | Real-browser smoke already opens on `/library`, sends the first workflow chip, checks the helper copy, and expects a visible `Start a new chat` control plus post-send actions, so Sprint 3 should preserve those route-real outcomes while allowing the header DOM structure to change |

## Tasks

1. Remove decorative opened-shell header copy and collapse the reset control into the leading header position.

   The implementation should stop spending a full header block on `Current thread` and `Continue or reset the workflow` when that copy is not carrying durable state.

   Minimum scope:

   - remove the opened-shell title and subtitle copy from the floating header when the shell is in its operational conversation state
   - let the `Start a new chat` affordance occupy the leading header position instead of rendering underneath a separate meta block
   - preserve the current reset confirmation path in that same leading position so confirmation does not create a second header rail
   - keep fullscreen and minimize in the right-side chrome cluster only

   Suggested implementation path:

   - refactor `FloatingChatHeader` so the left side is a single semantic leading region rather than a stacked identity block plus a separate action rail
   - make `title` and `subtitle` optional or remove them from the floating path entirely if no truthful operator-facing copy remains
   - preserve the `ConversationSidebar` behavior and accessibility contract while embedding it into the simplified header composition
   - introduce one stable semantic hook for the simplified left header region if the current `meta` and `primary-actions` hooks no longer describe reality

   Constraints:

   - Do not move fullscreen or minimize into the left-side region.
   - Do not change archive/new-conversation behavior; this sprint is simplifying placement and header hierarchy, not changing chat lifecycle.
   - Preserve the accessible name contract of `Start a new chat` unless every affected regression is migrated in the same sprint.
   - Avoid shipping an empty decorative container when there is no active conversation.

   Verify:

   - `npm exec vitest run src/components/FloatingChatShell.test.tsx tests/browser-fab-chat-flow.test.tsx`

2. Calibrate the simplified header for compact, default, and fullscreen floating layouts.

   The implementation should ensure the simpler header improves usable space rather than merely deleting text.

   Minimum scope:

   - reduce wasted vertical height at the top of the floating shell after the title/subtitle copy is removed
   - ensure the reset trigger and its confirmation state wrap cleanly on compact mobile widths without colliding with the chrome controls
   - keep the header readable and balanced in both default and fullscreen floating sizes
   - maintain transcript and composer continuity below the header after spacing changes

   Suggested implementation path:

   - tune floating-only spacing, gap, and wrapping tokens in `globals.css` for the simplified header rhythm
   - tighten header padding and leading-region layout in `FloatingChatHeader` only as much as needed to reclaim space without shrinking tap targets
   - verify the confirmation copy and action buttons can wrap inside the leading region while the right chrome rail remains intact

   Constraints:

   - Do not reduce tap targets for reset, fullscreen, minimize, attach, or send controls below the current usable size.
   - Keep the changes floating-only; do not restyle embedded chat or unrelated shell layouts.
   - Do not let responsive calibration bleed into Sprint 2 transcript, chip-ordering, or composer-behavior semantics.

   Verify:

   - `npm exec vitest run tests/browser-fab-mobile-density.test.tsx src/components/FloatingChatShell.test.tsx`

3. Run the final browser continuity pass across the shipped visual-authority contract.

   The implementation should treat Sprint 3 as the lock-in pass for the whole package, not just the last header tweak.

   Minimum scope:

   - update structural tests to reflect the simplified header contract without relying on obsolete two-rail assumptions
   - keep browser-style FAB flow green from launcher open through first send, follow-up actions, reset confirmation, and continued interaction
   - keep live-browser smoke prompt-tolerant and route-real while proving the simplified header still exposes `Start a new chat`
   - preserve scroll recovery and post-send action availability after the shell’s top spacing changes

   Suggested implementation path:

   - migrate shell-level assertions from `data-chat-floating-header-meta` and the old separate primary-actions rail to whichever stable leading-region hook Sprint 3 adopts
   - keep integration tests focused on visible outcomes and semantic regions rather than brittle class snapshots
   - retain the hardened post-send live-smoke polling strategy unless a more reliable prompt-tolerant check is proven in the same sprint

   Constraints:

   - Prefer semantic DOM assertions and stable hooks over class-name or spacing snapshots.
   - Do not reintroduce wording-fragile assertions for follow-up chip content where prompt-tolerant assertions already work.
   - Do not reopen runtime architecture or message semantics under the banner of QA cleanup.

   Verify:

   - `npm run test:browser-ui`
   - `npm run test:browser-live`

4. Close the package with explicit QA evidence and a documented selector migration.

   Sprint 3 is the final pass for this visual-authority package, so the implementation should leave the spec and tests unambiguous about the shipped header model.

   Minimum scope:

   - document any retired header hooks or migrated assertions directly in the sprint verification notes
   - confirm the parent spec and sprint index reflect the simplified final header contract
   - run the full static verification used by earlier sprints once the implementation lands

   Constraints:

   - Keep documentation changes aligned with the shipped implementation; do not claim the old two-row header remains if Sprint 3 removes it.
   - Do not mark verification green without actually rerunning the affected suites after implementation.

   Verify:

   - `npm run typecheck`
   - `npm run build`

## Test Matrix

### Positive Tests

1. Verify the opened floating shell no longer renders the `Current thread` and `Continue or reset the workflow` copy.
2. Verify `Start a new chat` occupies the leading header region when an active conversation exists.
3. Verify fullscreen and minimize remain in the right-side chrome region only.
4. Verify the reset confirmation state stays in the same leading header region rather than reopening a second rail.
5. Verify compact/mobile floating layouts keep the simplified header readable, tappable, and non-overlapping.
6. Verify the transcript plane, composer plane, helper copy, and follow-up actions remain visible after the header height is reduced.
7. Verify the live-browser smoke still opens on `/library`, sends the first chip, exposes `Start a new chat`, and reaches visible post-send actions.
8. Verify fullscreen entry and exit preserve the simplified header contract without duplicating the leading region.

### Negative Tests

1. Verify Sprint 3 does not keep an empty decorative meta container solely to preserve obsolete selectors.
2. Verify `Start a new chat` does not move into the right-side chrome cluster.
3. Verify the simplified header does not hide or clip the reset confirmation actions on narrow widths.
4. Verify Sprint 3 does not change archive/new-conversation semantics, message semantics, or shell lifecycle behavior.
5. Verify floating-only header simplification does not bleed into embedded chat or unrelated shell UI.
6. Verify follow-up action assertions remain prompt-tolerant rather than depending on exact assistant phrasing in live-browser smoke.

### Edge-Case Tests

1. Verify repeated open, minimize, and reopen cycles preserve a single simplified header region and a single chrome region.
2. Verify the reset confirmation state can open and close repeatedly without causing header layout thrash or duplicated controls.
3. Verify fullscreen mode preserves the same simplified left-region contract and does not reintroduce title/subtitle copy.
4. Verify mobile widths still allow the confirmation copy plus action buttons to wrap without pushing chrome controls out of view.
5. Verify scroll recovery remains functional after any top-of-shell spacing reduction changes transcript height.

## Completion Checklist

- [x] Decorative `Current thread` and `Continue or reset the workflow` header copy is removed from the opened floating shell
- [x] `Start a new chat` occupies the leading header position instead of a separate left-side action rail
- [x] Reset confirmation stays within the same simplified leading header region
- [x] Right-side chrome contains fullscreen and minimize only
- [x] Compact/default/fullscreen floating layouts are recalibrated for the simpler header without tap-target regressions
- [x] Structural, browser-style, scroll-recovery, and live-browser tests reflect the final simplified header contract
- [x] Typecheck and production build are rerun after implementation
- [x] Sprint 3 closes the visual-authority package without reopening lifecycle, transcript, or composer behavior scope

## QA Deviations

None.

## Verification Results

- Focused Sprint 3 FAB regressions passed: `npm exec vitest run src/components/FloatingChatShell.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-fab-mobile-density.test.tsx`
- Browser-style FAB suite passed: `npm run test:browser-ui`
- Live-browser smoke passed: `npm run test:browser-live`
- Static typecheck passed: `npm run typecheck`
- Production build passed: `npm run build`

## Verification

- `npm exec vitest run src/components/FloatingChatShell.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-scroll-recovery.test.tsx`
- `npm run test:browser-ui`
- `npm run test:browser-live`
- `npm run typecheck`
- `npm run build`
