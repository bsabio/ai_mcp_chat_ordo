# Sprint 4 — Chat Surface Unification

> **Parent spec:** [Platform V0](spec.md) §7 Sprint 4
> **Requirement IDs:** FND-008, FND-009
> **Depends on:** Sprint 3 (removes "New Chat" / ConversationSidebar — simplifies the container surface)
> **Goal:** One `ChatSurface` component replaces `ChatContainer`, `FloatingChatShell`, and `GlobalChat`. Homepage UX preserved. FAB controls preserved. No user-facing behavior change.

---

## §1 Current State (What We're Replacing)

### §1.1 Homepage container — `src/frameworks/ui/ChatContainer.tsx` (60 lines)

Embedded grid container using `useViewTransitionReady()` hook for view-transition support. Uses `EMBEDDED_CONTAINER_CLASSES` constant (`relative grid h-full min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] bg-background`). Passes all `surfaceState` props individually to `ChatContentSurface`. Sets `data-chat-container-mode="embedded"` and `data-chat-layout="message-composer"`. Located in clean architecture's UI layer.

### §1.2 FAB shell — `src/components/FloatingChatShell.tsx` (68 lines)

Client component with state: `isOpen`, `isFullScreen`. Imports `OPEN_GLOBAL_CHAT_EVENT` from `@/lib/chat/chat-events`. Listens via `window.addEventListener`. Uses `useViewTransitionReady()` hook. When closed, renders `FloatingChatLauncher`. When open, renders `FloatingChatFrame` (passing `canUseViewTransitions` and `conversationActions={null}`) + `ChatContentSurface` with all `surfaceState` props passed individually.

### §1.3 Route guard — `src/components/GlobalChat.tsx` (12 lines)

Returns `null` on `pathname === "/"` (mutual exclusion with `ChatContainer`). Otherwise renders `FloatingChatShell`.

### §1.4 FAB frame — `src/frameworks/ui/FloatingChatFrame.tsx` (63 lines)

Fixed-position glass-surface container with safe-area CSS variables, conditional `viewTransitionName` via `canUseViewTransitions` prop, fullscreen data attributes. Renders `FloatingChatHeader` internally (passing `onMinimize`, `onFullScreenToggle`, `isFullScreen`, `conversationActions`) + children.

### §1.5 FAB header — `src/frameworks/ui/FloatingChatHeader.tsx` (65 lines)

Fullscreen toggle button + minimize button. Conditional glass-surface styling for fullscreen vs default. Optional `conversationActions` slot (set to `null` since Sprint 3). Uses `data-chat-floating-header="true"` and `data-chat-floating-header-chrome="true"` data attributes targeted by CSS in `globals.css`.

### §1.6 Shared surface — `src/frameworks/ui/ChatContentSurface.tsx` (107 lines)

Already shared between both containers. Renders `ChatMessageViewport` + `ChatInput`. Accepts `isEmbedded` and `isFullScreen` props to adjust layout.

### §1.7 Surface state hook — `src/frameworks/ui/useChatSurfaceState.tsx` (119 lines)

Orchestrates all chat state: messages, sending, conversation, input handling, suggestions, link clicks, action routing. Returns flat properties (no `contentProps` nesting). Both containers use this hook.

### §1.8 Layout — `src/app/layout.tsx` (107 lines)

Renders `<GlobalChat />` wrapped in `<Suspense>` after `<AppShell>`. 8 font families loaded.

### §1.9 Homepage — `src/app/page.tsx` (15 lines)

Server component: uses `getSessionUser()` and `resolveShellHomeHref()` for redirect logic, renders `<ChatContainer />` for homepage users.

### §1.10 Problems this creates

1. Two component trees (ChatContainer + FloatingChatShell) for the same functionality.
2. `GlobalChat.tsx` is a mutual-exclusion hack.
3. FAB features (fullscreen, minimize) absent from embedded. Embedded features (hero state) absent from FAB.
4. Any change to chat behavior must be verified in both containers.

---

## §2 Target Architecture

### §2.1 New files

| File | Layer | Purpose |
| --- | --- | --- |
| `src/frameworks/ui/ChatSurface.tsx` | UI | Unified chat container — accepts `mode` prop |
| `src/frameworks/ui/ChatSurfaceHeader.tsx` | UI | Unified header — conditional rendering per mode |
| `tests/chat-surface.test.tsx` | Test | Unified surface tests |

### §2.2 Deleted files

| File | Reason |
| --- | --- |
| `src/frameworks/ui/ChatContainer.tsx` | Replaced by `ChatSurface mode="embedded"` |
| `src/components/FloatingChatShell.tsx` | Replaced by `ChatSurface mode="floating"` |
| `src/components/GlobalChat.tsx` | Mutual-exclusion hack no longer needed |
| `src/frameworks/ui/FloatingChatHeader.tsx` | Merged into `ChatSurfaceHeader` |

### §2.3 Modified files

| File | Change |
| --- | --- |
| `src/app/page.tsx` | Render `<ChatSurface mode="embedded" />` |
| `src/app/layout.tsx` | Render `<ChatSurface mode="floating" />` instead of `<GlobalChat />` |
| `src/frameworks/ui/FloatingChatFrame.tsx` | Remove `FloatingChatHeader` rendering, `conversationActions` prop, and `onMinimize`/`onFullScreenToggle` props — becomes a pure layout wrapper |
| `src/frameworks/ui/useChatSurfaceState.tsx` | Add `contentProps` getter to return value for cleaner pass-through |

### §2.4 Unchanged files

| File | Why unchanged |
| --- | --- |
| `src/frameworks/ui/ChatContentSurface.tsx` | Unchanged — `isEmbedded` and `isFullScreen` props remain as-is |
| `src/frameworks/ui/ChatMessageViewport.tsx` | Render layer — no container awareness |
| `src/frameworks/ui/ChatInput.tsx` | Render layer |
| `src/hooks/useGlobalChat.tsx` | Provider — no container awareness |
| `src/frameworks/ui/FloatingChatLauncher.tsx` | Preserved — FAB button, used by `ChatSurface` |

---

## §3 Implementation Details

### §3.1 `ChatSurface` — unified container

```typescript
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useChatSurfaceState } from "./useChatSurfaceState";
import { ChatContentSurface } from "./ChatContentSurface";
import { ChatSurfaceHeader } from "./ChatSurfaceHeader";
import { FloatingChatFrame } from "./FloatingChatFrame";
import { FloatingChatLauncher } from "./FloatingChatLauncher";
import { OPEN_GLOBAL_CHAT_EVENT } from "@/lib/chat/chat-events";
import { useViewTransitionReady } from "@/hooks/useViewTransitionReady";

export type ChatSurfaceMode = "embedded" | "floating";

const EMBEDDED_CONTAINER_CLASSES =
  "relative grid h-full min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] bg-background";

export function ChatSurface({ mode }: { mode: ChatSurfaceMode }) {
  const pathname = usePathname();

  // Floating mode: suppress on homepage where embedded mode is rendered
  if (mode === "floating" && pathname === "/") return null;

  // Embedded mode: always renders
  if (mode === "embedded") return <EmbeddedSurface />;

  // Floating mode: FAB lifecycle
  return <FloatingSurface />;
}

function EmbeddedSurface() {
  const surfaceState = useChatSurfaceState({ isEmbedded: true });
  const canUseViewTransitions = useViewTransitionReady();

  const sectionStyle: React.CSSProperties = {};
  if (canUseViewTransitions) {
    sectionStyle.viewTransitionName = "chat-container";
  }

  return (
    <section
      className={EMBEDDED_CONTAINER_CLASSES}
      style={sectionStyle}
      data-chat-container-mode="embedded"
      data-chat-layout="message-composer"
    >
      <ChatContentSurface
        {...surfaceState.contentProps}
        isEmbedded={true}
        isFullScreen={false}
      />
    </section>
  );
}

function FloatingSurface() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const surfaceState = useChatSurfaceState({ isEmbedded: false });
  const canUseViewTransitions = useViewTransitionReady();

  const handleMinimize = useCallback(() => {
    setIsOpen(false);
    setIsFullScreen(false);
  }, []);

  const handleFullScreenToggle = useCallback(() => {
    setIsFullScreen((prev) => !prev);
  }, []);

  // Listen for programmatic open events (same pattern as current FloatingChatShell)
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener(OPEN_GLOBAL_CHAT_EVENT, handler);
    return () => window.removeEventListener(OPEN_GLOBAL_CHAT_EVENT, handler);
  }, []);

  if (!isOpen) {
    return <FloatingChatLauncher onOpen={() => setIsOpen(true)} />;
  }

  return (
    <FloatingChatFrame
      canUseViewTransitions={canUseViewTransitions}
      isFullScreen={isFullScreen}
    >
      <ChatSurfaceHeader
        mode="floating"
        isFullScreen={isFullScreen}
        onMinimize={handleMinimize}
        onFullScreenToggle={handleFullScreenToggle}
      />
      <ChatContentSurface
        {...surfaceState.contentProps}
        isEmbedded={false}
        isFullScreen={isFullScreen}
      />
    </FloatingChatFrame>
  );
}
```

**Key design decisions:**

- `ChatSurface` is the single root component. Mode determines rendering path.
- `EmbeddedSurface` and `FloatingSurface` are private sub-components — not exported.
- The pathname check for `"/"` moves from `GlobalChat.tsx` into `ChatSurface` — same behavior, better location.
- `FloatingChatFrame` is preserved as the fixed-position layout wrapper. It handles safe-area CSS and glass-surface styling. Its internal `FloatingChatHeader` rendering is removed — `ChatSurfaceHeader` is rendered directly by `ChatSurface` as a child.
- `OPEN_GLOBAL_CHAT_EVENT` is imported from `@/lib/chat/chat-events` — not redefined locally. `window.addEventListener` is used (matching current `FloatingChatShell` behavior).
- `useViewTransitionReady()` hook is used (matching current `ChatContainer` and `FloatingChatShell` behavior) — not an inline `typeof document` check.
- `viewTransitionName: "chat-container"` is set on both surfaces — mutual exclusion via pathname check ensures they never coexist, so the transition name is safe.
- `EMBEDDED_CONTAINER_CLASSES` matches the current `ChatContainer` exactly: `relative grid h-full min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] bg-background`. The `data-chat-layout="message-composer"` attribute is preserved for CSS targeting.
- `EmbeddedSurface` uses a `<section>` element (matching current `ChatContainer`), not `<div>`.

### §3.2 `ChatSurfaceHeader` — unified header

```typescript
"use client";

import React from "react";

interface ChatSurfaceHeaderProps {
  mode: "embedded" | "floating";
  isFullScreen: boolean;
  onMinimize?: () => void;
  onFullScreenToggle?: () => void;
}

export function ChatSurfaceHeader({
  mode,
  isFullScreen,
  onMinimize,
  onFullScreenToggle,
}: ChatSurfaceHeaderProps) {
  // Embedded mode: no header chrome (hero state handles branding via ChatMessageViewport)
  if (mode === "embedded") return null;

  // Floating mode: fullscreen + minimize controls
  const headerClasses = isFullScreen
    ? "glass-surface safe-area-pt safe-area-px relative z-10 flex shrink-0 items-start justify-between border-b border-color-theme pb-4 pt-3 transition-colors duration-500"
    : "glass-surface relative z-10 flex shrink-0 items-start justify-between border-b border-color-theme px-(--container-padding) py-4 transition-colors duration-500";

  return (
    <div className={headerClasses} data-chat-floating-header="true">
      <div className="shell-action-row shrink-0 ml-auto" data-chat-floating-header-chrome="true">
        <button
          onClick={onFullScreenToggle}
          className="icon-btn"
          aria-label={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
        >
          {isFullScreen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v5H3M21 8h-5V3M3 16h5v5M16 21v-5h5" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 15v6h-6M3 9V3h6" />
            </svg>
          )}
        </button>
        <button
          onClick={onMinimize}
          className="icon-btn"
          aria-label="Minimize Chat"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
```

**Note:** The `FloatingChatHeader` had an optional `conversationActions` slot for `ConversationSidebar`. Since Sprint 3 deleted the sidebar, the slot is removed. The header simplifies to just fullscreen + minimize buttons.

### §3.3 `FloatingChatFrame` — preserved with structural cleanup

`FloatingChatFrame` stays as the fixed-position layout wrapper. It provides safe-area CSS variables and glass-surface styling. Two changes:

1. **Remove internal `FloatingChatHeader` rendering.** The header is now rendered by `ChatSurface` directly via `ChatSurfaceHeader` as a child element. `FloatingChatFrame` becomes a pure layout wrapper that renders only `{children}`.
2. **Remove `conversationActions`, `onMinimize`, and `onFullScreenToggle` props** — these were only needed to pass through to the internal header.

```typescript
// Before:
interface FloatingChatFrameProps {
  canUseViewTransitions: boolean;
  children: React.ReactNode;
  conversationActions?: React.ReactNode;
  isFullScreen: boolean;
  onMinimize: () => void;
  onFullScreenToggle: () => void;
}

// After:
interface FloatingChatFrameProps {
  canUseViewTransitions: boolean;
  children: React.ReactNode;
  isFullScreen: boolean;
}
```

The `FloatingChatHeader` import is removed. The `<FloatingChatHeader ... />` JSX in the render is replaced by just `{children}`.

### §3.4 Homepage — `src/app/page.tsx`

```typescript
// BEFORE:
import { ChatContainer } from "@/frameworks/ui/ChatContainer";
export default async function Home() {
  // ...redirect logic...
  return <ChatContainer />;
}

// AFTER:
import { ChatSurface } from "@/frameworks/ui/ChatSurface";
export default async function Home() {
  // ...redirect logic unchanged...
  return <ChatSurface mode="embedded" />;
}
```

### §3.5 Layout — `src/app/layout.tsx`

```typescript
// BEFORE:
import { GlobalChat } from "@/components/GlobalChat";
// ...
<Suspense fallback={null}>
  <GlobalChat />
</Suspense>

// AFTER:
import { ChatSurface } from "@/frameworks/ui/ChatSurface";
// ...
<Suspense fallback={null}>
  <ChatSurface mode="floating" />
</Suspense>
```

### §3.6 `useChatSurfaceState` — adapt return shape

The hook currently returns flat props. We add a `contentProps` getter for cleaner pass-through to `ChatContentSurface`. Note: `activeTrigger` from `useChatComposerController` is `MentionTrigger | null` (an object with `.char: string`). The `contentProps` mapping narrows it to `string | null` via `.char`.

```typescript
// Add to useChatSurfaceState return:
const contentProps = {
  activeTrigger: activeTrigger ? activeTrigger.char : null,  // MentionTrigger → string | null
  canSend,
  dynamicSuggestions,
  input,
  inputRef: textareaRef,                  // rename textareaRef → inputRef
  isHeroState,
  isLoadingMessages,
  isSending,
  mentionIndex,
  messages: presentedMessages,            // rename presentedMessages → messages
  onFileRemove: handleFileRemove,
  onFileSelect: handleFileSelect,
  onInputChange: handleInputChange,
  onLinkClick: handleLinkClick,
  onActionClick: handleActionClick,
  onMentionIndexChange: setMentionIndex,
  onSend: handleSend,
  onSuggestionClick: handleSuggestionClick,
  onSuggestionSelect: handleSuggestionSelect,
  pendingFiles,
  scrollDependency,
  searchQuery: sessionSearchQuery,        // rename sessionSearchQuery → searchQuery
  suggestions: mentionSuggestions,        // rename mentionSuggestions → suggestions
};

return {
  .../* existing flat return */,
  contentProps,
};
```

This keeps backward compatibility while making `ChatSurface` cleaner: `<ChatContentSurface {...surfaceState.contentProps} isEmbedded={...} isFullScreen={...} />`.

---

## §4 Task Breakdown

| # | Task | Files touched | Est. |
| --- | --- | --- | --- |
| 4.1 | Create `ChatSurface` component with `mode` prop | `src/frameworks/ui/ChatSurface.tsx` | M |
| 4.2 | Create `ChatSurfaceHeader` with mode-conditional rendering | `src/frameworks/ui/ChatSurfaceHeader.tsx` | M |
| 4.3 | Add `contentProps` to `useChatSurfaceState` return value | `src/frameworks/ui/useChatSurfaceState.tsx` | S |
| 4.4 | Update `FloatingChatFrame` — remove `onMinimize`, `onFullScreenToggle`, `conversationActions` props; remove internal `FloatingChatHeader` rendering; become pure layout wrapper | `src/frameworks/ui/FloatingChatFrame.tsx` | S |
| 4.5 | Update homepage `page.tsx` to render `ChatSurface mode="embedded"` | `src/app/page.tsx` | S |
| 4.6 | Update layout to render `ChatSurface mode="floating"` instead of `GlobalChat` | `src/app/layout.tsx` | S |
| 4.7 | Delete `ChatContainer.tsx` | `src/frameworks/ui/ChatContainer.tsx` | S |
| 4.8 | Delete `FloatingChatShell.tsx` | `src/components/FloatingChatShell.tsx` | S |
| 4.9 | Delete `GlobalChat.tsx` | `src/components/GlobalChat.tsx` | S |
| 4.10 | Delete `FloatingChatHeader.tsx` | `src/frameworks/ui/FloatingChatHeader.tsx` | S |
| 4.11 | Update all imports referencing deleted files in `src/` and `tests/` | Various (see §7.4) | M |
| 4.12 | Write tests for `ChatSurface` | `tests/chat-surface.test.tsx` | L |
| 4.13 | Verify `view-transition-name` safety | Manual + test | S |

**Execute order:** 4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6 → 4.7 → 4.8 → 4.9 → 4.10 → 4.11 → 4.12 → 4.13

---

## §5 Test Specification

### §5.1 Positive tests (expected behavior works)

| # | Test name | What it verifies |
| --- | --- | --- |
| P1 | `ChatSurface mode="embedded" renders chat content` | Embedded surface renders `ChatContentSurface` with `isEmbedded=true` |
| P2 | `ChatSurface mode="embedded" has viewTransitionName` | Container element has `viewTransitionName: "chat-container"` style |
| P3 | `ChatSurface mode="embedded" has correct data attributes` | `data-chat-container-mode="embedded"`, `data-chat-layout="message-composer"` |
| P4 | `ChatSurface mode="floating" renders launcher when closed` | Initial state: `FloatingChatLauncher` visible, chat content hidden |
| P5 | `ChatSurface mode="floating" opens on launcher click` | Click launcher → chat panel opens with `ChatContentSurface` |
| P6 | `ChatSurface mode="floating" renders fullscreen toggle` | Open panel → fullscreen button visible with correct aria-label |
| P7 | `ChatSurface mode="floating" renders minimize button` | Open panel → minimize button visible with correct aria-label |
| P8 | `ChatSurface mode="floating" minimizes on button click` | Click minimize → panel closes, launcher returns |
| P9 | `ChatSurface mode="floating" toggles fullscreen` | Click fullscreen → `isFullScreen` state changes, data attribute updates |
| P10 | `ChatSurface mode="floating" opens via OPEN_GLOBAL_CHAT_EVENT` | Dispatch event → panel opens |
| P11 | `ChatSurfaceHeader mode="embedded" returns null` | No header chrome rendered for embedded mode |
| P12 | `ChatSurfaceHeader mode="floating" renders controls` | Fullscreen + minimize buttons present |
| P13 | `hero state works in embedded mode` | Single bootstrap message → `isHeroState` is true |

### §5.2 Negative tests (invalid states prevented)

| # | Test name | What it verifies |
| --- | --- | --- |
| N1 | `ChatSurface mode="floating" returns null on homepage` | `pathname === "/"` → renders nothing |
| N2 | `no double-rendering on any page` | With both embedded and floating in the tree, only one is active |
| N3 | `minimize resets fullscreen state` | Fullscreen → minimize → reopen → not fullscreen |

### §5.3 Edge tests (boundary conditions)

| # | Test name | What it verifies |
| --- | --- | --- |
| E1 | `view-transition-name shared safely` | Embedded on "/" and floating elsewhere → never both rendered simultaneously |
| E2 | `OPEN_GLOBAL_CHAT_EVENT listener cleanup` | Component unmounts → event listener removed (no memory leak) |
| E3 | `floating panel preserves state during fullscreen toggle` | Messages, input text survive fullscreen transition |
| E4 | `mobile viewport (375px) renders correctly` | No horizontal overflow, safe-area respected |
| E5 | `darkMode class propagation` | Dark mode toggle affects unified surface correctly |

### §5.4 Deleted tests (from old container files)

| # | What's deleted | Reason |
| --- | --- | --- |
| D1 | `ChatContainer.test.tsx` — all tests | Component replaced by `ChatSurface mode="embedded"` |
| D2 | `FloatingChatShell.test.tsx` — all tests | Component replaced by `ChatSurface mode="floating"` |
| D3 | `GlobalChat.test.tsx` — all tests | Component deleted |
| D4 | `ChatContainer.send-failure.test.tsx` — all tests | Component replaced by `ChatSurface mode="embedded"` |

**Deleted test count (verified):**
- `ChatContainer.test.tsx` — 3 tests
- `FloatingChatShell.test.tsx` — 7 tests
- `GlobalChat.test.tsx` — 3 tests
- `ChatContainer.send-failure.test.tsx` — 1 test

**Total: 21 new tests, 14 deleted = net +7**

---

## §6 Test Implementation Patterns

### §6.1 ChatSurface rendering tests

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatSurface } from "@/frameworks/ui/ChatSurface";

// Mock hooks
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("@/hooks/useGlobalChat", () => ({
  useGlobalChat: vi.fn(() => ({
    messages: [],
    isSending: false,
    sendMessage: vi.fn(),
    conversationId: null,
    isLoadingMessages: false,
    setConversationId: vi.fn(),
    refreshConversation: vi.fn(),
  })),
}));

vi.mock("@/hooks/useViewTransitionReady", () => ({
  useViewTransitionReady: vi.fn(() => true),
}));

vi.mock("@/hooks/useUICommands", () => ({
  useUICommands: vi.fn(() => ({})),
}));

vi.mock("@/hooks/useCommandRegistry", () => ({
  useCommandRegistry: vi.fn(),
}));

vi.mock("@/adapters/StreamProviderFactory", () => ({
  StreamProviderFactory: { create: vi.fn() },
}));

vi.mock("@/components/ThemeProvider", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe("ChatSurface", () => {
  it("P1: mode='embedded' renders chat content", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/");

    const { container } = render(<ChatSurface mode="embedded" />);
    expect(container.querySelector("[data-chat-container-mode='embedded']")).toBeTruthy();
  });

  it("P4: mode='floating' renders launcher when closed", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/library");

    render(<ChatSurface mode="floating" />);
    // Launcher should be visible
    expect(screen.getByLabelText(/open chat|chat/i)).toBeTruthy();
  });

  it("N1: mode='floating' returns null on homepage", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/");

    const { container } = render(<ChatSurface mode="floating" />);
    expect(container.innerHTML).toBe("");
  });

  it("P8: minimize closes panel", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/library");

    render(<ChatSurface mode="floating" />);
    // Open the chat
    fireEvent.click(screen.getByLabelText(/open chat|chat/i));
    // Now minimize
    fireEvent.click(screen.getByLabelText("Minimize Chat"));
    // Launcher should be back
    expect(screen.getByLabelText(/open chat|chat/i)).toBeTruthy();
  });

  it("P10: opens via OPEN_GLOBAL_CHAT_EVENT", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/library");

    render(<ChatSurface mode="floating" />);
    // Dispatch custom event on window (not document)
    window.dispatchEvent(new Event("studio-ordo:open-chat"));
    // Panel should be open — minimize button visible
    expect(screen.getByLabelText("Minimize Chat")).toBeTruthy();
  });
});
```

### §6.2 ChatSurfaceHeader tests

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatSurfaceHeader } from "@/frameworks/ui/ChatSurfaceHeader";

describe("ChatSurfaceHeader", () => {
  it("P11: returns null for embedded mode", () => {
    const { container } = render(
      <ChatSurfaceHeader mode="embedded" isFullScreen={false} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("P12: renders controls for floating mode", () => {
    render(
      <ChatSurfaceHeader
        mode="floating"
        isFullScreen={false}
        onMinimize={() => {}}
        onFullScreenToggle={() => {}}
      />,
    );
    expect(screen.getByLabelText("Enter Full Screen")).toBeTruthy();
    expect(screen.getByLabelText("Minimize Chat")).toBeTruthy();
  });

  it("P9: fullscreen label toggles", () => {
    const { rerender } = render(
      <ChatSurfaceHeader
        mode="floating"
        isFullScreen={false}
        onMinimize={() => {}}
        onFullScreenToggle={() => {}}
      />,
    );
    expect(screen.getByLabelText("Enter Full Screen")).toBeTruthy();

    rerender(
      <ChatSurfaceHeader
        mode="floating"
        isFullScreen={true}
        onMinimize={() => {}}
        onFullScreenToggle={() => {}}
      />,
    );
    expect(screen.getByLabelText("Exit Full Screen")).toBeTruthy();
  });
});
```

---

## §7 Migration Checklist

### §7.1 Files to create

- [ ] `src/frameworks/ui/ChatSurface.tsx`
- [ ] `src/frameworks/ui/ChatSurfaceHeader.tsx`
- [ ] `tests/chat-surface.test.tsx`

### §7.2 Files to delete

- [ ] `src/frameworks/ui/ChatContainer.tsx`
- [ ] `src/components/FloatingChatShell.tsx`
- [ ] `src/components/GlobalChat.tsx`
- [ ] `src/frameworks/ui/FloatingChatHeader.tsx`

### §7.3 Test files to delete

- [ ] `src/frameworks/ui/ChatContainer.test.tsx` (3 tests)
- [ ] `src/components/FloatingChatShell.test.tsx` (7 tests)
- [ ] `src/components/GlobalChat.test.tsx` (3 tests)
- [ ] `src/frameworks/ui/ChatContainer.send-failure.test.tsx` (1 test)

### §7.4 Import updates required

After deleting old files, search **both** `src/` and `tests/` for references to deleted components:

```bash
grep -rn "ChatContainer\|FloatingChatShell\|GlobalChat\|FloatingChatHeader" src/ tests/
```

**Known files in `tests/` that reference deleted components:**
- `tests/browser-motion.test.tsx` — imports `ChatContainer`
- `tests/homepage-shell-ownership.test.tsx` — imports `ChatContainer`
- `tests/homepage-shell-layout.test.tsx` — queries `ChatContainer` data attributes
- `tests/browser-fab-chat-flow.test.tsx` — imports `FloatingChatShell`
- `tests/browser-fab-mobile-density.test.tsx` — imports `FloatingChatShell`
- `tests/shell-visual-system.test.tsx` — imports `FloatingChatHeader`
- `tests/helpers/homepageEvalHarness.ts` — queries `data-chat-container-mode="embedded"`

Each import must be updated to use `ChatSurface` or `ChatSurfaceHeader`.

---

## §8 Risks and Mitigations

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Missing import causes build failure | High | Run `grep` for all references to deleted files before deletion. Update all parents. |
| `FloatingChatFrame` internal header rendering creates double header | Medium | Task 4.4 explicitly removes `FloatingChatHeader` rendering and `onMinimize`/`onFullScreenToggle`/`conversationActions` props from `FloatingChatFrame` before `ChatSurface` is created. |
| `view-transition-name` conflict if both surfaces briefly coexist during navigation | Low | Same pathname check as before (`"/"` guard). View transitions only animate when the old element is removed and new appears. |
| Existing FAB tests fail due to changed component tree | High | Old tests are deleted and replaced by unified `ChatSurface` tests. Run full suite after migration. |
| `useChatSurfaceState` returns different shape when `contentProps` is added | Low | `contentProps` is additive — existing properties unchanged. Backward compatible. |

---

## §9 Feature Preservation Matrix

Verifying that every feature from both old containers exists in the new unified surface:

| Feature | ChatContainer (old) | FloatingChatShell (old) | ChatSurface (new) |
| --- | --- | --- | --- |
| Hero state with brand header | Yes (via `isHeroState`) | No | Yes — `mode="embedded"` |
| Suggestion chips | Yes | Yes | Yes — via `ChatContentSurface` |
| Message viewport | Yes | Yes | Yes — via `ChatContentSurface` |
| Chat input | Yes | Yes | Yes — via `ChatContentSurface` |
| Fullscreen toggle | No | Yes | Yes — `mode="floating"` |
| Minimize to LAB | No | Yes | Yes — `mode="floating"` |
| FAB launcher button | No | Yes | Yes — `mode="floating"` |
| `OPEN_GLOBAL_CHAT_EVENT` | No | Yes | Yes — `mode="floating"` |
| `viewTransitionName` | Yes | Yes (via Frame) | Yes — both modes |
| Safe-area CSS variables | No | Yes (via Frame) | Yes — via `FloatingChatFrame` |
| Glass-surface styling | No | Yes (via Frame) | Yes — via `FloatingChatFrame` |
| Route-aware suppression | N/A (homepage only) | Yes (hidden on "/") | Yes — floating returns null on "/" |
| Dynamic suggestions | Yes | Yes | Yes — via `ChatContentSurface` |
| Link/action routing | Yes | Yes | Yes — via `useChatSurfaceState` |

All features preserved. No gaps.

---

## §10 Definition of Done

1. `ChatSurface` component exists with `mode: "embedded" | "floating"` prop.
2. `ChatSurfaceHeader` renders mode-appropriate chrome.
3. Homepage renders `<ChatSurface mode="embedded" />`.
4. Layout renders `<ChatSurface mode="floating" />`.
5. `ChatContainer.tsx`, `FloatingChatShell.tsx`, `GlobalChat.tsx`, and `FloatingChatHeader.tsx` are deleted.
6. No references to deleted files remain in the codebase.
7. Hero state, FAB launcher, fullscreen toggle, minimize, and `OPEN_GLOBAL_CHAT_EVENT` all work.
8. `view-transition-name: "chat-container"` still animates between modes.
9. All 21 new tests pass.
10. Old container tests are deleted (14 tests across 4 files).
11. All remaining existing tests pass (no regressions).
12. TypeScript compiles clean. Build succeeds. Lint passes.
