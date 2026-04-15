# Architecture Specification: Message Rendering Pipeline & Tool Plugin Registry

**Date:** April 9, 2026 (revised)
**Prerequisite:** Chat Composer Sprints 0–2 complete (3 108 tests passing)
**Objective:** Decompose the message rendering monolith into an IoC-driven plugin system, add CSS-native performance optimizations, and complete the config externalization — all in safe, incremental sprints that never break the existing 393-file test suite.

---

## 1. Architectural Vision

The chat system currently forces all tool output — charts, graphs, audio, web-search, theme inspection, profile cards, journal workflows — through a single `ChatPresenter.present()` method that converts everything into `RichContent` AST blocks. This means:

- Adding a new MCP tool requires editing `ChatPresenter.ts` (adapter layer) AND `RichContentRenderer.tsx` (UI layer) — two files in different architectural layers.
- The `present()` method is ~1 250 lines with a 13-tool `switch` statement.
- `RichContent` conflates typography (markdown → blocks) with tool-result rendering.

The target architecture inverts this:

- **Typography** stays in `ChatPresenter` + `RichContentRenderer` (markdown → blocks → React).
- **Tool output** stays in `message.parts` as structured data. A `ToolPluginRegistry` maps `toolName → React.ComponentType<ToolPluginProps>`, and the UI iterates parts → looks up registry → renders plugin or fallback.
- **New tool = one file** (the plugin component + registry entry). No changes to the presenter or renderer.

This is not a rewrite. It's a controlled extraction that removes code from `ChatPresenter.ts` and distributes it into focused plugin components, one tool at a time.

---

## 2. Sprint Plan

### Prerequisites & Constraints

- Every sprint must leave all 393+ test files green.
- No new runtime dependencies (no framer-motion, no react-spring). Animation uses CSS (`content-visibility`, `@starting-style`, View Transitions API, `requestAnimationFrame`).
- Backward compatibility: any tool that lacks a registered plugin falls back to the current `JobStatusCard` rendering. The migration is gradual.
- Each sprint is independently shippable.

### Sprint A — Foundation: Registry, Performance CSS, Quick Wins

**Goal:** Ship the plugin registry skeleton, apply zero-JS performance fixes, and hoist static allocations. Low risk, high impact.

| Task | File(s) | Change |
|---|---|---|
| A.1 | `src/frameworks/ui/chat/registry/ToolPluginContext.tsx` (new) | Create `ToolPluginRegistry` context + `useToolPlugin(toolName)` hook |
| A.2 | `src/frameworks/ui/chat/registry/default-tool-registry.ts` (new) | Register `JobStatusFallbackCard` as the universal default |
| A.3 | `src/frameworks/ui/chat/plugins/system/JobStatusFallbackCard.tsx` (new) | Extract existing job-status block from `RichContentRenderer` into standalone component implementing `ToolPluginProps` |
| A.4 | `src/frameworks/ui/RichContentRenderer.tsx` | Hoist `blockRegistry` and `inlineRegistry` to module scope (currently re-created every render) |
| A.5 | `src/app/styles/chat.css` | Add `content-visibility: auto; contain-intrinsic-size: auto 120px;` to message wrappers (`[data-chat-message-role]`) |
| A.6 | `src/app/styles/chat.css` | Add `@starting-style` transition on suggestion container to prevent layout jitter on stream completion |
| A.7 | Tests | `tool-plugin-registry.test.tsx`, `job-status-fallback-card.test.tsx` |

**Exit criteria:** Registry context exists, all current rendering unchanged, `content-visibility` applied, no test regressions.

### Sprint B — UI Decomposition: AssistantBubble + Reducer Extraction

**Goal:** Break `AssistantBubble` into focused sub-components and extract domain logic from the reducer.

| Task | File(s) | Change |
|---|---|---|
| B.1 | `src/frameworks/ui/MessageList.tsx` | Extract `AssistantBubbleContent` component — owns the streaming/typewriter/richcontent branching |
| B.2 | `src/frameworks/ui/MessageList.tsx` | Extract `AssistantBubbleFooter` component — owns the status footer, toolbar, action chips |
| B.3 | `src/frameworks/ui/MessageList.tsx` | Replace `setInterval(fn, 10)` typewriter with `requestAnimationFrame`-based stepping |
| B.4 | `src/core/services/ConversationMessages.ts` (new) | Extract `upsertJobStatusMessage`, `appendTextDelta`, `updateMessageAtIndex`, `appendPart` from `chatState.ts` into pure functions in a dedicated module |
| B.5 | `src/hooks/chat/chatState.ts` | Reducer delegates to `ConversationMessages` functions. Same behavior, thinner file. |
| B.6 | Tests | Existing `MessageList.test.tsx` passes unchanged; new `conversation-messages.test.ts` unit tests |

**Exit criteria:** `MessageList.tsx` drops from 591 to ~400 lines. `chatState.ts` reducer cases are one-liners delegating to `ConversationMessages`. Typewriter uses rAF.

### Sprint C — Plugin Migration: First Tool Extractions

**Goal:** Migrate the first tools out of `ChatPresenter` into the plugin registry, proving the pattern works end-to-end.

| Task | File(s) | Change |
|---|---|---|
| C.1 | `src/frameworks/ui/chat/plugins/custom/ChartRendererCard.tsx` (new) | Implement `ToolPluginProps` for `generate_chart` tool |
| C.2 | `src/frameworks/ui/chat/plugins/custom/GraphRendererCard.tsx` (new) | Implement `ToolPluginProps` for `generate_graph` tool |
| C.3 | `src/frameworks/ui/chat/plugins/custom/AudioPlayerCard.tsx` (new) | Implement `ToolPluginProps` for `generate_audio` tool |
| C.4 | `src/frameworks/ui/chat/plugins/custom/WebSearchCard.tsx` (new) | Implement `ToolPluginProps` for `admin_web_search` tool |
| C.5 | `src/frameworks/ui/chat/registry/default-tool-registry.ts` | Register `generate_chart → ChartRendererCard`, etc. |
| C.6 | `src/adapters/ChatPresenter.ts` | Remove the `case TOOL_NAMES.GENERATE_CHART`, `GENERATE_GRAPH`, `GENERATE_AUDIO`, `ADMIN_WEB_SEARCH` branches. These tools now resolve via the registry. |
| C.7 | `src/frameworks/ui/MessageList.tsx` | `AssistantBubble` iterates `message.parts` → for job-status parts, query the plugin registry → render plugin or fallback. Text parts still go through `RichContentRenderer`. |
| C.8 | Tests | Per-plugin test file + integration test verifying fallback for unknown tools |

**Exit criteria:** 4 tools render via registry. `ChatPresenter.present()` switch has 4 fewer cases. Adding a *new* tool requires only a plugin component + registry entry.

### Sprint D — Full Tool Migration & Config Completion

**Goal:** Migrate remaining tools, complete the config externalization.

| Task | File(s) | Change |
|---|---|---|
| D.1 | Plugin files (new) | `ThemeCustomizerCard` (`set_theme`, `adjust_ui`, `inspect_theme`), `ProfileCard` (`get_my_profile`, `update_my_profile`), `ReferralQrCard` (`get_my_referral_qr`), `JournalWorkflowCard` (`get_journal_workflow_summary`, `prepare_journal_post_for_publish`) |
| D.2 | `src/adapters/ChatPresenter.ts` | Remove remaining tool-specific `case` branches. The `switch` collapses to: `default → leave in parts`. |
| D.3 | `src/adapters/ChatPresenter.ts` | Remove `buildGenericToolResultBlocks`. Tool results stay in `message.parts`. |
| D.4 | `src/hooks/chat/chatState.ts` / `src/lib/config/defaults.ts` | Move `CHAT_BOOTSTRAP_COPY` for AUTHENTICATED, APPRENTICE, STAFF, ADMIN into `InstanceConfigContext` (matching the existing ANONYMOUS config pattern). |
| D.5 | Tests | Full plugin coverage, presenter audit test (no job-status blocks in RichContent), config-driven bootstrap tests |

**Exit criteria:** `ChatPresenter.present()` switch/case is gone. All tool rendering is registry-driven. All 5 role greetings are config-driven. `ChatPresenter.ts` drops from ~1 250 to ~600 lines.

### Sprint E — Performance Polish & Future-Proofing

**Goal:** Advanced CSS performance, accessibility, and DOM scaling.

| Task | File(s) | Change |
|---|---|---|
| E.1 | `src/frameworks/ui/MessageList.tsx` | Intersection Observer for lazy-loading images in `MessageAttachments` |
| E.2 | `chat.css` | View Transitions API for smooth height interpolation on stream finalization (typing indicator → suggestion chips) where supported |
| E.3 | `src/frameworks/ui/chat/plugins/system/ErrorCard.tsx` (new) | Dedicated error-state plugin replacing inline error rendering |
| E.4 | Performance test | Emit 500 mock messages, assert `content-visibility` paint-skipping via Playwright `getComputedStyle` |
| E.5 | Accessibility audit | Ensure all plugin cards have proper ARIA roles, labels, and keyboard navigation |

**Exit criteria:** Long conversations perform within budget on mobile. All plugin transitions are smooth. Full ARIA coverage.

---

## 3. Interface Contracts

### ToolPluginProps (every plugin implements this)

```tsx
import type { JobStatusMessagePart } from "@/core/entities/message-parts";
import type { ActionLinkType } from "@/core/entities/rich-content";

export interface ToolPluginProps {
  part: JobStatusMessagePart;
  onActionClick?: (actionType: ActionLinkType, value: string, params?: Record<string, string>) => void;
  isStreaming: boolean;
}
```

### ToolPluginRegistry

```tsx
type ToolComponent = React.ComponentType<ToolPluginProps>;

interface ToolPluginRegistry {
  getRenderer(toolName: string): ToolComponent;
}
```

`getRenderer` always returns a component — `JobStatusFallbackCard` when no custom plugin is registered. Never `null`.

### ToolPluginWrapper (renders individual parts — avoids hooks-in-loops)

```tsx
function ToolPluginPartRenderer({ part, isStreaming, onActionClick }: ToolPluginProps) {
  const registry = useToolPluginRegistry();
  const Plugin = registry.getRenderer(part.toolName);
  return <Plugin part={part} isStreaming={isStreaming} onActionClick={onActionClick} />;
}
```

> **Critical:** The registry lookup must happen inside a component (not inside `.map()`). This avoids the React hooks-in-loops rule violation. `AssistantBubble` maps parts → renders `<ToolPluginPartRenderer>` per part.

---

## 4. Migration Safety

### Backward Compatibility Protocol

Every tool that has not yet been migrated to a plugin continues to work via the existing `ChatPresenter` → `RichContent` → `blockRegistry` path. The migration order (Sprint C then D) allows each tool to be moved independently, tested, and shipped without affecting others.

### Presenter Shrink Tracking

| Sprint | `ChatPresenter.ts` lines | Tool cases in switch | Tools via registry |
|---|---|---|---|
| Before Sprint A | ~1 250 | 13 + default | 0 |
| After Sprint A | ~1 250 | 13 + default | 0 (registry exists, not wired) |
| After Sprint C | ~1 050 | 9 + default | 4 |
| After Sprint D | ~600 | 0 (removed) | 13+ |

### Risk Mitigations

| Risk | Mitigation |
|---|---|
| New dependency (framer-motion) bloats bundle | **Rejected.** All animation is CSS-only (`content-visibility`, `@starting-style`, View Transitions API, `requestAnimationFrame`). |
| Hooks called inside `.map()` loops | **Solved.** `ToolPluginPartRenderer` is a proper component — the hook call is in a component body, not a loop. |
| Tests break during migration | Each sprint has explicit exit criteria: full vitest suite + build + lint must pass before merge. |
| Plugin registry adds latency | Registry is a plain object lookup (`O(1)`). No async resolution, no lazy imports for core plugins. |
| `ChatPresenter` tests rely on specific block types | Adapter tests updated per sprint to assert tool results remain in `parts` instead of `blocks`. |

---

## 5. Deliverable Summary

| Sprint | New Files | Modified Files | Key Outcome |
|---|---|---|---|
| A | 4 (registry context, default registry, fallback card, tests) | 2 (`RichContentRenderer`, `chat.css`) | Registry skeleton, performance CSS |
| B | 1 (`ConversationMessages`) + tests | 2 (`MessageList`, `chatState`) | Decomposed bubble, thin reducer |
| C | 4 plugins + tests | 3 (`ChatPresenter`, `MessageList`, registry) | 4 tools via registry, pattern proven |
| D | 5 plugins + tests | 3 (`ChatPresenter`, `chatState`, config) | All tools via registry, config complete |
| E | 1 (`ErrorCard`) + perf test | 2 (`MessageList`, `chat.css`) | Performance + accessibility polish |

Total estimated: ~20 new files, ~10 modified files across 5 sprints.
