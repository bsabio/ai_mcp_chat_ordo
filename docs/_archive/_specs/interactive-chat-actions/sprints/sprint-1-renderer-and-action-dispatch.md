# Sprint 1 — Renderer And Action Dispatch

> **Goal:** Render action-link inline nodes in `RichContentRenderer`, render per-message action chips in `AssistantBubble`, build the action dispatch handler, and wire the `onActionClick` callback through `useChatSurfaceState`. Clicks dispatch correctly for all four action types.
> **Spec Sections:** `ICA-080` through `ICA-096`
> **Depends On:** Sprint 0 (type system and parser must be complete)

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/frameworks/ui/RichContentRenderer.tsx` | `RichContentRenderer: FC<{ content: RichContent; onLinkClick?: (slug: string) => void }>`. Uses `blockRegistry` and `inlineRegistry` record types keyed by node type. `InlineRenderer` iterates `InlineNode[]` and renders via registry. |
| `src/frameworks/ui/MessageList.tsx` | `MessageList: FC<MessageListProps>` with `onLinkClick: (slug: string) => void`. `AssistantBubble` renders `RichContentRenderer` inside bubble. `SuggestionChips` renders conversation-level chips. `makeMessage()` test helper creates `PresentedMessage` with all fields. |
| `src/frameworks/ui/useChatSurfaceState.tsx` | Hook returning `handleLinkClick`, `handleSuggestionClick`, `handleSend`, plus 22 other keys (input state, composer, messages). Uses `useGlobalChat()` (for `conversationId`, `isSending`, `sendMessage`), `useChatComposerController`, `usePresentedChatMessages`, `useUICommands`, `useRouter`. Does **not** currently call `useChatConversationSession` directly. |
| `src/frameworks/ui/RichContentRenderer.test.tsx` | 5 tests: paragraph, bold, library-link click, list, operator brief. Uses `render()` + `screen` from testing-library. |
| `src/frameworks/ui/MessageList.test.tsx` | Uses `makeMessage()` helper to build `PresentedMessage` fixtures. Tests filter behavior and suggestion chip rendering. |
| `src/adapters/ChatPresenter.ts` | (After Sprint 0) `PresentedMessage` includes `actions: MessageAction[]` field |
| `src/core/entities/rich-content.ts` | (After Sprint 0) `InlineNode` union includes `action-link` variant with `label`, `actionType`, `value`, `params?` |

---

## Tasks

### 1. Add `onActionClick` prop to `RichContentRenderer`

In `src/frameworks/ui/RichContentRenderer.tsx`:

- Extend `Props` interface:
  ```typescript
  interface Props {
    content: RichContent;
    onLinkClick?: (slug: string) => void;
    onActionClick?: (actionType: ActionLinkType, value: string, params?: Record<string, string>) => void;
  }
  ```
- Thread `onActionClick` through `BlockRenderer` and `InlineRenderer` components

Constraints:
- `onActionClick` is optional — existing callers that only pass `onLinkClick` continue working unchanged
- Import `ActionLinkType` from `rich-content.ts`

Verify: `npm run typecheck`

### 2. Add `action-link` to `inlineRegistry`

In `src/frameworks/ui/RichContentRenderer.tsx`:

- Add an `"action-link"` entry to `inlineRegistry`:
  ```typescript
  "action-link": ({ node, onActionClick }) => (
    <button
      onClick={() => onActionClick?.(node.actionType, node.value, node.params)}
      className="inline-flex items-center gap-1 font-semibold text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:text-accent/80 hover:decoration-accent/50 focus-ring rounded-sm"
      data-chat-action-link={node.actionType}
    >
      {node.label}
    </button>
  ),
  ```

Constraints:
- The button must be styled distinctly from library-link (which uses `link-accent` class) — action links use underline + accent color to signal "this does something"
- Must emit `data-chat-action-link` attribute for test selection
- Must not navigate away — it dispatches via callback

Verify: `npm exec vitest run src/frameworks/ui/RichContentRenderer.test.tsx`

### 3. Create `MessageActionChips` component

In `src/frameworks/ui/MessageList.tsx` (collocated with `SuggestionChips`):

- Add a new component `MessageActionChips`:
  ```typescript
  const MessageActionChips: React.FC<{
    actions: MessageAction[];
    onActionClick: (actionType: ActionLinkType, value: string, params?: Record<string, string>) => void;
    disabled?: boolean;
  }>
  ```
- Renders a row of chips styled similarly to `SuggestionChips` (followup variant) but with:
  - A small icon or visual indicator that these are actions, not questions
  - `data-chat-action-chip` attribute with the action type
  - Max 3 chips displayed (slice the array)
- Each chip resolves the primary value from a per-type key map: `{ conversation: "id", route: "path", send: "text", corpus: "slug" }`. It calls `onActionClick(action.action, action.params[ACTION_VALUE_KEY[action.action]] ?? "", action.params)` on click

Constraints:
- Visually distinguish action chips from suggestion chips: action chips use a filled/accent style; suggestion chips remain outline style
- Action chips appear inside the `AssistantBubble`, after the content but before the streaming cursor
- Suggestion chips remain outside the bubble, after the bubble

Verify: `npm exec vitest run src/frameworks/ui/MessageList.test.tsx`

### 4. Render `MessageActionChips` inside `AssistantBubble`

In `src/frameworks/ui/MessageList.tsx`:

- Add `onActionClick` to `AssistantBubble` props
- Add `onActionClick` to `MessageListProps`
- After the `RichContentRenderer` div inside `AssistantBubble`, render:
  ```typescript
  {message.actions.length > 0 && (
    <div className="mt-3 border-t border-border/40 pt-3">
      <MessageActionChips
        actions={message.actions}
        onActionClick={onActionClick}
        disabled={isStreaming}
      />
    </div>
  )}
  ```

Constraints:
- Action chips are disabled during streaming (same as suggestion chips disable during sending)
- Action chips render for every assistant message that has actions, not just the last one
- The existing suggestion chip rendering below the bubble is unchanged

Verify: `npm run typecheck`

### 5a. Expose `setConversationId` and `refreshConversation` via `useGlobalChat`

In `src/hooks/useGlobalChat.tsx`:

- Add `setConversationId` and `refreshConversation` to `ChatContextType`:
  ```typescript
  setConversationId: (id: string | null) => void;
  refreshConversation: (conversationIdOverride?: string | null) => Promise<void>;
  ```
- Add both to the Provider value object (they are already available inside `ChatProvider` from `useChatConversationSession`)

Constraints:
- `setConversationId` is already used internally (passed to `useChatSend`). This task only exposes it to external consumers.
- `refreshConversation` already accepts an optional `conversationIdOverride` parameter.
- Do not change the existing behavior of either function.

Verify: `npm run typecheck`

### 5b. Expose `setComposerText` from `useChatComposerController`

In `src/hooks/chat/useChatComposerController.ts`:

- Add a `setComposerText(text: string)` method that calls `composer.updateInput(text)` directly, bypassing mention processing (unlike `handleInputChange` which also triggers mention detection)
- Return `setComposerText` from the hook

In `src/frameworks/ui/useChatSurfaceState.tsx`:

- Destructure `setComposerText` from the `useChatComposerController` return value

Constraints:
- `setComposerText` is a pure text setter — no mention processing, no side effects beyond updating the input value
- The existing `handleInputChange` is unchanged

Verify: `npm run typecheck`

### 5c. Build `handleActionClick` in `useChatSurfaceState`

In `src/frameworks/ui/useChatSurfaceState.tsx`:

- Import `ActionLinkType` from `rich-content.ts`
- Add a new callback:
  ```typescript
  const { conversationId, setConversationId, refreshConversation } = useGlobalChat();
  // setComposerText from useChatComposerController (added in Task 5a)
  const handleActionClick = useCallback(
    (actionType: ActionLinkType, value: string, params?: Record<string, string>) => {
      switch (actionType) {
        case "conversation": {
          const targetId = value || params?.id;
          if (!targetId) break;
          // If user has an active conversation, confirm before switching
          if (conversationId && conversationId !== targetId) {
            if (!window.confirm("Switch to a different conversation? Your current thread will be saved.")) break;
          }
          setConversationId(targetId);
          refreshConversation(targetId);
          break;
        }
        case "route":
          if (value.startsWith("/")) router.push(value);
          break;
        case "send":
          // Pre-fill the composer for user review — do not auto-send
          setComposerText(value || params?.text || "");
          break;
        case "corpus":
          router.push(`/library/section/${value}`);
          break;
      }
    },
    [router, conversationId, setConversationId, refreshConversation, setComposerText],
  );
  ```
- Return `handleActionClick` from the hook
- Thread `handleActionClick` through the component tree to `MessageList` → `AssistantBubble` → `MessageActionChips` and `RichContentRenderer`

Constraints:
- Depends on Tasks 5a and 5b being complete — `setConversationId`/`refreshConversation` come from `useGlobalChat()`, `setComposerText` from the composer controller
- Route action validates path starts with `/` — external URLs are rejected (security: `ICA-121`)
- Send action pre-fills the composer via `setComposerText()` — does not auto-send. The user must review and explicitly submit.
- Conversation action uses `setConversationId` + `refreshConversation` from `useGlobalChat()` (exposed via Task 5a) — no new event infrastructure needed
- Mid-conversation switching: if the user has an active conversation different from the target, a `window.confirm()` dialog prevents accidental context loss. Current thread is auto-saved.

Verify: `npm run typecheck`

### 6. Wire `onActionClick` through `ChatContentSurface` and `ChatContainer`

The `onActionClick` callback from `useChatSurfaceState` must reach:
- `ChatContentSurface` → `ChatMessageViewport` → `MessageList` → `AssistantBubble` → `RichContentRenderer` (for inline action links)
- `ChatContentSurface` → `ChatMessageViewport` → `MessageList` → `AssistantBubble` → `MessageActionChips` (for per-message chips)

Add `onActionClick` prop to any intermediate components in the chain that don't already have it.

Constraints:
- Follow the same threading pattern used for `onLinkClick`
- Do not introduce context providers — use prop drilling consistent with existing pattern

Verify: `npm run typecheck && npm run build`

### 7. Update `makeMessage` test helper and add tests

In `src/frameworks/ui/MessageList.test.tsx`:

- Update `makeMessage()` to include `actions: overrides.actions ?? []`

In `src/frameworks/ui/RichContentRenderer.test.tsx`, add tests:

1. Action link renders as button with correct label text
2. Action link click calls `onActionClick` with correct actionType, value, params
3. Action link has `data-chat-action-link` attribute

In `src/frameworks/ui/MessageList.test.tsx`, add tests:

1. AssistantBubble renders `MessageActionChips` when message has actions
2. AssistantBubble does not render action chip region when message has no actions
3. Action chip click calls `onActionClick` with correct arguments
4. Action chips are disabled during streaming

---

## Test Matrix

### Positive Tests
- [x] Action link renders as `<button>` with label text
- [x] Action link click dispatches `onActionClick(actionType, value, params)`
- [x] Action link has `data-chat-action-link` attribute matching action type
- [x] Action link inside operator brief card is clickable
- [x] `MessageActionChips` renders chips for each action in array
- [x] Action chip click dispatches correct action type and params
- [x] Action chips appear inside the assistant bubble after content
- [x] Action chips limited to max 3 per message
- [x] `handleActionClick("route", "/dashboard")` calls `router.push`
- [x] `handleActionClick("send", "Draft offer")` pre-fills composer via `setComposerText`
- [x] `handleActionClick("conversation", "conv_001")` calls `setConversationId` + `refreshConversation`
- [x] `handleActionClick("corpus", "slug")` navigates to library section

### Negative Tests
- [x] `onActionClick` not provided → action link renders but click is no-op
- [x] `handleActionClick("route", "https://evil.com")` → no navigation (security)
- [x] `handleActionClick("send", ...)` pre-fills composer without sending
- [x] `handleActionClick("conversation", ...)` while in different active conversation → confirmation dialog
- [x] `handleActionClick("conversation", ...)` user declines confirmation → no switch
- [x] `handleActionClick("conversation", "")` with empty ID → no-op
- [x] Message with empty actions array → no action chip region rendered
- [x] Action chips disabled during streaming → clicks are no-ops

### Edge Cases
- [x] Multiple action links in same paragraph
- [x] Action link adjacent to library-link in same sentence
- [x] Message with 5 actions → only first 3 chips rendered
- [x] Action link inside a list item, heading, or blockquote

---

## Completion Checklist

- [x] `setConversationId` and `refreshConversation` added to `ChatContextType` and Provider value
- [x] `setComposerText` exposed from `useChatComposerController`
- [x] `RichContentRenderer` accepts and threads `onActionClick` prop
- [x] `action-link` entry added to `inlineRegistry`
- [x] `MessageActionChips` component renders inside `AssistantBubble`
- [x] `handleActionClick` dispatches all four action types correctly
- [x] `useChatSurfaceState` returns `handleActionClick`
- [x] `onActionClick` threaded through `ChatContentSurface` → `MessageList` → bubbles
- [x] `makeMessage()` test helper includes `actions` field
- [x] RichContentRenderer tests pass (existing 5 + new 7 = 12)
- [x] MessageList tests pass (existing 13 + new 5 = 18)
- [x] useChatSurfaceState handleActionClick tests pass (9)
- [x] `npm run typecheck` clean
- [x] `npm run build` succeeds

> **Known gap:** Action link buttons have no `aria-label` until Sprint 3 Task 4 adds them. Between Sprint 1 and Sprint 3, screen readers will read only the label text without action-type context.

---

## QA Deviations

- Used `fireEvent.click` from `@testing-library/react` instead of `userEvent.setup().click()` from `@testing-library/user-event` because the latter is not installed as a project dependency. Click dispatch behavior is equivalent for these synchronous button handlers.

---

## Verification Results

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Clean — no errors |
| `vitest run RichContentRenderer.test.tsx` | 12/12 passed |
| `vitest run MessageList.test.tsx` | 18/18 passed |
| `vitest run useChatSurfaceState.test.tsx` | 9/9 passed |
| Full suite (`npx vitest run`) | 1038/1038 passed (1 Playwright file skipped — pre-existing) |
| `npm run build` | Success — all routes built |
| Test matrix | 20/20 positive + negative, 4/4 edge cases |

---

## Verification

```bash
npm exec vitest run src/frameworks/ui/RichContentRenderer.test.tsx
npm exec vitest run src/frameworks/ui/MessageList.test.tsx
npm run typecheck
npm run build
```
