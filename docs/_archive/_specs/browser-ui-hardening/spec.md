# Browser UI Hardening - System Spec

> **Status:** Draft v1.0
> **Date:** 2026-03-15
> **Scope:** Cross-browser hardening of the application shell, floating chat UI,
> overlays, motion system, browser-sensitive media behavior, and regression
> verification across Safari, Chrome, mobile browsers, and Firefox.
> **Dependencies:** Existing Next.js app shell, ThemeProvider, floating chat UI,
> Radix dialog surfaces, Lighthouse baseline, existing Vitest test suite.
> **Affects:** `src/app/layout.tsx`, `src/app/globals.css`,
> `src/components/SiteNav.tsx`, `src/components/SiteFooter.tsx`,
> `src/components/CommandPalette.tsx`, `src/components/ContentModal.tsx`,
> `src/components/ToolCard.tsx`, `src/components/MentionsMenu.tsx`,
> `src/components/AccountMenu.tsx`, `src/components/AudioPlayer.tsx`,
> `src/components/ThemeProvider.tsx`, `src/frameworks/ui/ChatContainer.tsx`,
> `src/frameworks/ui/ChatHeader.tsx`, `src/frameworks/ui/ChatInput.tsx`,
> `src/frameworks/ui/MessageList.tsx`, `src/frameworks/ui/RichContentRenderer.tsx`,
> `src/hooks/useChatScroll.ts`, new browser-support utilities, new browser UI
> tests, optional new browser automation config.
> **Motivation:** The current UI is visually strong in Chromium desktop, but it
> relies on several engine-sensitive features: nested `100dvh` layouts,
> transformed fixed dialogs, sticky headers inside clipped containers,
> backdrop blur as a default treatment, direct use of modern browser APIs, and a
> motion system with no reduced-motion path. These patterns create the highest
> risk in iOS Safari, mobile Chrome with dynamic browser chrome, and lower-power
> browsers where repaint and scroll behavior diverge.
> **Requirement IDs:** `BUI-XXX`

---

## 1. Problem Statement

### 1.1 Verified Browser Risk Areas

1. **Viewport locking is too aggressive.** The root app shell uses both
   `min-h-[100dvh]` and nested `h-[100dvh]`, and the floating chat computes
   height directly from `100dvh`. This is fragile on Safari and mobile
   Chromium when the URL bar or virtual keyboard changes viewport height.
   `[BUI-010]`

2. **The app has multiple scroll owners.** Root shell, main content, floating
   chat shell, and nested message areas all clip or own scrolling. This raises
   the chance of broken sticky behavior, scroll chaining bugs, and focus/keyboard
   jumps on touch devices. `[BUI-020]`

3. **Dialogs depend on transformed fixed centering.** The command palette,
   content modal, and expanded tool modal use fixed positioning with translate
   transforms, which is one of the most failure-prone patterns on iOS Safari
   during keyboard open/close. `[BUI-030]`

4. **Blur is treated like a baseline capability.** Sticky nav, chat headers,
   overlays, and floating shells all assume backdrop blur is available and cheap.
   Safari handles blur visually, but the repaint cost can be high. Firefox and
   lower-end mobile browsers may degrade or ignore it. `[BUI-040]`

5. **Logical overflow properties are used without physical fallbacks.** Global
   layout uses `overflow-inline` and `overflow-block` only. That is elegant but
   not robust enough as the sole mechanism for broader browser support and
   embedded webview compatibility. `[BUI-050]`

6. **Touch and pointer behaviors are inconsistent.** Menus and popovers are
   anchored with fixed pixel offsets, and at least one outside-click handler uses
   `mousedown` rather than pointer-aware input handling. `[BUI-060]`

7. **Motion is heavy and unbounded.** The UI uses many entrance animations,
   animated chips, pulse states, staggered reveals, and transformed overlays, but
   it does not yet implement a reduced-motion strategy. `[BUI-070]`

8. **Browser-sensitive APIs need progressive enhancement rules.** The app uses
   `document.startViewTransition`, `new Audio(...)`, `ReadableStream` readers,
   `IntersectionObserver`, and smooth scrolling behavior that are not yet wrapped
   in a shared compatibility layer. `[BUI-080]`

9. **Safe-area handling is incomplete.** Floating launcher positions, audio
   ready toast positions, and bottom-fixed controls do not currently account for
   iOS safe-area insets. `[BUI-090]`

10. **Regression coverage is too indirect.** Current automated validation covers
    types, tests, and builds well, but it does not explicitly assert browser UI
    fallbacks, reduced-motion behavior, or mobile layout invariants. `[BUI-100]`

### 1.2 Why This Matters

The system is no longer in a stage where "works in desktop Chrome" is an
acceptable proxy for release quality. This UI is a primary user surface:
conversation, search, command routing, theme switching, and media playback all
flow through it. Browser-specific cracks will be interpreted by users as product
instability, not browser variance.

The problem is not one bug. It is a class of issues caused by using modern CSS
and browser APIs without an explicit progressive-enhancement contract.

---

## 2. Design Goals

1. **Progressive enhancement first.** Advanced features such as view
   transitions, backdrop blur, overscroll tuning, and animated reveal patterns
   must improve supported browsers without becoming required for layout
   correctness. `[BUI-110]`

2. **Single-responsibility layout.** The app should minimize nested full-height
   containers and establish a clear scroll owner for each major surface. Sticky
   behavior must be intentional, not incidental. `[BUI-120]`

3. **Mobile viewport correctness.** Shells, dialogs, and bottom actions must
   remain usable under dynamic browser chrome, safe-area insets, and software
   keyboard changes. `[BUI-130]`

4. **Browser support by contract.** Engine-sensitive APIs must be accessed
   through shared helpers or guarded branches rather than being scattered inline
   throughout components. `[BUI-140]`

5. **Touch parity with mouse parity.** Pointer, tap, keyboard, and screen-reader
   flows must behave consistently across menus, popovers, dialogs, and floating
   controls. `[BUI-150]`

6. **Accessible motion budget.** Motion should feel intentional on capable
   devices and be reduced automatically when the user or platform requests it.
   `[BUI-160]`

7. **Regression visibility.** The project must gain explicit browser-UI test and
   audit coverage so future changes cannot silently reintroduce the same class
   of defects. `[BUI-170]`

---

## 3. Current Architecture Inventory

### 3.1 Verified Existing Files

The following existing files were inspected and are in scope for this spec:

- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/components/SiteNav.tsx`
- `src/components/SiteFooter.tsx`
- `src/components/CommandPalette.tsx`
- `src/components/ContentModal.tsx`
- `src/components/ToolCard.tsx`
- `src/components/MentionsMenu.tsx`
- `src/components/AccountMenu.tsx`
- `src/components/AudioPlayer.tsx`
- `src/components/ThemeProvider.tsx`
- `src/components/GlobalChat.tsx`
- `src/frameworks/ui/ChatContainer.tsx`
- `src/frameworks/ui/ChatHeader.tsx`
- `src/frameworks/ui/ChatInput.tsx`
- `src/frameworks/ui/MessageList.tsx`
- `src/frameworks/ui/RichContentRenderer.tsx`
- `src/hooks/useChatScroll.ts`
- `package.json`
- `lighthouse-prod.json`

### 3.2 Existing Behavioral Facts

1. `ThemeProvider` already guards `document.startViewTransition` with a feature
   check before use, but the rest of the UI does not centralize browser support
   decisions. `[BUI-180]`

2. `ChatContainer` currently mixes floating shell transitions, fixed positioning,
   blur-heavy styling, and explicit `viewTransitionName` assignment with nested
   overflow containers. `[BUI-181]`

3. `ChatHeader` uses sticky positioning and blur in the embedded shell and blur
   in the floating shell. `[BUI-182]`

4. `CommandPalette`, `ContentModal`, and `ToolCard` all use fixed-position
   dialogs centered with transforms. `[BUI-183]`

5. `AudioPlayer` already contains graceful fallback logic when stream readers are
   unavailable, but its browser-sensitive behaviors are still local to the
   component. `[BUI-184]`

6. `useChatScroll` performs auto-scroll via `scrollTo({ behavior: "instant" })`,
   which should be normalized to a widely supported strategy. `[BUI-185]`

---

## 4. Required Architecture Changes

### 4.1 Layout and CSS Infrastructure

1. Introduce a browser UI utility layer or shared constants module for feature
   detection, safe-area offsets, and viewport heuristics used by shell and media
   components. `[BUI-200]`

2. Refactor global layout tokens so physical overflow fallbacks exist alongside
   logical properties, and viewport sizing tokens are centralized rather than
   repeated inline. `[BUI-201]`

3. Establish one primary scroll owner for the non-floating shell and one for the
   floating chat shell. Sticky elements must live inside a predictable container
   contract. `[BUI-202]`

4. Add CSS utilities or component-level class contracts for reduced motion,
   blur fallback, and safe-area spacing. `[BUI-203]`

### 4.2 Overlay and Popover Infrastructure

1. Replace transform-centered dialog positioning with inset/flex or inset/grid
   positioning that remains stable under keyboard resize. `[BUI-210]`

2. Standardize overlay max-height behavior using viewport-aware constraints and
   scrollable interior panes. `[BUI-211]`

3. Standardize outside-click handling on pointer-aware events where appropriate.
   `[BUI-212]`

4. Review popover anchoring for mention menus and account menus to prevent
   edge-screen overflow and touch clipping. `[BUI-213]`

### 4.3 Motion and Enhancement Infrastructure

1. Add a project-wide reduced-motion mode that gates high-amplitude transitions,
   pulses, and reveal animations. `[BUI-220]`

2. Ensure layout correctness does not depend on `viewTransitionName`, blur, or
   motion-only affordances. `[BUI-221]`

3. Reduce Safari repaint pressure by preferring opacity/background fallback when
   blur support is absent or expensive. `[BUI-222]`

### 4.4 Media and Browser API Infrastructure

1. Wrap browser-sensitive APIs in small helpers or clearly documented guarded
   branches. Targeted APIs: `Audio`, `IntersectionObserver`, stream readers,
   view transitions, and smooth/auto scroll behavior. `[BUI-230]`

2. Preserve existing `AudioPlayer` semantics while improving fallback clarity and
   test coverage. `[BUI-231]`

3. Normalize scroll behavior to supported values and explicit intent. `[BUI-232]`

---

## 5. Browser Support Matrix

### 5.1 Supported Browser Classes

1. **Safari / iOS Safari:** Highest priority hardening target. Must support
   shell layout, floating chat, dialogs, menus, media, and touch interactions.
   `[BUI-240]`

2. **Chrome / Chromium desktop:** Baseline reference implementation. Advanced
   enhancements may be enabled here first, but layout must not be Chromium-only.
   `[BUI-241]`

3. **Android Chrome:** Must support dynamic viewport changes, keyboard shifts,
   touch menus, and floating chat without shell breakage. `[BUI-242]`

4. **Firefox desktop:** Must support fallback appearance where blur or advanced
   typography behaves differently, while preserving correctness and usability.
   `[BUI-243]`

### 5.2 Explicit Non-Goals

1. Internet Explorer and legacy non-evergreen browsers are out of scope.
2. Pixel-perfect parity across engines is not required.
3. Removing all motion is not a goal; motion must become optional and bounded.

---

## 6. Testing Strategy

### 6.1 Automated Tests

1. Add targeted Vitest coverage for browser support helpers, reduced-motion
   class branching, dialog positioning helpers, and scroll behavior decisions.
   `[BUI-250]`

2. Add focused component tests for floating chat, command palette, audio player,
   and browser-sensitive overlay states where DOM-level behavior can be asserted.
   `[BUI-251]`

3. Preserve full existing validation: `npm run lint`, `npm run test`,
   `npm run build`. `[BUI-252]`

### 6.2 Audit and Runtime Checks

1. Reuse existing Lighthouse capability to verify performance and layout impact
   after shell refactors. `[BUI-253]`

2. Add a browser verification checklist for Safari, Chrome desktop, mobile
   Chrome, and Firefox. `[BUI-254]`

3. If browser automation is introduced, keep it focused on layout invariants,
   overlay usability, and reduced-motion paths rather than broad end-to-end app
   duplication. `[BUI-255]`

---

## 7. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Establish browser matrix, support utilities, and measurable acceptance criteria |
| 1 | Refactor viewport shell, scroll ownership, and safe-area layout primitives |
| 2 | Harden overlays, popovers, and touch/keyboard interaction surfaces |
| 3 | Add reduced-motion rules and progressive enhancement for blur and view transitions |
| 4 | Normalize media, scroll, and browser API fallback behavior |
| 5 | Add browser-focused regression coverage and runtime validation |
| 6 | Perform QA hardening, acceptance verification, and release gate documentation |

---

## 8. Acceptance Criteria

1. Root shell and floating chat remain fully usable on Safari and mobile
   Chromium with dynamic browser chrome and software keyboard visibility.
   `[BUI-260]`

2. Dialogs no longer rely on transformed centering for correctness. `[BUI-261]`

3. Blur and view-transition features degrade gracefully with no correctness loss.
   `[BUI-262]`

4. Reduced-motion mode materially lowers animated movement while preserving
   functionality. `[BUI-263]`

5. Browser-sensitive APIs are centralized or explicitly guarded with fallback
   behavior. `[BUI-264]`

6. New regression tests and verification steps document the supported browser
   matrix clearly enough for future implementation and QA agents. `[BUI-265]`

---

## 9. Future Considerations

1. Optional Playwright or cloud browser testing can be added after the core
   hardening work lands, but only if the team wants broader visual regression
   automation.

2. If the design system grows further, browser support tokens and progressive
   enhancement helpers should move into a formal UI platform module.

3. Additional typography fallbacks may be needed if the project later introduces
   more experimental CSS text features.
