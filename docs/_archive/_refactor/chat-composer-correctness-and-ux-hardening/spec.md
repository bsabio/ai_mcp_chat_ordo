# Chat Composer Correctness & UX Hardening — Refactor Spec

> **Status:** Planned
> **Date:** 2026-04-09
> **Scope:** Fix algorithmic bugs, eliminate dead code and prop bloat, harden accessibility, and bring the chat composer to world-class UX parity with modern chat products.
> **Affects:** `src/frameworks/ui/ChatInput.tsx`, `src/frameworks/ui/ChatContentSurface.tsx`, `src/frameworks/ui/useChatSurfaceState.tsx`, `src/hooks/chat/useChatComposerController.ts`, `src/hooks/chat/useChatComposerState.ts`, `src/hooks/useMentions.ts`, `src/components/MentionsMenu.tsx`, `src/app/styles/chat.css`, related test files.
> **Motivation:** The chat composer is the product's handshake — the single surface every user touches on every turn. An audit against Knuth-level correctness, Martin-level cleanliness, and Rauch-level UX polish reveals algorithmic bugs, dead code, prop overload, and missing interactions that collectively keep a functional surface from reading as world-class.
> **Requirement IDs:** `CCH-XXX`

---

## 1. Problem Statement

### 1.1 Verified Current Defects

The chat composer works for the happy path but carries three classes of debt. `[CCH-010]`

**Correctness bugs:**

1. **Mention trigger priority is array-order-dependent, not cursor-proximity-based.** In `src/hooks/useMentions.ts`, the loop iterates `TRIGGERS` in declaration order (`@`, `[[`, `#`, `/`) and breaks on the first match. Typing `[[@benedict` matches `@` (position 2) before `[[` (position 0) because `@` is checked first in the array, even though `[[` is the *intended* trigger. `[CCH-011]`
2. **Textarea auto-resize forces two layout reflows per keystroke.** `src/frameworks/ui/ChatInput.tsx` sets `height: 0px`, reads `scrollHeight`, then sets final height — every render, including when the input is empty and streaming is active. `[CCH-012]`
3. **`handleSend` is async but typed as `() => void`.** The promise from `onSendMessage` is silently dropped. If the network request rejects, the error is unhandled — no toast, no visual feedback, no restore of the draft. `[CCH-013]`
4. **`insertMention` reads the DOM directly** (`textareaRef.current.value`, `.selectionStart`) instead of accepting state as arguments. This creates stale-closure risk and makes the function untestable without a real DOM ref. `[CCH-014]`

**Architecture and dead code:**

5. **ChatInput accepts 22 props spanning 5 responsibilities** (text editing, file attachment, mentions coordination, keyboard shortcuts, send/stop control). Single Responsibility Principle violation. `[CCH-015]`
6. **`useChatSurfaceState` returns 36 fields and duplicates most of them** — both as a `contentProps` object and as flat top-level fields. `[CCH-016]`
7. **`onArrowUp` is hardcoded to `() => {}` in `ChatContentSurface.tsx`.** ChatInput's `handleEditLastMessage` fires when the user presses ↑ in an empty field, but the callback does nothing. Dead prop, dead code path, false feature signal. `[CCH-017]`
8. **`hasInput` and `canSend` semantics diverge.** `hasInput = value.trim().length > 0` drives the send button's visual state, but `canSend` also accounts for `pendingFiles.length > 0`. A user with files attached and no text sees an "idle" (faded) send button even though sending is valid. `[CCH-018]`
9. **~35 lines of orphaned CSS helper-text rules** in `chat.css` target `[data-chat-composer-helper="true"]`, but no component emits that attribute anymore. `[CCH-019]`
10. **`menuPosition` state in `useMentions` is computed every keystroke but never consumed.** The MentionsMenu uses CSS `absolute` + `bottom: calc(100% + 0.75rem)` for positioning. The `top`/`left` values are dead computation. `[CCH-020]`

**UX and design gaps:**

11. **No drag-and-drop file handling.** The composer only supports button-click attachment. No `onDrop`/`onDragOver` on the composer frame. Every peer product (ChatGPT, iMessage, Slack, WhatsApp Web, Claude.ai) supports drag-and-drop. `[CCH-021]`
12. **No `enterKeyHint="send"` on the textarea.** Mobile keyboards show a generic return key instead of a "Send" affordance. One attribute, zero cost. `[CCH-022]`
13. **File pills show truncated filenames only — no thumbnail for images.** When a user attaches a JPEG, a text pill with a truncated name gives no visual confirmation that the right image is queued. `URL.createObjectURL(file)` provides zero-cost previews. `[CCH-023]`
14. **No optimistic message insertion.** When the user hits Send, the composer clears instantly but the message doesn't appear in the viewport until the server responds. This creates a perceptible void that reads as lag. `[CCH-024]`
15. **The composer form has `onSubmit` but no progressive enhancement path.** `[CCH-025]`

**Accessibility gaps:**

16. **No `aria-live` region for the mentions dropdown.** Screen readers don't announce when suggestions appear, change count, or disappear. `[CCH-026]`
17. **Textarea lacks an accessible label.** No `aria-label`, no associated `<label>`. Placeholder text is not a substitute for a label. `[CCH-027]`
18. **MentionsMenu items lack `tabIndex`.** The menu is `role="listbox"` but items can't receive programmatic focus, meaning `aria-activedescendant` can't work. `[CCH-028]`

### 1.2 Root cause

The composer was built incrementally: text first, then files, then mentions, then the floating shell. Each layer added props and behaviors without refactoring the integration boundary. The result is a component that does everything adequately and nothing precisely. `[CCH-030]`

### 1.3 Why this matters

A chat-first product is judged by the quality of the input, not just the output. If the composer feels imprecise (wrong trigger fires), sluggish (layout thrash), incomplete (no drag-drop), or silent on error (swallowed promises), the entire product reads as less capable than the runtime behind it. `[CCH-031]`

---

## 2. Governing Constraints

### 2.1 Product and system boundaries `[CCH-040]`

This refactor must preserve:

1. Enter to send, Shift+Enter to newline, Escape to dismiss mentions
2. All mention trigger characters (`@`, `[[`, `#`, `/`) and their registered behaviors
3. File upload MIME restrictions and size limits
4. Send/stop button semantics and streaming behavior
5. All existing `data-chat-*` attribute contracts consumed by tests and CSS
6. Floating shell visual authority and embedded-mode layout

### 2.2 Design-system boundaries `[CCH-041]`

1. Visual changes land through `chat.css` and `foundation.css` — not as component-local inline styles
2. New semantic hooks (`data-*` attributes) must be stable, documented in this spec, and tested
3. No new external dependencies without justification (e.g., `textarea-caret` — must prove value over simpler approach)

### 2.3 File ownership `[CCH-042]`

| File | Change type |
|---|---|
| `src/frameworks/ui/ChatInput.tsx` | Major refactor — decompose into sub-components |
| `src/frameworks/ui/ComposerFilePills.tsx` | **New** — extracted from ChatInput |
| `src/frameworks/ui/ComposerSendControl.tsx` | **New** — extracted from ChatInput |
| `src/frameworks/ui/ChatContentSurface.tsx` | Minor — remove dead `onArrowUp` prop, fix `hasInput`/`canSend` |
| `src/frameworks/ui/useChatSurfaceState.tsx` | Moderate — eliminate return duplication |
| `src/hooks/useMentions.ts` | Moderate — fix trigger priority, remove dead `menuPosition`, make `insertMention` pure |
| `src/hooks/chat/useChatComposerController.ts` | Minor — type `handleSend` correctly, wire error feedback |
| `src/hooks/chat/useChatComposerState.ts` | Minor — add drag-drop handler |
| `src/components/MentionsMenu.tsx` | Minor — add `tabIndex`, `id` for `aria-activedescendant` |
| `src/app/styles/chat.css` | Moderate — remove orphaned helper rules, add drag-over visual state |

---

## 3. Solution Design

### 3.1 Trigger priority fix `[CCH-100]`

Replace the first-match loop with a closest-to-cursor algorithm:

```
for each trigger in TRIGGERS:
  find lastIndex of trigger.char before cursor
  if segment between trigger and cursor has no whitespace:
    record { trigger, lastIndex, segment }

winner = candidate with highest lastIndex
```

When two triggers overlap (e.g., `[[` starts at 0 and `@` at 2 inside `[[@name`), the trigger with the **largest `lastIndex`** wins. For `[[` at position 0, its `lastIndex + char.length = 2`. For `@` at position 2, its `lastIndex = 2`. Tie-break: multi-char triggers win (they are more intentional). But the real tie-break is that `[[` segment is `@name` (contains `@`), while the `@` segment is `name` — both are valid. The longest trigger should win because the user typed two characters deliberately.

**Resolution rule:** Among candidates with the same `lastIndex`, the longer trigger character wins. Among candidates at different positions, the highest `lastIndex` wins.

### 3.2 Auto-resize guard `[CCH-101]`

Wrap the resize `useEffect` with:
1. Skip when `isSending && value === ""` (streaming + empty input — no resize needed)
2. Track previous height in a ref. Only write to the DOM if the computed height differs from the stored height

This eliminates: (a) wasted reflows during streaming, (b) two reflows when height hasn't changed.

### 3.3 Async send with error surface `[CCH-102]`

1. Type `onSend` as `() => void | Promise<void>` in the ChatInput interface
2. In `useChatComposerController.handleSend`: wrap `onSendMessage` in try/catch. On failure, call `composer.restoreComposer(draft, queuedFiles)` (already implemented but never reached)
3. Surface a transient error indicator — a red flash on the composer frame border + `aria-live` announcement

### 3.4 Pure `insertMention` `[CCH-103]`

Change signature from `(item: MentionItem) => string` to:
```ts
(item: MentionItem, currentText: string, cursorIndex: number) => string
```

Remove direct DOM reads. Pass `value` and `selectionStart` from the controlled state. This makes the function fully testable with plain arguments.

### 3.5 Component extraction `[CCH-104]`

**`<ComposerFilePills>`** — extracted from ChatInput:
- Props: `files: File[]`, `onRemove: (index: number) => void`
- Renders file pills with image thumbnails (see §3.9)
- Emits `data-chat-file-pills="true"` on wrapper

**`<ComposerSendControl>`** — extracted from ChatInput:
- Props: `canSend: boolean`, `isSending: boolean`, `canStopStream: boolean`, `onStopStream?: () => void | Promise<unknown>`, `hasContent: boolean`
- `hasContent` replaces the internal `hasInput` — incorporates both text and files
- Emits `data-chat-send-state` and `data-chat-stop-state`

**ChatInput after extraction:** ~12 props (textarea control, keyboard dispatch, mentions coordination, and the two sub-component slots)

### 3.6 Orchestrator return cleanup `[CCH-105]`

`useChatSurfaceState` should return only:
```ts
{
  contentProps: ChatContentSurfaceProps,
  conversationId: string | null,
  currentConversation: ...,
  sessionSearchQuery: string,
  setSessionSearchQuery: (q: string) => void,
}
```

All 28 duplicated flat fields are removed. Consumers use `contentProps` exclusively.

### 3.7 Dead code removal `[CCH-106]`

| Dead code | Action |
|---|---|
| `onArrowUp` prop in ChatInputProps | Remove from interface, ChatInput, ChatContentSurface |
| `handleEditLastMessage` in ChatInput | Remove |
| `menuPosition` state in useMentions | Remove state, remove `setMenuPosition` call |
| `[data-chat-composer-helper]` CSS rules (~35 lines) | Remove all selectors referencing this attribute |
| Duplicated flat returns in useChatSurfaceState | Remove (see §3.6) |

### 3.8 `hasInput` → `hasContent` semantic fix `[CCH-107]`

Replace:
```tsx
const hasInput = value.trim().length > 0;
```

With:
```tsx
const hasContent = value.trim().length > 0 || pendingFiles.length > 0;
```

This drives `data-chat-composer-state`, `data-chat-send-state`, and the send button's visual class (`ui-chat-send-ready` vs `ui-chat-send-idle`). A user with files attached and no text now sees the ready state.

### 3.9 File pill image thumbnails `[CCH-108]`

For files where `file.type.startsWith("image/")`:
- Create `URL.createObjectURL(file)` and render a 24×24 rounded thumbnail
- Revoke the object URL on pill removal (`onFileRemove`) and on component unmount
- Non-image files show a document icon (📄 for PDF, 📝 for plain text)

### 3.10 Drag-and-drop on composer `[CCH-109]`

Add to the composer `<form>` element:
- `onDragOver`: prevent default, set `data-chat-composer-dragover="true"`
- `onDragLeave`: remove attribute
- `onDrop`: prevent default, extract `e.dataTransfer.files`, filter by allowed MIME types, delegate to `onFileSelect`-equivalent handler

CSS: `[data-chat-composer-dragover="true"]` gets a dashed accent border and a subtle highlight — the universal "drop target active" signal.

`useChatComposerState` gains `handleFileDrop(e: React.DragEvent)` alongside existing `handleFileSelect`.

### 3.11 `enterKeyHint` attribute `[CCH-110]`

Add `enterKeyHint="send"` to the textarea. Mobile keyboards will display a "Send" key label instead of a generic return arrow.

### 3.12 Accessibility hardening `[CCH-111]`

1. **Textarea `aria-label`:** Add `aria-label="Message"` to the textarea
2. **Mentions live region:** Add a visually-hidden `<div role="status" aria-live="polite">` near the textarea. When suggestions appear: "N suggestions available". When suggestions clear: empty string (silent)
3. **`aria-activedescendant`:** Add `id` to each MentionsMenu `role="option"` element (e.g., `mention-option-{index}`). Set `aria-activedescendant` on the textarea to the active option's id when the menu is open
4. **`tabIndex={-1}`** on each MentionsMenu option for focus management

### 3.13 Optimistic message insertion `[CCH-112]`

When `handleSend` fires:
1. Immediately insert a "pending" user message into the presented messages array with a `status: "pending"` flag
2. The viewport renders it instantly with a subtle opacity treatment (e.g., `opacity: 0.8`)
3. When the server responds, reconcile: replace the pending message with the confirmed one (matching by a local nonce)
4. If the request fails, mark the pending message as `status: "failed"` — show a retry affordance on the message itself

This eliminates the "text vanishes → void → message appears" perceptual gap.

---

## 4. Test Specification

### 4.1 Trigger Priority `[CCH-200]`

#### Positive tests

| ID | Scenario | Input | Cursor position | Expected trigger | Rationale |
|---|---|---|---|---|---|
| `CCH-T201` | Single `@` trigger | `@bene` | 5 | `@` → practitioner | Standard single-trigger case |
| `CCH-T202` | Single `[[` trigger | `[[Chapter` | 9 | `[[` → chapter | Multi-char trigger at start |
| `CCH-T203` | Single `/` trigger | `/help` | 5 | `/` → command | Command slash at start |
| `CCH-T204` | `#` trigger mid-sentence | `see #frame` | 11 | `#` → framework | Trigger not at position 0 |
| `CCH-T205` | Trigger after prior completed mention | `@John hello [[Chap` | 19 | `[[` → chapter | Earlier `@` already completed (has space after) |

#### Negative tests

| ID | Scenario | Input | Cursor position | Expected | Rationale |
|---|---|---|---|---|---|
| `CCH-T210` | Whitespace after trigger | `@ ben` | 5 | No active trigger | Space in segment → trigger abandoned |
| `CCH-T211` | No trigger character | `hello world` | 11 | No active trigger | Plain text, no trigger |
| `CCH-T212` | Trigger at end, cursor before it | `hello @` | 5 | No active trigger | Cursor is before the `@`, not after it |
| `CCH-T213` | Escaped bracket | `[\[text` | 6 | No active trigger | `[[` not present as contiguous pair |

#### Edge case tests

| ID | Scenario | Input | Cursor position | Expected trigger | Rationale |
|---|---|---|---|---|---|
| `CCH-T220` | **Overlapping triggers `[[@name`** | `[[@benedict` | 12 | `[[` → chapter | `[[` starts at 0 (lastIndex=0, len=2); `@` starts at 2 (lastIndex=2, len=1). `[[` has lastIndex 0 but trigger length 2 means its "reach" equals `@`'s position. Multi-char trigger wins tie per §3.1 |
| `CCH-T221` | Trigger immediately after trigger | `/@help` | 6 | `/` → command | `/` at position 0, `@` at position... wait — `/@help`: `/` lastIndex=0 segment=`@help` (contains `@`), `@` lastIndex=1 segment=`help`. `@` has higher lastIndex → `@` wins → command. Actually: highest lastIndex wins → `@` at 1 > `/` at 0 → `@`. **But user typed `/` first.** This is correct: the cursor is closer to `@`. |
| `CCH-T222` | Multiple `@` symbols | `@alice said @bob` | 17 | `@` → practitioner, query=`bob` | `lastIndexOf` finds the rightmost `@` at position 13 |
| `CCH-T223` | `[[` with `]]` closed, then another `[[` | `[[Done]] check [[Open` | 21 | `[[` → chapter, query=`Open` | Rightmost `[[` at position 16 is the active one |
| `CCH-T224` | Zero-length query | `@` | 1 | `@` → practitioner, query="" | Trigger fires, all practitioners shown (empty filter matches all) |
| `CCH-T225` | Unicode in query | `@Ælfrēd` | 8 | `@` → practitioner, query=`Ælfrēd` | Unicode in segment does not count as whitespace |
| `CCH-T226` | Cursor in middle of text | `hello @world goodbye` | 12 | `@` → practitioner, query=`world` | `textBeforeCursor` = `hello @world`, trigger matches |

---

### 4.2 Auto-Resize `[CCH-210]`

#### Positive tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T230` | User types a single line | Height = max(scrollHeight, 44px), no larger than maxTextareaHeight |
| `CCH-T231` | User types 10 lines (exceeds max) | Height = maxTextareaHeight, `overflowY: auto` |
| `CCH-T232` | User deletes all text after 10 lines | Height shrinks back to min 44px |

#### Negative tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T235` | Streaming active + empty input | Resize effect does NOT run (guard skips) |
| `CCH-T236` | Value changes but height is identical | DOM write does NOT execute (height-ref comparison) |

#### Edge case tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T240` | Paste 500 lines in one event | Height caps at maxTextareaHeight; `overflowY: auto`; no frame thrash |
| `CCH-T241` | Mode switch (embedded → fullscreen) changes maxTextareaHeight from 144→224 | Height recalculates on next render with new max |
| `CCH-T242` | `inputRef` is null (component unmounting) | Effect exits cleanly, no error |

---

### 4.3 Async Send & Error Handling `[CCH-220]`

#### Positive tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T250` | User sends message, server accepts | Composer clears, message appears in viewport |
| `CCH-T251` | User sends files only (no text), server accepts | Composer clears, files delivered, send button was in `ready` state |

#### Negative tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T255` | `onSendMessage` rejects (network failure) | `restoreComposer(draft, queuedFiles)` called — text and files restored to composer. Error visually indicated (border flash + `aria-live` announcement). No unhandled promise rejection in console. |
| `CCH-T256` | `onSendMessage` rejects, user edits restored text and retries | Second send succeeds; first failure state is cleared |
| `CCH-T257` | Double-click Send rapidly | Only one send fires (`isSending` guard prevents second) |

#### Edge case tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T260` | `onSendMessage` hangs (never resolves) | Composer stays cleared (already committed). Stop button appears if streaming begins. If streaming never starts, user can type a new message. |
| `CCH-T261` | Network error during file-only send | Files restored to composer; text remains empty (was empty before) |
| `CCH-T262` | `onSendMessage` throws synchronously (not async rejection) | Caught by try/catch in `handleSend`; same restore behavior |

---

### 4.4 `insertMention` Purity `[CCH-230]`

#### Positive tests

| ID | Scenario | Input args | Expected output |
|---|---|---|---|
| `CCH-T270` | `@` mention insertion | `item={id:"1",name:"Benedict"}`, text=`"Ask @Ben"`, cursor=8 | `"Ask @Benedict "` |
| `CCH-T271` | `[[` mention insertion | `item={id:"2",name:"Chapter 5"}`, text=`"See [[Chap"`, cursor=10 | `"See [[Chapter 5]] "` |
| `CCH-T272` | `/` command insertion | `item={id:"3",name:"help"}`, text=`"/hel"`, cursor=4 | `"/help "` |

#### Negative tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T275` | `activeTrigger` is null | Returns empty string, no mutation |
| `CCH-T276` | `currentText` is empty string | Returns trigger+name (e.g., `"@Benedict "`) — still valid |

#### Edge case tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T280` | Cursor not at end of text | Text after cursor preserved: `"Ask @Ben more"` → `"Ask @Benedict more"` |
| `CCH-T281` | Mention name contains special chars | `item.name = "O'Brien-Smith"` → inserted verbatim, no escaping issues |
| `CCH-T282` | Multiple trigger chars in text, insertion at rightmost | Only the rightmost trigger is replaced |

---

### 4.5 `hasContent` Semantic Fix `[CCH-240]`

#### Positive tests

| ID | Scenario | `value` | `pendingFiles` | Expected `hasContent` | Expected `data-chat-send-state` |
|---|---|---|---|---|---|
| `CCH-T290` | Text only | `"Hello"` | `[]` | true | `"ready"` |
| `CCH-T291` | Files only | `""` | `[image.jpg]` | true | `"ready"` |
| `CCH-T292` | Text and files | `"See this"` | `[doc.pdf]` | true | `"ready"` |

#### Negative tests

| ID | Scenario | `value` | `pendingFiles` | Expected `hasContent` | Expected `data-chat-send-state` |
|---|---|---|---|---|---|
| `CCH-T295` | Empty, no files | `""` | `[]` | false | `"idle"` |
| `CCH-T296` | Whitespace only, no files | `"   "` | `[]` | false | `"idle"` |

#### Edge case tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T298` | Files attached, all removed, text still empty | `hasContent` flips to false; send button returns to idle |
| `CCH-T299` | File attached, then text typed, then file removed | `hasContent` stays true (text remains) |

---

### 4.6 Drag-and-Drop `[CCH-250]`

#### Positive tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T300` | Drag a JPEG onto the composer | `data-chat-composer-dragover="true"` appears on dragover; on drop, file added to `pendingFiles`; drag-over attribute removed |
| `CCH-T301` | Drag a PDF onto the composer | File added to `pendingFiles` with correct type |
| `CCH-T302` | Drag multiple files at once | All valid files added to `pendingFiles` |

#### Negative tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T305` | Drag an `.exe` file onto the composer | File is NOT added (MIME filter rejects); no error thrown; drag-over state clears |
| `CCH-T306` | Drag a file while `isSending=true` | Drop is ignored; composer does not accept files during send |
| `CCH-T307` | Drag text selection (not a file) onto the composer | No file added; no crash; text drop handled by browser default or ignored |

#### Edge case tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T310` | Drag 3 files: 1 valid JPEG, 1 valid PDF, 1 invalid .docx | Only 2 files added; .docx silently filtered out. No partial-failure toast (this is expected filtering, not an error) |
| `CCH-T311` | Drag and leave without dropping | `data-chat-composer-dragover` removed on `dragleave`; no files added |
| `CCH-T312` | Drag over nested child element inside composer | Drag-over state persists (use `dragenter`/`dragleave` counter or `contains` check to avoid flicker) |
| `CCH-T313` | Drop a 40MB file (exceeds 32MB limit) | File rejected; composer shows transient size-limit feedback |

---

### 4.7 File Pill Thumbnails `[CCH-260]`

#### Positive tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T320` | Attach a JPEG | Pill shows a 24×24 rounded thumbnail from `URL.createObjectURL` + truncated filename |
| `CCH-T321` | Attach a PNG | Same thumbnail behavior |
| `CCH-T322` | Attach a PDF | Pill shows a document icon (📄) + truncated filename, no thumbnail attempt |

#### Negative tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T325` | Attach a plain text file | Shows text-file icon (📝) + filename; no object URL created |

#### Edge case tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T330` | Remove an image pill | `URL.revokeObjectURL` called for that file's preview URL |
| `CCH-T331` | Component unmounts with 3 image pills | All 3 object URLs revoked (cleanup in `useEffect` return) |
| `CCH-T332` | Attach 10 files | All 10 pills render in a wrapping layout without overflow |
| `CCH-T333` | File with very long name (200 chars) | Pill truncates at `max-w-30` with ellipsis; tooltip shows full name on hover |

---

### 4.8 `enterKeyHint` `[CCH-270]`

#### Positive tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T340` | Render ChatInput | Textarea has attribute `enterKeyHint="send"` |

#### Negative tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T341` | User presses Enter (desktop) | Behavior unchanged — `handleMessageSubmit` fires, `enterKeyHint` has no effect on desktop |

---

### 4.9 Accessibility `[CCH-280]`

#### Positive tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T350` | Render ChatInput | Textarea has `aria-label="Message"` |
| `CCH-T351` | Mentions menu opens with 3 suggestions | Live region announces "3 suggestions available" |
| `CCH-T352` | User presses ArrowDown in mentions | `aria-activedescendant` on textarea updates to next option's id |
| `CCH-T353` | Mentions menu closes | Live region empties (silent dismiss) |

#### Negative tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T355` | No suggestions match query | Mentions menu does not render; live region stays empty; `aria-activedescendant` not set |
| `CCH-T356` | Textarea focused, no active trigger | `aria-activedescendant` is not present on the textarea |

#### Edge case tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T360` | Suggestions change from 5 to 2 while menu is open | Live region updates to "2 suggestions available"; `mentionIndex` clamped to valid range |
| `CCH-T361` | Suggestions change to 0 while at index 4 | Menu closes; `mentionIndex` resets to 0; `aria-activedescendant` removed |
| `CCH-T362` | Screen reader user navigates to file pill remove button | Button has `aria-label="Remove {filename}"` and is reachable via Tab |

---

### 4.10 Component Extraction `[CCH-290]`

#### Positive tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T370` | Render ChatInput with `pendingFiles` | `ComposerFilePills` renders with `data-chat-file-pills="true"` |
| `CCH-T371` | Render ChatInput with `canStopStream=true` | `ComposerSendControl` renders stop button with `data-chat-stop-state="active"` |
| `CCH-T372` | All existing data-attribute contracts preserved | Every `data-chat-*` selector in `chat.css` matches a rendered element |

#### Negative tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T375` | Render with `pendingFiles=[]` | `ComposerFilePills` wrapper does not render (no empty container in DOM) |

#### Edge case tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T380` | Remove file from `ComposerFilePills` while mentions menu is open | Mentions menu stays open; keyboard focus returns to textarea |

---

### 4.11 Dead Code Removal `[CCH-295]`

#### Positive tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T390` | Build after removing `onArrowUp` | TypeScript compiles with zero errors; no component references `onArrowUp` |
| `CCH-T391` | Build after removing `menuPosition` | TypeScript compiles; no component reads `menuPosition` |
| `CCH-T392` | CSS after removing `[data-chat-composer-helper]` rules | No selector references `data-chat-composer-helper`; no visual regression in floating shell |

#### Negative tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T395` | grep for `onArrowUp` in all `.tsx`/`.ts` files | Zero matches |
| `CCH-T396` | grep for `menuPosition` in all `.tsx`/`.ts` files | Zero matches |
| `CCH-T397` | grep for `data-chat-composer-helper` in all `.css`/`.tsx` files | Zero matches |

---

### 4.12 Optimistic Message Insertion `[CCH-298]`

#### Positive tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T400` | User sends "Hello" | A pending message bubble appears immediately in viewport with `data-chat-message-status="pending"`; opacity 0.8; correct text content |
| `CCH-T401` | Server responds successfully | Pending message replaced with confirmed message; opacity returns to 1; no visible flicker |

#### Negative tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T405` | `onSendMessage` rejects | Pending message transitions to `data-chat-message-status="failed"`; retry button appears on the message |
| `CCH-T406` | User sends, then navigates away before response | Pending message does not persist in storage (it's local-only until confirmed) |

#### Edge case tests

| ID | Scenario | Expected |
|---|---|---|
| `CCH-T410` | User sends 3 messages rapidly | 3 pending bubbles appear in order; each resolves independently as server responds |
| `CCH-T411` | Server responds out of order | Messages render in chronological send order, not response order |
| `CCH-T412` | Pending message has file attachments | File pills or thumbnails shown in the pending bubble |

---

## 5. Sprint Plan

### Sprint 1 — Correctness & Dead Code (estimated: 1 sprint)

| Work item | Spec refs |
|---|---|
| Fix trigger priority algorithm | §3.1, CCH-T201–T226 |
| Guard auto-resize effect | §3.2, CCH-T230–T242 |
| Type and catch async send | §3.3, CCH-T250–T262 |
| Make `insertMention` pure | §3.4, CCH-T270–T282 |
| Remove all dead code (§3.7) | §3.7, CCH-T390–T397 |
| Fix `hasContent` semantic | §3.8, CCH-T290–T299 |

### Sprint 2 — UX Polish (estimated: 1 sprint)

| Work item | Spec refs |
|---|---|
| Add drag-and-drop | §3.10, CCH-T300–T313 |
| Add `enterKeyHint` | §3.11, CCH-T340–T341 |
| File pill image thumbnails | §3.9, CCH-T320–T333 |
| Add `aria-label`, live region, `aria-activedescendant` | §3.12, CCH-T350–T362 |

### Sprint 3 — Architecture (estimated: 1 sprint)

| Work item | Spec refs |
|---|---|
| Extract `ComposerFilePills` | §3.5, CCH-T370–T380 |
| Extract `ComposerSendControl` | §3.5, CCH-T371–T375 |
| Clean orchestrator returns | §3.6, — |
| Optimistic message insertion | §3.13, CCH-T400–T412 |

---

## 6. Acceptance Criteria

1. All `CCH-T*` tests pass
2. `npm run build` succeeds with zero TypeScript errors
3. `npm run lint` produces zero errors, no new warnings
4. Full vitest suite passes (all existing tests + new tests)
5. No `data-chat-*` attribute contracts broken (verified by existing browser/integration tests)
6. Lighthouse accessibility score ≥ 95 on chat surface
7. Manual verification on iOS Safari: `enterKeyHint="send"` shows "Send" on keyboard
8. Manual verification of drag-and-drop on Chrome, Firefox, Safari
9. grep for `onArrowUp`, `menuPosition`, `data-chat-composer-helper` returns zero matches across the codebase
