# Sprint 1 - Composer and Scroll Intent

> **Goal:** Upgrade the composer to a real multiline control and simplify scroll behavior around explicit pinned-to-bottom state.
> **Spec Sections:** `CUX-049` through `CUX-057`

## Tasks

1. Replace the single-line input with a textarea that supports multiline drafting, `Enter` submit, `Shift+Enter` newline, and bounded auto-growth.
2. Pass a real textarea ref through the chat container into the input component so the mentions hook targets the actual DOM element.
3. Refactor `useChatScroll` so pin state is derived from bottom proximity rather than scroll direction deltas, with explicit re-pin on “scroll to bottom”.
4. Add focused regressions for composer keyboard behavior and scroll hook pin/detach behavior.

## Completion Checklist

- [x] Composer is textarea-based
- [x] Mentions hook owns a real textarea ref
- [x] Scroll hook uses explicit pin state
- [x] Focused regressions added and passing

## QA Deviations

None.

## Verification

- `npm exec vitest run src/frameworks/ui/ChatInput.test.tsx src/hooks/useChatScroll.test.tsx`