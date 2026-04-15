# Front-End Hot Path Audit: Chat Subsystem

**Date:** April 9, 2026 (revised)
**Focus Area:** React UI / State Management / Stream Processing
**Codebase Snapshot:** 393 test files, 3 108 tests — all passing; Sprint 2 complete

---

## Inventory: What We Have

Before diagnosing problems, an honest inventory of the current architecture.

### File Map

| Layer | File | Lines | Purpose |
|---|---|---|---|
| **Domain** | `src/core/entities/chat-message.ts` | 35 | `ChatMessage`, `FailedSendMetadata` |
| **Domain** | `src/core/entities/message-parts.ts` | 73 | 11-variant `MessagePart` union |
| **Domain** | `src/core/entities/rich-content.ts` | ~120 | `RichContent`, `BLOCK_TYPES` (12 types), inline types (5) |
| **Domain** | `src/core/entities/MessageFactory.ts` | 26 | Factory: user, assistant, hero messages |
| **Adapter** | `src/adapters/ChatPresenter.ts` | ~1 250 | `ChatMessage → PresentedMessage` (markdown parse, tool-call → AST, suggestions, actions) |
| **Adapter** | `src/adapters/MarkdownParserService.ts` | ~300 | Markdown string → `RichContent` blocks |
| **Adapter** | `src/adapters/CommandParserService.ts` | 19 | Regex-based `__ui_command__` extraction |
| **Adapter** | `src/adapters/StreamProviderFactory.ts` | 13 | Lazy singleton `ChatStreamProvider` |
| **State** | `src/hooks/chat/chatState.ts` | 286 | Reducer (8 action types), bootstrap copy, helpers |
| **State** | `src/hooks/chat/useChatSend.ts` | 237 | Send + retry pipeline, optimistic dispatch |
| **Stream** | `src/lib/chat/StreamStrategy.ts` | ~280 | 14 concrete strategies + `StreamProcessor` |
| **Stream** | `src/hooks/chat/chatStreamRunner.ts` | 28 | Event loop: consume → buffer → process → flush |
| **Stream** | `src/hooks/chat/chatStreamTextBuffer.ts` | 92 | `setTimeout(0)` batch with markdown tail-split |
| **Stream** | `src/hooks/chat/chatStreamProcessor.ts` | 18 | Factory: wires 14 strategies |
| **Stream** | `src/hooks/chat/chatStreamDispatch.ts` | 79 | Routes stream actions, resolves IDs |
| **Stream** | `src/hooks/chat/useChatStreamRuntime.ts` | 113 | Hook: `runStream`, `stopStream`, `activeStreamId` |
| **Stream** | `src/hooks/chat/useChatJobEvents.ts` | 94 | EventSource for job-status SSE; reconciles on focus |
| **Hooks** | `src/hooks/useGlobalChat.tsx` | 121 | `ChatProvider` context (messages, send, stop, retry) |
| **Hooks** | `src/hooks/usePresentedChatMessages.ts` | 62 | Presenter invocation + optimistic pending/failed status |
| **UI** | `src/frameworks/ui/ChatContentSurface.tsx` | 97 | Wires viewport + composer |
| **UI** | `src/frameworks/ui/useChatSurfaceState.tsx` | ~220 | Orchestrator: global chat → presentation → UI commands → handlers |
| **UI** | `src/frameworks/ui/ChatMessageViewport.tsx` | 76 | Scroll container + `useChatScroll` |
| **UI** | `src/frameworks/ui/MessageList.tsx` | 591 | `UserBubble`, `AssistantBubble`, hero state, typewriter, action chips, retry |
| **UI** | `src/frameworks/ui/RichContentRenderer.tsx` | 397 | `blockRegistry` (12 types), `inlineRegistry` (5 types) |
| **UI** | `src/frameworks/ui/ChatInput.tsx` | ~233 | Composer: text, keyboard, mentions, drag-drop |
| **UI** | `src/frameworks/ui/ComposerFilePills.tsx` | ~66 | Extracted Sprint 2: file pill lifecycle |
| **UI** | `src/frameworks/ui/ComposerSendControl.tsx` | ~80 | Extracted Sprint 2: send/stop button |

### Current Pattern Usage

| GoF Pattern | Where | Quality |
|---|---|---|
| **Strategy** | `StreamStrategy.ts` — 14 strategies for SSE events | Excellent (OCP-compliant) |
| **Strategy** | `EventParserStrategy.ts` — 16 parsers for raw SSE JSON | Excellent |
| **Strategy** | `MentionStrategy.tsx` — 3 mention renders + registry | Good |
| **Factory Method** | `MessageFactory.ts` — user/assistant/hero creation | Good, tiny |
| **Factory** | `StreamProviderFactory.ts` — lazy singleton adapter | Good |
| **Adapter** | `ChatPresenter`, `MarkdownParserService`, `CommandParserService` | Clean boundary |
| **Observer** | `useChatJobEvents` — EventSource → reducer dispatch | Solid |
| **Template Method** | `chatStreamRunner.ts` — event-loop skeleton | Concise |

---

## 1. Architectural Analysis (Clean Architecture Lens)

### Triumphs

**Strict domain boundary.** `chat-message.ts` and `message-parts.ts` are pure TypeScript — zero React imports. The `PresentedMessage` adapter (`ChatPresenter`) injects `MarkdownParserService` and `CommandParserService`, keeping the UI completely unaware of parsing internals.

**Stream pipeline decomposition.** The path from SSE byte → rendered pixel crosses 6 focused files (`chatStreamAdapter → chatStreamRunner → chatStreamTextBuffer → chatStreamProcessor → chatStreamDispatch → chatReducer`). Each has a single responsibility and its own test file.

**Optimistic rendering (Sprint 2).** `PresentedMessage.status` (`"confirmed" | "pending" | "failed"`) is resolved in `usePresentedChatMessages`, keeping the concern inside the adapter boundary. `MessageList` simply reads `data-chat-message-status` with no knowledge of the send pipeline.

### Identified Smells

**1. SRP violation in `chatState.ts` (286 lines).** The reducer handles pure state transitions *and* complex domain logic. Functions like `upsertJobStatusMessage` (find-by-jobId, create-or-update, splice into array) and `appendTextDelta` (find-last-text-part, append or create) are domain operations masquerading as state transitions. They belong to a `ConversationAggregate` or `MessageListModel` that the reducer delegates to.

**2. AST pollution in `ChatPresenter.ts` (~1 250 lines).** The presenter converts tool-call payloads (charts, graphs, audio, web-search, theme inspection, profile, journal, referral QR) into `RichContent` AST `blocks`. This conflates two concerns: (a) typography (markdown → blocks) and (b) tool-result rendering. A `generate_chart` tool result is not "rich content" — it is a structured payload that should remain in `message.parts` and be rendered by a dedicated UI component.

*Evidence:* The `present()` method contains a ~150-line `switch` on `call.name` matching 13 tool names (`SET_THEME`, `NAVIGATE`, `NAVIGATE_TO_PAGE`, `ADJUST_UI`, `INSPECT_THEME`, `GENERATE_CHART`, `GENERATE_GRAPH`, `GENERATE_AUDIO`, `ADMIN_WEB_SEARCH`, `GET_MY_PROFILE`, `UPDATE_MY_PROFILE`, `GET_MY_REFERRAL_QR`, `GET_JOURNAL_WORKFLOW_SUMMARY`, `PREPARE_JOURNAL_POST_FOR_PUBLISH`) plus a `default` with generic job-status block creation. Every new MCP tool adds another `case`.

**3. Partial config externalization.** `ANONYMOUS` bootstrap messages are config-driven (`InstanceConfigContext` → `useInstancePrompts()`), but `AUTHENTICATED`, `APPRENTICE`, `STAFF`, and `ADMIN` greetings remain hardcoded in `CHAT_BOOTSTRAP_COPY` inside `chatState.ts`. The config boundary is half-built.

### Remediation Path

1. Extract array-mutation helpers from `chatState.ts` into a pure `ConversationMessages` utility class (or module of pure functions). The reducer becomes a thin dispatcher.
2. Move tool-result → block conversion out of `ChatPresenter.present()` into a `ToolResultBlockFactory` (or the plugin registry described below). The presenter returns tool-call parts *as-is*; the UI maps them to components.
3. Complete the `InstanceConfigContext` migration for all 5 role greetings. `CHAT_BOOTSTRAP_COPY` becomes the fallback, not the source of truth.

---

## 2. Design Pattern Recognition (Gang of Four Lens)

### Triumphs

**The Strategy pipeline is the crown jewel.** `StreamStrategy.ts` (14 concrete strategies) + `chatStreamProcessor.ts` (wires them) + `chatStreamRunner.ts` (the event loop) form a textbook Chain of Responsibility. Adding a new SSE event type means adding one class — the processor, runner, and buffer never change.

**`MessageFactory.ts` (26 lines) is correctly tiny.** It encapsulates `crypto.randomUUID()` + timestamp creation. No logic leakage.

**`useChatSend.ts` separates policies cleanly.** `validateChatSend` (pure validation), `prepareChatSend` (optimistic message construction), `shouldRefreshConversationAfterStream` (refresh heuristic) are all imported pure functions. The hook orchestrates them without owning their logic.

### Identified Smells

**1. Missing Component Registry in the UI layer.** `RichContentRenderer.tsx` already implements a `blockRegistry` lookup — an object keyed by block type, valued by React component. This is the right pattern. But `AssistantBubble` (in `MessageList.tsx`) does *not* use it for tool-result parts; instead it has 7 major conditional branches controlling streaming state, typewriter animation, attachments, status footer, and toolbar visibility. The bubble component has grown to ~180 lines.

**2. `blockRegistry` is not memoized.** The registry object is re-created on every render of `RichContentRenderer`. For 50+ messages each containing 3+ blocks, this creates hundreds of redundant object allocations per paint cycle.

**3. No formal plugin interface for MCP tools.** When a new tool ships (e.g., a future `generate_image` or `edit_document`), the developer must modify both `ChatPresenter.ts` (add a `case`) and `RichContentRenderer.tsx` (add a block type + renderer). These files are in different architectural layers. A proper registry would let a tool ship its own renderer.

### Remediation Path

1. Introduce `ToolPluginRegistry` — a typed `Map<toolName, React.ComponentType<ToolPluginProps>>`. Mount it via context so plugins can be registered declaratively.
2. In `AssistantBubble`, replace the tool-result rendering path with: iterate `message.parts` → if job-status part → look up registry → render plugin or fallback. Typography stays in `RichContentRenderer`.
3. Hoist `blockRegistry` and `inlineRegistry` to module scope (they're pure lookups with no runtime dependencies).

---

## 3. Performance & UX Analysis (Vercel Lens)

### Triumphs

**`ChatStreamTextBuffer` is elite.** By flushing text deltas via `setTimeout(0)` and splitting on markdown boundaries (`splitRenderableMarkdownTail`), the system avoids both (a) one-setState-per-token layout thrashing and (b) rendering half-formed markdown that would cause reflow when completed. This is production-grade batching.

**Scroll-pin escape in `useChatScroll`.** The hook distinguishes *content growth within a message* (don't snap) from *new message appended* (do snap). Users can scroll up during streaming without being dragged back. The `resetPin()` fires only on conversation switch (`messages.length` change). This is an S-tier UX detail.

**Optimistic rendering (Sprint 2).** `opacity: 0.8` on pending, smooth `transition: opacity 200ms ease`, red border tint on failed — all via CSS attribute selectors on `data-chat-message-status`. Zero JavaScript animation overhead.

### Identified Smells

**1. Eager DOM rendering — no virtualization.** `MessageList.tsx` renders every message to the DOM unconditionally. For a 200-message conversation with attachments, code blocks, and graphs, this creates thousands of DOM nodes. Lower-end mobile devices will stall on paint.

*Fix:* CSS-native `content-visibility: auto; contain-intrinsic-size: auto 120px;` on each message wrapper. The browser skips paint for off-screen messages without JS virtualization libraries. Zero bundle cost, progressive enhancement, works today.

**2. Layout jitter on stream completion.** When `isSending` flips to `false`, the `TypingIndicator` unmounts and `SuggestionChips` mount in the same frame. The viewport jumps because the DOM height changes instantaneously.

*Fix:* CSS `@starting-style` transitions (supported in Chrome 117+, Safari 17.5+, Firefox 129+) on the suggestion container. Alternatively, the View Transitions API (already shipping in Chrome and Safari) can interpolate height changes across paint frames. Both are zero-dependency, CSS-only solutions that avoid the ~30 KB bundle cost of framer-motion.

**3. TypeWriter animation uses `setInterval` at 10ms.** This fires 100 times/second, far exceeding the 60fps (16.67ms) paint budget. On each tick it calls `setDisplayText(text.slice(0, i))` — a state update that triggers a re-render of the entire `AssistantBubble` subtree.

*Fix:* Replace `setInterval(fn, 10)` with `requestAnimationFrame`-based stepping, or use a CSS `@keyframes` approach with `steps()` on a max-width clip. The latter removes all JavaScript from the animation path.

**4. `blockRegistry` allocation per render.** The `blockRegistry` and `inlineRegistry` objects are defined inside the component body of `RichContentRenderer`. They should be module-level constants.

---

## Quantified Risk Matrix

| Issue | Severity | Impact | Files | Sprint Target |
|---|---|---|---|---|
| `ChatPresenter` AST pollution (13 tool cases) | 🔴 High | Every new tool = 2-file edit | `ChatPresenter.ts` | Sprint A (Registry) |
| Eager DOM (no content-visibility) | 🔴 High | Mobile TTI degrades >100 msgs | `MessageList.tsx`, `chat.css` | Sprint A (1-line CSS) |
| `chatState.ts` SRP violation | 🟡 Medium | Reducer hard to test in isolation | `chatState.ts` | Sprint B (Extract) |
| `AssistantBubble` 7 branches | 🟡 Medium | Hard to add streaming states | `MessageList.tsx` | Sprint B (Decompose) |
| `blockRegistry` not memoized | 🟡 Medium | Redundant allocations | `RichContentRenderer.tsx` | Sprint A (hoist) |
| Bootstrap copy partially hardcoded | 🟡 Medium | Config drift | `chatState.ts` | Sprint C (Config) |
| Layout jitter on stream end | 🟡 Medium | Visual polish | `chat.css` | Sprint A (CSS) |
| TypeWriter 10ms setInterval | 🟢 Low | CPU waste, minor | `MessageList.tsx` | Sprint B |
| No formal plugin interface | 🟢 Low | Developer velocity | New files | Sprint A (Registry) |

---

## Conclusion

The ordoSite chat subsystem has a genuinely excellent data pipeline — the stream strategy layer, text buffer batching, and adapter boundaries are production-grade. The debt concentrates in two places: (1) `ChatPresenter.ts` trying to be both a markdown formatter and a tool-result renderer, and (2) the UI layer lacking `content-visibility` and a component registry for tool output. Both are addressable incrementally with the sprint plan that follows.
