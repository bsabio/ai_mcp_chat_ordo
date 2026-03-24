# Sprint 2 - Styling Contract and Mobile Geometry

> **Goal:** Replace split floating-shell geometry ownership with a coherent styling contract based on real state attributes and aligned mobile selectors.
> **Spec Sections:** `FAB-013`, `FAB-033` through `FAB-034`, `FAB-053`, `FAB-073` through `FAB-102`, `FAB-134`
> **Status:** Implemented on 2026-03-21

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/frameworks/ui/FloatingChatFrame.tsx` | The floating shell now emits `data-chat-floating-shell="true"`, `data-chat-shell-kind="floating"`, and `data-chat-shell-size` state for default and fullscreen modes while pushing geometry through shell CSS variables |
| `src/components/FloatingChatShell.tsx` | The shell controller now owns open/minimize/full-screen lifecycle separately from styling rules, which keeps the geometry contract scoped to the floating-frame/view layer |
| `src/frameworks/ui/ChatContentSurface.tsx` | The shared content surface emits `data-chat-composer-shell="true"` in both variants and emits `data-chat-composer-row="true"` only when `isEmbedded` is true |
| `src/frameworks/ui/ChatInput.tsx` | The composer emits `data-chat-composer-form="true"` and `data-chat-composer-helper="true"` hooks used by mobile/browser regressions |
| `src/frameworks/ui/ChatMessageViewport.tsx` | The message viewport emits `data-chat-message-viewport="true"`, which is still the stable scroll/layout selector for the floating shell |
| `src/app/globals.css` | Floating-shell geometry now resolves through the `data-chat-shell-kind` and `data-chat-shell-size` contract, and the dead floating composer-row selector path has been removed |
| `src/components/FloatingChatShell.test.tsx` | Structural lifecycle coverage now asserts the floating shell renders a single `data-chat-shell-kind="floating"` instance across open/minimize/reopen flows |
| `tests/browser-fab-mobile-density.test.tsx` | The compact-density browser-style regression now protects floating-shell state hooks, helper copy, and the absence of embedded-only composer-row hooks in the floating shell |
| `tests/browser-fab-chat-flow.test.tsx` | The browser-style FAB flow regression protects the shell through launcher open, first chip send, and follow-up send behavior |
| `tests/browser-fab-scroll-recovery.test.tsx` | The scroll-recovery regression protects follow-up chip visibility and the scroll CTA behavior inside the floating message viewport |
| `tests/browser-ui/fab-live-smoke.spec.ts` | Live browser smoke already verifies the launcher, shell visibility, helper copy, initial chip send, and visible follow-up actions on a real route |

## QA Findings

1. The floating shell exposes the stateful styling hooks required by `FAB-097` and `FAB-098` through `data-chat-shell-kind` and `data-chat-shell-size` on `FloatingChatFrame`.
2. Floating geometry is now expressed through shell CSS variables for inline size, block size, offsets, and radius, aligning the implementation with the token model described in `FAB-099` and `FAB-102`.
3. The dead floating composer-row selector path has been removed, and floating/mobile selectors now target only hooks that the floating shell actually emits.
4. Browser and structural coverage now explicitly protect against embedded-only hook leakage into the floating shell contract.
5. Sprint 0 and Sprint 1 work kept lifecycle ownership separate from styling, which allowed Sprint 2 to complete without reopening the shell-controller boundary.

## Tasks

1. Preserve the shipped `data-chat-shell-kind` and `data-chat-shell-size` hooks as the canonical shell-state attributes for floating geometry and responsive styling.
2. Keep floating-shell geometry on the documented token contract for inline size, block size, offsets, and radius so the frame only supplies dynamic shell variables rather than direct geometry styling.
3. Keep the floating-shell CSS grouped around emitted shell-state hooks so future responsive changes remain local and understandable.
4. Preserve the cleanup that removed the dead floating composer-row selector path and reject future selectors that do not correspond to rendered floating-shell markup.
5. Keep `data-chat-message-viewport`, `data-chat-composer-shell`, `data-chat-composer-form`, `data-chat-composer-helper`, and launcher hooks stable so existing browser-style and live-browser coverage stay meaningful.
6. Extend browser-focused coverage to assert the explicit shell-state hooks and to guard against regressions where embedded-only hooks accidentally become part of the floating styling contract.

## Test Matrix

### Positive Tests

1. Verify the floating frame emits `data-chat-floating-shell="true"`, `data-chat-shell-kind="floating"`, and `data-chat-shell-size="default|fullscreen"` so CSS can target rendered state intentionally.
2. Verify the launcher opens a single floating shell and the shell preserves its state-hook contract across minimize and reopen flows.
3. Verify compact-density mobile rendering still exposes `data-chat-message-viewport`, `data-chat-composer-shell`, `data-chat-composer-form`, and `data-chat-composer-helper` inside the floating shell.
4. Verify helper copy remains visible inside the floating shell on mobile-sized viewports.
5. Verify browser-style FAB flow coverage still reaches first-send and follow-up-send outcomes after the shell hook contract changes.
6. Verify scroll-recovery coverage still exposes follow-up actions below the fold and the scroll CTA still restores the viewport.
7. Verify live browser smoke still shows the launcher on a non-homepage route, opens the shell, sends the first workflow chip, and renders visible follow-up actions.

### Negative Tests

1. Verify floating-shell mobile CSS does not depend on embedded-only hooks such as `data-chat-composer-row="true"`.
2. Verify the floating shell does not render duplicate launcher or duplicate floating-shell containers during repeated open events.
3. Verify shell-state styling assertions do not depend on assistant wording or prompt-specific copy beyond stable helper/action affordances.
4. Verify the floating shell does not lose `data-chat-message-viewport` or `data-chat-composer-shell` hooks when toggling full-screen mode.
5. Verify browser regressions fail fast if the floating shell stops emitting `data-chat-shell-kind` or `data-chat-shell-size`.
6. Verify Sprint 2 does not reintroduce geometry ownership into unrelated embedded-shell tests or selectors.

### Edge-Case Tests

1. Verify `data-chat-shell-size` transitions from `default` to `fullscreen` and back without remounting a second shell instance.
2. Verify repeated open/minimize/open cycles preserve a single controller-owned floating shell and stable shell-kind attributes.
3. Verify mobile-sized viewports still keep the composer helper and follow-up actions reachable after the first message send.
4. Verify the floating message viewport still exposes the scroll CTA when the user is away from the bottom and hides that recovery path when already at the bottom.
5. Verify live-browser smoke stays resilient if the assistant response wording changes but visible shell outcomes remain correct.
6. Verify future selector cleanup does not break the homepage embedded composer-row layout, since that hook intentionally remains embedded-only.

## Completion Checklist

- [x] Floating shell exposes explicit size/kind styling hooks
- [x] FAB geometry is driven by a documented token contract
- [x] Mobile floating-shell selectors align fully with emitted DOM hooks
- [x] Dead selector paths removed
- [x] Browser FAB regressions cover the shell-state styling contract
- [x] Mobile and scroll-related regressions exist for the floating shell contract

## QA Deviations

None.

## Verification Log

- `npm exec vitest run src/components/FloatingChatShell.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-scroll-recovery.test.tsx tests/browser-fab-chat-flow.test.tsx` passed on 2026-03-21
- `npm run typecheck` passed on 2026-03-21
- `npm run test:browser-live` remains the real-browser verification entry point for the floating-shell contract

## Verification

- `npm exec vitest run src/components/FloatingChatShell.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-scroll-recovery.test.tsx`
- `npm run test:browser-ui`
- `npm run test:browser-live`
- `npm run typecheck`
