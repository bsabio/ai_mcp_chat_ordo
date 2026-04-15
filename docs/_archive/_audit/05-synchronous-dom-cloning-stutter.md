# Audit Report: Synchronous DOM Cloning Performance Stutter

**Severity:** Medium (UX Degradation)
**Area:** Chat Main-Thread Execution / Performance
**Target Files:** `src/lib/chat/collect-current-page-snapshot.ts`

## 1. Description
When a user sends a chat message, `collectCurrentPageSnapshot` performs a synchronous execution block:
1. Looks up the `CONTENT_ROOT_SELECTOR`.
2. Invokes `root.cloneNode(true)` which deep-copies the entire content tree into memory.
3. Runs `clone.querySelectorAll` to find excluded nodes and removes them.
4. Walks the tree for headings and runs `textContent` string aggregations.

On content-heavy pages (like long journal articles or library documents), this synchronous block can easily exceed 50-100ms. 

## 2. Impact
* Because this occurs exactly at the moment the user clicks "Send", it blocks the main browser thread.
* The CPU spike causes the send button's click animation to drop frames.
* The optimistic UI update for appending the user's message is visibly delayed (stutter), degrading the perception of a high-performance system.

## 3. Remediation Strategy
1. **Debounced Background Caching:** Shift the snapshot extraction to a background event (like `requestIdleCallback`) that incrementally updates a cached snapshot object out of band, rather than blocking on the user interaction.
2. **Web Worker Offloading:** Traverse the actual DOM tree only to extract innerHTML or textContent strings, and offload the parsing/regex stripping to a Web Worker, leaving the main thread unblocked.
