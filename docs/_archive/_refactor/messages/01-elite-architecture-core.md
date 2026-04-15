# Core Implementation Guide: Tool Plugin Registry & Message Pipeline

**Date:** April 9, 2026 (revised)
**Prerequisite:** Specification in `elite-architecture-specification.md`; audit in `chat-architecture-audit.md`
**Objective:** Exact file paths, interfaces, code patterns, and migration steps for each sprint.

---

## 1. Directory Structure

New files live under `src/frameworks/ui/chat/`. This directory does not exist yet — it will be created in Sprint A.

```
src/frameworks/ui/chat/
├── registry/
│   ├── ToolPluginContext.tsx         # React Context + useToolPluginRegistry() hook
│   ├── default-tool-registry.ts     # Plain object mapping toolName → component
│   ├── tool-plugin-registry.test.tsx # Unit tests for registry lookup + fallback
├── plugins/
│   ├── system/
│   │   ├── JobStatusFallbackCard.tsx       # Extracted from current RichContentRenderer job-status block
│   │   ├── JobStatusFallbackCard.test.tsx
│   │   ├── ErrorCard.tsx                   # Sprint E — dedicated error state
│   ├── custom/
│   │   ├── ChartRendererCard.tsx           # Sprint C — generate_chart
│   │   ├── GraphRendererCard.tsx           # Sprint C — generate_graph
│   │   ├── AudioPlayerCard.tsx             # Sprint C — generate_audio
│   │   ├── WebSearchCard.tsx               # Sprint C — admin_web_search
│   │   ├── ThemeCustomizerCard.tsx         # Sprint D — set_theme, adjust_ui, inspect_theme
│   │   ├── ProfileCard.tsx                 # Sprint D — get_my_profile, update_my_profile
│   │   ├── ReferralQrCard.tsx              # Sprint D — get_my_referral_qr
│   │   ├── JournalWorkflowCard.tsx         # Sprint D — journal tools
│   │   └── [tool-name].test.tsx            # One test file per plugin
├── ToolPluginPartRenderer.tsx              # Wrapper component that calls useToolPluginRegistry()
├── ToolPluginPartRenderer.test.tsx
```

---

## 2. Interface Contracts

### 2.1 ToolPluginProps

Every plugin component implements this interface. It matches the existing `JobStatusMessagePart` shape from `src/core/entities/message-parts.ts`.

```tsx
// src/frameworks/ui/chat/registry/types.ts

import type { JobStatusMessagePart } from "@/core/entities/message-parts";
import type { ActionLinkType } from "@/core/entities/rich-content";

export interface ToolPluginProps {
  /** The raw job-status part from message.parts */
  part: JobStatusMessagePart;

  /** Action handler passed down from ChatSurface */
  onActionClick?: (
    actionType: ActionLinkType,
    value: string,
    params?: Record<string, string>,
  ) => void;

  /** True while the stream for this message is still open */
  isStreaming: boolean;
}

export type ToolComponent = React.ComponentType<ToolPluginProps>;
```

### 2.2 ToolPluginRegistry

The registry is a plain object — no class, no async resolution. Lookup is `O(1)`.

```tsx
// src/frameworks/ui/chat/registry/ToolPluginContext.tsx

import { createContext, useContext, type ReactNode } from "react";
import type { ToolComponent, ToolPluginProps } from "./types";
import { JobStatusFallbackCard } from "../plugins/system/JobStatusFallbackCard";

interface ToolPluginRegistry {
  getRenderer(toolName: string): ToolComponent;
}

const fallbackRegistry: ToolPluginRegistry = {
  getRenderer: () => JobStatusFallbackCard,
};

const ToolPluginRegistryContext = createContext<ToolPluginRegistry>(fallbackRegistry);

export function ToolPluginRegistryProvider({
  registry,
  children,
}: {
  registry: ToolPluginRegistry;
  children: ReactNode;
}) {
  return (
    <ToolPluginRegistryContext.Provider value={registry}>
      {children}
    </ToolPluginRegistryContext.Provider>
  );
}

export function useToolPluginRegistry(): ToolPluginRegistry {
  return useContext(ToolPluginRegistryContext);
}
```

Key decisions:
- `getRenderer` **always returns a component** — never `null`. Unknown tools resolve to `JobStatusFallbackCard`.
- The default context value IS the fallback registry, so the provider is optional during testing.
- No `useToolPlugin(toolName)` hook that embeds the lookup — see Section 3 for why.

### 2.3 Default Registry Builder

```tsx
// src/frameworks/ui/chat/registry/default-tool-registry.ts

import type { ToolComponent } from "./types";
import { JobStatusFallbackCard } from "../plugins/system/JobStatusFallbackCard";

// Sprint A: only the fallback
// Sprint C: add ChartRendererCard, GraphRendererCard, AudioPlayerCard, WebSearchCard
// Sprint D: add ThemeCustomizerCard, ProfileCard, ReferralQrCard, JournalWorkflowCard

const toolMap: Record<string, ToolComponent> = {
  // Sprint C additions go here:
  // "generate_chart": ChartRendererCard,
  // "generate_graph": GraphRendererCard,
  // "generate_audio": AudioPlayerCard,
  // "admin_web_search": WebSearchCard,
};

export function createDefaultToolRegistry() {
  return {
    getRenderer(toolName: string): ToolComponent {
      return toolMap[toolName] ?? JobStatusFallbackCard;
    },
  };
}
```

---

## 3. Hooks-in-Loops Prevention: ToolPluginPartRenderer

The original spec had this pattern inside `AssistantBubble`:

```tsx
// ❌ ILLEGAL — hooks called inside .map() violates Rules of Hooks
{message.parts.map((part) => {
  const Plugin = useToolPlugin(part.toolName); // hook inside loop
  return <Plugin key={part.jobId} part={part} />;
})}
```

The fix: a dedicated **wrapper component** that receives the part as a prop and calls the hook in its own component body.

```tsx
// src/frameworks/ui/chat/ToolPluginPartRenderer.tsx

import { useToolPluginRegistry } from "./registry/ToolPluginContext";
import type { ToolPluginProps } from "./registry/types";

/**
 * Wrapper component that resolves the correct plugin for a tool part.
 * Exists to keep the useToolPluginRegistry() call inside a component body,
 * not inside a .map() loop in AssistantBubble.
 */
export function ToolPluginPartRenderer({
  part,
  isStreaming,
  onActionClick,
}: ToolPluginProps) {
  const registry = useToolPluginRegistry();
  const Plugin = registry.getRenderer(part.toolName);
  return (
    <Plugin
      part={part}
      isStreaming={isStreaming}
      onActionClick={onActionClick}
    />
  );
}
```

Then `AssistantBubble` uses it cleanly:

```tsx
// Inside AssistantBubble — no hooks in loops
<ErrorBoundary name="AssistantBubblePlugins">
  {toolParts.map((part) => (
    <ToolPluginPartRenderer
      key={part.jobId}
      part={part}
      isStreaming={isStreaming}
      onActionClick={onActionClick}
    />
  ))}
</ErrorBoundary>
```

---

## 4. RichContentRenderer Static Allocation Fix (Sprint A)

Currently `blockRegistry` and `inlineRegistry` are defined inside the `RichContentRenderer` component body (lines ~30–80 of `src/frameworks/ui/RichContentRenderer.tsx`). They are plain objects with no dependency on props or state, but they're recreated on every render.

**Fix:** Hoist both to module scope.

```tsx
// src/frameworks/ui/RichContentRenderer.tsx — BEFORE (inside component)
function RichContentRenderer({ content, ... }) {
  const blockRegistry = { paragraph: ParagraphBlock, ... };
  const inlineRegistry = { text: TextInline, ... };
  // ...
}

// AFTER (module scope)
const blockRegistry = { paragraph: ParagraphBlock, ... };
const inlineRegistry = { text: TextInline, ... };

function RichContentRenderer({ content, ... }) {
  // Uses module-scope registries directly
}
```

This is safe because the registries are static mappings — no closures over props or state. It eliminates unnecessary object allocation on every render cycle.

---

## 5. Content-Visibility CSS (Sprint A)

Add to `src/app/styles/chat.css`:

```css
/* Performance: skip paint for off-screen messages */
[data-chat-message-role] {
  content-visibility: auto;
  contain-intrinsic-size: auto 120px;
}
```

This tells the browser to skip layout/paint for messages outside the viewport. Combined with the existing `data-chat-message-role` attributes on UserBubble and AssistantBubble wrappers, this is a zero-JS virtualization approach.

**Why 120px?** Average message height. The `auto` keyword lets the browser remember the real height after first paint, so scroll position stays accurate.

---

## 6. Layout Jitter Fix: @starting-style (Sprint A)

The suggestion chips that appear when streaming completes cause a layout shift. Use CSS `@starting-style` for entry animation:

```css
/* Suggestion container fade-in without layout jitter */
.suggestion-chips-container {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}

@starting-style {
  .suggestion-chips-container {
    opacity: 0;
    transform: translateY(4px);
  }
}
```

This replaces any need for framer-motion's `AnimatePresence` on this element. The browser handles the entry animation natively.

---

## 7. AssistantBubble Decomposition (Sprint B)

Current state: `AssistantBubble` in `MessageList.tsx` is one component with 7 conditional branches handling streaming, typewriter, rich content, attachments, status footer, toolbar, and action chips.

Target: three focused components.

### 7.1 AssistantBubbleContent

Owns the streaming state machine:
- If streaming + has text → `RichContentRenderer` with partial content
- If streaming + typewriter active → typewriter display
- If finalized → `RichContentRenderer` with full content
- Tool parts → `ToolPluginPartRenderer` (Sprint C wires this up)

### 7.2 AssistantBubbleFooter

Owns:
- Status display (pending/failed from Sprint 2's `data-chat-message-status`)
- `MessageToolbar` (copy, regenerate)
- `MessageActionChips` (suggestion follow-ups)

### 7.3 Typewriter Fix

Current: `setInterval(fn, 10)` — fires 100 times/second regardless of frame budget.

Replace with:

```tsx
useEffect(() => {
  if (!isTypewriting) return;

  let frameId: number;
  let charIndex = 0;

  function step() {
    charIndex += CHARS_PER_FRAME; // e.g. 2–3
    setDisplayedLength(Math.min(charIndex, fullLength));
    if (charIndex < fullLength) {
      frameId = requestAnimationFrame(step);
    }
  }

  frameId = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frameId);
}, [isTypewriting, fullLength]);
```

This aligns with the display refresh rate (typically 60fps) and naturally pauses when the tab is backgrounded.

---

## 8. ConversationMessages Extraction (Sprint B)

Extract pure functions from the `chatState.ts` reducer into `src/core/services/ConversationMessages.ts`.

Current reducer pattern (inside `chatState.ts`):
```tsx
case "UPSERT_JOB_STATUS": {
  const idx = state.messages.findIndex(m => m.id === action.messageId);
  if (idx === -1) return state;
  const msg = { ...state.messages[idx] };
  const partIdx = msg.parts.findIndex(p => p.jobId === action.jobId);
  // ... 15 lines of array mutation logic
  return { ...state, messages: newMessages };
}
```

Target pattern:
```tsx
// src/core/services/ConversationMessages.ts
export function upsertJobStatus(
  messages: readonly ChatMessage[],
  messageId: string,
  jobId: string,
  update: Partial<JobStatusMessagePart>,
): ChatMessage[] {
  // Pure function: takes messages, returns new array
}

// chatState.ts reducer — one-liner delegation
case "UPSERT_JOB_STATUS":
  return { ...state, messages: upsertJobStatus(state.messages, action.messageId, action.jobId, action.update) };
```

This makes the array mutation logic independently testable without needing to construct full reducer state.

---

## 9. ChatPresenter Tool Migration (Sprint C–D)

### Migration Protocol (per tool)

1. **Create plugin component** in `src/frameworks/ui/chat/plugins/custom/[ToolName]Card.tsx` implementing `ToolPluginProps`.
2. **Register in `default-tool-registry.ts`** — add entry to `toolMap`.
3. **Remove the `case` branch** from `ChatPresenter.present()` that converts that tool's result into `RichContent` blocks.
4. **Update `ChatPresenter.test.ts`** — verify the tool result stays in `message.parts` (not converted to blocks).
5. **Add plugin unit test** — verify the component renders correctly given a `JobStatusMessagePart`.

### What remains in ChatPresenter after Sprint D

- `present()` still converts `message.content` (markdown text) into `RichContent` AST for `RichContentRenderer`.
- `present()` no longer touches `message.parts` — they pass through as-is.
- Line count drops from ~1 250 to ~600.

---

## 10. Config Externalization (Sprint D)

### Current State

`CHAT_BOOTSTRAP_COPY` in `chatState.ts` has 5 role variants:
- **ANONYMOUS** — partially config-driven via `InstanceConfigContext.tsx` / `useInstancePrompts()`
- **AUTHENTICATED**, **APPRENTICE**, **STAFF**, **ADMIN** — hardcoded strings

### Target State

All 5 role greetings should follow the ANONYMOUS pattern: loaded from config, not hardcoded.

```tsx
// src/lib/config/defaults.ts (or wherever bootstrap config lives)
export const CHAT_BOOTSTRAP_CONFIG: Record<UserRole, BootstrapCopy> = {
  ANONYMOUS: { ... },       // already in InstanceConfigContext
  AUTHENTICATED: { ... },   // move from chatState.ts
  APPRENTICE: { ... },      // move from chatState.ts
  STAFF: { ... },           // move from chatState.ts
  ADMIN: { ... },           // move from chatState.ts
};
```

`InstanceConfigContext` grows to provide bootstrap copy for all roles, and `chatState.ts` consumes it instead of owning the strings.

---

## 11. Animation Strategy: CSS-Only

**No framer-motion.** The project has zero animation library dependencies and should stay that way.

| Animation Need | CSS Solution |
|---|---|
| Entry animation for suggestion chips | `@starting-style` (Sprint A) |
| Message appearance | `@starting-style` + `opacity`/`transform` transition |
| Content-visibility paint skipping | `content-visibility: auto` (Sprint A) |
| Smooth height changes on stream finalization | View Transitions API (`document.startViewTransition()`) where supported, graceful degradation to instant |
| Typewriter character reveal | `requestAnimationFrame` loop (Sprint B) — not CSS, but not a library either |

View Transitions API usage (Sprint E):

```tsx
function finalizeStream() {
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      setStreamFinalized(true);
    });
  } else {
    setStreamFinalized(true);
  }
}
```

This gives smooth height interpolation from typing-indicator → suggestion-chips on browsers that support it, and instant swap on others.
