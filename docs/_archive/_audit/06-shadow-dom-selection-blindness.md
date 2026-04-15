# Audit Report: Shadow DOM Selection Blindness

**Severity:** Low / Feature Gap
**Area:** Chat Context Extraction
**Target Files:** `src/lib/chat/collect-current-page-snapshot.ts`

## 1. Description
The snapshot utility relies on the native `window.getSelection()` API to capture highlighted text for the AI context. The global `window.getSelection()` API cannot penetrate Shadow DOM boundaries (e.g., custom web components, encapsulated code blocks, or embedded `iframe`s). 

If the application uses Shadow DOM for complex interactive components, text selections made inside those boundaries will register as collapsed or null to the global window context.

## 2. Impact
* The AI is unable to "see" selected text inside modern encapsulated components.
* Users attempting to highlight specific code snippets or custom widget data will find the AI inexplicably lacks context, despite the text clearly being highlighted on screen.

## 3. Remediation Strategy
1. Implement a recursive Shadow DOM selection helper. If the global selection points to a host element containing a `shadowRoot`, it needs to query `element.shadowRoot.getSelection()` recursively to find the actual text nodes.
2. Ensure third-party embedded editors (like Monaco or CodeMirror, if added later) broadcast their selection states to the global window context via custom events that the chat hook can listen to.
