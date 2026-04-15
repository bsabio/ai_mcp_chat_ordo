# FAB Shell Refactor - Architecture Spec

> **Status:** Implemented and verified v1.0
> **Date:** 2026-03-21
> **Scope:** Refactor the floating chat FAB shell so its lifecycle, layout, theming, and styling are modular, testable, and consistent with the existing assistant command pipeline. This feature covers the floating shell only, not the embedded homepage chat stage.
> **Dependencies:** Chat Experience (implemented), Browser UI Hardening (verification assets shipped), Homepage Chat Shell (coexistence verified), Shell Navigation And Design System (complete), Theme Consistency (command path verified)
> **Affects:** `src/components/GlobalChat.tsx`, `src/frameworks/ui/ChatContainer.tsx`, `src/frameworks/ui/ChatHeader.tsx`, `src/frameworks/ui/ChatMessageViewport.tsx`, `src/frameworks/ui/ChatInput.tsx`, `src/frameworks/ui/MessageList.tsx`, `src/hooks/useGlobalChat.tsx`, `src/hooks/useUICommands.ts`, `src/components/ThemeProvider.tsx`, `src/app/globals.css`, focused FAB/browser tests, and live browser smoke coverage.
> **Motivation:** The FAB was architecturally over-compressed before this refactor. This spec now records the shipped architecture, the historical baseline that motivated it, and the verification evidence proving the final shell contract.
> **Requirement IDs:** `FAB-010` through `FAB-143`

---

## 0. Implementation Outcome

The refactor described in this spec is now implemented and verified.

Delivered architecture:

1. `GlobalChat` owns only route presence and suppresses the FAB on the homepage. `[FAB-084]`
2. `FloatingChatShell` owns the floating-shell lifecycle, open/minimize behavior, full-screen state, and `OPEN_GLOBAL_CHAT_EVENT` subscription. `[FAB-085]`
3. `FloatingChatLauncher`, `FloatingChatFrame`, and `FloatingChatHeader` split the floating shell into focused view components with truthful collaboration seams. `[FAB-086]` `[FAB-087]` `[FAB-088]`
4. `ChatHeader` is now embedded-only, while theme and accessibility changes continue through `useUICommands()` and `useCommandRegistry()` rather than through FAB-local controls. `[FAB-093]` `[FAB-094]` `[FAB-095]`
5. The floating frame emits `data-chat-shell-kind` and `data-chat-shell-size`, and FAB geometry now resolves through shell CSS variables with mobile selectors aligned to real emitted hooks. `[FAB-097]` `[FAB-098]` `[FAB-099]` `[FAB-100]` `[FAB-101]` `[FAB-102]`
6. Structural, browser-style jsdom, and live-browser smoke verification now cover the shipped FAB contract without depending on prompt-specific assistant wording. `[FAB-108]` through `[FAB-116]`

Sections 1 and 3 below preserve the verified pre-refactor baseline for historical context. Sections 4 through 8 describe the target architecture that has now been delivered.

---

## 1. Historical Baseline

### 1.1 Product Requirement

The floating chat FAB must satisfy the following product rules:

1. The FAB is available on every route except the homepage, which already owns the embedded hero chat experience. `[FAB-010]`
2. The FAB should behave like a stable shell that can be opened, minimized, restored, and tested independently of model-response wording. `[FAB-011]`
3. Theme and accessibility adjustments should be driven through the assistant command/tool pathway rather than through local FAB header controls. `[FAB-012]`
4. The floating shell styling should be locally understandable and should not depend on dead selectors or hard-to-trace cross-layer overrides. `[FAB-013]`

### 1.2 Historical Baseline Before Refactor

Before Sprint 0, the implementation already provided a working FAB, but the boundaries were blurred.

Verified pre-refactor baseline:

1. `src/components/GlobalChat.tsx` mounts the floating chat on every route except `/`. `[FAB-020]`
2. `src/frameworks/ui/ChatContainer.tsx` owns floating shell open/close/full-screen state, listens for `OPEN_GLOBAL_CHAT_EVENT`, renders the launcher, and renders the full floating shell. `[FAB-021]`
3. `src/frameworks/ui/ChatHeader.tsx` contains both floating-header logic and a separate embedded-header branch in the same component. `[FAB-022]`
4. `src/frameworks/ui/ChatContainer.tsx` currently reads theme density and grid controls directly from `useTheme()` and passes them into the floating header. `[FAB-023]`
5. `src/hooks/useUICommands.ts` already supports assistant-driven UI changes through `set_theme` and `adjust_ui` commands, which means the product has an existing theme-control seam outside the FAB header. `[FAB-024]`
6. Mobile FAB styling depends on `data-chat-*` hooks in `src/app/globals.css`, but some selectors target attributes that the floating shell does not actually emit. `[FAB-025]`

### 1.3 Verified Pre-Refactor Architecture And Styling Failures

The pre-refactor FAB had the following verified defects or structural weaknesses:

1. `ChatContainer` is carrying multiple responsibilities at once: shell lifecycle, event subscription, router navigation, theme manipulation, message presentation wiring, viewport geometry, and composer orchestration. `[FAB-030]`
2. `ChatHeader` has an oversized interface for the floating use case because it still accepts search, density, and grid props that are not part of the desired long-term floating-shell contract. `[FAB-031]`
3. The floating shell exposes an `onClose` prop but does not honor parent-controlled close orchestration; the container consumes it and then discards it. `[FAB-032]`
4. Floating layout authority is split between computed inline styles in `ChatContainer` and global attribute selectors in `globals.css`, creating a brittle styling model with mixed precedence. `[FAB-033]`
5. The mobile stylesheet contains at least one dead override path: the rule targeting `[data-chat-floating-shell="true"] [data-chat-composer-row]` does not execute because the floating shell never emits `data-chat-composer-row`. `[FAB-034]`
6. The pre-refactor FAB tests mixed shell-contract assertions with variant-specific assistant output expectations, which made some browser assertions too dependent on prompt wording rather than stable UI outcomes. `[FAB-035]`

### 1.4 Historical Root Cause

The root problem is not that the FAB is broken. The root problem is that the FAB shell grew by accretion instead of around a dedicated shell architecture.

Current responsibilities are distributed across four layers without a single clean ownership model:

1. `GlobalChat` decides where the FAB exists. `[FAB-036]`
2. `ChatContainer` decides whether the shell is visible, full-screen, and how large it should be. `[FAB-037]`
3. `ChatHeader` decides which control surface the shell exposes, including theme-related controls that belong to the broader UI-command system. `[FAB-038]`
4. `globals.css` decides mobile shell behavior through global selectors that are only partially aligned with actual render hooks. `[FAB-039]`

This is why seemingly small FAB changes can create regressions across layout, controls, and test behavior. `[FAB-040]`

---

## 2. Design Goals

1. **Single shell responsibility.** Floating-shell lifecycle should be encapsulated behind a dedicated FAB shell boundary rather than spread across one large chat container. `[FAB-050]`
2. **Truthful public interfaces.** Component props must reflect real collaboration seams. If a shell exposes `onClose`, it must honor it. `[FAB-051]`
3. **Theme control through assistant tooling.** Floating FAB chrome must stop owning density and grid toggles; theme and accessibility changes should continue through the existing assistant command pipeline. `[FAB-052]`
4. **Local styling authority.** FAB geometry and FAB-specific styling should be driven by a coherent shell contract with predictable hooks and minimal global override leakage. `[FAB-053]`
5. **Stable page policy.** Route presence rules for the FAB should be explicit and testable: present on all non-homepage routes. `[FAB-054]`
6. **Live-contract testing.** Browser tests should assert stable shell behavior and visible interaction outcomes, not exact prompt phrasing from the assistant. `[FAB-055]`
7. **Incremental adoption.** The refactor should preserve the working event contract and chat runtime rather than rewrite the whole chat system. `[FAB-056]`

---

## 3. Historical Pre-Refactor Architecture Inventory

### 3.1 Page Presence Policy

Verified in `src/components/GlobalChat.tsx`:

```typescript
export function GlobalChat()
```

Verified pre-refactor policy:

```typescript
const pathname = usePathname();
if (pathname === "/") return null;
return <ChatContainer isFloating={true} />;
```

This was the pre-refactor source of truth for FAB page presence and already matched the clarified requirement: the FAB exists on every page except the homepage. `[FAB-060]`

### 3.2 Floating Shell Container

Verified in `src/frameworks/ui/ChatContainer.tsx`:

```typescript
interface Props {
  isFloating?: boolean;
  onClose?: () => void;
}

export const ChatContainer: React.FC<Props>
```

Verified pre-refactor responsibilities inside the same component:

1. local open state via `const [isOpen, setIsOpen] = useState(false)` `[FAB-061]`
2. local full-screen state via `const [isFullScreen, setIsFullScreen] = useState(false)` `[FAB-062]`
3. event-bus open handling via `window.addEventListener(OPEN_GLOBAL_CHAT_EVENT, handleOpenChat)` `[FAB-063]`
4. theme coupling through `useTheme()` and header props `[FAB-064]`
5. layout geometry through `sectionStyle.inlineSize` and `sectionStyle.blockSize` `[FAB-065]`
6. launcher rendering and floating-shell rendering in the same component `[FAB-066]`

This file is functioning as both shell controller and shell view. That is the main architectural compression point. `[FAB-067]`

### 3.3 Header Control Surface

Verified in `src/frameworks/ui/ChatHeader.tsx`:

```typescript
interface ChatHeaderProps {
  title: string;
  subtitle: string;
  isFloating: boolean;
  onMinimize?: () => void;
  onFullScreenToggle: () => void;
  isFullScreen: boolean;
  conversationActions?: React.ReactNode;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  density: "compact" | "normal" | "relaxed";
  onDensityChange: (density: "compact" | "normal" | "relaxed") => void;
  gridEnabled: boolean;
  onGridToggle: () => void;
}
```

Verified behavior:

1. Floating mode renders conversation actions, full-screen, and minimize controls. Title and subtitle were removed during Sprint 1 to avoid duplication with the embedded header. `[FAB-068]`
2. Embedded mode renders search, density, and grid controls. `[FAB-069]`
3. The same component currently owns both branches. `[FAB-070]`

This interface is already telling us that two different headers exist conceptually, even though they are still implemented as one. `[FAB-071]`

### 3.4 Existing Theme Command Path

Verified in `src/hooks/useUICommands.ts`:

```typescript
if (cmd.type === "set_theme") {
  setTheme(cmd.theme as Theme);
} else if (cmd.type === "adjust_ui") {
  applyUIAdjustment(settings, accessibility, setAccessibility, setTheme, setIsDark);
}
```

Verified in `src/hooks/useCommandRegistry.ts`:

```typescript
createShellCommands({
  navigate: (path) => router.push(path),
  setTheme,
})
```

Verified supporting command type in `src/core/commands/ThemeCommands.ts`:

```typescript
export class ThemeCommand implements Command
```

This means theme and accessibility changes already have a command-driven path owned by the assistant/UI-command layer rather than by the floating shell. The refactor should remove FAB-local theme controls and lean on this existing pathway. `[FAB-072]`

### 3.5 Styling Inventory

Verified floating-shell style hooks:

1. `data-chat-floating-shell` is emitted by `ChatContainer`. `[FAB-073]`
2. `data-chat-fab-launcher` is emitted by the launcher button. `[FAB-074]`
3. `data-chat-composer-shell`, `data-chat-composer-form`, and `data-chat-composer-helper` are emitted by the composer subtree. `[FAB-075]`

Verified global mobile overrides in `src/app/globals.css`:

```css
[data-chat-floating-shell="true"] { ... }
[data-chat-floating-shell="true"] [data-chat-message-viewport="true"] { ... }
[data-chat-floating-shell="true"] [data-chat-composer-row] { ... }
[data-chat-floating-shell="true"] [data-chat-composer-shell="true"] { ... }
[data-chat-composer-helper="true"] { ... }
[data-chat-fab-launcher="true"] { ... }
```

The contract is heading in the right direction, but the selectors and the rendered hooks are not fully aligned. `[FAB-076]`

---

## 4. Implemented Architecture Direction

The design direction in this section is now the shipped architecture.

### 4.1 Canonical Rule

The FAB refactor should separate the floating shell into three coordinated layers:

1. **Presence layer:** decides whether the FAB exists on the current route. `[FAB-080]`
2. **Shell controller layer:** owns open, minimize, restore, and full-screen state for the floating shell. `[FAB-081]`
3. **Floating chat view layer:** renders chat content inside a shell contract without owning theme policy or route policy. `[FAB-082]`

`ChatContainer` may remain the embedded chat surface, but the floating FAB should no longer be just `ChatContainer` with `isFloating=true`. `[FAB-083]`

### 4.2 Proposed Component Boundaries

Recommended target structure:

```typescript
export function GlobalChat(): JSX.Element | null
export function FloatingChatShell(): JSX.Element
export function FloatingChatLauncher(props): JSX.Element
export function FloatingChatFrame(props): JSX.Element
export function FloatingChatHeader(props): JSX.Element
```

Rules:

1. `GlobalChat` owns only route presence policy. `[FAB-084]`
2. `FloatingChatShell` owns open/full-screen lifecycle and listens for `OPEN_GLOBAL_CHAT_EVENT`. `[FAB-085]`
3. `FloatingChatLauncher` owns only the closed-state button rendering. `[FAB-086]`
4. `FloatingChatFrame` renders the active floating shell geometry and hosts the content surface. `[FAB-087]`
5. `FloatingChatHeader` owns only floating-shell controls: conversation actions slot, full-screen toggle, minimize action. Title and subtitle were removed during Sprint 1 because the floating header intentionally avoids branding duplication with the embedded header. `[FAB-088]`
6. `ChatContainer` remains the shared chat composition surface for embedded mode and may optionally host a smaller shared content sub-tree used by both embedded and floating variants. `[FAB-089]`

This is the key structural refactor. The shell should be composed from smaller, honest objects rather than toggled through `if (isFloating)` branches. `[FAB-090]`

### 4.3 Theme And Accessibility Control Rule

The floating FAB header must stop rendering local density and grid toggles.

Canonical rule:

1. Theme changes remain supported. `[FAB-091]`
2. Accessibility adjustments remain supported. `[FAB-092]`
3. Those adjustments must be triggered through the assistant command pipeline using the existing `set_theme` and `adjust_ui` command types handled in `useUICommands()`. `[FAB-093]`
4. Any slash-command or command-palette path that sets theme should continue to route through `useCommandRegistry()` and the shell command registry. `[FAB-094]`
5. The FAB shell must not expose direct local header controls for density or grid state. `[FAB-095]`

This keeps theme policy in one place and removes shell-local UI settings drift. `[FAB-096]`

### 4.4 Floating Layout Contract

The floating shell needs a single layout authority.

Recommended rule set:

1. The shell frame should expose stable size-state attributes such as `data-chat-shell-size="default|fullscreen"`. `[FAB-097]`
2. The shell frame should expose stable mode attributes such as `data-chat-shell-kind="floating"`. `[FAB-098]`
3. FAB-specific geometry tokens should be centralized as CSS custom properties rather than split between string-built class names and inline measurements. `[FAB-099]`
4. Mobile adaptations should target rendered attributes that actually exist in the floating shell subtree. `[FAB-100]`
5. FAB-specific CSS should be grouped into a clearly marked floating-shell section and should avoid dead selectors and unnecessary `!important` usage. `[FAB-101]`

Recommended geometry model:

```css
--fab-shell-inline-size
--fab-shell-block-size
--fab-shell-inline-offset
--fab-shell-block-offset
--fab-shell-radius
```

`FloatingChatFrame` should set state attributes; CSS should own most of the size behavior. Inline style should only be used where viewport-safe dynamic values are truly required. `[FAB-102]`

### 4.5 Public Lifecycle Contract

The floating shell must have a truthful close/minimize API.

Rules:

1. If the shell exposes an `onClose` prop, invoking the close affordance must call it. `[FAB-103]`
2. If close is internally owned, the prop should be removed from the public interface. `[FAB-104]`
3. `OPEN_GLOBAL_CHAT_EVENT` remains the canonical global open signal. `[FAB-105]`
4. Minimize should preserve current conversation state. `[FAB-106]`
5. Full-screen exit should preserve current conversation state and return to default floating geometry. `[FAB-107]`

### 4.6 Testing Contract

The FAB needs three distinct test layers:

1. **Structural component tests** for open/minimize/full-screen and hook alignment. `[FAB-108]`
2. **Browser-style jsdom tests** for scrolling, composer affordances, and mobile shell hooks. `[FAB-109]`
3. **Live browser smoke** for stable visible behaviors only. `[FAB-110]`

Live-browser assertions should verify:

1. launcher visible on non-homepage routes `[FAB-111]`
2. shell opens `[FAB-112]`
3. helper text remains visible `[FAB-113]`
4. initial chip send works `[FAB-114]`
5. visible clarifying or follow-up next actions render after the first send `[FAB-115]`

Live-browser assertions should not depend on one exact sentence from the assistant if multiple prompt variants are valid. `[FAB-116]`

---

## 5. Security And State Rules

1. The FAB refactor must not create route-specific exceptions beyond the explicit homepage exclusion without documenting them in code and tests. `[FAB-120]`
2. Assistant-issued UI commands must continue to flow only through the existing command handling layer in `useUICommands()` and must not introduce ad hoc DOM mutation inside the FAB shell. `[FAB-121]`
3. The shell refactor must not duplicate conversation state already owned by `ChatProvider` or `useGlobalChat()`. `[FAB-122]`
4. Minimize and restore must not create duplicate event listeners or duplicate send flows. `[FAB-123]`

---

## 6. Testing Strategy

The implementation must add or update tests for the following:

1. `GlobalChat` route presence policy: present on all non-homepage routes, absent on homepage. `[FAB-130]`
2. Floating shell lifecycle: launcher, open event, minimize, full-screen toggle, restore. `[FAB-131]`
3. Floating header contract: no local density/grid controls after refactor. `[FAB-132]`
4. Theme-control continuity: assistant `set_theme` and `adjust_ui` commands still affect the UI without FAB-local controls. `[FAB-133]`
5. Mobile shell styling hooks: every selector used by floating FAB mobile CSS must correspond to an emitted attribute. `[FAB-134]`
6. Browser live smoke: stable post-send shell outcomes without prompt-variant brittleness. `[FAB-135]`

---

## 7. Sprint Outcome

| Sprint | Goal | Status |
| --- | --- | --- |
| 0 | Split route presence from shell lifecycle and extract a dedicated floating shell controller | Implemented |
| 1 | Extract floating header and frame components, remove FAB-local theme/grid controls, and align the shell with the existing assistant command pipeline | Implemented |
| 2 | Refactor floating-shell styling into a coherent geometry/token contract and remove dead or misleading CSS selector paths | Implemented |
| 3 | Rebuild focused tests and browser smoke coverage around stable shell contracts instead of variant-specific assistant wording | Implemented |

---

## 8. Verification Outcome

The following verification stack passed on 2026-03-21:

1. `npm run browser:verify`
2. `npm run browser:smoke`
3. `npm run typecheck`
4. `npm run build`

Supporting focused verification delivered during the sprint sequence:

1. `src/components/GlobalChat.test.tsx` verifies homepage suppression and non-homepage FAB presence. `[FAB-130]`
2. `src/components/FloatingChatShell.test.tsx` verifies launcher/open/minimize/full-screen/restore lifecycle and shell-state hooks. `[FAB-131]`
3. `src/hooks/useUICommands.test.tsx` verifies `set_theme` and `adjust_ui` continuity after FAB-local controls were removed. `[FAB-133]`
4. `tests/browser-fab-mobile-density.test.tsx`, `tests/browser-fab-scroll-recovery.test.tsx`, and `tests/browser-fab-chat-flow.test.tsx` verify floating-shell hooks, scroll recovery, and first-send/follow-up continuity. `[FAB-109]` `[FAB-134]`
5. `tests/browser-ui/fab-live-smoke.spec.ts` verifies stable visible outcomes in a real browser without depending on one assistant phrase. `[FAB-110]` through `[FAB-116]`

---

## 9. Future Considerations

1. If the product later wants explicit manual theme controls in the floating shell, they should be added as a dedicated preferences surface rather than reintroduced into the floating header. `[FAB-140]`
2. If route-specific FAB exclusions are needed later, they should be modeled as a central route-policy helper instead of inline pathname checks. `[FAB-141]`
3. If floating and embedded chat continue to diverge visually, the project may eventually want separate `EmbeddedChatSurface` and `FloatingChatSurface` components sharing only message/composer primitives. `[FAB-142]`
4. If assistant UI commands expand beyond theme and navigation, that command pipeline should be documented as a first-class UI orchestration feature rather than remaining an implementation detail of chat rendering. `[FAB-143]`
