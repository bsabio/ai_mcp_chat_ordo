# Audit Report: Portal & Modal Blindspots

**Severity:** Medium
**Area:** Chat Context Extraction
**Target Files:** `src/lib/chat/collect-current-page-snapshot.ts`

## 1. Description
To avoid reading its own chat interface, the application confines snapshot extraction via a targeted selector:
`const CONTENT_ROOT_SELECTOR = "main[data-shell-main-surface], main, [data-shell-main-surface]";`

Modern React UI libraries (including Radix UI, which is commonly used) render volatile overlay components like Dialogs, Popovers, and Toast notifications into React Portals. Portals typically mount directly to the end of `document.body`, entirely outside the `<main>` boundary defined by `CONTENT_ROOT_SELECTOR`.

## 2. Impact
* If the user opens a modal displaying an error code or an explicit form and asks the AI, "What does this mean?" or "Fix this for me", the AI will not see the modal. The snapshot strips it out completely.
* It significantly diminishes the value of the JIT context system for debugging or workflow assistance.

## 3. Remediation Strategy
1. `findContentRoot()` should be expanded to not only clone the base `CONTENT_ROOT_SELECTOR`, but to also select active portals (e.g., `[role="dialog"]`, `.radix-portal`) and append their cloned text content to the snapshot.
2. Maintain active exclusion of internal chat shell elements, since the chat container applies portals as well. Extend `EXCLUDED_CONTENT_SELECTOR` accordingly.
