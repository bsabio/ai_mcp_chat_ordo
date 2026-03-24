# Homepage Chat Shell - Architecture Spec

> **Status:** Draft v1.0
> **Date:** 2026-03-15
> **Scope:** Restore and formalize the homepage interaction model where the home route behaves as a dedicated chat workspace, the footer remains a real document footer below the fold, the composer stays pinned to the bottom of the viewport stage, and the default scroll interaction is always the chat message region.
> **Affects:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/AppShell.tsx`, `src/components/SiteNav.tsx`, `src/components/SiteFooter.tsx`, `src/frameworks/ui/ChatContainer.tsx`, `src/frameworks/ui/MessageList.tsx`, `src/hooks/useChatScroll.ts`, a new scroll-boundary hook if required, and targeted browser/interaction tests.
> **Motivation:** The homepage previously had the correct chat-first behavior, but that contract was lost while broader browser-shell hardening work was in progress. The current issue is not cosmetic. It is an architectural failure caused by mixing normal page-scroll assumptions with a chat application shell that requires its own exclusive interaction surface.
> **Requirement IDs:** `HCS-XXX`

---

## 1. Problem Statement

### 1.1 Required User Experience

The homepage must satisfy all of the following at the same time:

1. The footer must remain a real site footer in normal document flow and load below the fold. `[HCS-010]`
2. The first screen of the homepage must behave like a dedicated chat stage rather than a normal document. `[HCS-011]`
3. The chat composer must remain pinned to the bottom edge of that stage. `[HCS-012]`
4. The default scroll interaction must belong to the message area, not the page. `[HCS-013]`
5. A user must still be able to reach the footer intentionally by leaving the chat scroll region and scrolling the outer page. `[HCS-014]`

### 1.2 Verified Failure Modes

Recent regressions showed several distinct failure classes:

1. The outer page shell became a competing scroll owner, causing the footer to appear in the default homepage experience instead of staying below the first screen. `[HCS-020]`
2. The homepage composer shared vertical layout flow with the message stack, allowing the interaction to feel like messages were pushing the composer down even when some inner scroll behavior still existed. `[HCS-021]`
3. Footer access was temporarily replaced with home-route-specific workarounds such as explicit site-link reveals, which violated the requirement that the site footer remain a real footer below the fold. `[HCS-022]`
4. The main navigation was overloaded with extra center content, breaking the intended single-line brand/auth layout. `[HCS-023]`

### 1.3 Root Cause

The current architecture mixes two incompatible layout models:

1. A normal document shell that wants the page itself to be the primary scroll surface.
2. A chat workspace that requires an exclusive internal scroll surface for messages.

If both models are allowed to participate in the same first-screen vertical flow, one of these regressions will reappear:

1. The page scroll leaks into the homepage by default.
2. The footer is removed or hidden with a special-case workaround.
3. The composer stops behaving like a fixed workspace control.

The solution must separate these responsibilities structurally, not cosmetically. `[HCS-024]`

---

## 2. Design Goals

1. **Dedicated chat stage.** The homepage first screen must be an explicit workspace stage, not a normal content page. `[HCS-030]`
2. **Real footer below fold.** The footer remains a normal document sibling after the homepage stage, not a modal, drawer, reveal, or alternate home-route substitute. `[HCS-031]`
3. **Composer isolation.** The composer must live in its own non-scrolling row so message growth can never displace it. `[HCS-032]`
4. **Message-first scroll.** The message viewport must be the default scroll owner inside the homepage stage. `[HCS-033]`
5. **Intentional outer scroll.** Reaching the footer must require an intentional outer-page scroll gesture outside the message region. `[HCS-034]`
6. **Minimal nav contract.** The homepage nav must remain one line with only brand on the left and auth/user controls on the right. `[HCS-035]`
7. **Reliable browser behavior.** The solution must survive Safari/mobile scroll chaining and dynamic viewport behavior more reliably than a pure CSS-only flex stack. `[HCS-036]`

---

## 3. Architecture Direction

### 3.1 Shell Model

The home route uses a two-layer document structure:

1. **Homepage stage**: exactly one viewport tall, rendered above the fold.
2. **Footer document segment**: normal page content below the stage.

This means the document still scrolls overall, but the first screen itself is a bounded workspace. `[HCS-040]`

### 3.1.1 Viewport Budget Contract

The homepage stage height must be defined against the project viewport token strategy rather than raw browser viewport assumptions.

Required rules:

1. The stage uses the same shared viewport block-size token already established in browser-shell hardening work, not inline `100vh` or ad hoc `100dvh` math. `[HCS-040A]`
2. The stage height budget must subtract the actual rendered nav height rather than duplicating a hard-coded header height guess. `[HCS-040B]`
3. The composer row must remain fully visible when dynamic browser chrome changes the available viewport height. `[HCS-040C]`
4. Mobile keyboard open must not move the composer out of the visible stage; if the browser shrinks the visual viewport, the message pane is the area that gives up space first. `[HCS-040D]`

### 3.2 Home Stage Layout Contract

The home stage must be composed as:

1. Sticky or fixed-height top nav
2. Chat workspace filling remaining viewport height

The chat workspace itself must be a strict two-row layout:

| Row | Purpose |
| --- | --- |
| Row 1 | Message viewport (scroll owner) |
| Row 2 | Composer row (non-scrolling) |

The composer row must not be inside the message viewport. `[HCS-041]`

### 3.3 Scroll Ownership Contract

The architecture must define scroll behavior explicitly:

| Surface | Scroll role |
| --- | --- |
| Outer document | Reaches the footer, but not the default interaction while pointer/touch is in messages |
| Home stage container | Non-scrolling |
| Message viewport | Primary and default scroll owner |
| Composer row | Non-scrolling |

This is the central contract. If the stage container itself scrolls, the design has failed. `[HCS-042]`

### 3.3.1 Ownership Boundaries

To avoid repeating the current regression class, each layer must own exactly one concern:

| Layer | Sole responsibility | Forbidden responsibilities |
| --- | --- | --- |
| App shell | Document composition: homepage stage above, footer below | No embedded chat layout, no scroll interception |
| Home route | Stage sizing inputs and route-specific workspace wrapper | No footer workarounds, no message-scroll logic |
| Chat container | Internal workspace layout: message row + composer row | No document/footer composition |
| Message viewport hook(s) | Message scrolling, auto-scroll, and boundary-lock behavior | No page-level layout decisions |

If any implementation spreads these concerns across multiple layers, it is violating the architecture even if the layout appears correct locally. `[HCS-042A]`

### 3.4 Scroll Boundary Enforcement

For reliable browser behavior, the message viewport may require both:

1. CSS containment such as `overscroll-contain`
2. A dedicated interaction hook that suppresses scroll chaining from wheel/touch events while the pointer is inside the message region

This hook should only prevent accidental page-scroll takeover from the message pane. It must not block intentional page scrolls that start outside the message region. `[HCS-043]`

### 3.4.1 Boundary-Lock Event Contract

If the boundary-lock hook is required, its behavior must be explicit:

1. It attaches only to the message viewport element. `[HCS-043A]`
2. It may use non-passive listeners only for the events that require cancellation to prevent scroll chaining. `[HCS-043B]`
3. It must preserve native momentum scrolling inside the message pane when further inner scrolling is possible. `[HCS-043C]`
4. It cancels wheel/touch scroll only when the gesture started inside the message viewport and the browser is attempting to transfer that same gesture to the outer page after hitting the top or bottom boundary. `[HCS-043D]`
5. It must not intercept keyboard scrolling, focus navigation, text selection, input editing, or link activation. `[HCS-043E]`
6. It must not interfere with intentional outer-page scrolling that begins on the nav, stage margins, or any area outside the message viewport. `[HCS-043F]`

This contract is necessary because “suppress scroll chaining” is otherwise too vague to implement consistently across Safari and Chromium. `[HCS-043G]`

### 3.5 Footer Contract

The footer remains rendered as a sibling after the homepage stage. It must:

1. Exist in normal document flow
2. Be reachable through intentional outer scroll
3. Never be visible in the default initial homepage viewport

This requirement rules out home-only substitutes such as drawers, buttons, or site-link panels. `[HCS-044]`

### 3.6 Navigation Contract

Homepage navigation must remain intentionally sparse:

1. Brand identity on the left
2. User menu or login/register controls on the right
3. No status pill, extra center rail, or second visual row in the homepage header

Any additional state indicator must live elsewhere in the chat experience, not in the primary nav line. `[HCS-045]`

### 3.7 Mobile Keyboard And Safe-Area Contract

The homepage shell must explicitly support:

1. iOS safe-area insets on top and bottom. `[HCS-046]`
2. Software keyboard open while the composer is focused. `[HCS-047]`
3. Visual viewport shrink without revealing the footer or making the stage itself scroll. `[HCS-048]`
4. Reflow where the message viewport compresses before the composer row does. `[HCS-049]`

The spec does not require the footer to remain reachable while the keyboard is open. It requires the chat stage to remain usable and the composer to stay visible. Footer reachability may resume after the keyboard closes. `[HCS-049A]`

---

## 4. Component Responsibilities

### 4.1 App Shell

`AppShell` or equivalent top-level layout component owns:

1. Document-level composition
2. The distinction between home stage and below-fold footer
3. Keeping the homepage stage exactly viewport-sized

It must not own embedded-chat-specific footer workarounds. `[HCS-050]`

Additional guardrail:

1. `AppShell` must render the homepage footer as a true below-the-fold sibling, not conditionally omit it and not replace it with a route-specific substitute. `[HCS-050A]`

### 4.2 Home Route

The home route owns:

1. The dedicated homepage stage wrapper
2. Any route-specific height budgeting below the nav
3. Passing the embedded mode into the chat workspace

It should not depend on incidental flex growth from the global shell. `[HCS-051]`

Additional guardrail:

1. The home route may create a dedicated stage wrapper component if that makes the height budget explicit and testable. `[HCS-051A]`
2. The home route must not contain site-link drawers, fallback footer panels, or alternative navigation surfaces. `[HCS-051B]`

### 4.3 Chat Container

The embedded chat container owns:

1. The two-row workspace layout
2. The message viewport
3. The pinned composer row
4. Scroll-to-bottom affordances and message presentation

It must not own footer rendering, footer alternatives, or route-level page navigation controls. `[HCS-052]`

Additional guardrail:

1. The embedded chat container must expose a stable DOM structure suitable for testing: one message viewport region and one composer region. `[HCS-052A]`

### 4.4 Message List

`MessageList` should optimize for the homepage chat-stage experience:

1. Message rhythm should not create excessive dead space above the composer
2. Short conversations should visually settle nearer to the input rather than floating awkwardly in the middle of the viewport

This may require alignment or spacing changes specific to the embedded home stage. `[HCS-053]`

### 4.5 Scroll Hook

`useChatScroll` continues to own message auto-scroll behavior. If boundary enforcement is needed, a separate hook should be added rather than overloading `useChatScroll` with page-scroll interception concerns. `[HCS-054]`

Recommended split:

1. `useChatScroll` keeps bottom-detection and auto-scroll semantics. `[HCS-054A]`
2. A separate `useMessageScrollBoundaryLock` or equivalent hook owns wheel/touch containment. `[HCS-054B]`

---

## 5. Reliability Strategy

### 5.1 CSS Is Necessary But Not Sufficient

Pure CSS containment is not enough to guarantee the requested behavior across browsers. It improves the default case, but Safari and touch scroll chaining can still promote the outer page as the active scroll surface when the inner pane hits a boundary.

Therefore the robust architecture should assume:

1. Structural isolation first
2. CSS overscroll containment second
3. Event-level boundary locking third where needed

`[HCS-060]`

### 5.2 Boundary-Lock Hook

If implemented, the boundary-lock hook should:

1. Attach only to the message viewport
2. Prevent wheel/touch chaining from escaping to the page when the gesture started inside the message region
3. Allow intentional page scrolling that starts outside the message region
4. Avoid breaking accessibility, keyboard scrolling, or text selection

This is the most reliable way to meet the interaction requirement exactly as stated. `[HCS-061]`

### 5.3 Failure Budget

The implementation should prefer slight friction over accidental footer exposure. In other words:

1. A small amount of deliberate effort to reach the footer is acceptable. `[HCS-062]`
2. Default message scrolling accidentally transferring to page scrolling is not acceptable. `[HCS-063]`
3. Composer displacement or stage scrolling is not acceptable. `[HCS-064]`

This prioritization should guide edge-case decisions during browser-specific tuning. `[HCS-065]`

---

## 6. Security

This feature is primarily about layout and interaction, but a few security and resilience boundaries still apply:

1. Scroll interception code must be scoped narrowly to the message viewport and must not attach global document listeners that degrade unrelated surfaces. `[HCS-066]`
2. No route-specific alternate navigation surface should hide or bypass authenticated navigation state; homepage shell changes must continue to use the real nav and real footer. `[HCS-067]`
3. Event listeners introduced for boundary-lock behavior must be cleaned up reliably to avoid leaks or stale handlers across route changes and Fast Refresh. `[HCS-068]`
4. The solution must not introduce input traps that block keyboard users from reaching footer links or main navigation through normal focus order. `[HCS-069]`

---

## 7. Testing Strategy

### 7.1 Layout and DOM Tests

Add or update tests proving:

1. The embedded chat container renders a dedicated composer row separate from the message viewport. `[HCS-070]`
2. The footer is not part of the default home stage rendering surface. `[HCS-071]`
3. The homepage nav stays single-line in structure and does not render optional center-stage content. `[HCS-072]`

### 7.2 Interaction Tests

Add focused tests for:

1. Auto-scroll behavior within the message pane `[HCS-073]`
2. Boundary-lock or scroll-chain prevention behavior if implemented `[HCS-074]`
3. Footer reachability through outer document scroll without breaking the composer `[HCS-075]`
4. Top-boundary and bottom-boundary behavior for wheel and touch interactions separately, if boundary-lock logic is introduced `[HCS-075A]`
5. Composer visibility while the route is in a reduced-height visual viewport simulation `[HCS-075B]`

### 7.3 Browser Verification

Manual verification must explicitly check:

1. Safari desktop
2. iOS Safari
3. Chrome desktop
4. Android Chrome

The critical scenarios are:

1. Short conversation with composer pinned at the bottom
2. Long conversation with internal message scrolling only
3. Intentional outer scroll to the footer
4. No accidental footer exposure from default chat scrolling
5. Software keyboard open on iOS Safari and Android Chrome while the composer is focused
6. Trackpad momentum scroll at the top and bottom boundaries on desktop Safari and Chrome

`[HCS-076]`

### 7.4 Eval Harness

The homepage shell must also ship with a deterministic eval harness that exercises the route as a product surface rather than only as isolated unit tests.

Required properties:

1. The harness runs named homepage scenarios against the rendered shell. `[HCS-077]`
2. It verifies the restored chat-first contract: embedded chat in `main`, footer outside the viewport stage, separate composer row, and no route-level hero wrapper. `[HCS-078]`
3. It must cover both the default hero state and an active conversation state so the intro content appears only when appropriate. `[HCS-079]`

---

## 8. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Remove home-route workarounds and restore the correct shell ownership boundaries |
| 1 | Implement dedicated homepage stage and two-row embedded chat workspace |
| 2 | Add boundary-lock behavior and browser-focused interaction coverage |
| 3 | Run browser QA, tighten spacing/rhythm, and finalize acceptance verification |
| 4 | Restore direct chat-first route composition, move hero content into the message viewport, and add a reusable homepage eval harness |

---

## 9. Acceptance Criteria

1. The homepage first screen is a dedicated chat stage and exactly fills the viewport below the nav. `[HCS-080]`
2. The footer exists below the fold in normal document flow. `[HCS-081]`
3. The composer remains pinned at the bottom of the chat stage regardless of message count. `[HCS-082]`
4. Message scrolling is the default interaction inside the homepage chat. `[HCS-083]`
5. The outer page only scrolls to the footer when the user intentionally scrolls outside the message region. `[HCS-084]`
6. The homepage nav remains one line with only company branding and auth/user controls. `[HCS-085]`
7. No home-route-specific footer substitutes remain. `[HCS-086]`
8. Keyboard-open behavior on mobile keeps the composer visible and the stage usable. `[HCS-087]`
9. Scroll-boundary logic, if implemented, preserves accessibility and does not block normal focus/navigation flows. `[HCS-088]`
10. A reusable homepage eval harness can be run on demand to validate both hero-state and active-conversation homepage scenarios. `[HCS-089]`

---

## 10. Future Considerations

1. If the homepage later gains secondary discovery UI, it should appear inside the message viewport or as route-specific content above it, not by reintroducing a second header row.
2. If browser-specific scroll chaining remains inconsistent after CSS containment, the boundary-lock hook should become the canonical solution rather than another round of layout experiments.
3. This architecture should remain homepage-specific. Other routes can continue using a normal document shell plus floating chat model.