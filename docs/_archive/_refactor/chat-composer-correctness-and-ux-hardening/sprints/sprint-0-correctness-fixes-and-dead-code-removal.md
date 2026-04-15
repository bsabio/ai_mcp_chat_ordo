# Sprint 0 — Correctness Fixes And Dead Code Removal

> **Status:** Planned
> **Source:** `docs/_refactor/chat-composer-correctness-and-ux-hardening/spec.md`
> **Spec refs:** `CCH-011` through `CCH-020`, `CCH-100` through `CCH-107`
> **Prerequisite:** None

---

## Objective

Fix every verified algorithmic bug, eliminate all dead code paths and orphaned CSS, and correct the `hasInput`/`canSend` visual semantic mismatch — without adding new features, without changing the component boundary, and without breaking a single existing test. `[CCH-S0-010]`

This sprint is pure correctness. When it lands, every input the system already accepts is handled more accurately, every dead path is gone, and the surface reflects truth about what the user can actually do.

---

## Available Assets

| File | Role in this sprint |
|---|---|
| `src/hooks/useMentions.ts` | Trigger detection algorithm — rewrite target |
| `src/frameworks/ui/ChatInput.tsx` | Auto-resize effect, `onArrowUp` prop, `hasInput` semantic — edit targets |
| `src/frameworks/ui/ChatContentSurface.tsx` | Dead `onArrowUp` passthrough — edit target |
| `src/hooks/chat/useChatComposerController.ts` | Async send error handling — edit target |
| `src/hooks/chat/useChatComposerState.ts` | `canSend` definition — reference (no change needed, already correct) |
| `src/frameworks/ui/useChatSurfaceState.tsx` | Duplicated return fields — edit target |
| `src/app/styles/chat.css` | Orphaned `[data-chat-composer-helper]` rules — removal target |
| `src/frameworks/ui/ChatInput.test.tsx` | Must update after `onArrowUp` removal |
| `tests/browser-fab-mobile-density.test.tsx` | May reference helper selectors — verify |
| `tests/theme-governance-qa.test.ts` | May reference helper hooks — verify |

---

## Task 0.1 — Fix Mention Trigger Priority Algorithm

**Spec ref:** `CCH-011`, `CCH-100`
**File:** `src/hooks/useMentions.ts`
**Test refs:** `CCH-T201` through `CCH-T226`

### Current behavior (defective)

The `handleInput` callback iterates `TRIGGERS` in declaration order (`@`, `[[`, `#`, `/`) and breaks on the first match whose segment contains no whitespace. This means array position determines the winner — not proximity to the cursor.

**Concrete failure:** User types `[[@benedict` with cursor at position 12. The `@` trigger (checked first in the array) matches at position 2 with segment `benedict`. The `[[` trigger would match at position 0 with segment `@benedict` — but it is never evaluated because `@` was found first and the loop broke.

### Required behavior

Replace the first-match loop with a **closest-to-cursor** algorithm:

```
candidates = []
for each trigger in TRIGGERS:
  lastIndex = textBeforeCursor.lastIndexOf(trigger.char)
  if lastIndex >= 0:
    segment = textBeforeCursor.slice(lastIndex + trigger.char.length)
    if segment contains no whitespace:
      candidates.push({ trigger, lastIndex, segment })

if candidates.length === 0:
  clear activeTrigger
  return

winner = candidate with highest lastIndex
if tie on lastIndex: candidate with longest trigger.char wins
```

### Exact implementation requirements

1. Do not change the `TRIGGERS` array order or contents. `[CCH-S0-011]`
2. Do not change the `MentionTrigger` type or the hook's return signature. `[CCH-S0-012]`
3. The filtering logic (whitespace check) must remain identical — only the selection strategy changes. `[CCH-S0-013]`
4. Remove the `break` after the first match. Iterate all triggers, collect all valid candidates, then pick the closest. `[CCH-S0-014]`
5. Tie-break rule: when two candidates have the same `lastIndex`, the **longer trigger character** wins. This handles the `[[@` overlap where `[[` at position 0 has effective reach to position 2 (which equals `@`'s lastIndex). The multi-character trigger is more intentional. `[CCH-S0-015]`

### Dead code removal in this file

6. Remove the `menuPosition` state (`useState({ top: 0, left: 0 })`). `[CCH-S0-016]`
7. Remove the `setMenuPosition(...)` call inside `handleInput`. `[CCH-S0-017]`
8. Remove `menuPosition` from the hook's return object. `[CCH-S0-018]`

### Pure `insertMention` conversion

**Spec ref:** `CCH-014`, `CCH-103`
**Test refs:** `CCH-T270` through `CCH-T282`

9. Change `insertMention` signature from `(item: MentionItem) => string` to `(item: MentionItem, currentText: string, cursorIndex: number) => string`. `[CCH-S0-019]`
10. Remove all direct reads of `textareaRef.current.value` and `textareaRef.current.selectionStart` inside `insertMention`. Use the `currentText` and `cursorIndex` parameters instead. `[CCH-S0-020]`
11. The null check `if (!textareaRef.current || !activeTrigger)` becomes `if (!activeTrigger)` — the ref is no longer needed. `[CCH-S0-021]`
12. Update the caller in `useChatComposerController.handleSuggestionSelect` to pass `composer.input` and the current cursor position. Since `handleInputChange` already receives `selectionStart`, store it in a ref or state so `handleSuggestionSelect` can access it. `[CCH-S0-022]`

### Test plan

Write a new test file `tests/mention-trigger-priority.test.ts` containing:

| Test ID | Input | Cursor | Expected trigger char | Expected query |
|---|---|---|---|---|
| `CCH-T201` | `@bene` | 5 | `@` | `bene` |
| `CCH-T202` | `[[Chapter` | 9 | `[[` | `Chapter` |
| `CCH-T203` | `/help` | 5 | `/` | `help` |
| `CCH-T204` | `see #frame` | 11 | `#` | `frame` |
| `CCH-T205` | `@John hello [[Chap` | 19 | `[[` | `Chap` |
| `CCH-T210` | `@ ben` | 5 | `null` | — |
| `CCH-T211` | `hello world` | 11 | `null` | — |
| `CCH-T220` | `[[@benedict` | 12 | `[[` | `@benedict` |
| `CCH-T222` | `@alice said @bob` | 17 | `@` | `bob` |
| `CCH-T223` | `[[Done]] check [[Open` | 21 | `[[` | `Open` |
| `CCH-T224` | `@` | 1 | `@` | `` (empty) |
| `CCH-T225` | `@Ælfrēd` | 8 | `@` | `Ælfrēd` |
| `CCH-T226` | `hello @world goodbye` (cursor at 12) | 12 | `@` | `world` |

Write a separate test file `tests/insert-mention-purity.test.ts` for the pure `insertMention` function containing tests `CCH-T270` through `CCH-T282`.

---

## Task 0.2 — Guard Auto-Resize Effect

**Spec ref:** `CCH-012`, `CCH-101`
**File:** `src/frameworks/ui/ChatInput.tsx`
**Test refs:** `CCH-T230` through `CCH-T242`

### Current behavior (wasteful)

```tsx
useEffect(() => {
  const element = textareaRef.current;
  if (!element) return;
  element.style.height = "0px";                     // ← forces reflow
  const nextHeight = Math.min(element.scrollHeight, maxTextareaHeight);
  element.style.height = `${Math.max(nextHeight, 44)}px`;  // ← second reflow
  element.style.overflowY = ...;
}, [maxTextareaHeight, textareaRef, value]);
```

This runs on every render, including when `value = ""` and `isSending = true` (streaming), and writes to the DOM even when the height hasn't changed.

### Required changes

1. Add a `previousHeightRef = useRef(0)` to track the last written height. `[CCH-S0-030]`
2. After computing `nextHeight`, compare against `previousHeightRef.current`. If they are equal, skip the DOM writes. `[CCH-S0-031]`
3. Add an early return guard: if `isSending && value === ""`, skip the entire effect body. This eliminates wasted reflows during streaming when the composer is empty. `[CCH-S0-032]`
4. The `isSending` prop is already available in the component scope. It does NOT need to be added to the `useEffect` dependency array — it's a skip guard, not a trigger. If the linter requires it in the dep array, add it. `[CCH-S0-033]`

### Exact implementation

```tsx
const previousHeightRef = useRef(0);

useEffect(() => {
  const element = textareaRef.current;
  if (!element) return;
  if (isSending && value === "") return;

  element.style.height = "0px";
  const nextHeight = Math.max(Math.min(element.scrollHeight, maxTextareaHeight), 44);

  if (nextHeight !== previousHeightRef.current) {
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > maxTextareaHeight ? "auto" : "hidden";
    previousHeightRef.current = nextHeight;
  } else {
    element.style.height = `${nextHeight}px`;
  }
}, [isSending, maxTextareaHeight, textareaRef, value]);
```

Note: The `height = "0px"` read-then-write is necessary to get an accurate `scrollHeight`. But the `overflowY` write and height-comparison produce the skip when nothing changed.

### Test plan

These tests verify the guard logic via the component's rendered output, not by spying on DOM writes directly (jsdom limitations):

| Test ID | Scenario | Assertion |
|---|---|---|
| `CCH-T230` | Render with `value="hello"` | Textarea has a style height ≥ 44px |
| `CCH-T242` | Render with `inputRef={null}` externally, no ref provided | Effect runs without error |

---

## Task 0.3 — Type And Catch Async Send

**Spec ref:** `CCH-013`, `CCH-102`
**File:** `src/hooks/chat/useChatComposerController.ts`
**Test refs:** `CCH-T250` through `CCH-T262`

### Current behavior (silent failure)

```tsx
const handleSend = useCallback(async () => {
  ...
  const result = await onSendMessage(draft, queuedFiles);
  if (!result.ok) {
    composer.restoreComposer(draft, queuedFiles);
  }
}, [composer, isSending, onSendMessage]);
```

The `await onSendMessage(...)` can throw a network error. There is no try/catch, so the rejection becomes an unhandled promise rejection. The `restoreComposer` path only fires if the server returns `{ ok: false }`, not if the fetch itself fails.

### Required changes

1. Wrap the `await onSendMessage(draft, queuedFiles)` call in a try/catch. `[CCH-S0-040]`
2. In the catch block, call `composer.restoreComposer(draft, queuedFiles)` to return the user's draft and files to the composer. `[CCH-S0-041]`
3. Add an `onSendError?: (error: string) => void` callback to the `UseChatComposerControllerOptions` interface. Call it in the catch block with the error message. This lets the surface layer show a transient error indicator without coupling the composer to a specific notification system. `[CCH-S0-042]`
4. Also call `onSendError` when `result.ok === false` and `result.error` exists. `[CCH-S0-043]`

### Exact implementation

```tsx
const handleSend = useCallback(async () => {
  if (isSending || !composer.canSend) return;

  const draft = composer.input.trim();
  if (!draft && composer.pendingFiles.length === 0) return;

  const queuedFiles = [...composer.pendingFiles];
  composer.clearComposer();

  try {
    const result = await onSendMessage(draft, queuedFiles);
    if (!result.ok) {
      composer.restoreComposer(draft, queuedFiles);
      if (result.error) onSendError?.(result.error);
    }
  } catch (error) {
    composer.restoreComposer(draft, queuedFiles);
    onSendError?.(error instanceof Error ? error.message : "Failed to send message");
  }
}, [composer, isSending, onSendMessage, onSendError]);
```

5. In `useChatSurfaceState.tsx`, pass `onSendError` to the controller. For now, use a no-op or `console.error`. The UI surface for error feedback (border flash, toast) is a Sprint 2 concern. `[CCH-S0-044]`

### Test plan

Write tests in `tests/chat-composer-send-error.test.ts`:

| Test ID | Setup | Assertion |
|---|---|---|
| `CCH-T255` | `onSendMessage` rejects with `Error("Network failure")` | `restoreComposer` called with original draft and files; `onSendError` called with `"Network failure"` |
| `CCH-T257` | Call `handleSend` twice in same tick | Second call is a no-op (guarded by `isSending`) |
| `CCH-T260` | `onSendMessage` returns a never-resolving promise | Composer stays cleared (already committed); no error callback fired |
| `CCH-T262` | `onSendMessage` throws synchronously | Caught by same try/catch; `restoreComposer` + `onSendError` called |

---

## Task 0.4 — Fix hasInput → hasContent Semantic

**Spec ref:** `CCH-018`, `CCH-107`
**File:** `src/frameworks/ui/ChatInput.tsx`
**Test refs:** `CCH-T290` through `CCH-T299`

### Current behavior (misleading visual)

```tsx
const hasInput = value.trim().length > 0;
```

This drives `data-chat-composer-state`, `data-chat-send-state`, and the send button's CSS class. But `canSend` (from `useChatComposerState`) correctly accounts for `pendingFiles.length > 0`.

**Result:** A user with files attached and no text sees a "Send" button styled as `ui-chat-send-idle` (transparent, 20% opacity) even though clicking it would successfully send. The button is enabled (`!canSend` is false when `canSend = true`), but it *looks* disabled.

### Required changes

1. Replace `hasInput` with `hasContent` throughout ChatInput. `[CCH-S0-050]`
2. `hasContent` must account for both text and files:
   ```tsx
   const hasContent = value.trim().length > 0 || pendingFiles.length > 0;
   ```
   `[CCH-S0-051]`
3. Every usage of `hasInput` becomes `hasContent`:
   - `data-chat-composer-state={hasContent ? "ready" : "idle"}`
   - `data-chat-send-state={hasContent ? "ready" : "idle"}`
   - Send button class: `hasContent ? "ui-chat-send-ready" : "ui-chat-send-idle"`
   - Disabled additional class: `!canSend && hasContent ? "ui-chat-send-disabled" : ""`
   `[CCH-S0-052]`

### Test plan

Update existing tests in `ChatInput.test.tsx` and add new cases:

| Test ID | `value` | `pendingFiles` | `canSend` | Expected `data-chat-composer-state` | Expected `data-chat-send-state` |
|---|---|---|---|---|---|
| `CCH-T290` | `"Hello"` | `[]` | true | `"ready"` | `"ready"` |
| `CCH-T291` | `""` | `[file]` | true | `"ready"` | `"ready"` |
| `CCH-T292` | `"See this"` | `[file]` | true | `"ready"` | `"ready"` |
| `CCH-T295` | `""` | `[]` | false | `"idle"` | `"idle"` |
| `CCH-T296` | `"   "` | `[]` | false | `"idle"` | `"idle"` |

---

## Task 0.5 — Remove All Dead Code

**Spec ref:** `CCH-017`, `CCH-019`, `CCH-020`, `CCH-106`
**Files:** Multiple
**Test refs:** `CCH-T390` through `CCH-T397`

### 0.5.1 — Remove `onArrowUp` prop chain

**Files:** `ChatInput.tsx`, `ChatContentSurface.tsx`, `ChatInput.test.tsx`

1. Remove `onArrowUp` from the `ChatInputProps` interface. `[CCH-S0-060]`
2. Remove `onArrowUp` from the destructured props in the `ChatInput` component. `[CCH-S0-061]`
3. Remove the `handleEditLastMessage` function entirely. `[CCH-S0-062]`
4. Remove the `handleEditLastMessage(e)` call from `handleKeyDown`. `[CCH-S0-063]`
5. Remove `onArrowUp={() => {}}` from the `<ChatInput>` usage in `ChatContentSurface.tsx`. `[CCH-S0-064]`
6. Remove `onArrowUp={vi.fn()}` from every test render in `ChatInput.test.tsx`. `[CCH-S0-065]`

### 0.5.2 — Remove orphaned `[data-chat-composer-helper]` CSS

**File:** `src/app/styles/chat.css`

7. Remove all selectors targeting `[data-chat-composer-helper="true"]` and `[data-chat-helper-mode]`. These span the floating shell override section (approximately lines 525–597). Remove:
   - The base `[data-chat-shell-kind="floating"] [data-chat-composer-helper="true"]` rule
   - The sibling combinator `[data-chat-composer-form="true"] + [data-chat-composer-helper="true"][data-chat-helper-mode="focus"]` rule
   - The `:hover` / `:focus-within` + helper focus transition rule
   - The mobile `@media (max-width: 640px)` override for `[data-chat-composer-helper="true"]`
   - The nested `span:last-child` rule inside the mobile helper override
   `[CCH-S0-066]`

### 0.5.3 — Remove dead `menuPosition` from useMentions

**File:** `src/hooks/useMentions.ts`

8. Already covered by Task 0.1 items `CCH-S0-016` through `CCH-S0-018`. Listed here for completeness — no additional work needed.

### 0.5.4 — Clean orchestrator return duplication

**Spec ref:** `CCH-016`, `CCH-105`
**File:** `src/frameworks/ui/useChatSurfaceState.tsx`

9. Identify every consumer of `useChatSurfaceState` other than `contentProps`. `[CCH-S0-070]`
10. If any consumer reads a flat field that is also inside `contentProps`, migrate it to read from `contentProps` instead. `[CCH-S0-071]`
11. Remove the duplicated flat fields from the hook's return statement. Keep only:
    - `contentProps` (the full ChatContentSurface prop bag)
    - `conversationId`
    - `currentConversation`
    - `sessionSearchQuery` and `setSessionSearchQuery`
    - Any field that is genuinely needed by consumers OTHER than ChatContentSurface (verify before deleting)
    `[CCH-S0-072]`
12. Run `npm run typecheck` to catch any consumer that breaks. Fix each by accessing through `contentProps.*` instead. `[CCH-S0-073]`

### Verification

After all removals:

```bash
grep -rn 'onArrowUp' src/ tests/ --include='*.tsx' --include='*.ts'
# Expected: 0 matches

grep -rn 'menuPosition' src/ --include='*.ts' --include='*.tsx'
# Expected: 0 matches

grep -rn 'data-chat-composer-helper' src/ --include='*.css' --include='*.tsx'
# Expected: 0 matches

grep -rn 'handleEditLastMessage' src/ --include='*.tsx'
# Expected: 0 matches
```

---

## Deliverables

1. Rewritten `handleInput` in `useMentions.ts` with closest-to-cursor algorithm.
2. Pure `insertMention` function that accepts text and cursor as arguments.
3. Guarded auto-resize `useEffect` in `ChatInput.tsx` with height-ref comparison and streaming skip.
4. try/catch in `handleSend` with `restoreComposer` on failure.
5. `hasContent` replacing `hasInput` in ChatInput — visual state reflects files-only sends.
6. `onArrowUp` prop chain fully removed from all files.
7. Orphaned `[data-chat-composer-helper]` CSS fully removed.
8. Dead `menuPosition` state fully removed.
9. Orchestrator return cleaned to eliminate duplication.
10. New test files: `mention-trigger-priority.test.ts`, `insert-mention-purity.test.ts`, `chat-composer-send-error.test.ts`.
11. Updated `ChatInput.test.tsx` (no `onArrowUp`, new `hasContent` cases).

---

## Verify

```bash
npm run typecheck
npm run lint
npm exec vitest run src/frameworks/ui/ChatInput.test.tsx tests/mention-trigger-priority.test.ts tests/insert-mention-purity.test.ts tests/chat-composer-send-error.test.ts tests/browser-fab-mobile-density.test.tsx tests/browser-fab-chat-flow.test.tsx tests/theme-governance-qa.test.ts
npm run build
```

---

## Exit Criteria

1. `[[@benedict` at cursor 12 activates `[[` trigger, not `@`. Verified by `CCH-T220`.
2. Typing in empty composer during active streaming causes zero DOM writes. Verified by guard.
3. `onSendMessage` throwing `Error("Network failure")` restores draft + files. Verified by `CCH-T255`.
4. Attaching a file with no text shows send button in `ready` state. Verified by `CCH-T291`.
5. `grep -rn 'onArrowUp' src/ tests/` returns zero matches.
6. `grep -rn 'data-chat-composer-helper' src/` returns zero matches.
7. `grep -rn 'menuPosition' src/` returns zero matches.
8. Full vitest suite passes with zero failures.
9. `npm run build` succeeds.
10. `npm run lint` produces zero errors.

---

## Completion Checklist

- [ ] Trigger priority algorithm rewritten with closest-to-cursor selection
- [ ] All 13 trigger priority tests pass (`CCH-T201` through `CCH-T226`)
- [ ] `insertMention` is pure — no DOM reads
- [ ] All 6 insertMention purity tests pass (`CCH-T270` through `CCH-T282`)
- [ ] Auto-resize guarded — height-ref skip + streaming skip
- [ ] `handleSend` wrapped in try/catch with `restoreComposer` on failure
- [ ] All 4 send-error tests pass (`CCH-T255`, `CCH-T257`, `CCH-T260`, `CCH-T262`)
- [ ] `hasInput` replaced by `hasContent` accounting for `pendingFiles`
- [ ] All 5 hasContent tests pass (`CCH-T290` through `CCH-T296`)
- [ ] `onArrowUp` removed from ChatInput interface, implementation, surface, and all tests
- [ ] `handleEditLastMessage` removed
- [ ] Orphaned `[data-chat-composer-helper]` CSS removed (~73 lines)
- [ ] `menuPosition` state and setter removed from useMentions
- [ ] Orchestrator return duplication eliminated
- [ ] All existing tests pass after changes
- [ ] `npm run build` succeeds
- [ ] `npm run typecheck` succeeds
- [ ] `npm run lint` — zero errors
