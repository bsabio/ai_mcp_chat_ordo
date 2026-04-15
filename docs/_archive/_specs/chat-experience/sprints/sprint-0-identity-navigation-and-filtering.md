# Sprint 0 - Identity, Navigation, and Filtering

> **Goal:** Stabilize rendered message identity, make inline content links navigate, and ensure filtered message views attach state to the correct visible messages.
> **Spec Sections:** `CUX-010` through `CUX-048`

## Tasks

1. Remove index-based message ids from the chat container and preserve the source message id through the presenter.
2. Replace the chat container inline-link logger with route navigation and repair the legacy chapter-only redirect route so it resolves section slugs across the corpus.
3. Refactor message filtering to search meaningful text content instead of `JSON.stringify`, and compute greeting/streaming/latest-chip state against the rendered list.
4. Add focused regressions for presenter identity, inline chat link routing, filtered-list chip placement, and legacy slug redirect behavior.

## Completion Checklist

- [x] Stable message ids preserved end-to-end
- [x] Inline links navigate to real content
- [x] Filtered list no longer misplaces latest-message UI
- [x] Focused regressions added and passing

## QA Deviations

None.

## Verification

- `npm exec vitest run src/frameworks/ui/MessageList.test.tsx src/frameworks/ui/ChatContainer.test.tsx 'src/app/book/[chapter]/page.test.ts'`