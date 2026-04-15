# Audit Report: Evaporating Text Selections

**Severity:** Low / UX Degradation
**Area:** Chat Context Extraction
**Target Files:** `src/lib/chat/collect-current-page-snapshot.ts`, `src/frameworks/ui/ChatSurface` (or Composer)

## 1. Description
The chat extraction mechanism `collectCurrentPageSnapshot()` attempts to capture the user's highlighted text by invoking `window.getSelection().toString()`.
Because this function runs eagerly *exactly when* the message is sent, standard interaction patterns break it. When a user highlights text on a page, then moves their mouse over to click the "Send" button in the Chat UI, the browser triggers a `mousedown` event on the button, collapsing the active text selection just before `collectSelectedText()` fires.

## 2. Impact
* The AI is completely blind to highlighted text if the user interacts with the chat through a mouse click. 
* The only users who benefit from the `selectedText` feature are those who happen to use `Enter` (keyboard shortcut) while keeping focus outside the chat input container, which is an extremely rare UX pattern.

## 3. Remediation Strategy
1. The chat composer input area and its "Send" button must intercept `onPointerDown`/`onMouseDown` events and execute `e.preventDefault()`. This intercepts focus transfer and allows the page selection to persist.
2. Alternatively, implement a global event listener on `document.addEventListener('selectionchange', ...)` to reactively cache the recent non-collapsed text selection into React state, using that cached value instead of JIT extraction.
