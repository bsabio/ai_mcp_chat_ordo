# Sprint 1 - Shared Mobile Primitives And Floating Chat

> **Status:** Completed
> **Goal:** Establish the shared mobile density primitives, compact the chat surfaces, and remove the launcher/content collision pattern on home and library-family routes.
> **Spec ref:** `MSR-041` through `MSR-048`, `MSR-060` through `MSR-065`, `MSR-075` through `MSR-095`, `MSR-120`
> **Prerequisite:** Sprint 0

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/app/styles/foundation.css` | shared token and density authority |
| `src/app/styles/chat.css` | chat selector authority for composer, chips, and floating shell |
| `src/app/styles/shell.css` | shell framing and route-level spacing authority |
| `src/components/AppShell.tsx` | shared container for route-level content clearances |
| `src/frameworks/ui/FloatingChatFrame.tsx` | floating-shell structure and vertical footprint |
| `src/frameworks/ui/FloatingChatLauncher.tsx` | launcher position and hit area |
| `src/frameworks/ui/ChatContentSurface.tsx` | transcript/composer seam and shell content layout |
| `src/frameworks/ui/ChatInput.tsx` | field, helper copy, textarea growth, attach, and send controls |
| `src/frameworks/ui/MessageList.tsx` | hero and follow-up chip treatment |
| `src/app/page.tsx` | embedded home-chat route |
| `src/app/library/page.tsx` | public listing route with confirmed launcher overlap |
| `tests/browser-fab-mobile-density.test.tsx` | current browser coverage for mobile chat density |
| `tests/browser-ui/home-shell-header.spec.ts` | current home and library header coverage |
| `tests/browser-ui/mobile-home-library-density.spec.ts` | focused mobile route assertions for home and library density |

---

## Task 1.1 - Establish Shared Mobile Density Primitives

**What:** Add or formalize the shared mobile roles needed by chat, home, and library surfaces.

**Modify:** `src/app/styles/foundation.css`, `src/app/styles/chat.css`, `src/app/styles/shell.css`

### Task 1.1 Minimum Roles To Govern

1. phone panel inset for high-value cards and framed surfaces
2. phone section gap for stacked route bands
3. phone bottom clearance for floating controls and safe area
4. compact chip gap and chip padding roles
5. compact metric and support-copy spacing roles
6. max-height and internal padding roles for the mobile composer

### Task 1.1 Required Outcome

The chat, home, and library routes must consume the same compact mobile roles instead of each surface inventing its own reduced spacing values.

---

## Task 1.2 - Compact The Floating Chat Shell And Composer

**What:** Convert the current floating composer from a tall layered tray into a shorter, more decisive mobile instrument.

**Modify:** `src/frameworks/ui/FloatingChatFrame.tsx`, `src/frameworks/ui/ChatContentSurface.tsx`, `src/frameworks/ui/ChatInput.tsx`, `src/frameworks/ui/MessageList.tsx`, `src/app/styles/chat.css`

### Task 1.2 Required Changes

1. hide or defer helper copy in the compact mobile state until focus, input, or an explicit info affordance
2. shorten or simplify the idle placeholder on phones
3. cap textarea growth more aggressively on mobile than desktop
4. move follow-up chips into a denser mobile pattern rather than a tall wrapped stack
5. reduce composer-plane padding and seam weight so the transcript or content retains more of the viewport
6. keep the send action authoritative without making the control rail bulky

### Task 1.2 Acceptance

1. the idle floating composer no longer dominates the lower viewport on `390x844`
2. transcript or page content clearly retains visual ownership above the composer
3. the compact state still preserves accessibility and authored hierarchy

---

## Task 1.3 - Remove Launcher And Content Collision Route-Wide

**What:** Solve floating-launcher overlap structurally instead of adding route-local margins.

**Modify:** `src/components/AppShell.tsx`, `src/frameworks/ui/FloatingChatLauncher.tsx`, any shared route-shell wrapper needed for bottom clearance

### Task 1.3 Required Changes

1. establish one route-level bottom-clearance mechanism for pages that allow floating chat
2. make launcher offset safe-area aware
3. ensure content lists, cards, and CTA rows preserve a clear visual zone above the launcher

### Task 1.3 Acceptance

1. `/library` no longer exhibits launcher overlap on content cards
2. the same fix applies cleanly to other non-home, non-admin routes with floating chat
3. the route-level spacing solution is shared and testable

---

## Task 1.4 - Compact The Home Embedded Chat Surface

**What:** Reduce the first-viewport weight of the embedded home-chat composition without flattening the brand experience.

**Modify:** `src/app/page.tsx`, `src/frameworks/ui/MessageList.tsx`, `src/frameworks/ui/ChatInput.tsx`, `src/app/styles/chat.css`, `src/app/styles/shell.css`

### Task 1.4 Required Changes

1. compress the hero stack so headline, support copy, suggestions, and composer do not all compete at full weight
2. reduce the empty-state gap between route identity and first action
3. keep the first screen focused on one authored conversation invitation rather than multiple equal bands

### Task 1.4 Acceptance

1. the home route reveals route identity and the conversation entry point immediately
2. the first viewport no longer feels dominated by helper chrome and large empty-state spacing
3. the visual result stays premium and deliberate rather than simply smaller

---

## Task 1.5 - Compact The Library Index Surface

**What:** Make `/library` feel denser, faster, and clearer on phones while preserving readability.

**Modify:** `src/app/library/page.tsx`, any shared listing-card component used there, `src/app/styles/foundation.css`, `src/app/styles/shell.css`

### Task 1.5 Required Changes

1. reduce card padding and decorative whitespace
2. keep search discoverable on mobile without letting the header consume the route
3. ensure the route surfaces more actual content per viewport without becoming cramped

### Task 1.5 Acceptance

1. `/library` shows more real content in the first viewport
2. the route remains readable and calm rather than crowded
3. the floating-launcher fix from Task 1.3 holds on the same route

---

## Verification

1. `npm run typecheck`
2. `npm run lint`
3. `npm run lint:css`
4. `npm run spacing:audit`
5. `npm exec vitest run tests/browser-fab-mobile-density.test.tsx`
6. `npx playwright test tests/browser-ui/home-shell-header.spec.ts tests/browser-ui/mobile-home-library-density.spec.ts`
7. `tests/browser-ui/mobile-home-library-density.spec.ts` covers `/` and `/library` at `390x844` and `430x932`

## Sprint 1 Exit Criteria

1. Shared mobile density roles exist for the affected surfaces.
2. The floating composer is materially shorter and cleaner on phones.
3. The launcher/content overlap defect is gone through a shared mechanism.
4. Home and library index now satisfy the first-viewport contract.
5. Focused mobile regression coverage exists for the changed surfaces.
