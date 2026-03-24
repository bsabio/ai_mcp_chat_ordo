# Interactive Chat Actions — Action Links, Message Chips, and Shorter Messages

> **Status:** Draft
> **Date:** 2026-03-21
> **Scope:** Extend the chat message pipeline with inline action links and per-message action chips so the AI can emit clickable, executable affordances instead of prose instructions. Shorten assistant output by replacing verbal action descriptions with interactive controls.
> **Dependencies:** [FAB Shell Refactor](../fab-shell-refactor/spec.md) (complete), [Tool Architecture](../tool-architecture/spec.md) (complete), [Chat Experience](../chat-experience/spec.md) (complete), [Dashboard AI Action Workspace](../dashboard-ai-action-workspace/spec.md) (complete)
> **Affects:** `src/core/entities/rich-content.ts`, `src/adapters/MarkdownParserService.ts`, `src/adapters/ChatPresenter.ts`, `src/frameworks/ui/RichContentRenderer.tsx`, `src/frameworks/ui/MessageList.tsx`, `src/frameworks/ui/useChatSurfaceState.tsx`, `src/lib/corpus-config.ts`, related tests
> **Motivation:** The AI currently uses prose to describe actions the user should take — "Open her conversation at conversationId=conv_seed_rev, then send a scoped advisory offer and propose a working session." Users should be able to click a name to open the entity and click a chip to execute the next step. Shorter messages with interactive affordances replace longer messages with verbal instructions.
> **Requirement IDs:** `ICA-010` through `ICA-199`
> **Historical note (2026-03-24):** This spec still references dashboard-era action flows because those were the source scenarios when ICA work landed. The active runtime is now chat-first and operator-owned; legacy dashboard references in this family should be read as historical origin context, not as a live `src/lib/dashboard/` implementation boundary.

---

## 1. Problem Statement

### 1.1 Context

The chat system renders assistant messages as rich markdown with support for bold, code, library links (`[[slug]]`), operator briefs (NOW/NEXT/WAIT cards), audio, charts, web search results, and conversation-level suggestion chips. The AI is instructed to be brief and lead with the answer.

Despite this, the AI routinely produces long messages when the response involves actionable entities — leads, conversations, training paths, dashboard blocks — because the only way to reference these entities is with plain text. The AI writes out full instructions ("Open her conversation at conversationId=conv_seed_rev") because there is no inline action syntax it can use instead.

### 1.2 Verified Issues

1. **Entity names are dead text.** Names like "Morgan Lee" or "Avery Chen" appear as bold text in operator briefs. They should be clickable links that open the relevant conversation or lead. `[ICA-010]`
2. **Action instructions are prose paragraphs.** The AI writes multi-sentence instructions describing what to do next. These should be clickable chips that execute the action. `[ICA-011]`
3. **Conversation references are unlinked.** The AI mentions conversationId values as plain text. Clicking a conversation reference should open that conversation. `[ICA-012]`
4. **Suggestions exist only at conversation level.** The `__suggestions__` tag produces chips below the last assistant message only. Individual messages in a multi-turn thread have no per-message CTAs. `[ICA-013]`
5. **Messages are too long.** Because the AI must describe actions verbally, operator brief cards and triage responses run 3-5x longer than necessary. `[ICA-014]`
6. **The existing `[[slug]]` library-link syntax** proves inline interactive affordances work in this pipeline — but it only supports corpus navigation, not conversations, leads, routes, or arbitrary actions. `[ICA-015]`

### 1.3 Root Cause

The rich content type system has exactly one interactive inline type (`library-link`) and one interactive message-level feature (`suggestions`). Both are single-purpose. There is no general-purpose mechanism for the AI to emit clickable references to entities or per-message action buttons.

The AI compensates by writing prose instructions — the only tool it has. `[ICA-016]`

### 1.4 Why This Matters

- **Founder time is the bottleneck.** Every second spent reading "Open her conversation at X, then do Y" is a second not spent executing. A clickable chip eliminates the read-then-navigate-then-act loop. `[ICA-017]`
- **Operator briefs lose their value when they're paragraphs.** The NOW/NEXT/WAIT cards were designed to be scannable triage surfaces. When each card contains multi-sentence action instructions, they become walls of text. `[ICA-018]`
- **The dashboard handoff flow ends in dead text.** The dashboard fires an AI action with context, the AI triages correctly, but then its response says "go do X" instead of offering a button that does X. The last mile is broken. `[ICA-019]`

---

## 2. Design Goals

1. **Action links are inline.** Entity references in text (names, conversations, routes) should be clickable without disrupting sentence flow. `[ICA-040]`
2. **Message actions are per-message.** Each assistant message can have its own action chips, independent of the conversation-level `__suggestions__`. `[ICA-041]`
3. **Actions are typed and dispatched.** Each action has a declared type (`conversation`, `route`, `send`, `corpus`) and structured parameters. No free-form string interpretation. `[ICA-042]`
4. **The AI writes shorter messages.** Action links replace prose instructions. The system prompt enforces this. `[ICA-043]`
5. **Existing features are preserved.** `[[slug]]` library links, `__suggestions__`, UI commands (`set_theme`, `navigate`), and operator briefs continue working unchanged. `[ICA-044]`
6. **The parser is forgiving during streaming.** Partial action link syntax during SSE streaming must not break the message render. `[ICA-045]`
7. **Actions are safe by default.** Action dispatch validates types and parameters before execution. Unknown action types are rendered as inert text. `[ICA-046]`
8. **The syntax is markdown-adjacent.** The AI already generates markdown fluently. Action link syntax should look like standard markdown links so the model emits it reliably. `[ICA-047]`
9. **Message actions complement, not replace, suggestions.** `__suggestions__` remains the conversation-level follow-up mechanism. `__actions__` is the per-message CTA mechanism. `[ICA-048]`
10. **Incremental adoption.** The feature rolls out through the type system, parser, renderer, and prompt in ordered sprints. Each sprint produces a testable, shippable increment. `[ICA-049]`

---

## 3. Architecture Direction

### 3.1 Relationship To Existing Specs

This spec extends the rich content pipeline established in [Chat Experience](../chat-experience/spec.md) and the tool architecture from [Tool Architecture](../tool-architecture/spec.md). It does not modify the FAB shell contract ([FAB Shell Refactor](../fab-shell-refactor/spec.md)) or the visual authority tokens ([Floating Chat Visual Authority](../floating-chat-visual-authority/spec.md)).

The dashboard handoff flow from [Dashboard AI Action Workspace](../dashboard-ai-action-workspace/spec.md) is a primary consumer — action links and message chips make handoff responses interactive instead of verbal.

### 3.2 Action Link Syntax

Action links use markdown link syntax with a `?` prefix on the URL to distinguish them from real URLs:

```markdown
[Morgan Lee](?conversation=conv_seed_rev_001)
[Open library](?route=/library)
[Send advisory offer](?send=Draft a scoped advisory offer for Morgan Lee)
[Service Design Principles](?corpus=service-design-principles)
```

**Grammar:**

```text
action-link  = "[" label "]" "(?" action-type "=" value ( "&" key "=" value )* ")"
label        = visible text (any characters except "]")
action-type  = "conversation" | "route" | "send" | "corpus"
value        = URL-encoded string
key          = parameter name
```

**Action types:**

| Type | Behavior | Parameters |
| --- | --- | --- |
| `conversation` | Opens a conversation by ID in the chat shell | `id` (conversationId) |
| `route` | Navigates to a page route | Path is the value |
| `send` | Pre-fills the composer with the message text for user review before sending | Message text is the value |
| `corpus` | Opens a corpus section (equivalent to `[[slug]]`) | Slug is the value |

`[ICA-050]` through `[ICA-054]`

### 3.3 Message Actions Syntax

Per-message actions use a tag similar to `__suggestions__`, extracted per-message by `ChatPresenter`:

```markdown
__actions__:[{"label":"Open Morgan's thread","action":"conversation","params":{"id":"conv_seed_rev_001"}},{"label":"Send advisory offer","action":"send","params":{"text":"Draft a scoped advisory offer for Morgan Lee at Northstar Ops."}}]
```

**Schema:**

```typescript
interface MessageAction {
  label: string;
  action: "conversation" | "route" | "send" | "corpus";
  params: Record<string, string>;
}
```

`[ICA-055]` through `[ICA-058]`

### 3.4 Type System Changes

**InlineNode extension** in `rich-content.ts`:

```typescript
export const INLINE_TYPES = {
  TEXT: "text",
  BOLD: "bold",
  CODE: "code-inline",
  LINK: "library-link",
  ACTION_LINK: "action-link",  // NEW
} as const;

export type ActionLinkType = "conversation" | "route" | "send" | "corpus";

export type InlineNode =
  | { type: typeof INLINE_TYPES.TEXT; text: string }
  | { type: typeof INLINE_TYPES.BOLD; text: string }
  | { type: typeof INLINE_TYPES.CODE; text: string }
  | { type: typeof INLINE_TYPES.LINK; slug: string }
  | { type: typeof INLINE_TYPES.ACTION_LINK; label: string; actionType: ActionLinkType; value: string; params?: Record<string, string> };
```

**PresentedMessage extension** in `ChatPresenter.ts`:

```typescript
export interface MessageAction {
  label: string;
  action: ActionLinkType;
  params: Record<string, string>;
}

export interface PresentedMessage {
  id: string;
  role: string;
  content: RichContent;
  rawContent: string;
  commands: UICommand[];
  suggestions: string[];
  actions: MessageAction[];  // NEW
  attachments: AttachmentPart[];
  timestamp: string;
}
```

`[ICA-060]` through `[ICA-065]`

### 3.5 Parser Changes

`MarkdownParserService.parseInlines()` adds a new regex branch in the combined pattern:

```typescript
// Existing: (**bold**, `code`, [[slug]])
// New:      [label](?action=value&key=value)
const combined = /(\*\*[^*]+\*\*|`[^`]+`|\[\[[^\]]+\]\]|\[[^\]]+\]\(\?[^)]+\))/g;
```

The new `[label](?...)` branch parses action type, value, and optional key-value parameters from the URL-like string.

`[ICA-070]` through `[ICA-073]`

### 3.6 Presenter Changes

`ChatPresenter.present()` adds extraction of `__actions__` alongside existing `__suggestions__` extraction:

```typescript
const ACTION_REGEX = /__actions__:\[([\s\S]*?)\]/;

// In present():
const actionMatch = textContent.match(ACTION_REGEX);
if (actionMatch?.[1]) {
  try {
    actions = JSON.parse(`[${actionMatch[1]}]`);
  } catch { /* skip malformed */ }
  textContent = textContent.replace(ACTION_REGEX, "").trim();
}
```

> **Note:** The regex capture group already excludes the outer `[` `]` delimiters, so `JSON.parse` re-wraps with `[...]` to produce a valid JSON array. This mirrors the existing `__suggestions__` extraction pattern.
>
> **Known Limitation:** The `[\s\S]*?` non-greedy quantifier in `ACTION_REGEX` stops at the first `]` character. If any JSON string value inside the `__actions__` payload contains a literal `]`, the regex will truncate the match. This is acceptable because action params are short identifiers (conversation IDs, routes, slugs) that should never contain `]`. If this proves insufficient, replace the regex with a bracket-balancing parser. `[ICA-078]`

`[ICA-075]` through `[ICA-078]`

### 3.7 Renderer Changes

**Inline action link** in `RichContentRenderer.tsx`:

```typescript
"action-link": ({ node, onActionClick }) => (
  <button
    onClick={() => onActionClick?.(node.actionType, node.value, node.params)}
    className="action-link-inline"
  >
    {node.label}
  </button>
),
```

**Message action chips** in `MessageList.tsx`, rendered inside `AssistantBubble` after the content:

```typescript
{message.actions.length > 0 && (
  <MessageActionChips
    actions={message.actions}
    onActionClick={onActionClick}
  />
)}
```

`[ICA-080]` through `[ICA-085]`

### 3.8 Action Dispatch

An extension to `useChatSurfaceState` routes action clicks. This requires two prerequisite changes:

**Prerequisite A — Expose `setConversationId` and `refreshConversation` via `useGlobalChat`.**
Currently `setConversationId` is internal to `ChatProvider` (passed only to `useChatSend`) and not included in `ChatContextType`. Sprint 1 must add both `setConversationId` and `refreshConversation` to the `ChatContextType` interface and the Provider value in `src/hooks/useGlobalChat.tsx` so consumers of `useGlobalChat()` — including `useChatSurfaceState` — can access them.

**Prerequisite B — Expose a `setComposerText` setter.**
The composer is managed by `useChatComposerController`, which exposes `handleInputChange(value, selectionStart)` but no pure text setter. Sprint 1 must add a `setComposerText(text: string)` convenience method to `useChatComposerController` that calls the underlying `composer.updateInput(text)` without triggering mention processing. `useChatSurfaceState` then obtains `setComposerText` from the composer controller.

```typescript
function handleActionClick(actionType: ActionLinkType, value: string, params?: Record<string, string>) {
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
}
```

**Conversation Switching Infrastructure:** After Prerequisite A, the `conversation` action uses `setConversationId(targetId)` followed by `refreshConversation(targetId)` from `useGlobalChat()`. `refreshConversation` already supports a `conversationIdOverride` parameter (delegating to `restoreConversationById`). No new event system is needed.

**Mid-Conversation Switching UX:** If the user clicks a conversation action link while actively in a different conversation thread, a `window.confirm()` dialog appears. The user's current thread is auto-saved (existing behavior), but the explicit prompt prevents accidental context loss.

`[ICA-090]` through `[ICA-096]`

### 3.9 System Prompt Changes

The AI system prompt gains new formatting directives:

```text
INTERACTIVE FORMATTING RULES:
1. Use action links for entity references: [Morgan Lee](?conversation=conv_seed_rev_001)
2. Use action links for navigation: [Open library](?route=/library)
3. Use action links for follow-up prompts: [Send offer](?send=Draft advisory offer for Morgan)
4. Keep prose SHORT. If there's a link or chip that does it, don't explain it in words.
5. Append __actions__ with 1-3 primary CTAs when the response involves executable next steps.
6. Continue appending __suggestions__ with 3-4 follow-up questions at the end of every response.

ACTION CHIP RULES:
- __actions__ goes BEFORE __suggestions__ in the response
- Max 3 action chips per message
- Each chip must have a clear verb-first label under 40 characters
- Action types: conversation, route, send, corpus
```

`[ICA-100]` through `[ICA-106]`

**Redundancy Guidance:**

Inline action links and `__actions__` chips serve different purposes and must not duplicate the same action:

- **Inline action links** = contextual entity references woven into prose (e.g., "[Morgan Lee](?conversation=...)" in a sentence)
- **`__actions__` chips** = primary call-to-action buttons for the message's recommended next steps

If an entity is referenced inline, it should not also appear as a chip unless it is the primary CTA for the message. The system prompt must include this guidance. `[ICA-107]`

**Entity ID Availability Constraint:**

The AI can only emit action links with real entity IDs when the system prompt or task-origin handoff context provides them. In task-origin flows, `buildTaskOriginContextBlock()` injects specific context framing that helps the AI stay inside the clicked task. For ad-hoc requests without handoff context, the AI should prefer `corpus` and `route` action types (which use known slugs and paths) over `conversation` action types (which require specific IDs the AI may not have). Sprint 2 prompt directives must make this constraint explicit so the AI does not hallucinate entity IDs. `[ICA-108]`

### 3.10 Streaming Safety

During SSE streaming, partial action link syntax `[Morg` or `[Morgan Lee](?conv` must not crash the parser. The `MarkdownParserService` already handles this implicitly: unmatched regex patterns fall through to plain text nodes. The combined regex only matches complete `[label](?...)` sequences, so partial sequences render as text until the closing `)` arrives.

However, the `__actions__` tag extraction in `ChatPresenter` must be streaming-aware: the tag is only parsed after the full message is received (not on intermediate deltas).

`[ICA-110]` through `[ICA-112]`

---

## 4. Security And Safety

1. **Action type allowlist.** Only declared action types (`conversation`, `route`, `send`, `corpus`) are dispatched. Unknown types render as inert text. `[ICA-120]`
2. **Route validation.** The `route` action validates that the path starts with `/` (internal navigation only). External URLs are rejected. `[ICA-121]`
3. **Send action pre-fills the composer.** When a `send` action chip or link is clicked, the message text is placed in the composer input for user review and editing, not sent automatically. The user must explicitly submit. `[ICA-122]`
4. **Conversation ID validation.** The `conversation` action passes the ID through existing conversation access controls. Users can only open conversations they own. `[ICA-123]`
5. **No credential exposure.** Action link params never contain tokens, passwords, or session data. `[ICA-124]`
6. **XSS prevention.** Action link labels and values are rendered as React text nodes (not `dangerouslySetInnerHTML`). The existing `RichContentRenderer` pattern handles this. `[ICA-125]`

---

## 5. Testing Strategy

### 5.1 Unit Tests

| Area | Tests | Location |
| --- | --- | --- |
| `MarkdownParserService` | Parse action links, edge cases, partial syntax | `src/adapters/MarkdownParserService.test.ts` |
| `ChatPresenter` | Extract `__actions__`, preserve `__suggestions__`, combined extraction | `src/adapters/ChatPresenter.test.ts` |
| `RichContentRenderer` | Render action-link node, click dispatch | `src/frameworks/ui/RichContentRenderer.test.tsx` |
| `MessageActionChips` | Render chips, click dispatch, disabled state | `src/frameworks/ui/MessageList.test.tsx` |
| Action dispatch | Route each action type correctly | `src/frameworks/ui/useChatSurfaceState.test.ts` (new) |
| Prompt content | System prompt contains expected directives | `src/lib/corpus-config.test.ts` (new) |

### 5.2 Integration Tests

| Area | Tests | Location |
| --- | --- | --- |
| Browser FAB flow | Action links clickable in floating chat | `tests/browser-fab-chat-flow.test.tsx` |
| Browser mobile | Action chips density on mobile viewport | `tests/browser-fab-mobile-density.test.tsx` |
| Operator brief | Action links render inside NOW/NEXT/WAIT cards | `tests/browser-operator-brief.test.tsx` |

### 5.3 Estimated Impact

- 5-7 modified source files
- 3-5 new or updated test files
- ~25-35 new test cases
- No new npm dependencies

---

## 6. Sprint Plan

| Sprint | Goal |
| --- | --- |
| **0** | Type system foundation: add `action-link` to `InlineNode`, add `MessageAction` type, add `actions` to `PresentedMessage`, extend parser regex with defensive malformed-syntax handling, extend presenter extraction with documented JSON regex limitation. Unit tests for parser, presenter, and malformed edge cases. |
| **1** | Renderer and dispatch: render action-link inline nodes, render message action chips in AssistantBubble, build action dispatch handler with conversation-switch via `setConversationId`/`refreshConversation`, pre-fill composer for send actions, mid-conversation switching confirmation UX. Wire through `useChatSurfaceState`. |
| **2** | System prompt and AI integration: update system prompt with action link and `__actions__` directives, entity ID availability constraints, inline-vs-chip redundancy guidance, calibrate brevity instructions. Automated prompt content assertion tests. Verify AI emits correct syntax in dashboard handoff flows. |
| **3** | Polish and hardening: streaming edge cases, mobile density calibration for action chips, accessibility (keyboard, screen reader), operator brief visual density verification, browser integration test coverage, visual polish. |

---

## 7. Future Considerations

The following are explicitly deferred and out of scope for this spec:

1. **Custom action types beyond the initial four.** The type system supports extension, but we ship with `conversation`, `route`, `send`, and `corpus` only. `[ICA-190]`
2. **Action link autocomplete in the AI prompt.** The AI currently emits action links based on system prompt instructions. A future enhancement could inject available entity IDs into the context window so the AI can link to real entities it knows about. `[ICA-191]`
3. **Action link analytics.** Tracking which action links and chips are clicked to measure engagement. `[ICA-192]`
4. **Drag-to-reorder action chips.** Currently chips render in AI-emit order. `[ICA-193]`
5. **Conditional actions.** Actions that are only available based on user role or conversation state (e.g., admin-only actions). The RBAC system already filters tool access; extending it to action links is future work. `[ICA-194]`
6. **Persistent action state.** Actions are ephemeral — they execute on click and don't remember state. Multi-step action workflows are deferred. `[ICA-195]`
