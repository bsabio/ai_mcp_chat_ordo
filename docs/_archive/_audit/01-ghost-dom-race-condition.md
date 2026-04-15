# Audit Report: Soft Navigation Ghost DOM Race Condition

**Severity:** Medium
**Area:** Chat Context / Navigation Synchronization
**Target Files:** `src/hooks/chat/useChatSend.ts`, `src/lib/chat/collect-current-page-snapshot.ts`

## 1. Description
The AI relies on `collectCurrentPageSnapshot()` to understand the user's current environment. Next.js App Router relies on client-side routing where navigating to a new URL using `<Link>` instantly updates `usePathname()`, but asynchronously updates the DOM elements. 

If an automated trigger fires or a user quickly clicks a link and presses Enter, `useChatSend` captures the newly updated `currentPathname` but the old, pre-transition DOM content. The AI receives a conflicting snapshot: a new route configuration paired with the old route's `<h1>` and `textContent`.

## 2. Impact
* The AI will provide hallucinatory answers using content from the previous page while believing the user is on the new page.
* Creates irreproducible bug reports since timing defines the failure.

## 3. Remediation Strategy
Do not blindly grab DOM snapshots upon dispatching the `sendMessage` hook. Instead:
1. Maintain a cached snapshot using a debounced `MutationObserver` or `useLayoutEffect` that guarantees the DOM matches the URL.
2. Consider deferring `sendMessage` execution when a route transition is actively pending (via Next.js `useTransition` or `isPending` state if implemented).
